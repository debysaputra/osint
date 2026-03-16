"use client";
import { useState } from "react";
import ToolLayout from "@/app/components/ToolLayout";
import JsonViewer from "@/app/components/JsonViewer";

/* ─── Types ─── */
interface GHProfile {
  login: string; name: string | null; avatar_url: string; bio: string | null;
  company: string | null; blog: string | null; location: string | null;
  email: string | null; followers: number; following: number;
  public_repos: number; public_gists: number; created_at: string;
  html_url: string; twitter_username: string | null;
}
interface GHUser { login: string; avatar_url: string; html_url: string; }
interface GHListResult { platform: string; type: string; username: string; count: number; list: GHUser[]; timestamp: string; }
interface GHProfileResult { platform: string; type: string; timestamp: string; data: GHProfile; }

interface RedditUser {
  name: string; icon_img: string | null; link_karma: number; comment_karma: number;
  total_karma: number; created_date: string; is_gold: boolean; verified: boolean; url: string;
}
interface RedditSub {
  name: string; title: string; description: string; subscribers: number;
  active_users: number; created_date: string; url: string; over18: boolean;
  icon_img: string | null; lang: string;
}
interface RedditResult { platform: string; type: "user" | "subreddit"; timestamp: string; data: RedditUser | RedditSub; }

type AnyResult = GHProfileResult | GHListResult | RedditResult;

/* ─── Platform configs ─── */
const MANUAL_PLATFORMS = [
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "𝕏",
    color: "text-sky-400",
    border: "border-sky-900",
    buildUrl: (u: string) => `https://twitter.com/${u}/followers`,
    buildFollowingUrl: (u: string) => `https://twitter.com/${u}/following`,
    note: "Butuh login. Buka halaman followers/following secara manual.",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "text-pink-400",
    border: "border-pink-900",
    buildUrl: (u: string) => `https://www.instagram.com/${u}/followers/`,
    buildFollowingUrl: (u: string) => `https://www.instagram.com/${u}/following/`,
    note: "Butuh login. Akun harus publik untuk lihat followers.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    color: "text-red-400",
    border: "border-red-900",
    buildUrl: (u: string) => `https://www.tiktok.com/@${u}/followers`,
    buildFollowingUrl: (u: string) => `https://www.tiktok.com/@${u}/following`,
    note: "Butuh login. Klik Followers / Following di profil.",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    color: "text-red-400",
    border: "border-red-900",
    buildUrl: (u: string) => `https://www.youtube.com/@${u}`,
    buildFollowingUrl: (u: string) => `https://www.youtube.com/@${u}/channels`,
    note: "Subscriber count publik, daftar subscriber tidak tersedia tanpa API key.",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    color: "text-blue-400",
    border: "border-blue-900",
    buildUrl: (u: string) => `https://www.facebook.com/${u}/followers`,
    buildFollowingUrl: (u: string) => `https://www.facebook.com/${u}/following`,
    note: "Butuh login. Sebagian besar data terlindungi privasi.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    color: "text-blue-300",
    border: "border-blue-800",
    buildUrl: (u: string) => `https://www.linkedin.com/in/${u}/`,
    buildFollowingUrl: (u: string) => `https://www.linkedin.com/in/${u}/`,
    note: "Butuh login. Connection list tidak publik.",
  },
];

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function SocialPage() {
  const [platform, setPlatform] = useState<"github" | "reddit">("github");
  const [ghType, setGhType] = useState<"profile" | "followers" | "following">("profile");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnyResult | null>(null);
  const [error, setError] = useState("");
  const [manualInput, setManualInput] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const params = new URLSearchParams({
        platform,
        username: input.trim(),
        type: platform === "github" ? ghType : "profile",
      });
      const res = await fetch(`/api/social?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as AnyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const placeholders: Record<string, string> = {
    github: "Username GitHub (contoh: torvalds)",
    reddit: "Username (contoh: spez) atau subreddit (contoh: r/programming)",
  };

  return (
    <ToolLayout
      title="Social Media Scraper"
      description="Scrape followers, following, dan subscribers dari berbagai platform sosial media"
      icon="👥"
    >
      {/* Platform Tabs */}
      <div className="mb-6">
        <div className="text-xs text-zinc-600 font-mono mb-3">Pilih platform:</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Auto platforms */}
          {[
            { id: "github" as const, label: "GitHub", icon: "🐙", sub: "Auto · API publik" },
            { id: "reddit" as const, label: "Reddit", icon: "🤖", sub: "Auto · API publik" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => { setPlatform(p.id); setResult(null); setError(""); }}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                platform === p.id
                  ? "bg-green-950 border-green-600"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <div className="text-lg mb-1">{p.icon}</div>
              <div className={`text-sm font-semibold font-mono ${platform === p.id ? "text-green-400" : "text-zinc-300"}`}>
                {p.label}
              </div>
              <div className="text-xs text-green-600 mt-0.5">{p.sub}</div>
            </button>
          ))}

          {/* Manual platforms preview */}
          {MANUAL_PLATFORMS.slice(0, 2).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                const el = document.getElementById("manual-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-600 text-left transition-all cursor-pointer"
            >
              <div className="text-lg mb-1">{p.icon}</div>
              <div className="text-sm font-semibold font-mono text-zinc-400">{p.name}</div>
              <div className="text-xs text-zinc-600 mt-0.5">Manual · Butuh login</div>
            </button>
          ))}
        </div>
      </div>

      {/* GitHub type selector */}
      {platform === "github" && (
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mb-4">
          {(["profile", "followers", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setGhType(t)}
              className={`flex-1 py-2 text-xs rounded-md font-mono transition-colors cursor-pointer capitalize ${
                ghType === t
                  ? "bg-green-600 text-black font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t === "profile" ? "👤 Profile" : t === "followers" ? "⬇ Followers" : "⬆ Following"}
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={placeholders[platform]}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Loading..." : "Fetch"}
        </button>
      </div>

      {loading && (
        <div className="mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-mono animate-pulse">
          Mengambil data dari {platform}...
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {/* ─── GitHub Profile ─── */}
      {result && "data" in result && result.platform === "github" && result.type === "profile" && (() => {
        const r = result as GHProfileResult;
        const d = r.data;
        return (
          <div className="mt-6 space-y-4">
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-4 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.avatar_url} alt={d.login} className="w-16 h-16 rounded-full border-2 border-zinc-700" />
                <div>
                  <div className="text-lg font-bold text-zinc-100 font-mono">{d.name || d.login}</div>
                  <a href={d.html_url} target="_blank" rel="noopener noreferrer"
                    className="text-green-400 font-mono text-sm hover:underline">
                    @{d.login}
                  </a>
                  {d.location && <div className="text-zinc-500 text-xs mt-1">📍 {d.location}</div>}
                </div>
              </div>
              {d.bio && <p className="text-zinc-400 text-sm mb-4 italic">&quot;{d.bio}&quot;</p>}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Followers", val: fmt(d.followers), color: "text-green-400" },
                  { label: "Following", val: fmt(d.following), color: "text-cyan-400" },
                  { label: "Repos", val: fmt(d.public_repos), color: "text-yellow-400" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                    <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                {d.company && <div className="text-zinc-400"><span className="text-zinc-600">company </span>{d.company}</div>}
                {d.email && <div className="text-zinc-400"><span className="text-zinc-600">email </span>{d.email}</div>}
                {d.blog && <div className="text-zinc-400 col-span-2 truncate"><span className="text-zinc-600">blog </span><a href={d.blog} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{d.blog}</a></div>}
                {d.twitter_username && <div className="text-zinc-400"><span className="text-zinc-600">twitter </span>@{d.twitter_username}</div>}
                <div className="text-zinc-400"><span className="text-zinc-600">joined </span>{new Date(d.created_at).toLocaleDateString("id-ID")}</div>
              </div>
            </div>
            <JsonViewer data={r} filename={`github-profile-${d.login}`} />
          </div>
        );
      })()}

      {/* ─── GitHub Followers / Following list ─── */}
      {result && "list" in result && result.platform === "github" && (() => {
        const r = result as GHListResult;
        return (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-mono text-zinc-400">
                <span className="text-green-400 font-bold">{r.count}</span>{" "}
                {r.type} untuk{" "}
                <span className="text-zinc-200">@{r.username}</span>
              </div>
              {r.count === 500 && (
                <div className="text-xs text-yellow-600 font-mono">⚠ Maks 500 ditampilkan</div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-1">
              {r.list.map((u) => (
                <a key={u.login} href={u.html_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-green-700 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.avatar_url} alt={u.login} className="w-8 h-8 rounded-full border border-zinc-700 shrink-0" />
                  <span className="text-green-400 font-mono text-sm hover:underline">@{u.login}</span>
                </a>
              ))}
            </div>
            <JsonViewer data={r} filename={`github-${r.type}-${r.username}`} />
          </div>
        );
      })()}

      {/* ─── Reddit User ─── */}
      {result && "data" in result && result.platform === "reddit" && result.type === "user" && (() => {
        const d = (result as RedditResult).data as RedditUser;
        return (
          <div className="mt-6 space-y-4">
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-4 mb-4">
                {d.icon_img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.icon_img} alt={d.name} className="w-14 h-14 rounded-full border-2 border-zinc-700" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-orange-900 border-2 border-zinc-700 flex items-center justify-center text-2xl">🤖</div>
                )}
                <div>
                  <div className="text-lg font-bold font-mono text-zinc-100">{d.name}</div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    className="text-orange-400 font-mono text-sm hover:underline">u/{d.name}</a>
                  {d.is_gold && <span className="ml-2 text-xs text-yellow-400 bg-yellow-950 px-2 py-0.5 rounded">Gold</span>}
                  {d.verified && <span className="ml-2 text-xs text-green-400 bg-green-950 px-2 py-0.5 rounded">Verified</span>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Post Karma", val: fmt(d.link_karma), color: "text-orange-400" },
                  { label: "Comment Karma", val: fmt(d.comment_karma), color: "text-yellow-400" },
                  { label: "Total Karma", val: fmt(d.total_karma), color: "text-green-400" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                    <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs font-mono text-zinc-500">
                Bergabung: {new Date(d.created_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <p className="mt-2 text-xs text-zinc-600 font-mono">
                ℹ Reddit tidak mengekspos daftar follower/following secara publik via API.
              </p>
            </div>
            <JsonViewer data={result} filename={`reddit-user-${d.name}`} />
          </div>
        );
      })()}

      {/* ─── Reddit Subreddit ─── */}
      {result && "data" in result && result.platform === "reddit" && result.type === "subreddit" && (() => {
        const d = (result as RedditResult).data as RedditSub;
        return (
          <div className="mt-6 space-y-4">
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-4 mb-4">
                {d.icon_img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.icon_img} alt={d.name} className="w-14 h-14 rounded-full border-2 border-zinc-700" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-orange-900 border-2 border-zinc-700 flex items-center justify-center text-2xl">📋</div>
                )}
                <div>
                  <div className="text-lg font-bold font-mono text-zinc-100">{d.title}</div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    className="text-orange-400 font-mono text-sm hover:underline">r/{d.name}</a>
                  {d.over18 && <span className="ml-2 text-xs text-red-400 bg-red-950 px-2 py-0.5 rounded">NSFW</span>}
                </div>
              </div>
              {d.description && <p className="text-zinc-400 text-sm mb-4 italic">&quot;{d.description}&quot;</p>}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Subscribers", val: fmt(d.subscribers), color: "text-orange-400" },
                  { label: "Online Sekarang", val: fmt(d.active_users), color: "text-green-400" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                    <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-zinc-600 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs font-mono text-zinc-500">
                Dibuat: {new Date(d.created_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                {d.lang && <span className="ml-4">Bahasa: {d.lang}</span>}
              </div>
            </div>
            <JsonViewer data={result} filename={`reddit-sub-${d.name}`} />
          </div>
        );
      })()}

      {/* ─── Manual Platforms ─── */}
      <div id="manual-section" className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600 font-mono">Platform lain (manual)</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <p className="text-xs text-zinc-600 font-mono mb-4">
          Platform berikut membutuhkan login atau API berbayar. Masukkan username lalu klik tombol untuk buka langsung.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Masukkan username untuk platform di bawah"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          {MANUAL_PLATFORMS.map((p) => (
            <div key={p.id}
              className={`p-4 rounded-lg bg-zinc-900 border ${p.border} transition-colors`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <div className={`font-semibold text-sm ${p.color}`}>{p.name}</div>
                    <div className="text-zinc-600 text-xs font-mono mt-0.5">{p.note}</div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={manualInput ? p.buildUrl(manualInput) : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!manualInput) e.preventDefault(); }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      manualInput
                        ? `${p.border} ${p.color} hover:bg-zinc-800 cursor-pointer`
                        : "border-zinc-800 text-zinc-700 cursor-not-allowed"
                    }`}
                  >
                    Followers →
                  </a>
                  <a
                    href={manualInput ? p.buildFollowingUrl(manualInput) : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!manualInput) e.preventDefault(); }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      manualInput
                        ? `${p.border} ${p.color} hover:bg-zinc-800 cursor-pointer`
                        : "border-zinc-800 text-zinc-700 cursor-not-allowed"
                    }`}
                  >
                    Following →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
