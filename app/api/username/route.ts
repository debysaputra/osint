import { NextRequest, NextResponse } from "next/server";

// ── Auto-checkable platforms ──────────────────────────────────────────────────
// {} = username placeholder
// notFoundStatuses: HTTP codes that mean "not found" (default [404])
// foundStatuses:    HTTP codes that mean "found"    (default [200])
interface Platform {
  name: string;
  category: string;
  url: string;
  notFoundStatuses?: number[];
}

const AUTO_PLATFORMS: Platform[] = [
  // 📱 Social Media
  { name: "Twitter / X",     category: "Social",     url: "https://x.com/{}" },
  { name: "Instagram",       category: "Social",     url: "https://www.instagram.com/{}/" },
  { name: "TikTok",          category: "Social",     url: "https://www.tiktok.com/@{}" },
  { name: "Pinterest",       category: "Social",     url: "https://www.pinterest.com/{}/" },
  { name: "Reddit",          category: "Social",     url: "https://www.reddit.com/user/{}" },
  { name: "Snapchat",        category: "Social",     url: "https://www.snapchat.com/add/{}" },
  { name: "Tumblr",          category: "Social",     url: "https://{}.tumblr.com", notFoundStatuses: [404, 301] },
  { name: "MySpace",         category: "Social",     url: "https://myspace.com/{}" },
  { name: "Telegram",        category: "Social",     url: "https://t.me/{}" },

  // 💼 Professional
  { name: "LinkedIn",        category: "Professional", url: "https://www.linkedin.com/in/{}" },
  { name: "AngelList",       category: "Professional", url: "https://angel.co/u/{}" },

  // 💻 Developer
  { name: "GitHub",          category: "Developer",  url: "https://github.com/{}" },
  { name: "GitLab",          category: "Developer",  url: "https://gitlab.com/{}" },
  { name: "Bitbucket",       category: "Developer",  url: "https://bitbucket.org/{}" },
  { name: "Dev.to",          category: "Developer",  url: "https://dev.to/{}" },
  { name: "HackerNews",      category: "Developer",  url: "https://news.ycombinator.com/user?id={}" },
  { name: "CodePen",         category: "Developer",  url: "https://codepen.io/{}" },
  { name: "Replit",          category: "Developer",  url: "https://replit.com/@{}" },
  { name: "Keybase",         category: "Developer",  url: "https://keybase.io/{}" },
  { name: "npm",             category: "Developer",  url: "https://www.npmjs.com/~{}" },

  // 📺 Content / Creative
  { name: "YouTube",         category: "Content",    url: "https://www.youtube.com/@{}" },
  { name: "Twitch",          category: "Content",    url: "https://www.twitch.tv/{}" },
  { name: "Medium",          category: "Content",    url: "https://medium.com/@{}" },
  { name: "Flickr",          category: "Content",    url: "https://www.flickr.com/people/{}" },
  { name: "Vimeo",           category: "Content",    url: "https://vimeo.com/{}" },
  { name: "Dailymotion",     category: "Content",    url: "https://www.dailymotion.com/{}" },
  { name: "Behance",         category: "Content",    url: "https://www.behance.net/{}" },
  { name: "Dribbble",        category: "Content",    url: "https://dribbble.com/{}" },
  { name: "DeviantArt",      category: "Content",    url: "https://www.deviantart.com/{}" },

  // 🎵 Music
  { name: "SoundCloud",      category: "Music",      url: "https://soundcloud.com/{}" },
  { name: "Last.fm",         category: "Music",      url: "https://www.last.fm/user/{}" },
  { name: "Bandcamp",        category: "Music",      url: "https://{}.bandcamp.com" },
  { name: "Apple Music",     category: "Music",      url: "https://music.apple.com/profile/{}" },

  // 🎮 Gaming
  { name: "Steam",           category: "Gaming",     url: "https://steamcommunity.com/id/{}" },
  { name: "Xbox",            category: "Gaming",     url: "https://www.xbox.com/play/user/{}" },
  { name: "Roblox",          category: "Gaming",     url: "https://www.roblox.com/user.aspx?username={}" },

  // 🛒 E-Commerce Indonesia
  { name: "Tokopedia",       category: "E-Commerce ID", url: "https://www.tokopedia.com/{}" },
  { name: "Shopee ID",       category: "E-Commerce ID", url: "https://shopee.co.id/{}" },
  { name: "Bukalapak",       category: "E-Commerce ID", url: "https://www.bukalapak.com/u/{}" },

  // 🛍️ E-Commerce Global
  { name: "eBay",            category: "E-Commerce",  url: "https://www.ebay.com/usr/{}" },
  { name: "Etsy",            category: "E-Commerce",  url: "https://www.etsy.com/shop/{}" },
];

// ── Search-only platforms (can't auto-check, provide search link) ─────────────
interface SearchLink {
  name: string;
  category: string;
  searchUrl: string; // {} = query placeholder
  reason: string;
}

const SEARCH_LINKS: SearchLink[] = [
  // Social
  { name: "Facebook",        category: "Social",       searchUrl: "https://www.facebook.com/search/people?q={}", reason: "Login wall" },
  { name: "Facebook Pages",  category: "Social",       searchUrl: "https://www.facebook.com/search/pages?q={}", reason: "Login wall" },

  // Tech
  { name: "Google Account",  category: "Tech",         searchUrl: "https://contacts.google.com/search/{}", reason: "Requires auth" },
  { name: "Google Play Dev", category: "Tech",         searchUrl: "https://play.google.com/store/search?q={}&c=apps", reason: "Developer search" },
  { name: "Microsoft",       category: "Tech",         searchUrl: "https://learn.microsoft.com/en-us/users/{}/", reason: "Auth required" },
  { name: "Apple ID",        category: "Tech",         searchUrl: "https://www.apple.com/search/{}",  reason: "No public profile" },
  { name: "NVIDIA",          category: "Tech",         searchUrl: "https://www.nvidia.com/en-us/search/#q={}", reason: "No user profiles" },

  // E-Commerce
  { name: "Lazada",          category: "E-Commerce",   searchUrl: "https://www.lazada.co.id/catalog/?q={}", reason: "No username profiles" },
  { name: "Alibaba",         category: "E-Commerce",   searchUrl: "https://www.alibaba.com/trade/search?SearchText={}", reason: "Seller search only" },
  { name: "AliExpress",      category: "E-Commerce",   searchUrl: "https://www.aliexpress.com/wholesale?SearchText={}", reason: "Seller search only" },
  { name: "Amazon",          category: "E-Commerce",   searchUrl: "https://www.amazon.com/s?k={}", reason: "No public username profiles" },
  { name: "Shopee Global",   category: "E-Commerce",   searchUrl: "https://shopee.com/search?keyword={}", reason: "Region-locked" },
  { name: "Temu",            category: "E-Commerce",   searchUrl: "https://www.temu.com/search_result.html?search_key={}", reason: "No user profiles" },

  // Professional / Review
  { name: "Google Reviews",  category: "Review",       searchUrl: "https://www.google.com/maps/search/{}", reason: "No username system" },
  { name: "TripAdvisor",     category: "Review",       searchUrl: "https://www.tripadvisor.com/Search?q={}", reason: "Reviewer search" },
  { name: "Glassdoor",       category: "Review",       searchUrl: "https://www.glassdoor.com/Search/results.htm?keyword={}", reason: "Auth required" },

  // Other
  { name: "WhatsApp",        category: "Messaging",    searchUrl: "https://wa.me/{}",  reason: "Phone-based, no username" },
  { name: "Line",            category: "Messaging",    searchUrl: "https://line.me/R/ti/p/{}",  reason: "ID-based only" },
];

// ── Check a single platform ───────────────────────────────────────────────────
async function checkPlatform(username: string, platform: Platform) {
  const url = platform.url.replace(/\{\}/g, encodeURIComponent(username));
  const notFoundStatuses = platform.notFoundStatuses ?? [404];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    clearTimeout(timer);

    const found = !notFoundStatuses.includes(res.status) && res.status < 500;
    return { platform: platform.name, category: platform.category, url, found, status: res.status };
  } catch {
    return { platform: platform.name, category: platform.category, url, found: false, status: null, error: "timeout" };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  if (!/^[a-zA-Z0-9_.\-]{1,50}$/.test(username))
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });

  const checked = await Promise.all(AUTO_PLATFORMS.map((p) => checkPlatform(username, p)));

  const found    = checked.filter((r) => r.found);
  const notFound = checked.filter((r) => !r.found);

  // Build search links with username substituted
  const searchLinks = SEARCH_LINKS.map((s) => ({
    ...s,
    searchUrl: s.searchUrl.replace(/\{\}/g, encodeURIComponent(username)),
  }));

  return NextResponse.json({
    username,
    auto_checked: checked.length,
    found_count: found.length,
    found,
    not_found: notFound,
    search_links: searchLinks,
    timestamp: new Date().toISOString(),
  });
}
