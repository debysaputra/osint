"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

interface ImeiResult {
  imei: string;
  format: string;
  valid: boolean;
  luhn_note: string;
  structure: {
    tac: string;
    rbi: { code: string; issuer: string };
    snr: string;
    check_digit: string | null;
    svn?: string;
  };
  device: {
    source: string;
    brand: string | null;
    model: string | null;
    os: string | null;
    image: string | null;
  } | null;
  device_note?: string;
  timestamp: string;
}

/* Contoh IMEI untuk demo */
const EXAMPLES = [
  { label: "iPhone 15", imei: "013447002345678" },
  { label: "Samsung S23", imei: "358940102345671" },
  { label: "Format tidak valid", imei: "123456789012345" },
];

function Badge({ valid }: { valid: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold font-mono ${
      valid
        ? "bg-green-950 text-green-400 border border-green-700"
        : "bg-red-950 text-red-400 border border-red-700"
    }`}>
      <span className={`w-2 h-2 rounded-full ${valid ? "bg-green-400" : "bg-red-400"}`} />
      {valid ? "VALID" : "TIDAK VALID"}
    </span>
  );
}

function Row({ label, value, mono = true, className = "" }: {
  label: string; value: React.ReactNode; mono?: boolean; className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 border-b border-zinc-800 last:border-0 ${className}`}>
      <span className="text-zinc-500 text-xs shrink-0">{label}</span>
      <span className={`text-right text-sm ${mono ? "font-mono" : ""} text-zinc-200`}>{value}</span>
    </div>
  );
}

export default function ImeiPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImeiResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async (val?: string) => {
    const imei = (val ?? input).replace(/[\s\-\.]/g, "");
    if (!imei) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/imei?imei=${encodeURIComponent(imei)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as ImeiResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengecek IMEI");
    } finally {
      setLoading(false);
    }
  };

  /* visual IMEI breakdown */
  const renderBreakdown = (r: ImeiResult) => {
    const imei = r.imei.slice(0, 15);
    const parts = [
      { chars: imei.slice(0, 2), label: "RBI", color: "bg-blue-900 text-blue-300 border-blue-700" },
      { chars: imei.slice(2, 8), label: "TAC", color: "bg-purple-900 text-purple-300 border-purple-700" },
      { chars: imei.slice(8, 14), label: "SNR", color: "bg-yellow-900 text-yellow-300 border-yellow-700" },
      { chars: imei.slice(14, 15) || "?", label: "CD", color: r.valid ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700" },
    ];
    return (
      <div className="mt-4">
        <div className="text-xs text-zinc-600 font-mono mb-2">Breakdown struktur IMEI:</div>
        <div className="flex flex-wrap gap-1 font-mono">
          {parts.map(p => (
            <div key={p.label} className="text-center">
              <div className={`px-2 py-1.5 rounded border text-base tracking-widest ${p.color}`}>
                {p.chars}
              </div>
              <div className="text-xs text-zinc-600 mt-1">{p.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-zinc-500">
          <div><span className="text-blue-500">RBI</span> = Reporting Body</div>
          <div><span className="text-purple-500">TAC</span> = Type Allocation Code</div>
          <div><span className="text-yellow-500">SNR</span> = Serial Number</div>
          <div><span className={r.valid ? "text-green-500" : "text-red-500"}>CD</span> = Check Digit (Luhn)</div>
        </div>
      </div>
    );
  };

  return (
    <ToolLayout
      title="IMEI Checker"
      description="Validasi IMEI, decode struktur TAC/RBI/SNR, dan identifikasi brand/model perangkat"
      icon="📱"
    >
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.replace(/[^\d\s\-\.]/g, ""))}
          onKeyDown={e => e.key === "Enter" && handleCheck()}
          placeholder="Masukkan 15 digit IMEI (contoh: 352999101234561)"
          maxLength={19}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm tracking-widest"
        />
        <button
          onClick={() => handleCheck()}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </div>

      {/* Info */}
      <div className="mt-3 text-xs text-zinc-600 font-mono">
        Cara cek IMEI di HP: ketik{" "}
        <span className="text-green-600 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">*#06#</span>{" "}
        di dialpad
      </div>

      {/* Examples */}
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => { setInput(ex.imei); handleCheck(ex.imei); }}
            className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Contoh: {ex.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-5 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Memvalidasi IMEI dan mencari informasi perangkat...
        </div>
      )}

      {error && (
        <div className="mt-5 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Status card */}
          <div className={`p-5 rounded-xl border ${
            result.valid ? "bg-green-950/30 border-green-800" : "bg-red-950/30 border-red-800"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono text-zinc-400">
                IMEI: <span className="text-zinc-100 tracking-widest">{result.imei}</span>
              </span>
              <Badge valid={result.valid} />
            </div>
            <p className={`text-sm font-mono ${result.valid ? "text-green-400" : "text-red-400"}`}>
              {result.luhn_note}
            </p>
            <div className="mt-1 text-xs text-zinc-600 font-mono">{result.format}</div>
            {renderBreakdown(result)}
          </div>

          {/* Device info */}
          {result.device ? (
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="text-xs text-zinc-600 font-mono mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Informasi Perangkat
                <span className="text-zinc-700">— sumber: {result.device.source}</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                {result.device.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.device.image} alt={result.device.model || "device"}
                    className="w-16 h-16 object-contain rounded-lg bg-zinc-800 p-1 border border-zinc-700" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl">📱</div>
                )}
                <div>
                  <div className="text-xl font-bold font-mono text-zinc-100">
                    {result.device.brand ?? "—"}
                  </div>
                  <div className="text-green-400 font-mono text-sm">
                    {result.device.model ?? "Model tidak diketahui"}
                  </div>
                  {result.device.os && (
                    <div className="text-zinc-500 text-xs mt-1">{result.device.os}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="text-xs text-zinc-600 font-mono mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Informasi Perangkat
              </div>
              <p className="text-zinc-500 text-sm font-mono">{result.device_note}</p>
            </div>
          )}

          {/* Structure detail */}
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-xs text-zinc-600 font-mono mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Detail Struktur
            </div>
            <Row label="TAC (Type Allocation Code)" value={result.structure.tac} />
            <Row label="Reporting Body (RBI)" value={
              <span>{result.structure.rbi.code} — {result.structure.rbi.issuer}</span>
            } />
            <Row label="Serial Number (SNR)" value={result.structure.snr} />
            <Row label="Check Digit" value={
              <span className={result.valid ? "text-green-400" : "text-red-400"}>
                {result.structure.check_digit ?? "—"}{" "}
                <span className="text-zinc-600">({result.valid ? "valid" : "tidak valid"})</span>
              </span>
            } />
            {result.structure.svn && (
              <Row label="Software Version (SVN)" value={result.structure.svn} />
            )}
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-xs text-zinc-600 font-mono leading-relaxed">
              ℹ Validasi Luhn memastikan format IMEI sah secara matematis. Untuk pengecekan status
              blacklist/stolen, diperlukan akses ke database GSMA IMEI (berbayar) atau
              laporan operator.
            </p>
          </div>

          <JsonViewer data={result} filename={`imei-${result.imei}`} />
        </div>
      )}
    </ToolLayout>
  );
}
