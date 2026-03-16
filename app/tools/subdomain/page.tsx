"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

export default function SubdomainPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setFilter("");
    try {
      const res = await fetch(`/api/subdomain?domain=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const subdomains = result?.subdomains as string[] | undefined;
  const filtered = subdomains?.filter((s) =>
    filter ? s.includes(filter.toLowerCase()) : true
  );

  return (
    <ToolLayout title="Subdomain Finder" description="Discover subdomains via certificate transparency logs (crt.sh)" icon="🕸️">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter domain (e.g. example.com)"
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
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono">
          Querying certificate transparency logs... may take a moment for large domains
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 flex gap-4 text-sm mb-4">
            <div className="text-zinc-300">
              Total certs: <span className="text-cyan-400 font-mono font-bold">{String(result.total_certificates || 0)}</span>
            </div>
            <div className="text-zinc-300">
              Unique subdomains: <span className="text-green-400 font-mono font-bold">{String(result.unique_subdomains || 0)}</span>
            </div>
          </div>

          {subdomains && subdomains.length > 0 && (
            <>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter subdomains..."
                className="w-full mb-3 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
              />
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">subdomains</span>
                  <span className="text-xs text-zinc-600">{filtered?.length} shown</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/50">
                  {filtered?.map((sub) => (
                    <div key={sub} className="px-4 py-2 font-mono text-sm text-green-400 hover:bg-zinc-800/50 transition-colors flex items-center gap-2">
                      <span className="text-zinc-600 text-xs">›</span>
                      {sub}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <JsonViewer data={result} filename={`subdomains-${result.domain}`} />
        </>
      )}
    </ToolLayout>
  );
}
