"use client";
import { useState } from "react";

interface JsonViewerProps {
  data: unknown;
  filename?: string;
}

export default function JsonViewer({ data, filename = "osint-result" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">output.json</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400 transition-colors cursor-pointer"
          >
            {copied ? "✓ Copied" : "Copy JSON"}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Download .json
          </button>
        </div>
      </div>
      <pre className="json-pre p-4 bg-zinc-950 text-green-400 overflow-x-auto max-h-96 overflow-y-auto">
        {jsonString}
      </pre>
    </div>
  );
}
