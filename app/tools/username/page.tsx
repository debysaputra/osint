"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

interface PlatformResult {
  platform: string;
  category: string;
  url: string;
  found: boolean;
  status: number | null;
  error?: string;
}

interface SearchLink {
  name: string;
  category: string;
  searchUrl: string;
  reason: string;
}

interface UsernameResult {
  username: string;
  auto_checked: number;
  found_count: number;
  found: PlatformResult[];
  not_found: PlatformResult[];
  search_links: SearchLink[];
  timestamp: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Social":           "📱",
  "Professional":     "💼",
  "Developer":        "💻",
  "Content":          "📺",
  "Music":            "🎵",
  "Gaming":           "🎮",
  "E-Commerce ID":    "🛒",
  "E-Commerce":       "🛍️",
  "Tech":             "🔧",
  "Review":           "⭐",
  "Messaging":        "💬",
};

export default function UsernamePage() {
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<UsernameResult | null>(null);
  const [error, setError]     = useState("");
  const [activeTab, setActiveTab] = useState<"found" | "notfound" | "search">("found");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setActiveTab("found");
    try {
      const res = await fetch(`/api/username?username=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as UsernameResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Group found results by category
  const foundByCategory = result?.found.reduce<Record<string, PlatformResult[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  // Group search links by category
  const searchByCategory = result?.search_links.reduce<Record<string, SearchLink[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <ToolLayout
      title="Username Search"
      description="Cari username di 40+ platform: sosmed, developer, gaming, e-commerce, dan lainnya"
      icon="👤"
    >
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Masukkan username (contoh: johndoe)"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Scanning..." : "Search"}
        </button>
      </div>

      {loading && (
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Memeriksa 40+ platform... harap tunggu beberapa detik
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-2xl font-bold text-green-400 font-mono">{result.found_count}</div>
              <div className="text-xs text-zinc-500 mt-1">Ditemukan</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-2xl font-bold text-zinc-500 font-mono">
                {result.auto_checked - result.found_count}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Tidak ada</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-2xl font-bold text-cyan-400 font-mono">{result.search_links.length}</div>
              <div className="text-xs text-zinc-500 mt-1">Link Manual</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mt-4">
            {(["found", "notfound", "search"] as const).map((tab) => {
              const labels: Record<string, string> = {
                found:    `✓ Ditemukan (${result.found_count})`,
                notfound: `✗ Tidak Ada (${result.auto_checked - result.found_count})`,
                search:   `🔗 Cari Manual (${result.search_links.length})`,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs rounded-md font-mono transition-colors cursor-pointer ${
                    activeTab === tab
                      ? "bg-green-600 text-black font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* FOUND tab */}
          {activeTab === "found" && (
            <div className="mt-4">
              {result.found_count === 0 ? (
                <div className="p-6 text-center text-zinc-600 font-mono text-sm bg-zinc-900 rounded-lg border border-zinc-800">
                  Username &quot;{result.username}&quot; tidak ditemukan di platform manapun
                </div>
              ) : (
                foundByCategory &&
                Object.entries(foundByCategory).map(([cat, items]) => (
                  <div key={cat} className="mb-4">
                    <div className="text-xs text-zinc-500 font-mono mb-2 flex items-center gap-2">
                      <span>{CATEGORY_ICONS[cat] || "🌐"}</span>
                      <span>{cat}</span>
                      <span className="text-zinc-700">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((p) => (
                        <a
                          key={p.platform}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-green-900 hover:border-green-500 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span className="text-green-400 font-semibold text-sm">{p.platform}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {p.status && (
                              <span className="text-xs font-mono text-zinc-600">HTTP {p.status}</span>
                            )}
                            <span className="text-zinc-500 font-mono text-xs truncate max-w-52 hidden sm:block">
                              {p.url}
                            </span>
                            <span className="text-zinc-600 text-xs">→</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* NOT FOUND tab */}
          {activeTab === "notfound" && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {result.not_found.map((p) => (
                  <div
                    key={p.platform}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800"
                  >
                    <span className="text-zinc-700 text-xs">✗</span>
                    <span className="text-zinc-500 text-xs font-mono">{p.platform}</span>
                    {p.error && <span className="text-zinc-700 text-xs italic">(timeout)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANUAL SEARCH tab */}
          {activeTab === "search" && (
            <div className="mt-4">
              <p className="text-xs text-zinc-600 font-mono mb-4">
                Platform berikut tidak bisa dicek otomatis (butuh login, tidak ada profil publik, dll). Klik untuk buka langsung.
              </p>
              {searchByCategory &&
                Object.entries(searchByCategory).map(([cat, items]) => (
                  <div key={cat} className="mb-4">
                    <div className="text-xs text-zinc-500 font-mono mb-2 flex items-center gap-2">
                      <span>{CATEGORY_ICONS[cat] || "🌐"}</span>
                      <span>{cat}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((s) => (
                        <a
                          key={s.name}
                          href={s.searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0" />
                            <span className="text-cyan-400 font-semibold text-sm">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-700 text-xs italic hidden sm:block">{s.reason}</span>
                            <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                              Buka →
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          <JsonViewer data={result} filename={`username-${result.username}`} />
        </>
      )}
    </ToolLayout>
  );
}
