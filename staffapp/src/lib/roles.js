// src/lib/roles.js
// The people who run the school (they also work in the dashboard) may change a few simple things
// about a student from the app. The API still checks the role on every request: this only decides
// what the screens show.
const EDITORS = ["owner", "manager", "admin", "superadmin"];

export const canEditStudents = (user) =>
  EDITORS.includes((user?.userType || "").toLowerCase());

// The names of the people who registered the check-in, the check-out and the absence of a kid are only
// for the people who run the school: the owner, the managers and the programmer (the API refuses the
// rest: this only decides if the button is shown)
const SUPERVISORS = ["owner", "manager", "superadmin"];

export const canSeeWhoRegistered = (user) =>
  SUPERVISORS.includes((user?.userType || "").toLowerCase());
