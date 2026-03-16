import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

interface PlatformCheck {
  platform: string;
  category: string;
  registered: boolean | null;
  url?: string;
  detail?: string;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function withTimeout<T>(fn: () => Promise<T>, ms = 7000): Promise<T | null> {
  return Promise.race([fn(), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

function abort(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

// ── Auto-check functions ──────────────────────────────────────────────────────

async function checkGravatar(email: string): Promise<PlatformCheck> {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  try {
    const res = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404&s=1`, { next: { revalidate: 0 } });
    return { platform: "Gravatar", category: "Profile", registered: res.status === 200,
      url: `https://www.gravatar.com/${hash}` };
  } catch { return { platform: "Gravatar", category: "Profile", registered: null, error: "timeout" }; }
}

async function checkFirefox(email: string): Promise<PlatformCheck> {
  try {
    const res = await fetch(`https://api.accounts.firefox.com/v1/account/status?email=${encodeURIComponent(email)}`,
      { next: { revalidate: 0 } });
    if (!res.ok) return { platform: "Firefox Accounts", category: "Browser", registered: null, error: `HTTP ${res.status}` };
    const d = await res.json();
    return { platform: "Firefox Accounts", category: "Browser", registered: d.exists === true, url: "https://accounts.firefox.com" };
  } catch { return { platform: "Firefox Accounts", category: "Browser", registered: null, error: "timeout" }; }
}

async function checkDuolingo(email: string): Promise<PlatformCheck> {
  try {
    const res = await fetch(`https://www.duolingo.com/2017-06-30/users?email=${encodeURIComponent(email)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    if (!res.ok) return { platform: "Duolingo", category: "Education", registered: null, error: `HTTP ${res.status}` };
    const d = await res.json();
    const found = Array.isArray(d.users) && d.users.length > 0;
    return { platform: "Duolingo", category: "Education", registered: found,
      url: found ? `https://www.duolingo.com/profile/${d.users[0]?.username}` : undefined,
      detail: found ? `@${d.users[0]?.username}` : undefined };
  } catch { return { platform: "Duolingo", category: "Education", registered: null, error: "timeout" }; }
}

async function checkGitHub(email: string): Promise<PlatformCheck> {
  try {
    const res = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email&per_page=1`,
      { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "OSINT-Tool/1.0" }, next: { revalidate: 0 } });
    if (!res.ok) return { platform: "GitHub", category: "Developer", registered: null, error: `HTTP ${res.status}` };
    const d = await res.json();
    const found = d.total_count > 0;
    return { platform: "GitHub", category: "Developer", registered: found,
      url: found ? `https://github.com/${d.items?.[0]?.login}` : undefined,
      detail: found ? `@${d.items?.[0]?.login}` : undefined };
  } catch { return { platform: "GitHub", category: "Developer", registered: null, error: "timeout" }; }
}

async function checkKeybase(email: string): Promise<PlatformCheck> {
  try {
    const res = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?email=${encodeURIComponent(email)}`,
      { next: { revalidate: 0 } });
    if (!res.ok) return { platform: "Keybase", category: "Crypto", registered: null, error: `HTTP ${res.status}` };
    const d = await res.json();
    const found = d.status?.code === 0 && d.them?.length > 0;
    return { platform: "Keybase", category: "Crypto", registered: found,
      url: found ? `https://keybase.io/${d.them[0]?.basics?.username}` : undefined,
      detail: found ? `@${d.them[0]?.basics?.username}` : undefined };
  } catch { return { platform: "Keybase", category: "Crypto", registered: null, error: "timeout" }; }
}

async function checkWordPress(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  try {
    const res = await fetch(`https://public-api.wordpress.com/rest/v1.1/users/${encodeURIComponent(user)}`,
      { next: { revalidate: 0 } });
    return { platform: "WordPress.com", category: "Blog", registered: res.status === 200,
      url: `https://wordpress.com/~${user}` };
  } catch { return { platform: "WordPress.com", category: "Blog", registered: null, error: "timeout" }; }
}

async function checkProtonMail(email: string): Promise<PlatformCheck> {
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://account.proton.me/api/core/v4/users/available?Name=${encodeURIComponent(email.split("@")[0])}`,
      { headers: { "x-pm-appversion": "web-account@5.0.0" }, signal, next: { revalidate: 0 } });
    clear();
    return { platform: "Proton Mail", category: "Email", registered: res.status === 409, url: "https://proton.me" };
  } catch { return { platform: "Proton Mail", category: "Email", registered: null, error: "timeout" }; }
}

// Microsoft / Outlook / Hotmail / Live
async function checkMicrosoft(email: string): Promise<PlatformCheck> {
  const { signal, clear } = abort(7000);
  try {
    const res = await fetch("https://login.live.com/GetCredentialType.srf", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({
        username: email, uaid: "aabbccdd11223344aabbccdd11223344",
        isOtherIdpSupported: true, checkPhones: false, isRemoteNGCSupported: true,
        isCookieBannerShown: false, isFidoSupported: true, originalRequest: "",
        country: "US", forceotclogin: false, otclogindisallowed: true,
        isExternalFederationDisallowed: false, isRemoteConnectSupported: false,
        federationFlags: 0, isSignup: false, flowToken: "",
      }),
      signal, next: { revalidate: 0 },
    });
    clear();
    if (!res.ok) return { platform: "Microsoft / Outlook", category: "Tech", registered: null, error: `HTTP ${res.status}` };
    const d = await res.json();
    // 0,4,5 = exists; 1 = not found
    const found = [0, 4, 5].includes(d.IfExistsResult);
    return { platform: "Microsoft / Outlook", category: "Tech", registered: found, url: "https://outlook.live.com",
      detail: found && d.Display ? d.Display : undefined };
  } catch { return { platform: "Microsoft / Outlook", category: "Tech", registered: null, error: "timeout" }; }
}

// Spotify
async function checkSpotify(email: string): Promise<PlatformCheck> {
  const { signal, clear } = abort(7000);
  try {
    const res = await fetch(
      `https://spclient.wg.spotify.com/signup/public/v1/account?validate=1&email=${encodeURIComponent(email)}`,
      { headers: { "App-Platform": "Browser", "User-Agent": "Mozilla/5.0" }, signal, next: { revalidate: 0 } });
    clear();
    if (!res.ok) return { platform: "Spotify", category: "Music", registered: null, error: `HTTP ${res.status}` };
    const d = await res.json();
    // email_field.status 20 = available, 40 = taken
    const found = d.email_field?.status === 40;
    return { platform: "Spotify", category: "Music", registered: found, url: "https://www.spotify.com" };
  } catch { return { platform: "Spotify", category: "Music", registered: null, error: "timeout" }; }
}

// Snapchat — via public profile page (username === email prefix)
async function checkSnapchat(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.snapchat.com/add/${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Snapchat", category: "Social", registered: res.status === 200,
      url: `https://www.snapchat.com/add/${user}` };
  } catch { return { platform: "Snapchat", category: "Social", registered: null, error: "timeout" }; }
}

// Twitter / X — public profile by email-prefix username heuristic
async function checkTwitter(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://x.com/${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Twitter / X", category: "Social", registered: res.status === 200,
      url: `https://x.com/${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Twitter / X", category: "Social", registered: null, error: "timeout" }; }
}

// Instagram heuristic
async function checkInstagram(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(user)}/`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Instagram", category: "Social", registered: res.status === 200,
      url: `https://www.instagram.com/${user}/`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Instagram", category: "Social", registered: null, error: "timeout" }; }
}

// TikTok heuristic
async function checkTikTok(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "TikTok", category: "Social", registered: res.status === 200,
      url: `https://www.tiktok.com/@${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "TikTok", category: "Social", registered: null, error: "timeout" }; }
}

// Pinterest heuristic
async function checkPinterest(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.pinterest.com/${encodeURIComponent(user)}/`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Pinterest", category: "Social", registered: res.status === 200,
      url: `https://www.pinterest.com/${user}/`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Pinterest", category: "Social", registered: null, error: "timeout" }; }
}

// Reddit heuristic
async function checkReddit(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.reddit.com/user/${encodeURIComponent(user)}.json`,
      { signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Reddit", category: "Social", registered: res.status === 200,
      url: `https://www.reddit.com/user/${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Reddit", category: "Social", registered: null, error: "timeout" }; }
}

// Tokopedia heuristic
async function checkTokopedia(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.tokopedia.com/${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Tokopedia", category: "E-Commerce ID", registered: res.status === 200,
      url: `https://www.tokopedia.com/${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Tokopedia", category: "E-Commerce ID", registered: null, error: "timeout" }; }
}

// Shopee ID heuristic
async function checkShopee(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://shopee.co.id/${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Shopee ID", category: "E-Commerce ID", registered: res.status === 200,
      url: `https://shopee.co.id/${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Shopee ID", category: "E-Commerce ID", registered: null, error: "timeout" }; }
}

// LinkedIn heuristic
async function checkLinkedIn(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.linkedin.com/in/${encodeURIComponent(user)}/`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "LinkedIn", category: "Professional", registered: res.status === 200,
      url: `https://www.linkedin.com/in/${user}/`, detail: "Dicek via prefix email" };
  } catch { return { platform: "LinkedIn", category: "Professional", registered: null, error: "timeout" }; }
}

// Medium heuristic
async function checkMedium(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://medium.com/@${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Medium", category: "Blog", registered: res.status === 200,
      url: `https://medium.com/@${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Medium", category: "Blog", registered: null, error: "timeout" }; }
}

// Twitch heuristic
async function checkTwitch(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://www.twitch.tv/${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Twitch", category: "Content", registered: res.status === 200,
      url: `https://www.twitch.tv/${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Twitch", category: "Content", registered: null, error: "timeout" }; }
}

// Steam heuristic
async function checkSteam(email: string): Promise<PlatformCheck> {
  const user = email.split("@")[0];
  const { signal, clear } = abort(6000);
  try {
    const res = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(user)}`,
      { method: "HEAD", signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    clear();
    return { platform: "Steam", category: "Gaming", registered: res.status === 200,
      url: `https://steamcommunity.com/id/${user}`, detail: "Dicek via prefix email" };
  } catch { return { platform: "Steam", category: "Gaming", registered: null, error: "timeout" }; }
}

// ── Search links (forgot-password / manual check pages) ──────────────────────
interface SearchLink {
  platform: string;
  category: string;
  forgotUrl: string;  // direct forgot-password or search page
  note: string;
}

function buildSearchLinks(email: string): SearchLink[] {
  const e = encodeURIComponent(email);
  return [
    { platform: "Facebook",      category: "Social",          forgotUrl: `https://www.facebook.com/login/identify?ctx=recover&email=${e}`, note: "Lupa Sandi" },
    { platform: "Google",         category: "Tech",            forgotUrl: "https://accounts.google.com/signin/v2/identifier",              note: "Cek masuk" },
    { platform: "Apple ID",       category: "Tech",            forgotUrl: "https://iforgot.apple.com/",                                    note: "Lupa Apple ID" },
    { platform: "NVIDIA",         category: "Tech",            forgotUrl: "https://www.nvidia.com/en-us/account/",                         note: "Akun NVIDIA" },
    { platform: "Netflix",        category: "Streaming",       forgotUrl: `https://www.netflix.com/loginhelp`,                             note: "Lupa Sandi" },
    { platform: "PayPal",         category: "Payment",         forgotUrl: `https://www.paypal.com/authflow/entry/`,                        note: "Masuk/Lupa Sandi" },
    { platform: "Amazon",         category: "E-Commerce",      forgotUrl: `https://www.amazon.com/ap/forgotpassword`,                      note: "Lupa Sandi" },
    { platform: "Lazada ID",      category: "E-Commerce ID",   forgotUrl: `https://member.lazada.co.id/user/forgotpassword`,               note: "Lupa Sandi" },
    { platform: "Bukalapak",      category: "E-Commerce ID",   forgotUrl: `https://www.bukalapak.com/forgotpw`,                            note: "Lupa Sandi" },
    { platform: "Alibaba",        category: "E-Commerce",      forgotUrl: `https://login.alibaba.com/member/forgotPassword.htm`,           note: "Lupa Sandi" },
    { platform: "AliExpress",     category: "E-Commerce",      forgotUrl: `https://login.aliexpress.com/m/lp/forgotpw.htm`,                note: "Lupa Sandi" },
    { platform: "Temu",           category: "E-Commerce",      forgotUrl: "https://www.temu.com/",                                        note: "Masuk" },
    { platform: "Discord",        category: "Social",          forgotUrl: "https://discord.com/login",                                    note: "Cek email login" },
    { platform: "WhatsApp",       category: "Messaging",       forgotUrl: "https://www.whatsapp.com/",                                    note: "Berbasis nomor HP" },
    { platform: "Line",           category: "Messaging",       forgotUrl: "https://account.line.biz/",                                    note: "Cek akun" },
    { platform: "Zoom",           category: "Tech",            forgotUrl: "https://zoom.us/forgotpassword",                               note: "Lupa Sandi" },
    { platform: "Slack",          category: "Tech",            forgotUrl: "https://slack.com/forgot-password",                            note: "Lupa Sandi" },
    { platform: "Dropbox",        category: "Tech",            forgotUrl: "https://www.dropbox.com/forgot",                               note: "Lupa Sandi" },
    { platform: "Adobe",          category: "Tech",            forgotUrl: "https://account.adobe.com/",                                   note: "Masuk Adobe" },
    { platform: "Canva",          category: "Design",          forgotUrl: "https://www.canva.com/login",                                  note: "Masuk Canva" },
    { platform: "Figma",          category: "Design",          forgotUrl: "https://www.figma.com/login",                                  note: "Masuk Figma" },
    { platform: "Grab",           category: "Local ID",        forgotUrl: "https://account.grab.com/",                                    note: "Akun Grab" },
    { platform: "Gojek",          category: "Local ID",        forgotUrl: "https://account.gojek.com/",                                   note: "Akun Gojek" },
    { platform: "Google Play",    category: "Tech",            forgotUrl: `https://play.google.com/store/search?q=${e}&c=apps`,           note: "Developer search" },
    { platform: "Microsoft Store", category: "Tech",           forgotUrl: "https://account.microsoft.com/account/",                       note: "Akun Microsoft" },
  ];
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });

  const gravatarHash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");

  // Run all auto-checks in parallel
  const checks = await Promise.all([
    withTimeout(() => checkGravatar(email)),
    withTimeout(() => checkFirefox(email)),
    withTimeout(() => checkDuolingo(email)),
    withTimeout(() => checkGitHub(email)),
    withTimeout(() => checkKeybase(email)),
    withTimeout(() => checkWordPress(email)),
    withTimeout(() => checkProtonMail(email)),
    withTimeout(() => checkMicrosoft(email)),
    withTimeout(() => checkSpotify(email)),
    withTimeout(() => checkSnapchat(email)),
    withTimeout(() => checkTwitter(email)),
    withTimeout(() => checkInstagram(email)),
    withTimeout(() => checkTikTok(email)),
    withTimeout(() => checkPinterest(email)),
    withTimeout(() => checkReddit(email)),
    withTimeout(() => checkTokopedia(email)),
    withTimeout(() => checkShopee(email)),
    withTimeout(() => checkLinkedIn(email)),
    withTimeout(() => checkMedium(email)),
    withTimeout(() => checkTwitch(email)),
    withTimeout(() => checkSteam(email)),
  ]);

  const results = checks
    .filter((r): r is PlatformCheck => r !== null)
    .sort((a, b) => {
      if (a.registered === true && b.registered !== true) return -1;
      if (b.registered === true && a.registered !== true) return 1;
      return 0;
    });

  const registeredCount = results.filter((r) => r.registered === true).length;

  return NextResponse.json({
    email,
    gravatar_hash: gravatarHash,
    gravatar_avatar: `https://www.gravatar.com/avatar/${gravatarHash}?s=200&d=404`,
    total_checked: results.length,
    registered_count: registeredCount,
    results,
    search_links: buildSearchLinks(email),
    timestamp: new Date().toISOString(),
  });
}
