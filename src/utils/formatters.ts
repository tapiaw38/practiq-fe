type DateFormatOptions = Intl.DateTimeFormatOptions;

const ES_LOCALE = "es";

export function formatDate(
  dateStr?: string,
  options: DateFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  fallback = "—",
) {
  if (!dateStr) return fallback;
  return new Date(dateStr).toLocaleDateString(ES_LOCALE, options);
}

export function formatDateTime(dateStr?: string, fallback = "—") {
  return formatDate(
    dateStr,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    fallback,
  );
}

export function formatShortDate(dateStr?: string, fallback = "-") {
  return formatDate(
    dateStr,
    {
      month: "short",
      day: "numeric",
    },
    fallback,
  );
}

export function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  return `hace ${diffDays}d`;
}

export function formatDuration(secs: number) {
  const safeSecs = Math.max(0, Math.floor(secs));
  const minutes = Math.floor(safeSecs / 60).toString().padStart(2, "0");
  const seconds = (safeSecs % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatAIFeedback(value?: string) {
  const feedback = (value || "").trim();
  if (!feedback) return "Sin observaciones de IA";
  if (feedback.includes("UNREADABLE")) return "Respuesta no legible por IA";
  return feedback;
}
