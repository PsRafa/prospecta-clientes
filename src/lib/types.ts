export type LeadStatus = "novo" | "contatado" | "negociando" | "fechado" | "descartado";

export interface SearchHistoryEntry {
  id: string;
  niche: string;
  city: string | null;
  state: string | null;
  is_national: boolean;
  result_count: number;
  created_at: string;
}

export interface Business {
  id: string;
  google_place_id: string;
  name: string;
  niche: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  has_website: boolean;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_url: string | null;
  linkedin_url: string | null;
  cnpj: string | null;
  razao_social: string | null;
  responsavel: string | null;
  situacao_cadastral: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
