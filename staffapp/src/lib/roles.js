// src/lib/roles.js
// The people who run the school (they also work in the dashboard) may change a few simple things
// about a student from the app. The API still checks the role on every request: this only decides
// what the screens show.
const EDITORS = ["owner", "manager", "admin", "superadmin"];

export const canEditStudents = (user) =>
  EDITORS.includes((user?.userType || "").toLowerCase());
