import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const domain = email.split("@")[1];

  try {
    // Use eva.pingutil.com for email validation
    const res = await fetch(
      `https://api.eva.pingutil.com/email?email=${encodeURIComponent(email)}`,
      { next: { revalidate: 0 } }
    );

    let validationData: Record<string, unknown> = {};
    if (res.ok) {
      validationData = await res.json();
    }

    // Also do MX lookup to verify domain has mail servers
    const mxRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { next: { revalidate: 0 } }
    );
    const mxData = mxRes.ok ? await mxRes.json() : {};

    const result = {
      email,
      domain,
      format_valid: true,
      mx_records: mxData.Answer || [],
      has_mx: (mxData.Answer?.length || 0) > 0,
      validation: validationData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email lookup failed" },
      { status: 500 }
    );
  }
}
