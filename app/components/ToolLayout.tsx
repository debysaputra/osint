import Link from "next/link";

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: string;
  children: React.ReactNode;
}

export default function ToolLayout({ title, description, icon, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-green-400 transition-colors mb-6"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{icon}</span>
            <h1 className="text-2xl font-bold text-green-400 terminal-glow font-mono">{title}</h1>
          </div>
          <p className="text-zinc-400 text-sm">{description}</p>
          <div className="mt-3 h-px bg-gradient-to-r from-green-500/50 to-transparent" />
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
