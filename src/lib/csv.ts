import type { Business } from "./types";
import { recommendService } from "./serviceRecommendation";

const COLUMNS: { key: keyof Business; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "niche", label: "Nicho" },
  { key: "phone", label: "Telefone" },
  { key: "website", label: "Site" },
  { key: "address", label: "Endereço" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "UF" },
  { key: "rating", label: "Avaliação" },
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "whatsapp_url", label: "WhatsApp" },
  { key: "cnpj", label: "CNPJ" },
  { key: "razao_social", label: "Razão social" },
  { key: "responsavel", label: "Responsável" },
  { key: "status", label: "Status" },
];

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function businessesToCsv(businesses: Business[]): string {
  const header = [...COLUMNS.map((c) => c.label), "Serviço recomendado"].join(",");
  const lines = businesses.map((b) => {
    const recommendation = recommendService(b);
    const cells = [
      ...COLUMNS.map((c) => escapeCsvValue(b[c.key])),
      escapeCsvValue(recommendation ? `${recommendation.label} (${recommendation.price})` : ""),
    ];
    return cells.join(",");
  });
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
