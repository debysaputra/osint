import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const username = searchParams.get("username")?.trim();
  const type = searchParams.get("type") || "profile";

  if (!platform || !username) {
    return NextResponse.json(
      { error: "platform dan username wajib diisi" },
      { status: 400 }
    );
  }

  try {
    switch (platform) {
      case "github":
        return await handleGitHub(username, type);
      case "reddit":
        return await handleReddit(username);
      default:
        return NextResponse.json(
          { error: "Platform tidak didukung" },
          { status: 400 }
        );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ─── GitHub ─── */
async function handleGitHub(username: string, type: string) {
  const headers: HeadersInit = {
    "User-Agent": "OSINT-Tool/1.0",
    Accept: "application/vnd.github.v3+json",
  };

  const base = `https://api.github.com/users/${encodeURIComponent(username)}`;

  if (type === "profile") {
    const res = await fetch(base, { headers });
    if (res.status === 404)
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (res.status === 403)
      return NextResponse.json(
        { error: "Rate limit GitHub tercapai (60 req/jam). Coba lagi nanti." },
        { status: 429 }
      );
    if (!res.ok)
      return NextResponse.json({ error: "Gagal mengambil data GitHub" }, { status: res.status });

    const d = await res.json();
    return NextResponse.json({
      platform: "github",
      type: "profile",
      timestamp: new Date().toISOString(),
      data: {
        login: d.login,
        name: d.name,
        avatar_url: d.avatar_url,
        bio: d.bio,
        company: d.company,
        blog: d.blog,
        location: d.location,
        email: d.email,
        followers: d.followers,
        following: d.following,
        public_repos: d.public_repos,
        public_gists: d.public_gists,
        created_at: d.created_at,
        updated_at: d.updated_at,
        html_url: d.html_url,
        twitter_username: d.twitter_username,
        hireable: d.hireable,
        site_admin: d.site_admin,
      },
    });
  }

  if (type === "followers" || type === "following") {
    // Ambil hingga 500 user (5 halaman × 100)
    type GHUser = { login: string; avatar_url: string; html_url: string };
    const all: GHUser[] = [];
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(`${base}/${type}?per_page=100&page=${page}`, { headers });
      if (!res.ok) break;
      const data: GHUser[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      for (const u of data) {
        all.push({ login: u.login, avatar_url: u.avatar_url, html_url: u.html_url });
      }
      if (data.length < 100) break;
    }
    return NextResponse.json({
      platform: "github",
      type,
      username,
      count: all.length,
      timestamp: new Date().toISOString(),
      list: all,
    });
  }

  return NextResponse.json({ error: "type tidak valid (profile/followers/following)" }, { status: 400 });
}

/* ─── Reddit ─── */
async function handleReddit(input: string) {
  const headers: HeadersInit = { "User-Agent": "OSINT-Tool/1.0" };

  const isSub = /^\/?r\//i.test(input);

  if (isSub) {
    const sub = input.replace(/^\/?r\//i, "");
    const res = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/about.json`, {
      headers,
    });
    if (res.status === 404 || res.status === 403)
      return NextResponse.json({ error: "Subreddit tidak ditemukan atau privat" }, { status: 404 });
    if (!res.ok)
      return NextResponse.json({ error: "Gagal mengambil data Reddit" }, { status: res.status });

    const json = await res.json();
    const d = json.data;
    return NextResponse.json({
      platform: "reddit",
      type: "subreddit",
      timestamp: new Date().toISOString(),
      data: {
        name: d.display_name,
        title: d.title,
        description: d.public_description,
        subscribers: d.subscribers,
        active_users: d.active_user_count,
        created_utc: d.created_utc,
        created_date: new Date(d.created_utc * 1000).toISOString(),
        url: `https://reddit.com/r/${d.display_name}`,
        over18: d.over18,
        icon_img: d.community_icon || d.icon_img || null,
        banner_img: d.banner_background_image || null,
        lang: d.lang,
        submission_type: d.submission_type,
      },
    });
  }

  // User
  const user = input.replace(/^\/?u\//i, "");
  const res = await fetch(
    `https://www.reddit.com/user/${encodeURIComponent(user)}/about.json`,
    { headers }
  );
  if (res.status === 404)
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (!res.ok)
    return NextResponse.json({ error: "Gagal mengambil data Reddit" }, { status: res.status });

  const json = await res.json();
  const d = json.data;
  return NextResponse.json({
    platform: "reddit",
    type: "user",
    timestamp: new Date().toISOString(),
    data: {
      name: d.name,
      icon_img: d.icon_img?.split("?")[0] || null,
      link_karma: d.link_karma,
      comment_karma: d.comment_karma,
      total_karma: d.total_karma,
      created_utc: d.created_utc,
      created_date: new Date(d.created_utc * 1000).toISOString(),
      is_gold: d.is_gold,
      verified: d.verified,
      has_verified_email: d.has_verified_email,
      url: `https://reddit.com/u/${d.name}`,
    },
  });
}
