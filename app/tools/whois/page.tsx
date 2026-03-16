"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

export default function WhoisPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/whois?domain=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout title="WHOIS / RDAP" description="Query domain registration info via RDAP protocol: registrar, dates, nameservers" icon="📋">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter domain (e.g. google.com)"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "..." : "Lookup"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3">
            {[
              { label: "Domain", value: String(result.domain || "") },
              { label: "Registrar", value: String(result.registrar || "N/A") },
              { label: "Registrant", value: String(result.registrant || "N/A") },
              { label: "Registered", value: String(result.registered || "N/A") },
              { label: "Updated", value: String(result.updated || "N/A") },
              { label: "Expires", value: String(result.expires || "N/A") },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 flex gap-4">
                <div className="text-zinc-500 text-xs w-28 shrink-0 pt-0.5">{label}</div>
                <div className="text-green-400 font-mono text-sm">{value}</div>
              </div>
            ))}
            <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
              <div className="text-zinc-500 text-xs mb-2">Status</div>
              <div className="flex flex-wrap gap-2">
                {(result.status as string[])?.map((s: string) => (
                  <span key={s} className="px-2 py-1 bg-zinc-800 rounded text-cyan-400 font-mono text-xs">{s}</span>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
              <div className="text-zinc-500 text-xs mb-2">Nameservers</div>
              <div className="flex flex-col gap-1">
                {(result.nameservers as string[])?.map((ns: string) => (
                  <span key={ns} className="text-cyan-400 font-mono text-sm">{ns}</span>
                ))}
              </div>
            </div>
          </div>
          <JsonViewer data={result} filename={`whois-${result.domain}`} />
        </>
      )}
    </ToolLayout>
  );
}
