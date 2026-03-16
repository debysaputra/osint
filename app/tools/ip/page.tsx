"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

export default function IpPage() {
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
      const res = await fetch(`/api/ip?ip=${encodeURIComponent(input.trim())}`);
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
    <ToolLayout title="IP Geolocation" description="Lookup IP address details: location, ISP, coordinates, proxy detection" icon="🌐">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter IP address (e.g. 8.8.8.8)"
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
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: "IP Address", value: String(result.query || "") },
              { label: "Country", value: `${result.country} (${result.countryCode})` },
              { label: "City", value: `${result.city}, ${result.regionName}` },
              { label: "ISP", value: String(result.isp || "") },
              { label: "Organization", value: String(result.org || "") },
              { label: "AS", value: String(result.as || "") },
              { label: "Timezone", value: String(result.timezone || "") },
              { label: "Coordinates", value: `${result.lat}, ${result.lon}` },
              { label: "Proxy/VPN", value: result.proxy ? "Yes ⚠️" : "No ✓" },
              { label: "Hosting", value: result.hosting ? "Yes" : "No" },
              { label: "Mobile", value: result.mobile ? "Yes" : "No" },
              { label: "ZIP Code", value: String(result.zip || "N/A") },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-1">{label}</div>
                <div className="text-green-400 font-mono text-sm truncate">{value}</div>
              </div>
            ))}
          </div>
          <JsonViewer data={result} filename={`ip-${result.query}`} />
        </>
      )}
    </ToolLayout>
  );
}
