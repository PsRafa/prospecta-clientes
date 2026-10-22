"use client";

import { useEffect, useMemo, useState } from "react";
import type { Business, LeadStatus, SearchHistoryEntry } from "@/lib/types";
import { businessesToCsv, downloadCsv } from "@/lib/csv";
import { recommendService } from "@/lib/serviceRecommendation";

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  negociando: "Negociando",
  fechado: "Fechado",
  descartado: "Descartado",
};

const STATUS_DOT: Record<LeadStatus, string> = {
  novo: "bg-slate-400",
  contatado: "bg-sky-400",
  negociando: "bg-amber-400",
  fechado: "bg-emerald-400",
  descartado: "bg-rose-500",
};

type WebsiteFilter = "todos" | "sem_site" | "com_site";

function isEnriched(business: Business): boolean {
  return Boolean(
    business.instagram_url ||
      business.facebook_url ||
      business.whatsapp_url ||
      business.linkedin_url ||
      business.cnpj
  );
}

function WebsiteBadge({ business }: { business: Business }) {
  if (!business.website) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        sem site — lead quente
      </span>
    );
  }
  if (!business.has_website) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-medium text-fuchsia-300">
        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
        só rede social
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      site próprio
    </span>
  );
}

export default function Home() {
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCities, setFailedCities] = useState<string[]>([]);
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("todos");
  const [minRating, setMinRating] = useState(0);
  const [cityFilter, setCityFilter] = useState<string>("todas");
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [cnpjLookingUpIds, setCnpjLookingUpIds] = useState<Set<string>>(new Set());
  const [bulkCnpjLookup, setBulkCnpjLookup] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch("/api/search/history")
      .then((res) => res.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => {});
  }, []);

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

  const stats = useMemo(() => {
    const total = businesses.length;
    const semSite = businesses.filter((b) => !b.website).length;
    const soRedeSocial = businesses.filter((b) => b.website && !b.has_website).length;
    const ratings = businesses.map((b) => b.rating).filter((r): r is number => r != null);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return { total, semSite, soRedeSocial, avgRating };
  }, [businesses]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFailedCities([]);
    try {
      const trimmedCity = city.trim();
      const payload = trimmedCity ? { niche, city: trimmedCity } : { niche };
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
      fetch("/api/search/history")
        .then((r) => r.json())
        .then((d) => setHistory(d.history ?? []))
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: LeadStatus) {
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    await fetch(`/api/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function enrichOne(id: string) {
    setEnrichingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/businesses/${id}/enrich`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.business) {
        setBusinesses((prev) => prev.map((b) => (b.id === id ? data.business : b)));
      }
    } catch {
      // ignora falhas individuais, usuário pode tentar de novo
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function enrichAll() {
    const targets = filtered.filter((b) => b.has_website && !isEnriched(b));
    if (targets.length === 0) return;
    setBulkEnriching(true);
    const CONCURRENCY = 4;
    try {
      for (let i = 0; i < targets.length; i += CONCURRENCY) {
        const batch = targets.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((b) => enrichOne(b.id)));
      }
    } finally {
      setBulkEnriching(false);
    }
  }

  async function lookupCnpjOne(id: string) {
    setCnpjLookingUpIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/businesses/${id}/cnpj`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.business) {
        setBusinesses((prev) => prev.map((b) => (b.id === id ? data.business : b)));
      }
    } catch {
      // ignora falhas individuais, usuário pode tentar de novo
    } finally {
      setCnpjLookingUpIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function lookupCnpjAll() {
    const targets = filtered.filter((b) => b.cnpj && !b.razao_social);
    if (targets.length === 0) return;
    setBulkCnpjLookup(true);
    const CONCURRENCY = 4;
    try {
      for (let i = 0; i < targets.length; i += CONCURRENCY) {
        const batch = targets.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((b) => lookupCnpjOne(b.id)));
      }
    } finally {
      setBulkCnpjLookup(false);
    }
  }

  async function loadFromHistory(entry: SearchHistoryEntry) {
    setLoading(true);
    setError(null);
    setFailedCities([]);
    setShowHistory(false);
    try {
      setNiche(entry.niche);
      setCity(entry.is_national ? "" : [entry.city, entry.state].filter(Boolean).join(", "));
      const params = new URLSearchParams({ niche: entry.niche });
      if (entry.is_national) {
        params.set("national", "true");
      } else if (entry.city) {
        params.set("city", entry.city);
      }
      const res = await fetch(`/api/businesses?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar histórico");
      setBusinesses(data.businesses ?? []);
      setCityFilter("todas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (filtered.length === 0) return;
    downloadCsv(`leads-${niche}-${city}.csv`.replace(/\s+/g, "-"), businessesToCsv(filtered));
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-6xl px-6 pt-14 sm:px-8">
        <header className="mb-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-2)]">
            Prospecção de leads
          </p>
          <h1 className="bg-gradient-to-br from-white via-white to-[var(--muted)] bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
            Prospecta Clientes
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Busque um nicho no Brasil inteiro e filtre por cidade, site e avaliação
            depois. Comércios sem site próprio aparecem destacados como leads quentes.
          </p>

          {history.length > 0 && (
            <div className="relative mt-4 inline-block">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="rounded-lg border border-[var(--border-strong)] bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-white/10"
              >
                Buscas recentes ({history.length})
              </button>
              {showHistory && (
                <div className="absolute left-0 z-10 mt-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl backdrop-blur-xl">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => loadFromHistory(h)}
                      className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/10"
                    >
                      <span className="font-medium text-[var(--foreground)]">{h.niche}</span>
                      <span className="text-[var(--muted-2)]">
                        {h.is_national ? "Brasil todo" : [h.city, h.state].filter(Boolean).join(", ")} ·{" "}
                        {h.result_count} resultados ·{" "}
                        {new Date(h.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        <form
          onSubmit={handleSearch}
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--muted)]" htmlFor="niche">
                Nicho
              </label>
              <input
                id="niche"
                className="rounded-xl border border-[var(--border)] bg-black/20 px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                placeholder="ex: salão de beleza"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--muted)]" htmlFor="city">
                Cidade <span className="text-[var(--muted-2)]">(opcional)</span>
              </label>
              <input
                id="city"
                className="rounded-xl border border-[var(--border)] bg-black/20 px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                placeholder="em branco = Brasil todo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] px-6 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <span className="relative z-10">
                {loading ? (city.trim() ? "Buscando..." : "Buscando nas 27 capitais...") : "Buscar"}
              </span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
            </button>
          </div>

          <p className="mt-3.5 text-xs text-[var(--muted-2)]">
            {city.trim()
              ? "Busca só na cidade informada."
              : "Sem cidade, busca automaticamente nas 27 capitais do Brasil (pode levar até 1 minuto)."}
          </p>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {failedCities.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            Falha ao buscar em: {failedCities.join(", ")}. As demais cidades foram salvas normalmente.
          </div>
        )}

        {businesses.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Resultados", value: stats.total, accent: "text-white" },
                { label: "Sem site", value: stats.semSite, accent: "text-amber-300" },
                { label: "Só rede social", value: stats.soRedeSocial, accent: "text-fuchsia-300" },
                {
                  label: "Avaliação média",
                  value: stats.avgRating ? stats.avgRating.toFixed(1) : "—",
                  accent: "text-emerald-300",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 backdrop-blur-xl"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-2)]">
                    {s.label}
                  </p>
                  <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${s.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 backdrop-blur-xl">
              {cityOptions.length > 1 && (
                <select
                  className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                >
                  <option value="todas">Todas as cidades ({cityOptions.length})</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value as WebsiteFilter)}
              >
                <option value="todos">Site: todos</option>
                <option value="sem_site">Site: sem site próprio (lead quente)</option>
                <option value="com_site">Site: com site próprio</option>
              </select>

              <select
                className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>Avaliação: qualquer</option>
                <option value={3}>3+</option>
                <option value={4}>4+</option>
                <option value={4.5}>4.5+</option>
              </select>

              <button
                onClick={enrichAll}
                disabled={bulkEnriching}
                className="ml-auto rounded-lg border border-[var(--border-strong)] bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkEnriching ? "Enriquecendo..." : "Enriquecer sites"}
              </button>

              <button
                onClick={lookupCnpjAll}
                disabled={bulkCnpjLookup}
                className="rounded-lg border border-[var(--border-strong)] bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkCnpjLookup ? "Consultando..." : "Consultar CNPJ"}
              </button>

              <button
                onClick={handleExport}
                className="rounded-lg border border-[var(--border-strong)] bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-white/10"
              >
                Exportar CSV ({filtered.length})
              </button>
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <div className="scrollbar-thin mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
            <table className="w-full min-w-[1000px] table-fixed text-sm">
              <colgroup>
                <col className="w-[220px]" />
                <col className="w-[130px]" />
                <col className="w-[230px]" />
                <col className="w-[240px]" />
                <col className="w-[90px]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--muted-2)]">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Endereço</th>
                  <th className="px-4 py-3 font-medium">Avaliação</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[var(--border)] transition last:border-0 hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      <span className="line-clamp-2 break-words">{b.name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">{b.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 overflow-hidden">
                        <WebsiteBadge business={b} />
                        {(() => {
                          const rec = recommendService(b);
                          if (!rec) return null;
                          return (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                              Vender: {rec.label} ({rec.price})
                            </span>
                          );
                        })()}
                        {b.website && (
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-[var(--muted-2)] underline decoration-dotted hover:text-[var(--accent)]"
                            title={b.website}
                          >
                            {b.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                        {(b.instagram_url || b.facebook_url || b.whatsapp_url || b.linkedin_url) && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {b.instagram_url && (
                              <a href={b.instagram_url} target="_blank" rel="noreferrer" className="text-[var(--muted-2)] underline decoration-dotted hover:text-[var(--accent)]">
                                Instagram
                              </a>
                            )}
                            {b.facebook_url && (
                              <a href={b.facebook_url} target="_blank" rel="noreferrer" className="text-[var(--muted-2)] underline decoration-dotted hover:text-[var(--accent)]">
                                Facebook
                              </a>
                            )}
                            {b.whatsapp_url && (
                              <a href={b.whatsapp_url} target="_blank" rel="noreferrer" className="text-[var(--muted-2)] underline decoration-dotted hover:text-[var(--accent)]">
                                WhatsApp
                              </a>
                            )}
                            {b.linkedin_url && (
                              <a href={b.linkedin_url} target="_blank" rel="noreferrer" className="text-[var(--muted-2)] underline decoration-dotted hover:text-[var(--accent)]">
                                LinkedIn
                              </a>
                            )}
                          </div>
                        )}
                        {b.cnpj && <span className="text-[11px] text-[var(--muted-2)]">CNPJ: {b.cnpj}</span>}
                        {b.razao_social && (
                          <span className="text-[11px] text-[var(--muted-2)]">{b.razao_social}</span>
                        )}
                        {b.responsavel && (
                          <span className="text-[11px] text-[var(--muted-2)]">Sócio: {b.responsavel}</span>
                        )}
                        {b.situacao_cadastral && (
                          <span className="text-[11px] text-[var(--muted-2)]">
                            Situação: {b.situacao_cadastral}
                          </span>
                        )}
                        {b.has_website && !isEnriched(b) && (
                          <button
                            onClick={() => enrichOne(b.id)}
                            disabled={enrichingIds.has(b.id)}
                            className="self-start rounded-md border border-[var(--border-strong)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {enrichingIds.has(b.id) ? "Enriquecendo..." : "Enriquecer"}
                          </button>
                        )}
                        {b.cnpj && !b.razao_social && (
                          <button
                            onClick={() => lookupCnpjOne(b.id)}
                            disabled={cnpjLookingUpIds.has(b.id)}
                            className="self-start rounded-md border border-[var(--border-strong)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cnpjLookingUpIds.has(b.id) ? "Consultando..." : "Consultar CNPJ"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      <span className="line-clamp-2 break-words">{b.address ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[var(--muted)]">{b.rating ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="relative inline-flex items-center">
                        <span
                          className={`pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full ${STATUS_DOT[b.status]}`}
                        />
                        <select
                          className="rounded-lg border border-[var(--border)] bg-black/20 py-1.5 pl-6 pr-2.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                          value={b.status}
                          onChange={(e) => updateStatus(b.id, e.target.value as LeadStatus)}
                        >
                          {Object.entries(STATUS_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
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
