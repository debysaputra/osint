import { NextRequest, NextResponse } from "next/server";

/* ─── Luhn algorithm ─── */
function luhnCheck(imei: string): boolean {
  let sum = 0;
  for (let i = 0; i < imei.length; i++) {
    let d = parseInt(imei[imei.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/* ─── Reporting Body Identifier (RBI) ─── */
const RBI_MAP: Record<string, string> = {
  "00": "USA (PTCRB)", "01": "USA (PTCRB)", "10": "USA (PTCRB)",
  "30": "USA (PTCRB)", "33": "USA (PTCRB)",
  "35": "UK (BABT)", "44": "UK (BABT)", "45": "UK (BABT)",
  "49": "Germany (BnetzA)", "50": "Germany (BnetzA)",
  "52": "Australia (ACMA)", "54": "New Zealand (RSM)",
  "86": "China (CATR)", "99": "China (CATR)",
  "91": "India (DoT)", "40": "Japan (MIC)",
  "47": "South Korea (RRA)", "64": "Singapore (IMDA)",
  "36": "France (ARCEP)", "38": "Spain (SETSI)",
  "55": "Brazil (ANATEL)",
};

/* ─── Known TAC brand prefixes (kumpulan dari TAC publik) ─── */
const TAC_BRANDS: { prefix: string; brand: string; note?: string }[] = [
  // Apple iPhone
  { prefix: "01344600", brand: "Apple", note: "iPhone 15 Pro Max" },
  { prefix: "01344700", brand: "Apple", note: "iPhone 15 Pro" },
  { prefix: "01344800", brand: "Apple", note: "iPhone 15 Plus" },
  { prefix: "01344900", brand: "Apple", note: "iPhone 15" },
  { prefix: "35299210", brand: "Apple", note: "iPhone 14 Pro Max" },
  { prefix: "35299310", brand: "Apple", note: "iPhone 14 Pro" },
  { prefix: "35299110", brand: "Apple", note: "iPhone 14 Plus" },
  { prefix: "35299010", brand: "Apple", note: "iPhone 14" },
  { prefix: "35354810", brand: "Apple", note: "iPhone 13 Pro Max" },
  { prefix: "35354710", brand: "Apple", note: "iPhone 13 Pro" },
  { prefix: "35354610", brand: "Apple", note: "iPhone 13" },
  // Samsung
  { prefix: "35894010", brand: "Samsung", note: "Galaxy S23 Ultra" },
  { prefix: "35894110", brand: "Samsung", note: "Galaxy S23+" },
  { prefix: "35894210", brand: "Samsung", note: "Galaxy S23" },
  { prefix: "35397510", brand: "Samsung", note: "Galaxy S22 Ultra" },
  { prefix: "35673110", brand: "Samsung", note: "Galaxy A54 5G" },
  { prefix: "35302610", brand: "Samsung", note: "Galaxy A34 5G" },
  // Xiaomi
  { prefix: "86469603", brand: "Xiaomi", note: "Redmi / Mi series" },
  { prefix: "86733001", brand: "Xiaomi", note: "Redmi Note series" },
  { prefix: "86816403", brand: "Xiaomi" },
  // OPPO
  { prefix: "86227803", brand: "OPPO" },
  { prefix: "86327803", brand: "OPPO" },
  // Vivo
  { prefix: "86548403", brand: "Vivo" },
  { prefix: "86623403", brand: "Vivo" },
  // Huawei
  { prefix: "86192503", brand: "Huawei" },
  { prefix: "86726803", brand: "Huawei" },
  // Google Pixel
  { prefix: "35809910", brand: "Google", note: "Pixel 7 Pro" },
  { prefix: "35809810", brand: "Google", note: "Pixel 7" },
  { prefix: "35279910", brand: "Google", note: "Pixel 6 Pro" },
  // OnePlus
  { prefix: "86476603", brand: "OnePlus" },
  { prefix: "86814203", brand: "OnePlus" },
];

function detectBrandFromTAC(tac: string): { brand: string; note?: string } | null {
  // Exact 8-digit match
  const exact = TAC_BRANDS.find(t => t.prefix === tac);
  if (exact) return { brand: exact.brand, note: exact.note };
  // Prefix 6-digit match
  const prefix6 = TAC_BRANDS.find(t => t.prefix.slice(0, 6) === tac.slice(0, 6));
  if (prefix6) return { brand: prefix6.brand };
  return null;
}

/* ─── Try free device lookup services ─── */
async function tryImeiInfo(imei: string) {
  try {
    // imei.info unofficial JSON endpoint
    const res = await fetch(
      `https://imei.info/api/v2/full-info/?imei=${imei}&format=json`,
      {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (res.ok) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const data = await res.json();
        if (data && (data.brand || data.model || data.modelName)) return data;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function tryImeiCheck(imei: string) {
  try {
    const res = await fetch(
      `https://imeicheck.com/api.php?imei=${imei}`,
      {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (res.ok) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const data = await res.json();
        if (data && !data.error) return data;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/* ─── Main handler ─── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("imei")?.replace(/[\s\-\.]/g, "") || "";

  if (!raw) return NextResponse.json({ error: "IMEI wajib diisi" }, { status: 400 });

  // Support IMEI (15) and IMEISV (16 digits)
  if (!/^\d{14,16}$/.test(raw)) {
    return NextResponse.json({ error: "IMEI harus 14–16 digit angka" }, { status: 400 });
  }

  const imei15 = raw.slice(0, 15); // normalize to 15 for Luhn
  const isValid = luhnCheck(imei15);

  const tac = raw.slice(0, 8);
  const rbi = raw.slice(0, 2);
  const snr = raw.slice(8, 14);
  const checkDigit = raw.length >= 15 ? raw[14] : null;
  const svn = raw.length === 16 ? raw.slice(14, 16) : null; // Software Version Number

  const rbiInfo = RBI_MAP[rbi] ?? `RBI ${rbi} (tidak dikenal)`;
  const localBrand = detectBrandFromTAC(tac);

  // Try external lookups in parallel
  const [imeiInfoData, imeiCheckData] = await Promise.all([
    tryImeiInfo(imei15),
    tryImeiCheck(imei15),
  ]);

  const externalDevice = imeiInfoData || imeiCheckData;

  return NextResponse.json({
    imei: raw,
    format: raw.length === 16 ? "IMEISV (16 digit)" : "IMEI (15 digit)",
    valid: isValid,
    luhn_note: isValid
      ? "Checksum Luhn valid — format IMEI sah"
      : "Checksum Luhn GAGAL — kemungkinan IMEI palsu atau salah ketik",

    structure: {
      tac,
      rbi: { code: rbi, issuer: rbiInfo },
      snr,
      check_digit: checkDigit,
      svn: svn ?? undefined,
    },

    device: externalDevice
      ? {
          source: imeiInfoData ? "imei.info" : "imeicheck.com",
          brand: externalDevice.brand ?? externalDevice.brandName ?? null,
          model: externalDevice.model ?? externalDevice.modelName ?? null,
          os: externalDevice.os ?? null,
          image: externalDevice.image ?? externalDevice.img ?? null,
          raw: externalDevice,
        }
      : localBrand
      ? {
          source: "TAC database lokal",
          brand: localBrand.brand,
          model: localBrand.note ?? null,
          os: null,
          image: null,
        }
      : null,

    device_note: !externalDevice && !localBrand
      ? "Device tidak ditemukan di database lokal. TAC " + tac + " belum terdaftar atau lookup eksternal gagal."
      : undefined,

    timestamp: new Date().toISOString(),
  });
}
