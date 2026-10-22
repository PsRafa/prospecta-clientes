const CNPJ_REGEX = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;

export interface EnrichmentResult {
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_url: string | null;
  linkedin_url: string | null;
  cnpj: string | null;
}

const LINK_PATTERNS: { key: keyof EnrichmentResult; pattern: RegExp }[] = [
  { key: "instagram_url", pattern: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>)]+/i },
  { key: "facebook_url", pattern: /https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[^\s"'<>)]+/i },
  { key: "whatsapp_url", pattern: /https?:\/\/(?:api\.)?(?:wa\.me|whatsapp\.com)\/[^\s"'<>)]+/i },
  { key: "linkedin_url", pattern: /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>)]+/i },
];

function cleanUrl(raw: string): string {
  return raw.replace(/&amp;/g, "&").replace(/[.,;]+$/, "");
}

const emptyResult: EnrichmentResult = {
  instagram_url: null,
  facebook_url: null,
  whatsapp_url: null,
  linkedin_url: null,
  cnpj: null,
};

/** Baixa a home do site institucional e extrai links de redes sociais e CNPJ do HTML. */
export async function enrichFromWebsite(url: string): Promise<EnrichmentResult> {
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectaBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return emptyResult;
    html = await res.text();
  } catch {
    return emptyResult;
  }

  const result = { ...emptyResult };
  for (const { key, pattern } of LINK_PATTERNS) {
    const match = html.match(pattern);
    if (match) result[key] = cleanUrl(match[0]);
  }

  const cnpjMatch = html.match(CNPJ_REGEX);
  if (cnpjMatch) result.cnpj = cnpjMatch[0];

  return result;
}
