import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  DocentActor,
  DocentEvidence,
  DocentScene,
  PlaceDocentContext,
} from "@/lib/ai/docent-types";

type SceneRow = {
  id: number;
  episode: string | null;
  description: string | null;
};

type SceneActorRow = {
  scene_id: number;
  actor_id: number;
};

type ActorRow = {
  id: number;
  name: string;
};

type EvidenceRow = {
  verification_status: string;
  source_type: string | null;
  verified_fact: string | null;
};

const VERIFIED_STATUSES = [
  "verified",
  "approved",
  "confirmed",
  "complete",
  "completed",
];

function isVerifiedStatus(status: string) {
  return VERIFIED_STATUSES.includes(status.trim().toLowerCase());
}

function hasMeaningfulEvidence(evidence: EvidenceRow) {
  return (
    isVerifiedStatus(evidence.verification_status) &&
    Boolean(evidence.verified_fact?.trim())
  );
}

function episodeNumber(value: string | null) {
  if (!value?.trim()) {
    return Number.POSITIVE_INFINITY;
  }

  const matched = value.match(/\d+/);

  if (!matched) {
    return Number.POSITIVE_INFINITY;
  }

  return Number(matched[0]);
}

export async function loadPlaceDocentContext(
  contentId: number,
  placeId: number,
): Promise<PlaceDocentContext | null> {
  const db = createServerSupabaseClient();

  const [placeResult, contentResult, scenePlaceResult, evidenceResult] =
    await Promise.all([
      db
        .from("places")
        .select("id,name,address,is_active")
        .eq("id", placeId)
        .maybeSingle(),

      db
        .from("contents")
        .select("id,title")
        .eq("id", contentId)
        .maybeSingle(),

      db.from("scene_places").select("scene_id").eq("place_id", placeId),

      db
        .from("place_relations")
        .select("verification_status,source_type,verified_fact")
        .eq("content_id", contentId)
        .eq("place_id", placeId),
    ]);

  if (
    placeResult.error ||
    contentResult.error ||
    scenePlaceResult.error ||
    evidenceResult.error
  ) {
    throw new Error("Failed to load docent context.");
  }

  if (
    !placeResult.data ||
    placeResult.data.is_active === false ||
    !contentResult.data
  ) {
    return null;
  }

  const linkedSceneIds = Array.from(
    new Set((scenePlaceResult.data ?? []).map((row) => row.scene_id)),
  );

  let scenes: SceneRow[] = [];

  if (linkedSceneIds.length > 0) {
    const { data, error } = await db
      .from("scenes")
      .select("id,episode,description")
      .eq("content_id", contentId)
      .in("id", linkedSceneIds);

    if (error) {
      throw new Error("Failed to load docent scenes.");
    }

    scenes = (data ?? []) as SceneRow[];
  }

  const evidenceRows = (evidenceResult.data ?? []) as EvidenceRow[];

  if (scenes.length === 0 && evidenceRows.length === 0) {
    return null;
  }

  const sceneIds = scenes.map((scene) => scene.id);

  const actorMap = new Map<number, DocentActor>();
  const sceneActorMap = new Map<number, DocentActor[]>();

  if (sceneIds.length > 0) {
    const { data: sceneActorData, error: sceneActorError } = await db
      .from("scene_actors")
      .select("scene_id,actor_id")
      .in("scene_id", sceneIds);

    if (sceneActorError) {
      throw new Error("Failed to load docent scene actors.");
    }

    const sceneActorRows = (sceneActorData ?? []) as SceneActorRow[];

    const actorIds = Array.from(
      new Set(sceneActorRows.map((row) => row.actor_id)),
    );

    if (actorIds.length > 0) {
      const { data: actorData, error: actorError } = await db
        .from("actors")
        .select("id,name")
        .in("id", actorIds);

      if (actorError) {
        throw new Error("Failed to load docent actors.");
      }

      ((actorData ?? []) as ActorRow[]).forEach((actor) => {
        actorMap.set(actor.id, actor);
      });
    }

    sceneActorRows.forEach((row) => {
      const actor = actorMap.get(row.actor_id);

      if (!actor) {
        return;
      }

      const currentActors = sceneActorMap.get(row.scene_id) ?? [];

      if (!currentActors.some((item) => item.id === actor.id)) {
        currentActors.push(actor);
      }

      sceneActorMap.set(row.scene_id, currentActors);
    });
  }

  const enrichedScenes: DocentScene[] = scenes
    .sort(
      (a, b) =>
        episodeNumber(a.episode) - episodeNumber(b.episode) || a.id - b.id,
    )
    .map((scene) => ({
      id: scene.id,
      episode: scene.episode,
      description: scene.description,
      actors: (sceneActorMap.get(scene.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "ko"),
      ),
    }));

  const evidence: DocentEvidence[] = evidenceRows
    .filter(hasMeaningfulEvidence)
    .map((row) => ({
      verificationStatus: row.verification_status,
      sourceType: row.source_type,
      verifiedFact: row.verified_fact,
    }));

  return {
    content: {
      id: contentResult.data.id,
      title: contentResult.data.title,
    },

    place: {
      id: placeResult.data.id,
      name: placeResult.data.name,
      address: placeResult.data.address,
    },

    scenes: enrichedScenes,
    evidence,
  };
}

export function hasEnoughPlaceDocentContext(context: PlaceDocentContext) {
  const hasSceneDescription = context.scenes.some((scene) =>
    Boolean(scene.description?.trim()),
  );

  const hasVerifiedFact = context.evidence.some((evidence) =>
    Boolean(evidence.verifiedFact?.trim()),
  );

  return hasSceneDescription || hasVerifiedFact;
}