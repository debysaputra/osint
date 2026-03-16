"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

const DNS_TYPES = ["ALL", "A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"];

interface DnsRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export default function DnsPage() {
  const [input, setInput] = useState("");
  const [dnsType, setDnsType] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/dns?domain=${encodeURIComponent(input.trim())}&type=${dnsType}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const recordEntries: [string, DnsRecord[]][] = result?.records
    ? dnsType === "ALL"
      ? Object.entries(result.records as Record<string, DnsRecord[]>).filter(([, v]) => Array.isArray(v) && v.length > 0) as [string, DnsRecord[]][]
      : [[dnsType, result.records as DnsRecord[]]]
    : [];

  return (
    <ToolLayout title="DNS Lookup" description="Query DNS records: A, AAAA, MX, TXT, NS, CNAME, SOA" icon="🔍">
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter domain (e.g. github.com)"
          className="flex-1 min-w-48 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <select
          value={dnsType}
          onChange={(e) => setDnsType(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-zinc-300 focus:outline-none focus:border-green-500 font-mono text-sm cursor-pointer"
        >
          {DNS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "..." : "Query"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 space-y-4">
            {recordEntries.map(([type, records]) => (
              <div key={type} className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700 flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold">{type}</span>
                  <span className="text-xs text-zinc-500">{(records as DnsRecord[]).length} record(s)</span>
                </div>
                <div className="divide-y divide-zinc-800">
                  {(records as DnsRecord[]).map((rec, i) => (
                    <div key={i} className="px-4 py-2 flex gap-4 text-sm font-mono">
                      <span className="text-zinc-500 text-xs w-16 shrink-0">TTL {rec.TTL}</span>
                      <span className="text-green-400 break-all">{rec.data}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <JsonViewer data={result} filename={`dns-${result.domain}`} />
        </>
      )}
    </ToolLayout>
  );
}
