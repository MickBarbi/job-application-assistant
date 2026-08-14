"use client";

/**
 * Small copy-to-clipboard button with transient "Copied" feedback. Used for
 * copy-ready snippets and generated cover letters.
 */
import { useState } from "react";
import { useToast } from "@/components/feedback/ToastProvider";

export function CopyButton({
  value,
  label = "Copy",
  className = "btn-secondary",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Couldn't copy — copy manually instead.", "error");
    }
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? "Copied ✓" : label}
    </button>
  );
}
