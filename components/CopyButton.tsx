"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  label: string;
  /** Path on this site, e.g. /r/abc. The browser's origin is added in front. */
  path: string;
  /** Optional text before the link, e.g. a WhatsApp greeting. */
  before?: string;
};

export function CopyButton({ label, path, before = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState("");

  async function copy() {
    const text = `${before}${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(text);
      setFallback("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallback(text); // clipboard blocked (old browser or http): let them copy by hand
    }
  }

  return (
    <div>
      <button type="button" onClick={copy} className="btn-outline w-full sm:w-auto">
        {copied ? <Check aria-hidden className="size-5 text-pitch" /> : <Copy aria-hidden className="size-5" />}
        <span aria-live="polite">{copied ? "Copied" : label}</span>
      </button>
      {fallback && (
        <p className="mt-2 text-sm">
          Copy didn&apos;t work. Press and hold to copy: <span className="break-all font-mono select-all">{fallback}</span>
        </p>
      )}
    </div>
  );
}
