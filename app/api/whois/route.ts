import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Sanitize domain - remove protocol and path
  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`RDAP responded with ${res.status}`);

    const data = await res.json();

    // Extract the most relevant fields for easier reading
    const simplified = {
      domain: data.ldhName || cleanDomain,
      status: data.status || [],
      registrar: data.entities?.find((e: { roles?: string[] }) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v: string[]) => v[0] === "fn")?.[3] || "N/A",
      registrant: data.entities?.find((e: { roles?: string[] }) => e.roles?.includes("registrant"))?.vcardArray?.[1]?.find((v: string[]) => v[0] === "fn")?.[3] || "N/A",
      registered: data.events?.find((e: { eventAction: string }) => e.eventAction === "registration")?.eventDate || "N/A",
      updated: data.events?.find((e: { eventAction: string }) => e.eventAction === "last changed")?.eventDate || "N/A",
      expires: data.events?.find((e: { eventAction: string }) => e.eventAction === "expiration")?.eventDate || "N/A",
      nameservers: data.nameservers?.map((ns: { ldhName: string }) => ns.ldhName) || [],
      raw: data,
    };

    return NextResponse.json(simplified);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to lookup domain" },
      { status: 500 }
    );
  }
}
