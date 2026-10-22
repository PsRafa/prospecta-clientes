import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

/** Recarrega resultados já salvos no Supabase, sem consultar o Google Places de novo. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const niche = searchParams.get("niche");
  const city = searchParams.get("city");
  const isNational = searchParams.get("national") === "true";

  if (!niche) {
    return NextResponse.json({ error: "Informe o nicho" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  let query = supabase.from("businesses").select().eq("niche", niche);
  if (!isNational && city) {
    query = query.eq("city", city);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ businesses: data });
}
