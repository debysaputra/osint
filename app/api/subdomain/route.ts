import { NextRequest, NextResponse } from "next/server";

interface CrtEntry {
  name_value: string;
  issuer_name?: string;
  not_before?: string;
  not_after?: string;
  id?: number;
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  try {
    const res = await fetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(cleanDomain)}&output=json`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) throw new Error(`crt.sh responded with ${res.status}`);

    const data: CrtEntry[] = await res.json();

    // Extract unique subdomains
    const subdomainSet = new Set<string>();
    data.forEach((entry) => {
      const names = entry.name_value.split("\n");
      names.forEach((name) => {
        const cleaned = name.trim().toLowerCase().replace(/^\*\./, "");
        if (cleaned.endsWith(cleanDomain) && cleaned !== cleanDomain) {
          subdomainSet.add(cleaned);
        }
      });
    });

    const subdomains = Array.from(subdomainSet).sort();

    return NextResponse.json({
      domain: cleanDomain,
      total_certificates: data.length,
      unique_subdomains: subdomains.length,
      subdomains,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Subdomain lookup failed" },
      { status: 500 }
    );
  }
}
