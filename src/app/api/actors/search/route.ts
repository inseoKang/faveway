import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({
        data: [],
      });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("actors")
      .select(
        `
        id,
        name
      `,
      )
      .ilike("name", `%${query}%`)
      .order("name", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Failed to search actors:", error);

      return NextResponse.json(
        {
          message: "배우를 검색하지 못했습니다.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected actor search error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
