// src/pages/StudentWeeklySchedule.jsx
import React, { useMemo, useState } from "react";
import { Card, Spin, Input, Select } from "antd";
import { useKidsContext } from "../../contexts/KidsContext";
import "./StudentWeeklySchedule.scss";

const { Option } = Select;
const { Search } = Input;

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const schedKey = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
};

export default function StudentWeeklySchedule({ closeMenu }) {
  const { kids: students } = useKidsContext();

  /* filter states */
  const [sortBy, setSortBy] = useState("school"); // name | school
  const [search, setSearch] = useState(""); // text search
  const [dayFilter, setDayFilter] = useState(0); // 0 = any, 1 … 5 exact count

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

  /* ---------- loading ---------- */
  if (!students.length) {
    return (
      <div className="students-container">
        <Spin tip="Loading schedule…" />
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <div
      className={`students-container ${
        closeMenu ? "menu-closed" : "menu-open"
      }`}
    >
      <Card className="scheduleCard student-weekly-card">
        <h1>Student Weekly Schedule</h1>

        {/* filters */}
        <div className="schedule-filters">
          <Search
            placeholder="Search student or school"
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

        <div className="tableWrapper">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>School</th>
                {daysOfWeek.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((kid) => (
                <tr key={kid.id}>
                  <td>{kid.name}</td>
                  <td>{kid.schools?.name || "—"}</td>
                  {daysOfWeek.map((d) => (
                    <td key={d}>{scheduleTemplate[kid.id][d] ? "✓" : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
