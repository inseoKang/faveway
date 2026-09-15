import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    actorId: string;
  }>;
};

type Content = {
  id: number;
  title: string;
  media_type: string;
  release_year: number | null;
  description: string | null;
};

type ContentActorRow = {
  character_name: string | null;
  contents: Content | Content[] | null;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { actorId } = await context.params;

    const parsedActorId = Number(actorId);

    if (!Number.isInteger(parsedActorId) || parsedActorId <= 0) {
      return NextResponse.json(
        {
          message: "잘못된 배우 ID입니다.",
        },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("content_actors")
      .select(
        `
        character_name,
        contents (
          id,
          title,
          media_type,
          release_year,
          description
        )
      `,
      )
      .eq("actor_id", parsedActorId);

    if (error) {
      console.error("Failed to fetch actor contents:", error);

      return NextResponse.json(
        {
          message: "배우의 출연 작품을 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as unknown as ContentActorRow[];

    const contents = rows.flatMap((row) => {
      if (!row.contents) {
        return [];
      }

      const content = Array.isArray(row.contents)
        ? row.contents[0]
        : row.contents;

      if (!content) {
        return [];
      }

      return [
        {
          ...content,
          character_name: row.character_name,
        },
      ];
    });

    return NextResponse.json({
      data: contents,
    });
  } catch (error) {
    console.error("Unexpected actor contents error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
