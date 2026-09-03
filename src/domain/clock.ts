/**
 * The demo runs against a fixed clock so that findings, staleness checks and
 * completeness scores are reproducible across reloads and across machines.
 * Replace with the real clock when the platform stops being a simulation.
 */
export const DEMO_NOW = new Date("2026-09-03T10:00:00.000Z");

export function demoNowIso(): string {
  return new Date().toISOString();
}

/** Current Indian financial year label, e.g. "2026-2027". */
export function currentAssessmentYear(now: Date = DEMO_NOW): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 = Jan
  const start = month >= 3 ? year : year - 1;
  return `${start}-${start + 1}`;
}

/** Parses dd/mm/yyyy, yyyy-mm-dd and "01/04/2004" style strings. */
export function parseIndianDate(raw: string): Date | null {
  const dmy = raw.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
    );
  }
  return null;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
