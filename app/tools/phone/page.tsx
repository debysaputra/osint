"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

export default function PhonePage() {
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
      const res = await fetch(`/api/phone?phone=${encodeURIComponent(input.trim())}`);
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
    <ToolLayout title="Phone Lookup" description="Parse and analyze phone numbers: country, calling code, regional info" icon="📱">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter phone number (e.g. +6281234567890)"
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

      <div className="mt-2 text-xs text-zinc-600 font-mono">
        Tip: Include country code with + prefix (e.g. +1 for US, +62 for Indonesia)
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          Error: {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: "Input", value: String(result.input || "") },
              { label: "Normalized", value: String(result.normalized || "") },
              { label: "Calling Code", value: String(result.calling_code || "") },
              { label: "National Number", value: String(result.national_number || "") },
              { label: "Country", value: String(result.country || "") },
              { label: "Country Code", value: String(result.country_code || "") },
              { label: "Region", value: String(result.region || "") },
              { label: "Digit Count", value: String(result.digit_count || "") },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-1">{label}</div>
                <div className="text-green-400 font-mono text-sm">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-3 rounded-lg border flex items-center gap-3 ${result.valid_length ? 'bg-green-950 border-green-800' : 'bg-red-950 border-red-800'}">
            <span className={`text-lg ${result.valid_length ? "text-green-400" : "text-red-400"}`}>
              {result.valid_length ? "✓" : "✗"}
            </span>
            <span className={`text-sm font-mono ${result.valid_length ? "text-green-300" : "text-red-300"}`}>
              {result.valid_length ? "Valid phone number length (7-15 digits)" : "Invalid length — not a standard phone number"}
            </span>
          </div>

          <JsonViewer data={result} filename={`phone-${String(result.national_number || "result")}`} />
        </>
      )}
    </ToolLayout>
  );
}
