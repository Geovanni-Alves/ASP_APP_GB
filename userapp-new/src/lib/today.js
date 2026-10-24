// src/lib/today.js
// How a child's day is shown to the family.
export const STATUS = {
  checked_in: { label: "At the ASP", color: "#146c43", bg: "#d1e7dd" },
  waiting: { label: "Expected today", color: "#8a5a00", bg: "#fff3cd" },
  checked_out: { label: "Went home", color: "#0a58ca", bg: "#cfe2ff" },
  absent: { label: "Absent today", color: "#b02a37", bg: "#f8d7da" },
  none: { label: "Not scheduled today", color: "#6c757d", bg: "#e9ecef" },
};

export const statusOf = (kid) => STATUS[kid?.today?.status] || STATUS.none;

// "3:05 PM"
export const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

// The small line under the status: since when, or until when, and who did it
export const detailOf = (kid) => {
  const today = kid?.today;
  if (!today) return "";
  const by = (name) => (name ? ` · ${name}` : "");

  if (today.status === "checked_in" && today.checked_in_at) {
    return `Since ${formatTime(today.checked_in_at)}${by(today.checked_in_by)}`;
  }
  if (today.status === "checked_out" && today.checked_out_at) {
    return `Left at ${formatTime(today.checked_out_at)}${by(today.checked_out_by)}`;
  }
  if (today.status === "absent") {
    if (today.absent_by_family) return "Marked by you";
    return today.absent_by ? `Marked by ${today.absent_by}` : "";
  }
  return "";
};

export const WEEK_DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
];

// The feed has the clock of the program ("2026-10-22T15:05:00.123456", no time zone). The microseconds are cut
// to milliseconds, which is what the phone understands.
export const parseLocal = (value) =>
  value ? new Date(String(value).replace(/(\.\d{3})\d+/, "$1")) : null;

// "Today", "Yesterday" or "Wed, Oct 22"
export const dayLabel = (value) => {
  const day = parseLocal(value);
  if (!day || Number.isNaN(day.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return "Today";
  if (day.toDateString() === yesterday.toDateString()) return "Yesterday";
  return day.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const dayKey = (value) => parseLocal(value)?.toDateString() || "";

export const timeOf = (value) => {
  const date = parseLocal(value);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";
};
