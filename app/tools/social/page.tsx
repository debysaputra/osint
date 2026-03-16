"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

/* ─── CORS proxy untuk platform yang membutuhkan ─── */
const CORS = "https://corsproxy.io/?";

/* ──────────────────────────────────────────────────
   CLIENT-SIDE FETCHERS
   (semua dipanggil langsung dari browser)
   ────────────────────────────────────────────────── */

async function fetchGitHub(username: string, type: "profile" | "followers" | "following") {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  const base = `https://api.github.com/users/${encodeURIComponent(username)}`;

  if (type === "profile") {
    const res = await fetch(base, { headers });
    if (res.status === 404) throw new Error("User tidak ditemukan");
    if (res.status === 403) throw new Error("Rate limit GitHub (60/jam). Tunggu sebentar.");
    if (!res.ok) throw new Error("Gagal mengambil data GitHub");
    const d = await res.json();
    return {
      platform: "github", type: "profile", timestamp: new Date().toISOString(),
      data: {
        login: d.login, name: d.name, avatar_url: d.avatar_url, bio: d.bio,
        company: d.company, blog: d.blog, location: d.location, email: d.email,
        followers: d.followers, following: d.following, public_repos: d.public_repos,
        created_at: d.created_at, html_url: d.html_url, twitter_username: d.twitter_username,
      },
    };
  }

  type GHUser = { login: string; avatar_url: string; html_url: string };
  const all: GHUser[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${base}/${type}?per_page=100&page=${page}`, { headers });
    if (!res.ok) break;
    const data: GHUser[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data.map(u => ({ login: u.login, avatar_url: u.avatar_url, html_url: u.html_url })));
    if (data.length < 100) break;
  }
  return { platform: "github", type, username, count: all.length, timestamp: new Date().toISOString(), list: all };
}

async function fetchReddit(input: string) {
  const headers: HeadersInit = { "User-Agent": "OSINT-Tool/1.0" };
  const isSub = /^\/?r\//i.test(input);

  if (isSub) {
    const sub = input.replace(/^\/?r\//i, "");
    const res = await fetch(`https://www.reddit.com/r/${sub}/about.json`, { headers });
    if (!res.ok) throw new Error("Subreddit tidak ditemukan atau privat");
    const json = await res.json();
    const d = json.data;
    return {
      platform: "reddit", type: "subreddit", timestamp: new Date().toISOString(),
      data: {
        name: d.display_name, title: d.title, description: d.public_description,
        subscribers: d.subscribers, active_users: d.active_user_count,
        created_date: new Date(d.created_utc * 1000).toISOString(),
        url: `https://reddit.com/r/${d.display_name}`, over18: d.over18,
        icon_img: d.community_icon || d.icon_img || null,
      },
    };
  }

  const user = input.replace(/^\/?u\//i, "");
  const res = await fetch(`https://www.reddit.com/user/${user}/about.json`, { headers });
  if (!res.ok) throw new Error("User tidak ditemukan");
  const json = await res.json();
  const d = json.data;
  return {
    platform: "reddit", type: "user", timestamp: new Date().toISOString(),
    data: {
      name: d.name, icon_img: d.icon_img?.split("?")[0] || null,
      link_karma: d.link_karma, comment_karma: d.comment_karma, total_karma: d.total_karma,
      created_date: new Date(d.created_utc * 1000).toISOString(),
      is_gold: d.is_gold, verified: d.verified, url: `https://reddit.com/u/${d.name}`,
    },
  };
}

async function fetchYouTube(handle: string) {
  const clean = handle.replace(/^@/, "");
  const res = await fetch(
    `https://yt.lemnoslife.com/noKey/channels?forHandle=@${encodeURIComponent(clean)}&part=statistics,snippet`
  );
  if (!res.ok) throw new Error("Channel tidak ditemukan");
  const json = await res.json();
  if (!json.items?.length) throw new Error("Channel tidak ditemukan");
  const item = json.items[0];
  const s = item.snippet || {};
  const st = item.statistics || {};
  return {
    platform: "youtube", type: "channel", timestamp: new Date().toISOString(),
    data: {
      title: s.title, description: s.description?.slice(0, 300),
      thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url,
      subscribers: st.subscriberCount ? parseInt(st.subscriberCount) : null,
      total_views: st.viewCount ? parseInt(st.viewCount) : null,
      video_count: st.videoCount ? parseInt(st.videoCount) : null,
      published_at: s.publishedAt,
      url: `https://youtube.com/@${clean}`,
    },
  };
}

async function fetchInstagram(username: string) {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1&__d=dis`;
  const res = await fetch(CORS + encodeURIComponent(url), {
    headers: { Accept: "application/json, text/plain, */*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — Instagram mungkin memblokir`);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    throw new Error("Instagram mengembalikan HTML bukan JSON. Endpoint ini memerlukan login.");
  }
  const json = await res.json();
  const u = json.graphql?.user || json.data?.user;
  if (!u) throw new Error("Data profil tidak tersedia. Akun privat atau Instagram membutuhkan login.");
  return {
    platform: "instagram", type: "user", timestamp: new Date().toISOString(),
    data: {
      username: u.username, full_name: u.full_name, biography: u.biography,
      followers: u.edge_followed_by?.count ?? null,
      following: u.edge_follow?.count ?? null,
      posts: u.edge_owner_to_timeline_media?.count ?? null,
      profile_pic: u.profile_pic_url_hd || u.profile_pic_url,
      is_verified: u.is_verified, is_private: u.is_private,
      external_url: u.external_url,
      url: `https://www.instagram.com/${u.username}`,
    },
  };
}

async function fetchTikTok(username: string) {
  const clean = username.replace(/^@/, "");
  const url = `https://www.tiktok.com/@${encodeURIComponent(clean)}`;
  const res = await fetch(CORS + encodeURIComponent(url), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — TikTok mungkin memblokir`);
  const html = await res.text();

  // Coba extract dari meta tags
  const getMeta = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`));
    return m ? m[1] : null;
  };
  const getMetaName = (name: string) => {
    const m = html.match(new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]+)"`));
    return m ? m[1] : null;
  };

  const title = getMeta("og:title") || clean;
  const description = getMeta("og:description") || getMetaName("description") || "";
  const image = getMeta("og:image");

  // Parse "12.3M Followers, 456 Following, 89.2M Likes" dari deskripsi
  const parseCount = (text: string, keyword: string): string | null => {
    const m = text.match(new RegExp(`([\\d.,]+[KkMmBb]?)\\s*${keyword}`, "i"));
    return m ? m[1] : null;
  };

  const followers = parseCount(description, "Follower");
  const following = parseCount(description, "Following");
  const likes = parseCount(description, "Like");

  if (!title && !description) throw new Error("Profil tidak ditemukan atau TikTok memblokir request");

  return {
    platform: "tiktok", type: "user", timestamp: new Date().toISOString(),
    data: {
      username: clean, display_name: title,
      followers: followers || "Tidak tersedia",
      following: following || "Tidak tersedia",
      likes: likes || "Tidak tersedia",
      description, profile_pic: image,
      url: `https://www.tiktok.com/@${clean}`,
      note: "Data diambil dari HTML meta tags. Untuk data lebih lengkap diperlukan TikTok API.",
    },
  };
}

/* ─── Platform configs ─── */
type PlatformId = "github" | "reddit" | "youtube" | "instagram" | "tiktok";

const PLATFORMS: {
  id: PlatformId; label: string; icon: string; color: string; border: string;
  placeholder: string; mode: "auto" | "try";
  subTypes?: { id: string; label: string }[];
  note?: string;
}[] = [
  {
    id: "github", label: "GitHub", icon: "🐙", color: "text-green-400", border: "border-green-800",
    placeholder: "Username (contoh: torvalds)",
    mode: "auto",
    subTypes: [
      { id: "profile", label: "👤 Profile" },
      { id: "followers", label: "⬇ Followers" },
      { id: "following", label: "⬆ Following" },
    ],
  },
  {
    id: "reddit", label: "Reddit", icon: "🤖", color: "text-orange-400", border: "border-orange-800",
    placeholder: "Username (contoh: spez) atau r/subreddit",
    mode: "auto",
  },
  {
    id: "youtube", label: "YouTube", icon: "▶️", color: "text-red-400", border: "border-red-800",
    placeholder: "Handle channel (contoh: mkbhd atau @mkbhd)",
    mode: "auto",
    note: "Subscriber list tidak tersedia (YouTube tidak expose daftar subscriber publik)",
  },
  {
    id: "instagram", label: "Instagram", icon: "📸", color: "text-pink-400", border: "border-pink-800",
    placeholder: "Username (contoh: natgeo)",
    mode: "try",
    note: "Bergantung pada endpoint publik Instagram. Mungkin gagal jika endpoint diblokir atau akun privat.",
  },
  {
    id: "tiktok", label: "TikTok", icon: "🎵", color: "text-cyan-400", border: "border-cyan-800",
    placeholder: "Username (contoh: khaby.lame)",
    mode: "try",
    note: "Scrape dari meta tags halaman profil via CORS proxy. Data terbatas.",
  },
];

const MANUAL_PLATFORMS = [
  { id: "twitter", name: "Twitter / X", icon: "𝕏", color: "text-sky-400", border: "border-sky-800",
    followersUrl: (u: string) => `https://twitter.com/${u}/followers`,
    followingUrl: (u: string) => `https://twitter.com/${u}/following` },
  { id: "facebook", name: "Facebook", icon: "📘", color: "text-blue-400", border: "border-blue-800",
    followersUrl: (u: string) => `https://www.facebook.com/${u}/followers`,
    followingUrl: (u: string) => `https://www.facebook.com/${u}/following` },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "text-blue-300", border: "border-blue-700",
    followersUrl: (u: string) => `https://www.linkedin.com/in/${u}/`,
    followingUrl: (u: string) => `https://www.linkedin.com/in/${u}/` },
];

/* ─── Helpers ─── */
function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (typeof n === "string") return n;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("id-ID");
}

/* ─── Result renderers ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultCard({ result }: { result: any }) {
  const { platform, type } = result;

  if (platform === "github" && type === "profile") {
    const d = result.data;
    return (
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.avatar_url} alt={d.login} className="w-16 h-16 rounded-full border-2 border-zinc-700" />
          <div>
            <div className="text-lg font-bold text-zinc-100 font-mono">{d.name || d.login}</div>
            <a href={d.html_url} target="_blank" rel="noopener noreferrer"
              className="text-green-400 font-mono text-sm hover:underline">@{d.login}</a>
            {d.location && <div className="text-zinc-500 text-xs mt-1">📍 {d.location}</div>}
          </div>
        </div>
        {d.bio && <p className="text-zinc-400 text-sm italic mb-4">&quot;{d.bio}&quot;</p>}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Followers", val: fmt(d.followers), color: "text-green-400" },
            { label: "Following", val: fmt(d.following), color: "text-cyan-400" },
            { label: "Repos", val: fmt(d.public_repos), color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {d.company && <div className="text-zinc-400"><span className="text-zinc-600">company </span>{d.company}</div>}
          {d.email && <div className="text-zinc-400"><span className="text-zinc-600">email </span>{d.email}</div>}
          {d.twitter_username && <div className="text-zinc-400"><span className="text-zinc-600">twitter </span>@{d.twitter_username}</div>}
          {d.blog && <a href={d.blog} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline col-span-2 truncate"><span className="text-zinc-600">blog </span>{d.blog}</a>}
          <div className="text-zinc-400"><span className="text-zinc-600">joined </span>{new Date(d.created_at).toLocaleDateString("id-ID")}</div>
        </div>
      </div>
    );
  }

  if (platform === "github" && (type === "followers" || type === "following")) {
    const r = result;
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-mono text-zinc-400">
            <span className="text-green-400 font-bold">{r.count}</span> {type} untuk <span className="text-zinc-200">@{r.username}</span>
          </span>
          {r.count >= 500 && <span className="text-xs text-yellow-600 font-mono">⚠ Maks 500</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1">
          {r.list.map((u: { login: string; avatar_url: string; html_url: string }) => (
            <a key={u.login} href={u.html_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-green-700 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.avatar_url} alt={u.login} className="w-8 h-8 rounded-full border border-zinc-700 shrink-0" />
              <span className="text-green-400 font-mono text-sm">@{u.login}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (platform === "reddit" && type === "user") {
    const d = result.data;
    return (
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4 mb-4">
          {d.icon_img
            ? <img src={d.icon_img} alt={d.name} className="w-14 h-14 rounded-full border-2 border-zinc-700" /> // eslint-disable-line @next/next/no-img-element
            : <div className="w-14 h-14 rounded-full bg-orange-900 border-2 border-zinc-700 flex items-center justify-center text-2xl">🤖</div>}
          <div>
            <div className="text-lg font-bold font-mono text-zinc-100">{d.name}</div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-orange-400 font-mono text-sm hover:underline">u/{d.name}</a>
            <div className="flex gap-2 mt-1">
              {d.is_gold && <span className="text-xs text-yellow-400 bg-yellow-950 px-2 py-0.5 rounded">Gold</span>}
              {d.verified && <span className="text-xs text-green-400 bg-green-950 px-2 py-0.5 rounded">Verified</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "Post Karma", val: fmt(d.link_karma), color: "text-orange-400" },
            { label: "Comment Karma", val: fmt(d.comment_karma), color: "text-yellow-400" },
            { label: "Total Karma", val: fmt(d.total_karma), color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="text-xs font-mono text-zinc-500">
          Bergabung: {new Date(d.created_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <p className="mt-2 text-xs text-zinc-700 font-mono">ℹ Reddit tidak mengekspos daftar follower/following publik.</p>
      </div>
    );
  }

  if (platform === "reddit" && type === "subreddit") {
    const d = result.data;
    return (
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4 mb-4">
          {d.icon_img
            ? <img src={d.icon_img} alt={d.name} className="w-14 h-14 rounded-full border-2 border-zinc-700" /> // eslint-disable-line @next/next/no-img-element
            : <div className="w-14 h-14 rounded-full bg-orange-900 border-2 border-zinc-700 flex items-center justify-center text-2xl">📋</div>}
          <div>
            <div className="text-lg font-bold font-mono text-zinc-100">{d.title}</div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-orange-400 font-mono text-sm hover:underline">r/{d.name}</a>
            {d.over18 && <span className="ml-2 text-xs text-red-400 bg-red-950 px-2 py-0.5 rounded">NSFW</span>}
          </div>
        </div>
        {d.description && <p className="text-zinc-400 text-sm italic mb-4">&quot;{d.description}&quot;</p>}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: "Subscribers", val: fmt(d.subscribers), color: "text-orange-400" },
            { label: "Online Sekarang", val: fmt(d.active_users), color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="text-xs font-mono text-zinc-500">
          Dibuat: {new Date(d.created_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    );
  }

  if (platform === "youtube") {
    const d = result.data;
    return (
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4 mb-4">
          {d.thumbnail
            ? <img src={d.thumbnail} alt={d.title} className="w-14 h-14 rounded-full border-2 border-zinc-700" /> // eslint-disable-line @next/next/no-img-element
            : <div className="w-14 h-14 rounded-full bg-red-900 border-2 border-zinc-700 flex items-center justify-center text-2xl">▶️</div>}
          <div>
            <div className="text-lg font-bold font-mono text-zinc-100">{d.title}</div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-red-400 font-mono text-sm hover:underline">{d.url}</a>
          </div>
        </div>
        {d.description && <p className="text-zinc-500 text-xs mb-4 line-clamp-3">{d.description}</p>}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "Subscribers", val: d.subscribers !== null ? fmt(d.subscribers) : "Tersembunyi", color: "text-red-400" },
            { label: "Total Views", val: d.total_views !== null ? fmt(d.total_views) : "—", color: "text-yellow-400" },
            { label: "Video", val: d.video_count !== null ? fmt(d.video_count) : "—", color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        {d.published_at && (
          <div className="text-xs font-mono text-zinc-500">
            Channel dibuat: {new Date(d.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>
    );
  }

  if (platform === "instagram") {
    const d = result.data;
    return (
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4 mb-4">
          {d.profile_pic
            ? <img src={d.profile_pic} alt={d.username} className="w-14 h-14 rounded-full border-2 border-pink-800" /> // eslint-disable-line @next/next/no-img-element
            : <div className="w-14 h-14 rounded-full bg-pink-950 border-2 border-pink-800 flex items-center justify-center text-2xl">📸</div>}
          <div>
            <div className="text-lg font-bold font-mono text-zinc-100">{d.full_name || d.username}</div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-pink-400 font-mono text-sm hover:underline">@{d.username}</a>
            <div className="flex gap-2 mt-1">
              {d.is_verified && <span className="text-xs text-blue-400 bg-blue-950 px-2 py-0.5 rounded">✓ Verified</span>}
              {d.is_private && <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">🔒 Privat</span>}
            </div>
          </div>
        </div>
        {d.biography && <p className="text-zinc-400 text-sm italic mb-4">&quot;{d.biography}&quot;</p>}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "Followers", val: d.followers !== null ? fmt(d.followers) : "—", color: "text-pink-400" },
            { label: "Following", val: d.following !== null ? fmt(d.following) : "—", color: "text-purple-400" },
            { label: "Posts", val: d.posts !== null ? fmt(d.posts) : "—", color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        {d.external_url && (
          <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs hover:underline font-mono">{d.external_url}</a>
        )}
      </div>
    );
  }

  if (platform === "tiktok") {
    const d = result.data;
    return (
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-4 mb-4">
          {d.profile_pic
            ? <img src={d.profile_pic} alt={d.username} className="w-14 h-14 rounded-full border-2 border-cyan-800" /> // eslint-disable-line @next/next/no-img-element
            : <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-cyan-800 flex items-center justify-center text-2xl">🎵</div>}
          <div>
            <div className="text-lg font-bold font-mono text-zinc-100">{d.display_name || d.username}</div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 font-mono text-sm hover:underline">@{d.username}</a>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "Followers", val: String(d.followers), color: "text-cyan-400" },
            { label: "Following", val: String(d.following), color: "text-pink-400" },
            { label: "Likes", val: String(d.likes), color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        {d.note && <p className="text-xs text-zinc-600 font-mono mt-2">ℹ {d.note}</p>}
      </div>
    );
  }

  return null;
}

/* ─── Main Page ─── */
export default function SocialPage() {
  const [activePlatform, setActivePlatform] = useState<PlatformId>("github");
  const [ghType, setGhType] = useState<"profile" | "followers" | "following">("profile");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [manualInput, setManualInput] = useState("");

  const handleFetch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let data;
      switch (activePlatform) {
        case "github":    data = await fetchGitHub(input.trim(), ghType); break;
        case "reddit":    data = await fetchReddit(input.trim()); break;
        case "youtube":   data = await fetchYouTube(input.trim()); break;
        case "instagram": data = await fetchInstagram(input.trim()); break;
        case "tiktok":    data = await fetchTikTok(input.trim()); break;
        default: throw new Error("Platform tidak dikenali");
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform)!;

  return (
    <ToolLayout
      title="Social Media Scraper"
      description="Scrape followers, following & subscribers langsung dari browser — tanpa backend"
      icon="👥"
    >
      {/* Platform Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => { setActivePlatform(p.id); setResult(null); setError(""); setInput(""); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono transition-all cursor-pointer ${
              activePlatform === p.id
                ? `bg-zinc-800 ${p.border} ${p.color} font-semibold`
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
            }`}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              p.mode === "auto"
                ? "bg-green-950 text-green-600"
                : "bg-yellow-950 text-yellow-600"
            }`}>
              {p.mode === "auto" ? "auto" : "try"}
            </span>
          </button>
        ))}
      </div>

      {/* GitHub sub-type selector */}
      {activePlatform === "github" && (
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mb-4">
          {(currentPlatform.subTypes || []).map(t => (
            <button
              key={t.id}
              onClick={() => setGhType(t.id as "profile" | "followers" | "following")}
              className={`flex-1 py-2 text-xs rounded-md font-mono transition-colors cursor-pointer ${
                ghType === t.id
                  ? "bg-green-600 text-black font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Platform note */}
      {currentPlatform.note && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-yellow-950/50 border border-yellow-900 text-yellow-500 text-xs font-mono">
          ⚠ {currentPlatform.note}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleFetch()}
          placeholder={currentPlatform.placeholder}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleFetch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Loading..." : "Fetch"}
        </button>
      </div>

      {/* Status */}
      {loading && (
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Mengambil data dari {currentPlatform.label} langsung dari browser...
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          <ResultCard result={result} />
          <JsonViewer
            data={result}
            filename={`${activePlatform}-${input.replace(/[^a-z0-9]/gi, "-")}`}
          />
        </div>
      )}

      {/* ─── Manual section ─── */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600 font-mono">Platform lain (butuh login)</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="Masukkan username"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          {MANUAL_PLATFORMS.map(p => (
            <div key={p.id} className={`p-4 rounded-lg bg-zinc-900 border ${p.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <span className={`font-semibold text-sm ${p.color}`}>{p.name}</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: "Followers →", url: manualInput ? p.followersUrl(manualInput) : null },
                    { label: "Following →", url: manualInput ? p.followingUrl(manualInput) : null },
                  ].map(btn => (
                    <a
                      key={btn.label}
                      href={btn.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => { if (!btn.url) e.preventDefault(); }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                        btn.url
                          ? `${p.border} ${p.color} hover:bg-zinc-800 cursor-pointer`
                          : "border-zinc-800 text-zinc-700 cursor-not-allowed"
                      }`}
                    >
                      {btn.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
