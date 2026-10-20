// src/lib/today.js
// What the lists that show "who is here today" have in common.

// The groups of the day, in the order they appear.
// "checked_in" = HERE (picked up, or arrived); "checked_out" = went home (a parent took the kid).
export const GROUPS = [
  { key: "checked_in", title: "At the ASP", color: "#198754" },
  { key: "waiting", title: "Expected, not here yet", color: "#fd7e14" },
  { key: "checked_out", title: "Went home", color: "#6c757d" },
  { key: "absent", title: "Absent today", color: "#dc3545" },
  { key: "none", title: "Not coming today", color: "#adb5bd" },
];

// "2026-10-19" -> "October 19 · Monday" (read at noon, so the day never moves with the timezone)
export const formatDay = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  const dayAndMonth = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return `${dayAndMonth} · ${weekday}`;
};

export const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// Splits the kids into the groups of the day. Until the day is known ("unknown") it is one plain list.
//   kids      the kids to show (already searched)
//   statusOf  (kid) => "checked_in" | "waiting" | "checked_out" | "absent" | "none" | "unknown"
//   filter    "all", or the key of one group
//   compare   how to sort inside a group (by name when it is not given)
export function groupKids(kids, statusOf, filter = "all", compare) {
  const sort =
    compare || ((a, b) => (a.name || "").localeCompare(b.name || ""));

  if (kids.length > 0 && statusOf(kids[0]) === "unknown") {
    return [
      {
        key: "all",
        title: "Students",
        color: "#6c757d",
        data: [...kids].sort(sort),
      },
    ];
  }

  return GROUPS.filter((group) => filter === "all" || filter === group.key)
    .map((group) => ({
      ...group,
      data: kids.filter((kid) => statusOf(kid) === group.key).sort(sort),
    }))
    .filter((section) => section.data.length > 0);
}
