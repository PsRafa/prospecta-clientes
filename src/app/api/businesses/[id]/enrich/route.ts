import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { enrichFromWebsite } from "@/lib/enrichment";

export const maxDuration = 30;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: business, error: fetchError } = await supabase
    .from("businesses")
    .select("id, website, has_website")
    .eq("id", id)
    .single();

  if (fetchError || !business) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Comércio não encontrado" },
      { status: 404 }
    );
  }

  if (!business.website || !business.has_website) {
    return NextResponse.json(
      { error: "Comércio não tem site institucional para enriquecer" },
      { status: 400 }
    );
  }

  const enrichment = await enrichFromWebsite(business.website);

  const { data, error } = await supabase
    .from("businesses")
    .update(enrichment)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business: data });
}
