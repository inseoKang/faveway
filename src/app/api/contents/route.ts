import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("contents")
      .select(
        `
        id,
        title,
        media_type,
        release_year,
        description
      `,
      )
      .order("id", { ascending: true });

    if (error) {
      console.error("Failed to fetch contents:", error);

      return NextResponse.json(
        {
          message: "콘텐츠를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected server error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
