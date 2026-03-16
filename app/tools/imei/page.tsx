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

const EXAMPLES = [
  { label: "iPhone 15", imei1: "013447002345678", imei2: "013447102345671" },
  { label: "Samsung S23", imei1: "358940102345671", imei2: "358940202345678" },
  { label: "IMEI tidak valid", imei1: "123456789012345", imei2: "" },
];

function Badge({ valid }: { valid: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
      valid
        ? "bg-green-950 text-green-400 border border-green-700"
        : "bg-red-950 text-red-400 border border-red-700"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-green-400" : "bg-red-400"}`} />
      {valid ? "VALID" : "TIDAK VALID"}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-500 text-xs shrink-0">{label}</span>
      <span className="text-right text-sm font-mono text-zinc-200">{value}</span>
    </div>
  );
}

function ImeiBreakdown({ r, slot }: { r: ImeiResult; slot: "SIM 1" | "SIM 2" }) {
  const imei = r.imei.slice(0, 15);
  const parts = [
    { chars: imei.slice(0, 2), label: "RBI", color: "bg-blue-900 text-blue-300 border-blue-700" },
    { chars: imei.slice(2, 8), label: "TAC", color: "bg-purple-900 text-purple-300 border-purple-700" },
    { chars: imei.slice(8, 14), label: "SNR", color: "bg-yellow-900 text-yellow-300 border-yellow-700" },
    { chars: imei.slice(14, 15) || "?", label: "CD", color: r.valid ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700" },
  ];

  return (
    <div className={`p-5 rounded-xl border ${r.valid ? "bg-green-950/20 border-green-900" : "bg-red-950/20 border-red-900"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{slot}</span>
          <span className="text-xs font-mono text-zinc-500 tracking-widest">{r.imei}</span>
        </div>
        <Badge valid={r.valid} />
      </div>

      <p className={`text-xs font-mono mb-3 ${r.valid ? "text-green-400" : "text-red-400"}`}>
        {r.luhn_note}
      </p>

      {/* Visual breakdown */}
      <div className="flex flex-wrap gap-1 font-mono mb-3">
        {parts.map(p => (
          <div key={p.label} className="text-center">
            <div className={`px-2 py-1.5 rounded border text-sm tracking-widest ${p.color}`}>{p.chars}</div>
            <div className="text-xs text-zinc-600 mt-1">{p.label}</div>
          </div>
        ))}
      </div>

      {/* Device */}
      {r.device ? (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800">
          {r.device.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.device.image} alt={r.device.model || "device"}
              className="w-10 h-10 object-contain rounded bg-zinc-800 border border-zinc-700 p-0.5 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl shrink-0">📱</div>
          )}
          <div>
            <div className="text-sm font-bold font-mono text-zinc-100">{r.device.brand ?? "—"}</div>
            <div className="text-xs text-green-400 font-mono">{r.device.model ?? "Model tidak diketahui"}</div>
            {r.device.os && <div className="text-xs text-zinc-600">{r.device.os}</div>}
            <div className="text-xs text-zinc-700 font-mono">sumber: {r.device.source}</div>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-600 font-mono">
          {r.device_note ?? "Device tidak teridentifikasi"}
        </div>
      )}

      {/* Structure detail */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <Row label="TAC" value={r.structure.tac} />
        <Row label="RBI" value={`${r.structure.rbi.code} — ${r.structure.rbi.issuer}`} />
        <Row label="SNR" value={r.structure.snr} />
        <Row label="Check Digit" value={
          <span className={r.valid ? "text-green-400" : "text-red-400"}>
            {r.structure.check_digit ?? "—"}
          </span>
        } />
        {r.structure.svn && <Row label="SVN" value={r.structure.svn} />}
      </div>
    </div>
  );
}

async function checkImei(raw: string): Promise<ImeiResult> {
  const imei = raw.replace(/[\s\-\.]/g, "");
  const res = await fetch(`/api/imei?imei=${encodeURIComponent(imei)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as ImeiResult;
}

export default function ImeiPage() {
  const [imei1, setImei1] = useState("");
  const [imei2, setImei2] = useState("");
  const [dualSim, setDualSim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result1, setResult1] = useState<ImeiResult | null>(null);
  const [result2, setResult2] = useState<ImeiResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!imei1.trim()) return;
    setLoading(true);
    setError("");
    setResult1(null);
    setResult2(null);

    try {
      if (dualSim && imei2.trim()) {
        // Cek kedua IMEI paralel
        const [r1, r2] = await Promise.all([
          checkImei(imei1.trim()),
          checkImei(imei2.trim()),
        ]);
        setResult1(r1);
        setResult2(r2);
      } else {
        const r1 = await checkImei(imei1.trim());
        setResult1(r1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengecek IMEI");
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setImei1(ex.imei1);
    if (ex.imei2) {
      setDualSim(true);
      setImei2(ex.imei2);
    } else {
      setImei2("");
    }
  };

  const combinedJson = result2
    ? { sim1: result1, sim2: result2 }
    : result1;

  return (
    <ToolLayout
      title="IMEI Checker"
      description="Validasi IMEI, decode TAC/RBI/SNR, identifikasi brand & model — support Dual SIM"
      icon="📱"
    >
      {/* Dual SIM toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-zinc-500 font-mono">
          Cara cek IMEI: ketik{" "}
          <span className="text-green-600 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">*#06#</span>
          {" "}di dialpad
        </span>
        <button
          onClick={() => { setDualSim(v => !v); setResult2(null); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
            dualSim
              ? "bg-green-950 border-green-700 text-green-400"
              : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
          }`}
        >
          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${dualSim ? "bg-green-500 border-green-400" : "border-zinc-600"}`}>
            {dualSim && <span className="text-black text-xs leading-none">✓</span>}
          </span>
          Dual SIM
        </button>
      </div>

      {/* Input area */}
      <div className={`grid gap-3 ${dualSim ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {/* IMEI 1 */}
        <div className="space-y-1">
          {dualSim && (
            <label className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-blue-900 border border-blue-700 inline-flex items-center justify-center text-blue-300 font-bold text-xs">1</span>
              IMEI SIM 1
            </label>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={imei1}
              onChange={e => setImei1(e.target.value.replace(/[^\d\s\-\.]/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleCheck()}
              placeholder={dualSim ? "IMEI SIM 1 (15 digit)" : "Masukkan 15 digit IMEI"}
              maxLength={19}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm tracking-widest"
            />
            {!dualSim && (
              <button
                onClick={handleCheck}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
              >
                {loading ? "..." : "Check"}
              </button>
            )}
          </div>
        </div>

        {/* IMEI 2 */}
        {dualSim && (
          <div className="space-y-1">
            <label className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-orange-900 border border-orange-700 inline-flex items-center justify-center text-orange-300 font-bold text-xs">2</span>
              IMEI SIM 2
            </label>
            <input
              type="text"
              value={imei2}
              onChange={e => setImei2(e.target.value.replace(/[^\d\s\-\.]/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleCheck()}
              placeholder="IMEI SIM 2 (15 digit)"
              maxLength={19}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 font-mono text-sm tracking-widest"
            />
          </div>
        )}
      </div>

      {/* Check button for dual sim */}
      {dualSim && (
        <button
          onClick={handleCheck}
          disabled={loading}
          className="mt-3 w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Mengecek kedua IMEI..." : "Check Dual IMEI"}
        </button>
      )}

      {/* Examples */}
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => loadExample(ex)}
            className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Contoh: {ex.label}{ex.imei2 ? " (Dual SIM)" : ""}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-5 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Memvalidasi {dualSim && imei2 ? "2 IMEI" : "IMEI"} dan mencari informasi perangkat...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-5 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Results */}
      {result1 && (
        <div className="mt-6 space-y-4">
          {/* Dual SIM comparison header */}
          {result2 && (
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span className="w-3 h-3 rounded-sm bg-blue-800" /> SIM 1
              <span className="flex-1 h-px bg-zinc-800" />
              <span className="w-3 h-3 rounded-sm bg-orange-800" /> SIM 2
            </div>
          )}

          {/* Grid: side by side on desktop jika dual */}
          <div className={`grid gap-4 ${result2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            <ImeiBreakdown r={result1} slot="SIM 1" />
            {result2 && <ImeiBreakdown r={result2} slot="SIM 2" />}
          </div>

          {/* Compare summary jika dual */}
          {result2 && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="text-xs text-zinc-600 font-mono mb-3">Perbandingan</div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                <div className="text-zinc-500">SIM 1</div>
                <div className="text-zinc-700">—</div>
                <div className="text-zinc-500">SIM 2</div>

                <div className={result1.valid ? "text-green-400" : "text-red-400"}>
                  {result1.valid ? "✓ Valid" : "✗ Invalid"}
                </div>
                <div className="text-zinc-700 text-xs">Luhn</div>
                <div className={result2.valid ? "text-green-400" : "text-red-400"}>
                  {result2.valid ? "✓ Valid" : "✗ Invalid"}
                </div>

                <div className="text-zinc-300">{result1.device?.brand ?? "—"}</div>
                <div className="text-zinc-700 text-xs">Brand</div>
                <div className="text-zinc-300">{result2.device?.brand ?? "—"}</div>

                <div className="text-purple-400">{result1.structure.tac}</div>
                <div className="text-zinc-700 text-xs">TAC</div>
                <div className="text-purple-400">{result2.structure.tac}</div>

                <div className="text-blue-400 text-xs">{result1.structure.rbi.issuer}</div>
                <div className="text-zinc-700 text-xs">RBI</div>
                <div className="text-blue-400 text-xs">{result2.structure.rbi.issuer}</div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-xs text-zinc-600 font-mono leading-relaxed">
              ℹ Validasi Luhn memastikan format IMEI sah secara matematis. Untuk cek status
              blacklist/stolen, diperlukan akses database GSMA IMEI (berbayar) atau laporan operator.
            </p>
          </div>

          <JsonViewer
            data={combinedJson}
            filename={result2 ? `imei-dual-${result1.imei}-${result2.imei}` : `imei-${result1.imei}`}
          />
        </div>
      )}
    </ToolLayout>
  );
}
