import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    contentId: string;
  }>;
};

type Actor = {
  id: number;
  name: string;
};

type ContentActorRow = {
  actors: Actor | Actor[] | null;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { contentId } = await context.params;
    const parsedContentId = Number(contentId);

    if (!Number.isInteger(parsedContentId) || parsedContentId <= 0) {
      return NextResponse.json(
        {
          message: "잘못된 콘텐츠 ID입니다.",
        },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("content_actors")
      .select(
        `
        actors (
          id,
          name
        )
      `,
      )
      .eq("content_id", parsedContentId);

    if (error) {
      console.error("Failed to fetch content actors:", error);

      return NextResponse.json(
        {
          message: "출연 배우를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as unknown as ContentActorRow[];

    const actors = rows.flatMap((row) => {
      if (!row.actors) {
        return [];
      }

      return Array.isArray(row.actors) ? row.actors : [row.actors];
    });

    const uniqueActors = Array.from(
      new Map(actors.map((actor) => [actor.id, actor])).values(),
    ).sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return NextResponse.json({
      data: uniqueActors,
    });
  } catch (error) {
    console.error("Unexpected content actors error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
