"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

interface WikipediaResult {
  title: string;
  snippet: string;
  url: string;
  pageid: number;
}

interface WikidataResult {
  id: string;
  label: string;
  description: string;
  url: string;
}

interface GitHubResult {
  login: string;
  url: string;
  avatar: string;
  type: string;
}

interface OrcidResult {
  orcid: string;
  url: string;
}

interface NominatimResult {
  display_name: string;
  type: string;
  lat: string;
  lon: string;
}

interface NameSearchResult {
  query: string;
  sources: {
    wikipedia: { count: number; results: WikipediaResult[] };
    wikidata: { count: number; results: WikidataResult[] };
    github: { count: number; results: GitHubResult[] };
    orcid: { total_found: number; results: OrcidResult[] };
    nominatim: { count: number; results: NominatimResult[] };
  };
  timestamp: string;
}

export default function NamePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NameSearchResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/name?name=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as NameSearchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const totalFound = result
    ? result.sources.wikipedia.count +
      result.sources.wikidata.count +
      result.sources.github.count +
      (result.sources.orcid.results?.length || 0) +
      result.sources.nominatim.count
    : 0;

  return (
    <ToolLayout
      title="Name Search"
      description="Cari informasi seseorang berdasarkan nama: Wikipedia, Wikidata, GitHub, ORCID, dan lainnya"
      icon="🧑"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Masukkan nama (contoh: Linus Torvalds)"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {loading && (
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Mencari di Wikipedia, Wikidata, GitHub, ORCID, OpenStreetMap...
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          {/* Summary bar */}
          <div className="mt-6 p-3 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center gap-3">
            <span className="text-zinc-500 text-sm">Hasil untuk</span>
            <span className="text-green-400 font-mono font-semibold">&quot;{result.query}&quot;</span>
            <span className="ml-auto text-xs text-zinc-500 font-mono">{totalFound} entri ditemukan</span>
          </div>

          {/* Wikipedia */}
          {result.sources.wikipedia.count > 0 && (
            <Section title="Wikipedia" icon="📖" count={result.sources.wikipedia.count}>
              <div className="space-y-3">
                {result.sources.wikipedia.results.map((r) => (
                  <a
                    key={r.pageid}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-green-800 transition-colors"
                  >
                    <div className="text-green-400 font-semibold text-sm mb-1">{r.title}</div>
                    <div className="text-zinc-400 text-xs leading-relaxed line-clamp-2">{r.snippet}</div>
                    <div className="text-zinc-600 text-xs mt-2 font-mono truncate">{r.url}</div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Wikidata */}
          {result.sources.wikidata.count > 0 && (
            <Section title="Wikidata" icon="🗃️" count={result.sources.wikidata.count}>
              <div className="space-y-2">
                {result.sources.wikidata.results.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-cyan-800 transition-colors"
                  >
                    <span className="text-xs font-mono text-cyan-600 bg-zinc-800 px-2 py-0.5 rounded shrink-0">{r.id}</span>
                    <div className="min-w-0">
                      <div className="text-cyan-400 font-semibold text-sm">{r.label}</div>
                      {r.description && (
                        <div className="text-zinc-500 text-xs truncate">{r.description}</div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* GitHub */}
          {result.sources.github.count > 0 && (
            <Section title="GitHub Users" icon="💻" count={result.sources.github.count}>
              <div className="grid grid-cols-1 gap-2">
                {result.sources.github.results.map((u) => (
                  <a
                    key={u.login}
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-green-800 transition-colors"
                  >
                    <img
                      src={u.avatar}
                      alt={u.login}
                      width={36}
                      height={36}
                      className="rounded-full border border-zinc-700"
                    />
                    <div>
                      <div className="text-green-400 font-mono font-semibold text-sm">@{u.login}</div>
                      <div className="text-zinc-600 text-xs">{u.type}</div>
                    </div>
                    <span className="ml-auto text-xs text-zinc-600 font-mono">{u.url}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* ORCID */}
          {result.sources.orcid.total_found > 0 && (
            <Section title="ORCID (Peneliti / Akademik)" icon="🎓" count={result.sources.orcid.total_found}>
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                Total ditemukan di database: <span className="text-yellow-400">{result.sources.orcid.total_found}</span> peneliti
              </div>
              <div className="space-y-2">
                {result.sources.orcid.results.map((r) => (
                  <a
                    key={r.orcid}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-yellow-800 transition-colors"
                  >
                    <span className="text-yellow-400 font-mono text-sm">{r.orcid}</span>
                    <span className="text-zinc-600 text-xs ml-auto">{r.url}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Nominatim / Places */}
          {result.sources.nominatim.count > 0 && (
            <Section title="Lokasi / Tempat Terkait" icon="📍" count={result.sources.nominatim.count}>
              <div className="space-y-2">
                {result.sources.nominatim.results.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <div className="text-zinc-300 text-sm">{p.display_name}</div>
                    <div className="flex gap-4 mt-1 text-xs font-mono text-zinc-600">
                      <span>type: {p.type}</span>
                      <span>{p.lat}, {p.lon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {totalFound === 0 && (
            <div className="mt-6 p-6 text-center text-zinc-600 font-mono text-sm bg-zinc-900 rounded-lg border border-zinc-800">
              Tidak ditemukan hasil untuk &quot;{result.query}&quot;
            </div>
          )}

          <JsonViewer data={result} filename={`name-${result.query.replace(/\s+/g, "_")}`} />
        </>
      )}
    </ToolLayout>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <span className="text-zinc-300 font-semibold text-sm">{title}</span>
        <span className="text-xs font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{count}</span>
      </div>
      {children}
    </div>
  );
}
