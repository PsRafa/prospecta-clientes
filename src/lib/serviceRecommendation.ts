import type { Business } from "./types";

export interface ServiceRecommendation {
  label: string;
  price: string;
}

const FOOD_KEYWORDS = [
  "restaurante",
  "pizza",
  "hamburgu",
  "lanchonete",
  "lanches",
  "acai",
  "sorveter",
  "marmita",
  "padaria",
  "cafeteria",
  "cafe",
  "bar",
  "churrascaria",
  "pastel",
  "comida",
  "food",
  "confeitaria",
  "doceria",
  "buffet",
  "espetinho",
];

const CLOTHING_KEYWORDS = [
  "roupa",
  "boutique",
  "moda",
  "confecc",
  "brecho",
  "vestuario",
  "calcado",
  "sapataria",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchesAny(niche: string, keywords: string[]): boolean {
  const normalized = normalize(niche);
  return keywords.some((k) => normalized.includes(k));
}

/** Sugere, com base no nicho da busca e na presença digital do comércio, qual serviço do
 * plano de renda recorrente (cardápio online, loja estilo iFood, catálogo) oferecer. */
export function recommendService(business: Business): ServiceRecommendation | null {
  const niche = business.niche ?? "";

  if (matchesAny(niche, FOOD_KEYWORDS)) {
    if (business.has_website) {
      return { label: "Loja estilo iFood", price: "R$ 350/mês" };
    }
    return { label: "Cardápio online", price: "R$ 100/mês" };
  }

  if (matchesAny(niche, CLOTHING_KEYWORDS) && !business.has_website) {
    return { label: "Catálogo", price: "R$ 100/mês" };
  }

  return null;
}
