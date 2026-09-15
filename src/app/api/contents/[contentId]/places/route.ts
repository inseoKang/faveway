import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contentId: string }> },
) {
  try {
    const { contentId } = await context.params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("place_relations")
      .select(
        `
        id,
        relation_type,
        verification_status,
        verified_fact,
        places (
          id,
          name,
          address,
          latitude,
          longitude,
          place_type
        )
      `,
      )
      .eq("content_id", Number(contentId));

    if (error) {
      console.error("Supabase error:", error);

      return NextResponse.json(
        {
          message: "Failed to fetch content places",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Server error:", error);

    return NextResponse.json(
      {
        message: "Server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
