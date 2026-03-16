import { NextRequest, NextResponse } from "next/server";

const DNS_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"] as const;
type DnsType = (typeof DNS_TYPES)[number];

async function queryDns(name: string, type: DnsType) {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`DNS query failed for type ${type}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const type = (request.nextUrl.searchParams.get("type") || "ALL").toUpperCase();

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  try {
    if (type === "ALL") {
      const results: Record<string, unknown> = {};
      await Promise.all(
        DNS_TYPES.map(async (t) => {
          try {
            const data = await queryDns(cleanDomain, t);
            results[t] = data.Answer || [];
          } catch {
            results[t] = [];
          }
        })
      );
      return NextResponse.json({ domain: cleanDomain, records: results });
    } else {
      if (!DNS_TYPES.includes(type as DnsType)) {
        return NextResponse.json({ error: `Invalid type. Allowed: ${DNS_TYPES.join(", ")}` }, { status: 400 });
      }
      const data = await queryDns(cleanDomain, type as DnsType);
      return NextResponse.json({
        domain: cleanDomain,
        type,
        records: data.Answer || [],
        status: data.Status,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DNS lookup failed" },
      { status: 500 }
    );
  }
}
