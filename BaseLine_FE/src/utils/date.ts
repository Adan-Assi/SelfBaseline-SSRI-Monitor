// --- Date formatting --------------------
export function formatHomeDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime12h(date = new Date()) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";

  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${m} ${ampm}`;
}

// --- Date serialization --------------------
// Local "YYYY-MM-DD" based on device timezone
export function toISODateLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

// Returns "HH:MM" in 24-hour format
export function toHHMM(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");

  return `${h}:${m}`;
}

// --- Check-in label --------------------
export function formatNextCheckinLabel(
  value: string | number | Date | null | undefined,
) {
  if (!value) return "-";

  if (value instanceof Date) {
    return formatTime12h(value);
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : formatTime12h(d);
  }

  const raw = String(value).trim();

  // HH:mm
  if (/^\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return formatTime12h(d);
  }

  // ISO / datetime string
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return formatTime12h(d);
  }

  return raw;
}
