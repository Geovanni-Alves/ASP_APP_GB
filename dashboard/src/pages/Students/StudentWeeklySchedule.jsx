// src/pages/Students/StudentWeeklySchedule.jsx
import React, { useMemo, useState } from "react";
import { Spin, Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useKidsContext } from "../../contexts/KidsContext";
import "./StudentWeeklySchedule.scss";

const { Option } = Select;

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const schedKey = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
};

export default function StudentWeeklySchedule({ closeMenu }) {
  const { kids } = useKidsContext();

  // Archived students are not part of the weekly schedule
  const students = useMemo(
    () => kids.filter((kid) => kid.status !== "Inactive"),
    [kids],
  );

  /* filter states */
  const [sortBy, setSortBy] = useState("school"); // name | school
  const [search, setSearch] = useState(""); // text search
  const [dayFilter, setDayFilter] = useState(0); // 0 = any, 1 … 5 exact count

  /* build schedule lookup {id:{Mon:true…}} */
  const scheduleTemplate = useMemo(() => {
    const out = {};
    students.forEach((kid) => {
      const row = kid.students_schedule || {};
      out[kid.id] = {};
      daysOfWeek.forEach((d) => (out[kid.id][d] = !!row[schedKey[d]]));
    });
    return out;
  }, [students]);

  /* sort then filter */
  const displayed = useMemo(() => {
    const text = search.toLowerCase();

    const byDays = (kid) =>
      daysOfWeek.reduce((n, d) => (scheduleTemplate[kid.id][d] ? n + 1 : n), 0);

    return [...students]
      .sort((a, b) => {
        if (sortBy === "school") {
          const aS = a.schools?.name || "";
          const bS = b.schools?.name || "";
          return aS.localeCompare(bS);
        }
        return a.name.localeCompare(b.name);
      })
      .filter((kid) => {
        const nameMatch = kid.name.toLowerCase().includes(text);
        const schoolMatch = (kid.schools?.name || "")
          .toLowerCase()
          .includes(text);
        const textOK = !text || nameMatch || schoolMatch;

        const daysOK =
          dayFilter === 0 ? true : byDays(kid) === Number(dayFilter);

        return textOK && daysOK;
      });
  }, [students, sortBy, search, dayFilter, scheduleTemplate]);

  const totalShown = displayed.length;
  // How many kids come on each weekday (of the kids shown)
  const dayTotals = daysOfWeek.map(
    (d) => displayed.filter((kid) => scheduleTemplate[kid.id][d]).length,
  );
  const menuClass = closeMenu ? "menu-closed" : "menu-open";

  /* ---------- loading ---------- */
  if (!kids.length) {
    return (
      <div className={`app-page ${menuClass}`}>
        <Spin tip="Loading schedule…" />
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <div className={`app-page ${menuClass}`}>
      <div className="app-page-header">
        <h2 className="app-page-title">Student Weekly Schedule</h2>

        <div className="app-page-controls">
          <Input
            placeholder="Search student or school"
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />

          <Select value={sortBy} onChange={setSortBy} style={{ width: 160 }}>
            <Option value="name">Order by Name</Option>
            <Option value="school">Order by School</Option>
          </Select>

          <Select
            value={dayFilter}
            onChange={setDayFilter}
            style={{ width: 140 }}
          >
            <Option value={0}>Any days</Option>
            <Option value={1}>1 day / wk</Option>
            <Option value={2}>2 days / wk</Option>
            <Option value={3}>3 days / wk</Option>
            <Option value={4}>4 days / wk</Option>
            <Option value={5}>5 days / wk</Option>
          </Select>

          <span className="total-count">Total Students: {totalShown}</span>
        </div>
      </div>

      <div className="tableWrapper">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="name-cell">Student</th>
              <th className="school-cell">School</th>
              {daysOfWeek.map((d) => (
                <th key={d} className="day-cell">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((kid) => (
              <tr key={kid.id}>
                <td className="name-cell">{kid.name}</td>
                <td className="school-cell">{kid.schools?.name || "—"}</td>
                {daysOfWeek.map((d) => (
                  <td key={d} className="day-cell">
                    {scheduleTemplate[kid.id][d] ? (
                      <span className="schedule-dot">✓</span>
                    ) : (
                      ""
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="foot-label">
                Kids per day
              </td>
              {dayTotals.map((total, index) => (
                <td key={daysOfWeek[index]} className="day-cell">
                  {total}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        {displayed.length === 0 && (
          <p className="schedule-empty">No students match.</p>
        )}
      </div>
    </div>
  );
}
