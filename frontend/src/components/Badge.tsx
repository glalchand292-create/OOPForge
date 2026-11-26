import React from "react";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger";

const STYLES: Record<Variant, string> = {
  neutral:
    "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-rose-500/30",
};

export function difficultyVariant(diff: string): Variant {
  const d = diff.toLowerCase();
  if (d.includes("easy") || d.includes("beginner")) return "success";
  if (d.includes("hard") || d.includes("advanced") || d.includes("tricky")) return "danger";
  if (d.includes("medium") || d.includes("intermediate") || d.includes("mixed")) return "warning";
  return "accent";
}

export function statusVariant(status: string): Variant {
  const s = status.toLowerCase();
  if (s.includes("completed") || s.includes("solved") || s.includes("passed") || s.includes("correct"))
    return "success";
  if (s.includes("progress") || s.includes("pending")) return "accent";
  if (s.includes("revision") || s.includes("skipped")) return "warning";
  if (s.includes("incorrect") || s.includes("wrong") || s.includes("error") || s.includes("exceeded"))
    return "danger";
  return "neutral";
}

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}> = ({ children, variant = "neutral", className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border ${STYLES[variant]} ${className}`}
  >
    {children}
  </span>
);
