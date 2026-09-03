import type { ReactNode } from "react";
import type { Severity } from "@/domain/types";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <As
      className={cx(
        "rounded-[14px] border border-ink-700 bg-ink-900",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-ink-100">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-ink-400">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-400 disabled:bg-ink-700 disabled:text-ink-400",
  secondary:
    "border border-ink-600 bg-ink-800 text-ink-100 hover:border-ink-500 hover:bg-ink-700 disabled:text-ink-500",
  ghost:
    "text-ink-300 hover:bg-ink-800 hover:text-ink-100 disabled:text-ink-600",
  danger:
    "border border-critical-500/40 bg-critical-500/10 text-critical-500 hover:bg-critical-500/20",
};

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  type = "button",
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
        "disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "verified" | "attention" | "critical" | "graph";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-ink-600 bg-ink-800 text-ink-300",
    brand: "border-brand-500/40 bg-brand-500/10 text-brand-300",
    verified: "border-verified-500/40 bg-verified-500/10 text-verified-500",
    attention: "border-attention-500/40 bg-attention-500/10 text-attention-500",
    critical: "border-critical-500/40 bg-critical-500/10 text-critical-500",
    graph: "border-graph-500/40 bg-graph-500/10 text-graph-500",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const SEVERITY_TONE: Record<
  Severity,
  "critical" | "attention" | "brand"
> = {
  critical: "critical",
  attention: "attention",
  info: "brand",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Professional review",
  attention: "Needs attention",
  info: "Informational",
};

export function ConfidenceBar({
  value,
  showLabel = true,
}: {
  value: number;
  showLabel?: boolean;
}) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.92
      ? "bg-verified-500"
      : value >= 0.85
        ? "bg-brand-500"
        : "bg-attention-500";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-700"
        role="img"
        aria-label={`Extraction confidence ${pct} percent`}
      >
        <div className={cx("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      {showLabel ? (
        <span className="font-mono text-[11px] text-ink-400">{pct}%</span>
      ) : null}
    </div>
  );
}

export function Meter({
  value,
  label,
  tone = "brand",
}: {
  value: number;
  label?: string;
  tone?: "brand" | "verified" | "attention" | "critical";
}) {
  const tones = {
    brand: "bg-brand-500",
    verified: "bg-verified-500",
    attention: "bg-attention-500",
    critical: "bg-critical-500",
  };
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-700">
        <div
          className={cx("h-full rounded-full transition-[width] duration-500", tones[tone])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {label ? <p className="mt-1.5 text-xs text-ink-400">{label}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "verified" | "attention" | "critical";
}) {
  const valueTone: Record<string, string> = {
    neutral: "text-ink-100",
    verified: "text-verified-500",
    attention: "text-attention-500",
    critical: "text-critical-500",
  };
  return (
    <Panel className="px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-ink-400 uppercase">
        {label}
      </p>
      <p className={cx("mt-2 text-2xl font-semibold tracking-tight", valueTone[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-ink-400">{hint}</p> : null}
    </Panel>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-ink-500">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-ink-200">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-ink-400">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-300">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-ink-100 " +
  "placeholder:text-ink-500 focus:border-brand-500 focus:outline-2 focus:outline-offset-0 focus:outline-brand-500/40";

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-ink-700 bg-ink-850 px-4 py-3 text-[11px] leading-relaxed text-ink-400">
      {children}
    </p>
  );
}

export function KeyValue({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="divide-y divide-ink-700">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 py-2.5"
        >
          <dt className="text-xs text-ink-400">{row.label}</dt>
          <dd className="text-right text-xs font-medium text-ink-100">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
