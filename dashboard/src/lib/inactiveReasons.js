// src/lib/inactiveReasons.js
// Why something was deactivated. The API checks the same lists (InactiveReasons.java):
// when you change a list here, change it there too.

export const STUDENT_REASONS = [
  "Left the program",
  "Moved away",
  "Changed school",
  "Graduated / aged out",
  "Seasonal pause",
  "Other",
];

export const STAFF_REASONS = [
  "Resigned",
  "Contract ended",
  "Seasonal pause",
  "Dismissed",
  "Other",
];

export const VAN_REASONS = [
  "Sold",
  "Out of service (repairs)",
  "Retired",
  "Other",
];
