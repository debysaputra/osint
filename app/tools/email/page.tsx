"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

export default function EmailPage() {
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
      const res = await fetch(`/api/email?email=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const validation = result?.validation as Record<string, unknown> | null;

  return (
    <ToolLayout title="Email Validator" description="Validate email address format, check MX records, and inspect deliverability" icon="✉️">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter email (e.g. user@example.com)"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "..." : "Validate"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Email", value: String(result.email || "") },
                { label: "Domain", value: String(result.domain || "") },
                { label: "Format Valid", value: result.format_valid ? "✓ Yes" : "✗ No", green: result.format_valid },
                { label: "Has MX Records", value: result.has_mx ? "✓ Yes" : "✗ No", green: result.has_mx },
              ].map(({ label, value, green }) => (
                <div key={label} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <div className="text-zinc-500 text-xs mb-1">{label}</div>
                  <div className={`font-mono text-sm ${green !== undefined ? (green ? "text-green-400" : "text-red-400") : "text-green-400"}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* MX Records */}
            {(result.mx_records as unknown[])?.length > 0 && (
              <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-2">MX Records ({(result.mx_records as unknown[]).length})</div>
                <div className="space-y-1">
                  {(result.mx_records as Record<string, unknown>[]).map((rec, i) => (
                    <div key={i} className="font-mono text-sm text-cyan-400">
                      {String(rec.data || "")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Validation */}
            {validation && Object.keys(validation).length > 0 && (
              <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-2">External Validation</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(validation).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-zinc-500">{k}: </span>
                      <span className="text-green-400 font-mono">{JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <JsonViewer data={result} filename={`email-${result.email}`} />
        </>
      )}
    </ToolLayout>
  );
}
