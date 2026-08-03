const SOCIAL_HOST_PATTERNS = [
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.com$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)wa\.me$/,
  /(^|\.)api\.whatsapp\.com$/,
  /(^|\.)whatsapp\.com$/,
  /(^|\.)linktr\.ee$/,
  /(^|\.)linkedin\.com$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)threads\.net$/,
  /(^|\.)t\.me$/,
  /(^|\.)telegram\.me$/,
  /(^|\.)youtube\.com$/,
  /(^|\.)youtu\.be$/,
];

/** Um site "real" é um domínio próprio, não um link direto para uma rede social/mensageria. */
export function isRealWebsite(url: string | null | undefined): boolean {
  if (!url) return false;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return !SOCIAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}
