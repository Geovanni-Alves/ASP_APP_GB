// src/lib/roles.js
// The roles of the team and what each one may do. The API decides for real (it checks the role on
// every request); this file only decides what the screens show. When a rule changes, change it
// here AND in Roles.java.
//
//   superadmin  the programmer: everything, and nobody else sees this account
//   owner       ONE person: creates and deactivates managers, admins, staff and drivers
//   manager     creates and deactivates admins, staff and drivers
//   admin       a trusted person: the same work in the dashboard as a manager, but does not manage people
//   staff       the staff app only
//   driver      the staff app only

export const ROLE_LABELS = {
  superadmin: "Super admin",
  owner: "Owner",
  manager: "Manager",
  admin: "Admin",
  staff: "Staff",
  driver: "Driver",
};

// A person only manages people of a LOWER level than their own
const LEVELS = { superadmin: 5, owner: 4, manager: 3, admin: 2, staff: 1, driver: 1 };

const DASHBOARD_ROLES = ["owner", "manager", "admin", "superadmin"];
const PEOPLE_MANAGERS = ["owner", "manager", "superadmin"];

export const roleOf = (user) => (user?.userType || "").toLowerCase();
const levelOf = (role) => LEVELS[(role || "").toLowerCase()] || 0;

// Who may open the dashboard (staff and drivers only use the staff app)
export const canUseDashboard = (user) => DASHBOARD_ROLES.includes(roleOf(user));

// Who may create, edit, invite and deactivate people (and read the activity log)
export const canManagePeople = (user) => PEOPLE_MANAGERS.includes(roleOf(user));

// May this person manage that one?
export const canManage = (actor, target) =>
  canManagePeople(actor) &&
  levelOf(roleOf(target)) > 0 &&
  levelOf(roleOf(target)) < levelOf(roleOf(actor));

// The account types this person may give to others, highest first: [{ value: "MANAGER", label: "Manager" }, ...]
export const assignableTypes = (actor) =>
  Object.keys(LEVELS)
    .filter((role) => canManage(actor, { userType: role }))
    .sort((a, b) => LEVELS[b] - LEVELS[a])
    .map((role) => ({ value: role.toUpperCase(), label: ROLE_LABELS[role] }));
