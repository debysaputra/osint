import { NextRequest, NextResponse } from "next/server";

// Country code mapping (E.164 prefix → country info)
const COUNTRY_CODES: Record<string, { country: string; code: string; region: string }> = {
  "1": { country: "United States / Canada", code: "US/CA", region: "North America" },
  "7": { country: "Russia / Kazakhstan", code: "RU/KZ", region: "Eastern Europe / Central Asia" },
  "20": { country: "Egypt", code: "EG", region: "Africa" },
  "27": { country: "South Africa", code: "ZA", region: "Africa" },
  "30": { country: "Greece", code: "GR", region: "Europe" },
  "31": { country: "Netherlands", code: "NL", region: "Europe" },
  "32": { country: "Belgium", code: "BE", region: "Europe" },
  "33": { country: "France", code: "FR", region: "Europe" },
  "34": { country: "Spain", code: "ES", region: "Europe" },
  "36": { country: "Hungary", code: "HU", region: "Europe" },
  "39": { country: "Italy", code: "IT", region: "Europe" },
  "40": { country: "Romania", code: "RO", region: "Europe" },
  "41": { country: "Switzerland", code: "CH", region: "Europe" },
  "43": { country: "Austria", code: "AT", region: "Europe" },
  "44": { country: "United Kingdom", code: "GB", region: "Europe" },
  "45": { country: "Denmark", code: "DK", region: "Europe" },
  "46": { country: "Sweden", code: "SE", region: "Europe" },
  "47": { country: "Norway", code: "NO", region: "Europe" },
  "48": { country: "Poland", code: "PL", region: "Europe" },
  "49": { country: "Germany", code: "DE", region: "Europe" },
  "51": { country: "Peru", code: "PE", region: "South America" },
  "52": { country: "Mexico", code: "MX", region: "North America" },
  "54": { country: "Argentina", code: "AR", region: "South America" },
  "55": { country: "Brazil", code: "BR", region: "South America" },
  "56": { country: "Chile", code: "CL", region: "South America" },
  "57": { country: "Colombia", code: "CO", region: "South America" },
  "58": { country: "Venezuela", code: "VE", region: "South America" },
  "60": { country: "Malaysia", code: "MY", region: "Southeast Asia" },
  "61": { country: "Australia", code: "AU", region: "Oceania" },
  "62": { country: "Indonesia", code: "ID", region: "Southeast Asia" },
  "63": { country: "Philippines", code: "PH", region: "Southeast Asia" },
  "64": { country: "New Zealand", code: "NZ", region: "Oceania" },
  "65": { country: "Singapore", code: "SG", region: "Southeast Asia" },
  "66": { country: "Thailand", code: "TH", region: "Southeast Asia" },
  "81": { country: "Japan", code: "JP", region: "East Asia" },
  "82": { country: "South Korea", code: "KR", region: "East Asia" },
  "84": { country: "Vietnam", code: "VN", region: "Southeast Asia" },
  "86": { country: "China", code: "CN", region: "East Asia" },
  "90": { country: "Turkey", code: "TR", region: "Europe / Asia" },
  "91": { country: "India", code: "IN", region: "South Asia" },
  "92": { country: "Pakistan", code: "PK", region: "South Asia" },
  "93": { country: "Afghanistan", code: "AF", region: "South Asia" },
  "94": { country: "Sri Lanka", code: "LK", region: "South Asia" },
  "95": { country: "Myanmar", code: "MM", region: "Southeast Asia" },
  "98": { country: "Iran", code: "IR", region: "Middle East" },
  "212": { country: "Morocco", code: "MA", region: "Africa" },
  "213": { country: "Algeria", code: "DZ", region: "Africa" },
  "216": { country: "Tunisia", code: "TN", region: "Africa" },
  "218": { country: "Libya", code: "LY", region: "Africa" },
  "220": { country: "Gambia", code: "GM", region: "Africa" },
  "221": { country: "Senegal", code: "SN", region: "Africa" },
  "234": { country: "Nigeria", code: "NG", region: "Africa" },
  "254": { country: "Kenya", code: "KE", region: "Africa" },
  "255": { country: "Tanzania", code: "TZ", region: "Africa" },
  "256": { country: "Uganda", code: "UG", region: "Africa" },
  "966": { country: "Saudi Arabia", code: "SA", region: "Middle East" },
  "971": { country: "UAE", code: "AE", region: "Middle East" },
  "972": { country: "Israel", code: "IL", region: "Middle East" },
};

function parsePhone(phone: string) {
  // Normalize input
  const digits = phone.replace(/[\s\-().+]/g, "");
  const e164 = phone.startsWith("+") ? digits : digits;

  // Try to match country code (longest match first: 3, 2, 1 digits)
  let countryInfo = null;
  let callingCode = "";
  let nationalNumber = "";

  for (const len of [3, 2, 1]) {
    const prefix = e164.substring(0, len);
    if (COUNTRY_CODES[prefix]) {
      countryInfo = COUNTRY_CODES[prefix];
      callingCode = prefix;
      nationalNumber = e164.substring(len);
      break;
    }
  }

  const formatted = phone.startsWith("+")
    ? phone
    : `+${e164}`;

  return {
    input: phone,
    normalized: formatted,
    calling_code: callingCode ? `+${callingCode}` : "Unknown",
    national_number: nationalNumber || e164,
    country: countryInfo?.country || "Unknown",
    country_code: countryInfo?.code || "Unknown",
    region: countryInfo?.region || "Unknown",
    digit_count: e164.length,
    valid_length: e164.length >= 7 && e164.length <= 15,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  try {
    const result = parsePhone(phone);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Phone lookup failed" },
      { status: 500 }
    );
  }
}
