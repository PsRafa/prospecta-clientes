"use client";

import { useMemo, useState } from "react";
import type { Business, LeadStatus } from "@/lib/types";
import { businessesToCsv, downloadCsv } from "@/lib/csv";

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  negociando: "Negociando",
  fechado: "Fechado",
  descartado: "Descartado",
};

type WebsiteFilter = "todos" | "sem_site" | "com_site";
type SearchMode = "cidade" | "brasil";

export default function Home() {
  const [mode, setMode] = useState<SearchMode>("cidade");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCities, setFailedCities] = useState<string[]>([]);
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("todos");
  const [minRating, setMinRating] = useState(0);
  const [cityFilter, setCityFilter] = useState<string>("todas");

  const cityOptions = useMemo(() => {
    const set = new Set(businesses.map((b) => b.city).filter((c): c is string => !!c));
    return Array.from(set).sort();
  }, [businesses]);

  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      if (websiteFilter === "sem_site" && b.has_website) return false;
      if (websiteFilter === "com_site" && !b.has_website) return false;
      if (minRating > 0 && (b.rating ?? 0) < minRating) return false;
      if (cityFilter !== "todas" && b.city !== cityFilter) return false;
      return true;
    });
  }, [businesses, websiteFilter, minRating, cityFilter]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFailedCities([]);
    try {
      const payload =
        mode === "cidade" ? { mode, niche, city } : { mode, niche };
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na busca");
      setBusinesses(data.businesses ?? []);
      setFailedCities(data.failedCities ?? []);
      setCityFilter("todas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: LeadStatus) {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
    await fetch(`/api/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function handleExport() {
    if (filtered.length === 0) return;
    downloadCsv(`leads-${niche}-${city}.csv`.replace(/\s+/g, "-"), businessesToCsv(filtered));
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Prospecção de Comércios</h1>
          <p className="text-sm text-neutral-600">
            Busque comércios por nicho e cidade para encontrar leads de criação de sites.
          </p>
        </header>

        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="niche">Nicho</label>
            <input
              id="niche"
              className="w-56 rounded border border-neutral-300 px-3 py-2 text-sm"
              placeholder="ex: salão de beleza"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Abrangência</label>
            <div className="flex gap-1 rounded border border-neutral-300 p-1">
              <button
                type="button"
                onClick={() => setMode("cidade")}
                className={`rounded px-3 py-1.5 text-sm ${mode === "cidade" ? "bg-neutral-900 text-white" : "text-neutral-700"}`}
              >
                Cidade específica
              </button>
              <button
                type="button"
                onClick={() => setMode("brasil")}
                className={`rounded px-3 py-1.5 text-sm ${mode === "brasil" ? "bg-neutral-900 text-white" : "text-neutral-700"}`}
              >
                Brasil inteiro
              </button>
            </div>
          </div>

          {mode === "cidade" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="city">Cidade</label>
              <input
                id="city"
                className="w-56 rounded border border-neutral-300 px-3 py-2 text-sm"
                placeholder="ex: São Paulo, SP"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? mode === "brasil"
                ? "Buscando nas 27 capitais..."
                : "Buscando..."
              : "Buscar"}
          </button>

          {mode === "brasil" && (
            <p className="w-full text-xs text-neutral-500">
              Busca o nicho nas 27 capitais brasileiras (uma consulta por
              capital) e salva tudo no banco. Pode levar até 1 minuto. Depois
              você filtra por cidade, avaliação e site na tela.
            </p>
          )}
        </form>

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {failedCities.length > 0 && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Falha ao buscar em: {failedCities.join(", ")}. As demais cidades foram salvas normalmente.
          </p>
        )}

        {businesses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            {cityOptions.length > 1 && (
              <>
                <label className="text-sm font-medium">Cidade:</label>
                <select
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                >
                  <option value="todas">Todas ({cityOptions.length})</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="text-sm font-medium">Site:</label>
            <select
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
              value={websiteFilter}
              onChange={(e) => setWebsiteFilter(e.target.value as WebsiteFilter)}
            >
              <option value="todos">Todos</option>
              <option value="sem_site">Sem site (lead quente)</option>
              <option value="com_site">Com site</option>
            </select>

            <label className="text-sm font-medium">Avaliação mín.:</label>
            <select
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
            >
              <option value={0}>Qualquer</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={4.5}>4.5+</option>
            </select>

            <button
              onClick={handleExport}
              className="ml-auto rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
            >
              Exportar CSV ({filtered.length})
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">Site</th>
                  <th className="px-3 py-2">Endereço</th>
                  <th className="px-3 py-2">Avaliação</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-medium">
                      {b.name}
                      {!b.has_website && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                          sem site
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{b.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      {b.website ? (
                        <a href={b.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          site
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">{b.address ?? "—"}</td>
                    <td className="px-3 py-2">{b.rating ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value as LeadStatus)}
                      >
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
