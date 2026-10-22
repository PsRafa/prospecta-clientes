export interface CnpjLookupResult {
  razao_social: string | null;
  responsavel: string | null;
  situacao_cadastral: string | null;
}

interface BrasilApiSocio {
  nome_socio?: string;
}

interface BrasilApiCnpjResponse {
  razao_social?: string;
  descricao_situacao_cadastral?: string;
  qsa?: BrasilApiSocio[];
}

const emptyResult: CnpjLookupResult = {
  razao_social: null,
  responsavel: null,
  situacao_cadastral: null,
};

/** Consulta a BrasilAPI (dados públicos da Receita Federal) para um CNPJ. */
export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return emptyResult;

  let data: BrasilApiCnpjResponse;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return emptyResult;
    data = await res.json();
  } catch {
    return emptyResult;
  }

  return {
    razao_social: data.razao_social ?? null,
    responsavel: data.qsa?.[0]?.nome_socio ?? null,
    situacao_cadastral: data.descricao_situacao_cadastral ?? null,
  };
}
