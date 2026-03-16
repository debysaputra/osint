"use client";
import { useState, useCallback } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

// --- Types ---
interface PlatformResult {
  platform: string;
  category: string;
  registered: boolean | null;
  url?: string;
  detail?: string;
  error?: string;
}

interface SearchLink {
  platform: string;
  category: string;
  forgotUrl: string;
  note: string;
}

interface LiveResult {
  email: string;
  gravatar_hash: string;
  gravatar_avatar: string;
  total_checked: number;
  registered_count: number;
  results: PlatformResult[];
  search_links: SearchLink[];
  timestamp: string;
}

// Epieos export format
interface EpieosSpecItem {
  registered?: { value: boolean };
  breach?: { value: boolean };
  name?: { value: string };
  picture_url?: { value: string };
  website?: { value: string };
  bio?: { value: string };
  creation_date?: { value: string };
}

interface EpieosModule {
  module: string;
  schemaModule: string;
  status: string;
  query: string;
  spec_format: EpieosSpecItem[];
  category?: { name: string };
}

interface ParsedEpieos {
  email: string;
  registered: EpieosSpecItem[];
  breached: EpieosSpecItem[];
  other: EpieosSpecItem[];
  total: number;
  registered_count: number;
  breach_count: number;
}

function parseEpieosExport(data: EpieosModule[]): ParsedEpieos {
  const email = data[0]?.query || "unknown";
  const registered: EpieosSpecItem[] = [];
  const breached: EpieosSpecItem[] = [];
  const other: EpieosSpecItem[] = [];

  data.forEach((item) => {
    const spec = item.spec_format?.[0];
    if (!spec) return;
    if (spec.breach?.value === true) {
      breached.push(spec);
    } else if (spec.registered?.value === true) {
      registered.push(spec);
    } else {
      other.push(spec);
    }
  });

  return {
    email,
    registered,
    breached,
    other,
    total: data.length,
    registered_count: registered.length,
    breach_count: breached.length,
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  "Profile": "🧩", "Browser": "🌐", "Education": "🎓", "Developer": "💻",
  "Crypto": "🔑", "Blog": "📝", "Email": "📧", "Tech": "🔧",
  "Music": "🎵", "Social": "📱", "Professional": "💼", "Content": "📺",
  "Gaming": "🎮", "E-Commerce ID": "🛒", "E-Commerce": "🛍️",
  "Streaming": "🎬", "Payment": "💳", "Design": "🎨",
  "Local ID": "🇮🇩", "Messaging": "💬",
};

// --- Live Check Tab ---
function LiveCheckTab() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [error, setError] = useState("");
  const [subTab, setSubTab] = useState<"auto" | "manual">("auto");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSubTab("auto");
    try {
      const res = await fetch(`/api/emailreg?email=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (r: PlatformResult) => {
    if (r.registered === true) return "border-green-800 bg-green-950/30";
    if (r.registered === false) return "border-zinc-800 bg-transparent";
    return "border-yellow-900 bg-yellow-950/10";
  };

  // Group by category
  const byCategory = result?.results.reduce<Record<string, PlatformResult[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  const searchByCategory = result?.search_links.reduce<Record<string, SearchLink[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Masukkan email (contoh: user@gmail.com)"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
      </div>

      {loading && (
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Mengecek 21 platform secara otomatis... harap tunggu
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          {/* Profile header */}
          <div className="mt-6 flex items-center gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <img
              src={`https://www.gravatar.com/avatar/${result.gravatar_hash}?d=identicon&s=64`}
              alt="Gravatar" width={64} height={64}
              className="rounded-full border-2 border-zinc-700"
            />
            <div className="flex-1 min-w-0">
              <div className="text-zinc-100 font-semibold font-mono truncate">{result.email}</div>
              <div className="text-zinc-600 text-xs mt-1 font-mono truncate">MD5: {result.gravatar_hash}</div>
              <div className="flex gap-3 mt-2">
                <span className="text-xs text-green-400 font-mono font-bold">{result.registered_count} terdaftar</span>
                <span className="text-xs text-zinc-600 font-mono">{result.total_checked - result.registered_count} tidak ada</span>
                <span className="text-xs text-cyan-500 font-mono">{result.search_links.length} link manual</span>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mt-3">
            <button onClick={() => setSubTab("auto")}
              className={`flex-1 py-2 text-xs rounded-md font-mono transition-colors cursor-pointer ${subTab === "auto" ? "bg-green-600 text-black font-semibold" : "text-zinc-400 hover:text-zinc-200"}`}>
              🤖 Auto-check ({result.total_checked})
            </button>
            <button onClick={() => setSubTab("manual")}
              className={`flex-1 py-2 text-xs rounded-md font-mono transition-colors cursor-pointer ${subTab === "manual" ? "bg-cyan-600 text-black font-semibold" : "text-zinc-400 hover:text-zinc-200"}`}>
              🔗 Cek Manual ({result.search_links.length})
            </button>
          </div>

          {/* Auto-check results grouped by category */}
          {subTab === "auto" && byCategory && (
            <div className="mt-3 space-y-4">
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-xs text-zinc-500 font-mono mb-2 flex items-center gap-2">
                    <span>{CATEGORY_ICONS[cat] || "🌐"}</span><span>{cat}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((r) => (
                      <div key={r.platform}
                        className={`flex items-center justify-between p-3 rounded-lg border ${statusColor(r)}`}>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold text-sm w-4 text-center ${r.registered === true ? "text-green-400" : r.registered === false ? "text-zinc-700" : "text-yellow-600"}`}>
                            {r.registered === true ? "✓" : r.registered === false ? "✗" : "?"}
                          </span>
                          <div>
                            <div className={`text-sm font-semibold ${r.registered === true ? "text-zinc-100" : "text-zinc-500"}`}>
                              {r.platform}
                            </div>
                            {r.detail && <div className="text-xs text-cyan-400 font-mono">{r.detail}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.error && <span className="text-xs text-zinc-700 italic">{r.error}</span>}
                          {r.url && r.registered === true && (
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2 py-1 rounded bg-zinc-800 text-green-400 hover:bg-zinc-700 transition-colors">
                              Buka →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual search links grouped by category */}
          {subTab === "manual" && searchByCategory && (
            <div className="mt-3">
              <p className="text-xs text-zinc-600 font-mono mb-3">
                Platform yang tidak bisa dicek otomatis. Klik → masuk ke halaman lupa sandi atau pencarian untuk verifikasi manual.
              </p>
              <div className="space-y-4">
                {Object.entries(searchByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="text-xs text-zinc-500 font-mono mb-2 flex items-center gap-2">
                      <span>{CATEGORY_ICONS[cat] || "🌐"}</span><span>{cat}</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((s) => (
                        <a key={s.platform} href={s.forgotUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-cyan-700 bg-zinc-900/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0" />
                            <span className="text-cyan-400 font-semibold text-sm">{s.platform}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600 italic hidden sm:block">{s.note}</span>
                            <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">Buka →</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <JsonViewer data={result} filename={`emailreg-${result.email}`} />
        </>
      )}
    </div>
  );
}

// --- Import Epieos Tab ---
function ImportEpieosTab() {
  const [parsed, setParsed] = useState<ParsedEpieos | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".json")) {
      setError("File harus berformat .json");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error("Format tidak dikenali — harus array");
        if (!data[0]?.spec_format) throw new Error("Format bukan Epieos export");
        setParsed(parseEpieosExport(data as EpieosModule[]));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal parse JSON");
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const PlatformBadge = ({ spec, type }: { spec: EpieosSpecItem; type: "registered" | "breach" }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${type === "breach" ? "border-red-900 bg-red-950/30" : "border-green-900 bg-green-950/20"}`}>
      {spec.picture_url?.value && (
        <img
          src={spec.picture_url.value}
          alt={spec.name?.value}
          width={28}
          height={28}
          className="rounded object-contain bg-zinc-800 p-0.5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${type === "breach" ? "text-red-300" : "text-green-300"}`}>
          {spec.name?.value}
        </div>
        {spec.website?.value && (
          <div className="text-xs text-zinc-600 font-mono truncate">{spec.website.value}</div>
        )}
        {spec.creation_date?.value && (
          <div className="text-xs text-zinc-600">
            {new Date(spec.creation_date.value).toLocaleDateString("id-ID")}
          </div>
        )}
      </div>
      <span className={`text-xs font-mono px-2 py-0.5 rounded ${type === "breach" ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>
        {type === "breach" ? "Breach" : "Registered"}
      </span>
    </div>
  );

  return (
    <div>
      <p className="text-zinc-500 text-xs mb-4">
        Import file export dari <span className="text-cyan-400">Epieos</span> (format JSON) untuk menampilkan data registrasi dan breach secara terstruktur.
      </p>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-36 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${dragging ? "border-green-500 bg-green-950/20" : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"}`}
      >
        <div className="text-2xl mb-2">📁</div>
        <div className="text-zinc-400 text-sm">Drag & drop file JSON di sini</div>
        <div className="text-zinc-600 text-xs mt-1">atau klik untuk pilih file</div>
        <input type="file" accept=".json" className="hidden" onChange={handleInputChange} />
      </label>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {parsed && (
        <>
          {/* Summary */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-2xl font-bold text-green-400 font-mono">{parsed.registered_count}</div>
              <div className="text-xs text-zinc-500 mt-1">Terdaftar</div>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-2xl font-bold text-red-400 font-mono">{parsed.breach_count}</div>
              <div className="text-xs text-zinc-500 mt-1">Data Breach</div>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-2xl font-bold text-zinc-300 font-mono">{parsed.total}</div>
              <div className="text-xs text-zinc-500 mt-1">Total Dicek</div>
            </div>
          </div>

          <div className="mt-2 p-2 bg-zinc-900 rounded border border-zinc-800 text-center">
            <span className="text-xs text-zinc-500">Email: </span>
            <span className="text-xs text-cyan-400 font-mono">{parsed.email}</span>
          </div>

          {/* Registered */}
          {parsed.registered.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-zinc-500 font-mono mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                TERDAFTAR ({parsed.registered.length})
              </div>
              <div className="space-y-2">
                {parsed.registered.map((s, i) => (
                  <PlatformBadge key={i} spec={s} type="registered" />
                ))}
              </div>
            </div>
          )}

          {/* Breached */}
          {parsed.breached.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-zinc-500 font-mono mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                DATA BREACH ({parsed.breached.length})
              </div>
              <div className="space-y-2">
                {parsed.breached.map((s, i) => (
                  <PlatformBadge key={i} spec={s} type="breach" />
                ))}
              </div>
            </div>
          )}

          <JsonViewer data={parsed} filename={`epieos-${parsed.email}`} />
        </>
      )}
    </div>
  );
}

// --- Main Page ---
export default function EmailRegPage() {
  const [tab, setTab] = useState<"live" | "import">("live");

  return (
    <ToolLayout
      title="Email Registration"
      description="Cari di platform mana email terdaftar — live check atau import dari Epieos export"
      icon="🔐"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mb-6">
        <button
          onClick={() => setTab("live")}
          className={`flex-1 py-2 text-sm rounded-md font-mono transition-colors cursor-pointer ${tab === "live" ? "bg-green-600 text-black font-semibold" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          🔴 Live Check
        </button>
        <button
          onClick={() => setTab("import")}
          className={`flex-1 py-2 text-sm rounded-md font-mono transition-colors cursor-pointer ${tab === "import" ? "bg-green-600 text-black font-semibold" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          📂 Import Epieos JSON
        </button>
      </div>

      {tab === "live" ? <LiveCheckTab /> : <ImportEpieosTab />}
    </ToolLayout>
  );
}
