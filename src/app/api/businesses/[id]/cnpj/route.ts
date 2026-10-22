import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { lookupCnpj } from "@/lib/brasilApi";

export const maxDuration = 20;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: business, error: fetchError } = await supabase
    .from("businesses")
    .select("id, cnpj")
    .eq("id", id)
    .single();

  if (fetchError || !business) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Comércio não encontrado" },
      { status: 404 }
    );
  }

  if (!business.cnpj) {
    return NextResponse.json(
      { error: "Comércio não tem CNPJ identificado ainda" },
      { status: 400 }
    );
  }

  const lookup = await lookupCnpj(business.cnpj);

  const { data, error } = await supabase
    .from("businesses")
    .update(lookup)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business: data });
}
