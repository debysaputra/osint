import Link from "next/link";

const TOOLS = [
  {
    href: "/tools/ip",
    icon: "🌐",
    title: "IP Geolocation",
    description: "Lookup IP address details: country, city, ISP, coordinates, proxy detection",
    tag: "ip-api.com",
  },
  {
    href: "/tools/whois",
    icon: "📋",
    title: "WHOIS / RDAP",
    description: "Domain registration info: registrar, dates, nameservers via RDAP protocol",
    tag: "rdap.org",
  },
  {
    href: "/tools/dns",
    icon: "🔍",
    title: "DNS Lookup",
    description: "Query DNS records: A, AAAA, MX, TXT, NS, CNAME, SOA — all types supported",
    tag: "dns.google",
  },
  {
    href: "/tools/email",
    icon: "✉️",
    title: "Email Validator",
    description: "Validate email format, check MX records, and inspect deliverability info",
    tag: "eva.pingutil",
  },
  {
    href: "/tools/username",
    icon: "👤",
    title: "Username Search",
    description: "Find a username across 15+ platforms: GitHub, Reddit, Twitter, Instagram & more",
    tag: "15 platforms",
  },
  {
    href: "/tools/phone",
    icon: "📱",
    title: "Phone Lookup",
    description: "Parse phone numbers: country, calling code, regional info from E.164 format",
    tag: "local parser",
  },
  {
    href: "/tools/subdomain",
    icon: "🕸️",
    title: "Subdomain Finder",
    description: "Discover subdomains via SSL certificate transparency logs from crt.sh",
    tag: "crt.sh",
  },
  {
    href: "/tools/emailreg",
    icon: "🔐",
    title: "Email Registration",
    description: "Cari di mana email terdaftar: Gravatar, GitHub, Firefox, Duolingo, Keybase & lebih. Import Epieos JSON.",
    tag: "multi-platform",
  },
  {
    href: "/tools/name",
    icon: "🧑",
    title: "Name Search",
    description: "Cari informasi seseorang berdasarkan nama: Wikipedia, Wikidata, GitHub, ORCID, OpenStreetMap",
    tag: "5 sumber",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔎</span>
            <h1 className="text-2xl font-bold font-mono text-green-400 terminal-glow tracking-tight">
              OSINT Tools
            </h1>
            <span className="px-2 py-0.5 text-xs bg-green-950 border border-green-800 text-green-400 rounded font-mono">
              v1.0
            </span>
          </div>
          <p className="text-zinc-500 text-sm max-w-lg">
            Open Source Intelligence toolkit — IP, WHOIS, DNS, Email, Username, Phone &amp; Subdomain reconnaissance. Results export as JSON.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-xs text-zinc-600 font-mono mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          {TOOLS.length} tools available — all results saved as JSON
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-green-800 transition-all duration-200 hover:bg-zinc-900/80"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{tool.icon}</span>
                <span className="text-xs font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
                  {tool.tag}
                </span>
              </div>
              <h2 className="text-zinc-100 font-semibold mb-2 group-hover:text-green-400 transition-colors">
                {tool.title}
              </h2>
              <p className="text-zinc-500 text-xs leading-relaxed">{tool.description}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-zinc-600 group-hover:text-green-500 transition-colors font-mono">
                Open tool{" "}
                <span className="group-hover:translate-x-1 transition-transform inline-block">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-6 border-t border-zinc-900 text-center">
          <p className="text-zinc-700 text-xs font-mono">
            Uses free public APIs — no API keys required · Results downloadable as .json
          </p>
        </div>
      </div>
    </div>
  );
}
