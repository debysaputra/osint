import { NextRequest, NextResponse } from "next/server";

// --- Wikipedia search ---
async function searchWikipedia(name: string) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=5&format=json&origin=*`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.query?.search || []).map((r: { title: string; snippet: string; pageid: number }) => ({
      title: r.title,
      snippet: r.snippet.replace(/<[^>]+>/g, ""),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      pageid: r.pageid,
    }));
    return results;
  } catch {
    return [];
  }
}

// --- Wikidata person search ---
async function searchWikidata(name: string) {
  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json&origin=*`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.search || []).map((r: { id: string; label: string; description?: string; url: string }) => ({
      id: r.id,
      label: r.label,
      description: r.description || "",
      url: `https://www.wikidata.org/wiki/${r.id}`,
    }));
  } catch {
    return [];
  }
}

// --- GitHub user search by name ---
async function searchGitHub(name: string) {
  try {
    const res = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(name)}+in:name&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "OSINT-Tool/1.0",
        },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((u: { login: string; html_url: string; avatar_url: string; type: string }) => ({
      login: u.login,
      url: u.html_url,
      avatar: u.avatar_url,
      type: u.type,
    }));
  } catch {
    return [];
  }
}

// --- ORCID academic search ---
async function searchOrcid(name: string) {
  try {
    const res = await fetch(
      `https://pub.orcid.org/v3.0/search/?q=${encodeURIComponent(name)}&rows=5`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return { results: [], total: 0 };
    const data = await res.json();
    const items = data.result || [];
    return {
      total: data["num-found"] || 0,
      results: items.map((r: { "orcid-identifier": { path: string; uri: string } }) => ({
        orcid: r["orcid-identifier"]?.path,
        url: r["orcid-identifier"]?.uri,
      })),
    };
  } catch {
    return { results: [], total: 0 };
  }
}

// --- Nominatim (OpenStreetMap) - places named after person ---
async function searchNominatim(name: string) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=3&addressdetails=0`,
      {
        headers: { "User-Agent": "OSINT-Tool/1.0" },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((p: { display_name: string; type: string; lat: string; lon: string }) => ({
      display_name: p.display_name,
      type: p.type,
      lat: p.lat,
      lon: p.lon,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  }

  const trimmed = name.trim();

  const [wikipedia, wikidata, github, orcid, nominatim] = await Promise.all([
    searchWikipedia(trimmed),
    searchWikidata(trimmed),
    searchGitHub(trimmed),
    searchOrcid(trimmed),
    searchNominatim(trimmed),
  ]);

  return NextResponse.json({
    query: trimmed,
    sources: {
      wikipedia: {
        count: wikipedia.length,
        results: wikipedia,
      },
      wikidata: {
        count: wikidata.length,
        results: wikidata,
      },
      github: {
        count: github.length,
        results: github,
      },
      orcid: {
        total_found: orcid.total,
        results: orcid.results,
      },
      nominatim: {
        count: nominatim.length,
        results: nominatim,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
