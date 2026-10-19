// src/pages/Activity/Activity.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Button, DatePicker, Input, Select, Table, Tag, message } from "antd";
import api from "../../lib/api";
import { useUsersContext } from "../../contexts/UsersContext";
import { ROLE_LABELS, canManagePeople } from "../../lib/roles";
import "./Activity.css";

const PAGE_SIZE = 100;

// What an entry is about (the "entity_type" of the log). One word per area of the dashboard.
const AREA_OPTIONS = [
  { value: "", label: "Everything" },
  { value: "users", label: "People" },
  { value: "students", label: "Students" },
  { value: "vans", label: "Vehicles" },
  { value: "schools", label: "Schools" },
  { value: "planner", label: "Pickup planner" },
  { value: "contacts", label: "Parents / contacts" },
  { value: "settings", label: "Settings" },
  { value: "login", label: "Sign-ins" },
];

// Names of the tables, for the sentences ("Edited a school")
const TABLE_NAMES = {
  students: "student",
  vans: "vehicle",
  schools: "school",
  contacts: "contact",
  students_address: "address",
  students_schedule: "weekly schedule",
  student_family: "family link",
  student_details: "student detail",
  settings: "setting",
  events: "event",
  pictures: "picture",
  routes: "route",
  route_vans: "route vehicle",
  route_stops: "route stop",
};
const VERBS = { create: "Created", update: "Edited", delete: "Deleted" };

// Entries written by the code that did the change
const ACTIONS = {
  login: "Signed in",
  "login.failed": "Failed sign-in attempt",
  "invite.accepted": "Accepted the invite and signed in",
  "user.create": "Created an account",
  "user.update": "Edited a person",
  "user.invite": "Sent an invite",
  "user.deactivate": "Deactivated a person",
  "user.reactivate": "Reactivated a person",
  "student.deactivate": "Archived a student",
  "student.reactivate": "Reactivated a student",
  "van.deactivate": "Deactivated a vehicle",
  "van.reactivate": "Reactivated a vehicle",
  "van.delete": "Deleted a vehicle",
};

// Entries written by the safety net: "METHOD /route"
const REQUESTS = {
  "PUT /planner/pickup/{date}": "Saved the pickup plan",
  "POST /planner/pickup/{date}/send": "Sent the pickup plan to the staff",
  "POST /planner/pickup/{date}/reopen": "Reopened the pickup plan",
  "POST /contacts/{contactId}/invite": "Sent an invite to a parent",
  "POST /students/{studentId}/addresses": "Added an address",
  "PUT /students/{studentId}/addresses/{addressId}": "Changed an address",
  "PUT /students/{studentId}/addresses/{addressId}/default": "Chose the current address",
  "DELETE /students/{studentId}/addresses/{addressId}": "Removed an address",
  "POST /students/{studentId}/contacts": "Added a contact",
  "PUT /students/{studentId}/contacts/{contactId}": "Changed a contact",
  "DELETE /students/{studentId}/contacts/{contactId}": "Removed a contact",
  "DELETE /students/{studentId}": "Erased a student for good",
  "DELETE /files/{bucket}/{name}": "Deleted a file",
  "POST /app/students/{id}/dismissal-photos": "Added a dismissal photo",
};

const isDenied = (entry) => entry.action.startsWith("denied: ");

// The sentence that says what happened
function describe(entry) {
  const action = entry.action.replace(/^denied: /, "");
  if (ACTIONS[action]) return ACTIONS[action];
  if (REQUESTS[action]) return REQUESTS[action];

  // "schools.update", "students_address.create"...
  const dot = action.lastIndexOf(".");
  if (dot > 0) {
    const table = action.slice(0, dot);
    const verb = VERBS[action.slice(dot + 1)];
    if (verb) return `${verb} ${/^[aeiou]/.test(TABLE_NAMES[table] || table) ? "an" : "a"} ${TABLE_NAMES[table] || table}`;
  }
  return action; // an action we have no sentence for: the raw text is still the truth
}

// A value of the details, readable
const show = (value) => {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

function Details({ entry }) {
  const d = entry.details || {};
  const lines = [];

  if (d.changes) {
    Object.entries(d.changes).forEach(([field, change]) =>
      lines.push(
        <div key={field}>
          <strong>{field}</strong>: <span className="activity-old">{show(change.from)}</span> →{" "}
          <span className="activity-new">{show(change.to)}</span>
        </div>,
      ),
    );
  }
  [["values", "Created with"], ["deleted", "Deleted data"]].forEach(([key, title]) => {
    if (d[key]) {
      lines.push(
        <div key={key}>
          <em>{title}:</em>
          {Object.entries(d[key]).map(([field, value]) => (
            <div key={field} className="activity-indent">
              <strong>{field}</strong>: {show(value)}
            </div>
          ))}
        </div>,
      );
    }
  });
  if (d.rows) {
    lines.push(
      <div key="rows">
        <em>{d.count} row(s) deleted{d.count > d.rows.length ? ` (the first ${d.rows.length} are shown)` : ""}:</em>
        {d.rows.map((row, index) => (
          <div key={index} className="activity-indent">{show(row)}</div>
        ))}
      </div>,
    );
  }
  if (d.reason) {
    lines.push(
      <div key="reason">
        <strong>Reason</strong>: {d.reason}
        {d.note ? ` — ${d.note}` : ""}
      </div>,
    );
  }
  if (d.type || d.email) {
    lines.push(<div key="who">{[d.type, d.email].filter(Boolean).join(" · ")}</div>);
  }
  if (d.app) lines.push(<div key="app"><strong>App</strong>: {d.app}</div>);
  if (d.method) {
    lines.push(
      <div key="request">
        <strong>Request</strong>: {d.method} {d.path} (answer {d.status})
      </div>,
    );
  }
  if (entry.ip) lines.push(<div key="ip" className="activity-muted">From {entry.ip}</div>);

  return <div className="activity-details">{lines.length ? lines : "No more details."}</div>;
}

function Activity({ closeMenu }) {
  const { dbUser, users } = useUsersContext();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [text, setText] = useState("");
  const [area, setArea] = useState("");
  const [actor, setActor] = useState(undefined);
  const [range, setRange] = useState(null); // [dayjs, dayjs]

  // Only the people of the team are worth choosing in the filter
  const people = (users || []).filter((user) => ROLE_LABELS[(user.userType || "").toLowerCase()]);

  const load = useCallback(
    async (before) => {
      setLoading(true);
      try {
        const params = { limit: PAGE_SIZE };
        if (text.trim()) params.q = text.trim();
        if (area) params.entityType = area;
        if (actor) params.actor = actor;
        if (range?.[0]) params.from = range[0].format("YYYY-MM-DD");
        if (range?.[1]) params.to = range[1].format("YYYY-MM-DD");
        if (before) params.before = before;

        const { data } = await api.get("/audit", { params });
        setEntries((previous) => (before ? [...previous, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
      } catch (error) {
        console.error("Activity error:", error);
        message.error("Could not load the activity.");
      } finally {
        setLoading(false);
      }
    },
    [text, area, actor, range],
  );

  // Reloads when a filter changes (the text waits until the person stops typing)
  useEffect(() => {
    const timer = setTimeout(() => load(), 350);
    return () => clearTimeout(timer);
  }, [load]);

  if (!canManagePeople(dbUser)) {
    return (
      <div className={`app-page ${closeMenu ? "menu-closed" : "menu-open"}`}>
        <h2 className="app-page-title">Activity</h2>
        <p>Only the owner and the managers can see the activity.</p>
      </div>
    );
  }

  const columns = [
    {
      title: "When",
      dataIndex: "at",
      width: 175,
      render: (at) => new Date(at).toLocaleString(),
    },
    {
      title: "Who",
      width: 200,
      render: (_, entry) =>
        entry.actor_name ? (
          <>
            {entry.actor_name}{" "}
            {entry.actor_role && <Tag>{ROLE_LABELS[entry.actor_role] || entry.actor_role}</Tag>}
          </>
        ) : (
          <span className="activity-muted">unknown</span>
        ),
    },
    {
      title: "What",
      render: (_, entry) => (
        <>
          {describe(entry)}
          {isDenied(entry) && <Tag color="red" style={{ marginLeft: 8 }}>Blocked</Tag>}
          {entry.action === "login.failed" && <Tag color="red" style={{ marginLeft: 8 }}>Failed</Tag>}
        </>
      ),
    },
    {
      title: "About",
      dataIndex: "entity_label",
      render: (label) => label || <span className="activity-muted">—</span>,
    },
  ];

  return (
    <div className={`app-page ${closeMenu ? "menu-closed" : "menu-open"}`}>
      <div className="app-page-header">
        <h2 className="app-page-title">Activity</h2>
        <div className="app-page-controls">
          <Input
            placeholder="Search a name or an action"
            value={text}
            onChange={(e) => setText(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Select
            value={actor}
            onChange={setActor}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Anyone"
            style={{ width: 200 }}
            options={people.map((user) => ({ value: user.id, label: user.name || user.email }))}
          />
          <Select value={area} onChange={setArea} options={AREA_OPTIONS} style={{ width: 170 }} />
          <DatePicker.RangePicker value={range} onChange={setRange} />
        </div>
      </div>

      <Table
        rowKey="id"
        size="small"
        loading={loading && entries.length === 0}
        columns={columns}
        dataSource={entries}
        pagination={false}
        expandable={{ expandedRowRender: (entry) => <Details entry={entry} /> }}
        locale={{ emptyText: "Nothing recorded with these filters." }}
      />

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button loading={loading} onClick={() => load(entries[entries.length - 1].id)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default Activity;
