import React, { useState, useMemo, useEffect } from "react";
import { Card, DatePicker, Spin, Collapse, Tag, message } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import supabase from "../lib/supabase";
import { useKidsContext } from "../contexts/KidsContext";
import "./PickupPlanner.scss";

dayjs.extend(isoWeek);
const { Panel } = Collapse;
const getDismissal = (kid) =>
  kid.dismissalTime || kid.schools?.dismissal_time || "—";

/* ------------ Weekday map ------------- */
const dayMap = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
};

/* helper: today if Mon–Fri, otherwise next Monday */
const nextBusinessDay = () => {
  const today = dayjs();
  const wd = today.isoWeekday(); // 1 = Mon … 7 = Sun
  return wd >= 6 ? today.add(8 - wd, "day") : today;
};

export default function PickupPlanner({ closeMenu }) {
  const { kids: students } = useKidsContext();

  /* ------------ local state ------------ */
  const [selectedDate, setSelectedDate] = useState(nextBusinessDay());
  const [absents, setAbsents] = useState([]);
  const [assigned, setAssigned] = useState({}); // { vanId: [kid…] }
  const [vans, setVans] = useState([]); // fetched from DB
  const [loadingVans, setLoadingVans] = useState(true);
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [schoolOrder, setSchoolOrder] = useState({});

  /* ------------ fetch vans ------------ */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("vans")
        .select("*")
        .order("name");
      if (!error) setVans(data);
      setLoadingVans(false);
    })();
  }, []);

  /* ------------ fetch staff ------------ */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("userType", "STAFF")
        .order("name");
      if (!error) setStaff(data || []);
      setLoadingStaff(false);
    })();
  }, []);

  /* ------------ helpers ------------ */
  const vanIdSet = useMemo(() => new Set(vans.map((v) => v.id)), [vans]);
  const isVan = (id) => vanIdSet.has(id);

  /* ------------ day / kid filters ------------ */
  const selectedDay = useMemo(
    () => dayMap[selectedDate.isoWeekday()] ?? null,
    [selectedDate]
  );

  const studentsToday = useMemo(
    () =>
      !selectedDay
        ? []
        : students.filter((k) => k.students_schedule?.[selectedDay]),
    [students, selectedDay]
  );

  const assignedIds = useMemo(
    () =>
      new Set(
        Object.values(assigned)
          .flat()
          .map((e) => e.kid.id)
      ),
    [assigned]
  );
  const absentIds = useMemo(() => new Set(absents.map((k) => k.id)), [absents]);

  const groupedBySchool = useMemo(() => {
    const groups = {};
    studentsToday.forEach((kid) => {
      if (assignedIds.has(kid.id) || absentIds.has(kid.id)) return;
      const school = kid.schools?.name || "— No School —";
      (groups[school] ??= []).push(kid);
    });
    return groups;
  }, [studentsToday, assignedIds, absentIds]);

  // count how many kids per day (remain)
  const kidsRemaining = useMemo(
    () =>
      Object.values(groupedBySchool).reduce((sum, arr) => sum + arr.length, 0),
    [groupedBySchool]
  );

  const kidsOnRoute = useMemo(
    () => Object.values(assigned).reduce((sum, arr) => sum + arr.length, 0),
    [assigned]
  );

  // count absents and staff
  const absentsCount = absents.length;
  const staffPoolCount = staff.length;
  const dayLabel = selectedDate.format("dddd"); // e.g. Monday
  const totalKidsToday = studentsToday.length; // all kids scheduled for that day
  const totalSchoolsToday = Object.keys(groupedBySchool).length; // distinct schools

  /* ────────────────────────────────────────────
   Remove orphan school IDs whenever kids move
──────────────────────────────────────────── */
  useEffect(() => {
    setSchoolOrder((prev) => {
      let changed = false;
      const next = { ...prev };

      Object.keys(prev).forEach((vanId) => {
        /* collect the schools that still have kids in that van */
        const present = new Set(
          (assigned[vanId] || []).map((e) => e.kid.schools?.id ?? "no-school")
        );

        /* drop any ids that are no longer present */
        if (next[vanId]) {
          const filtered = next[vanId].filter((id) => present.has(id));
          if (filtered.length !== next[vanId].length) {
            next[vanId] = filtered;
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [assigned]);

  const addSchoolToOrder = (vanId, schoolId) =>
    setSchoolOrder((prev) => {
      const list = prev[vanId] || [];
      return list.includes(schoolId)
        ? prev
        : { ...prev, [vanId]: [...list, schoolId] };
    });

  function returnKid(kid, fromVanId = null) {
    // remove from absents
    setAbsents((prev) => prev.filter((k) => k.id !== kid.id));

    // remove from a van, if given
    if (fromVanId) {
      setAssigned((prev) => {
        const updated = { ...prev };
        updated[fromVanId] = updated[fromVanId].filter(
          (e) => e.kid.id !== kid.id
        );
        return updated;
      });
    }
  }

  /* ---------------- drag-and-drop handler ---------------- */
  const handleDragEnd = ({ source, destination, draggableId, type }) => {
    if (!destination) return;
    if (
      type === "staff" &&
      !destination.droppableId.startsWith("resp-") /* NEW */
    ) {
      return; // Block staff drops anywhere else
    }

    const droppingBackToSchool =
      destination.droppableId.startsWith("school-") ||
      destination.droppableId === "schools";

    if (
      droppingBackToSchool &&
      (source.droppableId === "absents" || isVan(source.droppableId))
    ) {
      return; // ignore the drop
    }

    /* ─── reorder school pills inside the same van ─── */
    if (type === "schoolOrder") {
      if (source.droppableId === destination.droppableId) {
        const vanId = source.droppableId.replace("order-", "");
        setSchoolOrder((prev) => {
          const list = [...(prev[vanId] || [])];
          const [moved] = list.splice(source.index, 1);
          list.splice(destination.index, 0, moved);
          return { ...prev, [vanId]: list };
        });
      }
      return; // nothing else to do
    }

    /* STAFF chip onto a kid row */
    if (type === "staff" && destination.droppableId.startsWith("resp-")) {
      const kidId = destination.droppableId.replace("resp-", "");
      const staffId = draggableId.replace("staff-", "");
      const staffObj = staff.find((s) => s.id === staffId);

      // 1) Find the van where this kid is assigned
      const targetVanId = Object.entries(assigned).find(([, list]) =>
        list.some((e) => e.kid.id === kidId)
      )?.[0];

      if (!targetVanId) {
        message.error("Target kid not found in any van");
        return;
      }

      const kidEntry = assigned[targetVanId].find((e) => e.kid.id === kidId);
      const targetSchoolId = kidEntry?.kid.schools?.id ?? null;

      // 2) Check if this kid already has a staff assigned
      const kidAlreadyHasStaff = kidEntry?.staff !== null;
      if (kidAlreadyHasStaff) {
        message.info(
          "This child already has a responsible. Use ↩ to remove it first."
        );
        return;
      }

      // 3) Check if the same staff is already covering another school in this van
      const sameStaffOtherSchool = assigned[targetVanId].some(
        (e) =>
          e.staff?.id === staffId &&
          (e.kid.schools?.id ?? null) !== targetSchoolId
      );

      if (sameStaffOtherSchool) {
        const allowDup = window.confirm(
          "This staff is already assigned to another school in this van. Allow duplicate?"
        );
        if (!allowDup) return;
      }

      // 4) Remove from pool if it was still there
      const isInPool = staff.some((s) => s.id === staffId);
      if (isInPool) {
        setStaff((prev) => prev.filter((s) => s.id !== staffId));
      }

      // 5) Update all kids in the same school in this van with this staff
      setAssigned((prev) => {
        const upd = { ...prev };
        upd[targetVanId] = upd[targetVanId].map((e) =>
          (e.kid.schools?.id ?? null) === targetSchoolId
            ? { ...e, staff: staffObj }
            : e
        );
        return upd;
      });

      return;
    }

    /* ---- whole school panel ---- */
    if (type === "school" && source.droppableId === "schools") {
      const kidsToMove = studentsToday.filter(
        (k) => (k.schools?.name || "— No School —") === draggableId
      );

      if (destination.droppableId === "absents") {
        setAbsents((prev) => [...prev, ...kidsToMove]);
      } else if (isVan(destination.droppableId)) {
        setAssigned((prev) => ({
          ...prev,
          [destination.droppableId]: [
            ...(prev[destination.droppableId] || []),
            ...kidsToMove.map((k) => ({ kid: k, staff: null })),
          ],
        }));
        const schoolId = kidsToMove[0]?.schools?.id ?? "no-school";
        addSchoolToOrder(destination.droppableId, schoolId);
      }
      return;
    }

    /* ---- single kid ---- */
    const kid = students.find((k) => k.id === draggableId);
    if (!kid) return;

    const sameList = source.droppableId === destination.droppableId;

    /* 1️⃣ SAME-LIST RE-ORDER  */
    if (sameList) {
      if (source.droppableId === "absents") {
        setAbsents((prev) => {
          const list = [...prev];
          const [m] = list.splice(source.index, 1);
          list.splice(destination.index, 0, m);
          return list;
        });
      } else if (isVan(source.droppableId)) {
        setAssigned((prev) => {
          const updated = { ...prev };
          const list = [...updated[source.droppableId]];
          const [m] = list.splice(source.index, 1);
          list.splice(destination.index, 0, m);
          updated[source.droppableId] = list;
          return updated;
        });
      }
      return;
    }

    /* remove from source */
    if (source.droppableId === "absents") {
      setAbsents((prev) => prev.filter((k) => k.id !== kid.id));
    } else if (isVan(source.droppableId)) {
      setAssigned((prev) => {
        const updated = { ...prev };
        updated[source.droppableId] = updated[source.droppableId].filter(
          (e) => e.kid.id !== kid.id
        );
        return updated;
      });
    }

    /* add to destination */
    if (destination.droppableId === "absents") {
      setAbsents((prev) => [...prev, kid]);
    } else if (isVan(destination.droppableId)) {
      setAssigned((prev) => {
        const list = [...(prev[destination.droppableId] || [])];

        //  look for an existing entry of this *school* in that van
        const schoolId = kid.schools?.id ?? null;
        const found = list.find(
          (e) => e.kid.schools?.id === schoolId && e.staff
        );

        list.push({ kid, staff: found ? found.staff : null }); // duplicate staff if found

        return { ...prev, [destination.droppableId]: list };
      });
      const schoolId = kid.schools?.id ?? "no-school";
      addSchoolToOrder(destination.droppableId, schoolId);
    }
  };

  /* ------------ loading screen ------------ */
  if (!students.length || loadingVans) {
    return (
      <div className="pickupContainer">
        <Spin tip="Loading…" />
      </div>
    );
  }

  /* ------------ UI ------------ */
  return (
    <div
      className={`planner-container ${closeMenu ? "menu-closed" : "menu-open"}`}
    >
      <h1>Pickup Planner</h1>

      <div>
        <DatePicker
          value={selectedDate}
          onChange={(v) => setSelectedDate(v || nextBusinessDay())}
          allowClear={false}
          disabledDate={(d) => d && d.isoWeekday() >= 6}
          style={{ marginBottom: 16 }}
        />
        <span> — {dayLabel}</span>
        <span> Kids for today {totalKidsToday - absentsCount}</span>
        <span>
          {" "}
          Kids on route {kidsOnRoute}{" "}
          {kidsRemaining === 0 && (
            <span style={{ color: "green", marginLeft: 8 }}>
              — All kids are on route
            </span>
          )}
        </span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="planner-body">
          <Card
            className="kids-card"
            title={`Kids of the Day (${kidsRemaining} kids • ${totalSchoolsToday} schools)`}
          >
            <Droppable droppableId="schools" type="school">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {Object.entries(groupedBySchool).map(
                    ([schoolName, kids], idx) => (
                      <Draggable
                        key={schoolName}
                        draggableId={schoolName}
                        index={idx}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="school-wrapper"
                          >
                            <Collapse>
                              <Panel
                                header={`${schoolName} (${kids.length})`}
                                key={schoolName}
                                extra={
                                  <span {...provided.dragHandleProps}>⠿</span>
                                }
                              >
                                <Droppable
                                  droppableId={`school-${schoolName}`}
                                  type="school"
                                  className="SchoolKidList"
                                >
                                  {(provided, snapshot) => (
                                    <ul
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={
                                        snapshot.isDraggingOver
                                          ? "dragging-over"
                                          : ""
                                      }
                                    >
                                      {kids.map((kid, i) => (
                                        <Draggable
                                          key={kid.id}
                                          draggableId={kid.id}
                                          index={i}
                                        >
                                          {(provided) => (
                                            <li
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className="kidList-row"
                                            >
                                              <div className="kid-pill">
                                                <span>{kid.name}</span>
                                                <span className="kid-time">
                                                  {getDismissal(kid)}
                                                </span>
                                              </div>
                                            </li>
                                          )}
                                        </Draggable>
                                      ))}
                                      {provided.placeholder}
                                    </ul>
                                  )}
                                </Droppable>
                              </Panel>
                            </Collapse>
                          </div>
                        )}
                      </Draggable>
                    )
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </Card>
          <Card
            className="absents-card"
            title={`Absents Drop (${absentsCount})`}
          >
            <Droppable droppableId="absents" type="school">
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`staff-pool ${
                    snapshot.isDraggingOver ? "dragging-over" : ""
                  }`}
                >
                  {absents.map((kid, idx) => (
                    <Draggable key={kid.id} draggableId={kid.id} index={idx}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="kid-pill abs-row"
                        >
                          {kid.name} — {kid.schools?.name || "—"}
                          <button
                            className="back-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              returnKid(kid);
                            }}
                          >
                            ↩
                          </button>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </Card>
          <Card
            className="staffList-card"
            title={`Staff List (${staffPoolCount})`}
          >
            {loadingStaff ? (
              <Spin tip="Loading staff…" />
            ) : (
              <Droppable
                droppableId="staffPool"
                type="staff"
                direction="horizontal"
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    // className={snapshot.isDraggingOver ? "dragging-over" : ""}
                  >
                    {staff.map((s, idx) => (
                      <Draggable
                        key={s.id}
                        draggableId={`staff-${s.id}`}
                        index={idx}
                      >
                        {(provided) => (
                          <span
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="staff-pill"
                          >
                            {s.name}
                          </span>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </Card>
          <div className="vans-card">
            {vans.map((van) => {
              const kidsInVan = assigned[van.id] || [];
              const seatsLeft = (van.seats ?? 0) - kidsInVan.length;
              const isFull = seatsLeft <= 0;

              /* ── 1. group by school ── */
              const groups = {};
              kidsInVan.forEach((e) => {
                const sid = e.kid.schools?.id ?? "no-school";
                (groups[sid] ??= []).push(e);
              });

              /* ── 2. build the ordered list ── */
              const orderedIds = (schoolOrder[van.id] || []).filter(
                (id) => groups[id]
              );
              const unorderedIds = Object.keys(groups).filter(
                (id) => !orderedIds.includes(id)
              );
              const flattened = [...orderedIds, ...unorderedIds].flatMap(
                (id) => groups[id]
              );

              const groupedByStaffAndSchool = {};
              flattened.forEach((entry) => {
                const key = `${entry.staff?.id ?? "no-staff"}--${
                  entry.kid.schools?.id ?? "no-school"
                }`;
                (groupedByStaffAndSchool[key] ??= []).push(entry);
              });

              return (
                <Card
                  key={van.id}
                  title={
                    <Droppable
                      droppableId={`order-${van.id}`}
                      type="schoolOrder"
                      direction="horizontal"
                    >
                      {(orderProvided) => (
                        <span
                          ref={orderProvided.innerRef}
                          {...orderProvided.droppableProps}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* van name */}
                          <strong>{van.name}</strong>

                          {/* seats tag */}
                          <Tag
                            color={isFull ? "red" : "blue"}
                            style={{ marginInlineStart: 4 }}
                          >
                            {seatsLeft}/{van.seats} seats
                          </Tag>

                          {/* draggable route pills */}
                          <span>Route Order:</span>
                          {(schoolOrder[van.id] || [])
                            /* keep only schools that still have kids */
                            .filter((sid) =>
                              kidsInVan.some(
                                (e) =>
                                  (e.kid.schools?.id ?? "no-school") === sid
                              )
                            )

                            /* now render a pill for each remaining school */
                            .map((sid, idx) => {
                              const name =
                                kidsInVan.find(
                                  (e) =>
                                    (e.kid.schools?.id ?? "no-school") === sid
                                )?.kid.schools?.name || "—";

                              return (
                                <React.Fragment key={sid}>
                                  {idx > 0 && (
                                    <RightOutlined
                                      style={{
                                        fontSize: 10,
                                        verticalAlign: "middle",
                                      }}
                                    />
                                  )}
                                  <Draggable
                                    draggableId={`order-${van.id}-${sid}`}
                                    index={idx}
                                  >
                                    {(pillProvided) => (
                                      <span
                                        ref={pillProvided.innerRef}
                                        {...pillProvided.draggableProps}
                                        {...pillProvided.dragHandleProps}
                                        style={{
                                          background: "#eee",
                                          borderRadius: 4,
                                          padding: "0 6px",
                                          fontSize: 10,
                                          whiteSpace: "nowrap",
                                          cursor: "grab",
                                          ...pillProvided.draggableProps.style,
                                        }}
                                      >
                                        {name}
                                      </span>
                                    )}
                                  </Draggable>
                                </React.Fragment>
                              );
                            })}
                          {orderProvided.placeholder}
                        </span>
                      )}
                    </Droppable>
                  }
                  className={`van-card ${isFull ? "full" : ""}`}
                >
                  <Droppable droppableId={van.id} type="school">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={
                          snapshot.isDraggingOver ? "dragging-over" : ""
                        }
                      >
                        {/* --- fixed driver / helper row --- */}
                        <div className="driver-row">
                          <span className="driver-label">Driver:</span>
                          <span className="driver-name">—</span>
                          <span className="helper-label">Helpers:</span>
                          <span className="helper-name">—</span>
                        </div>

                        {/* --- mini-table header --- */}
                        <div className="van-table header">
                          <span>#</span>
                          <span>Name</span>
                          <span>School</span>
                          <span>Responsible</span>
                          <span>Dismissal Time</span>
                          <span>↩</span>
                        </div>

                        {/* --- draggable kid rows --- */}
                        {flattened.map((entry, idx) => {
                          const schoolId = entry.kid.schools?.id ?? "no-school";
                          const staffId = entry.staff?.id ?? "no-staff";
                          const isFirstOfGroup =
                            idx === 0 ||
                            flattened[idx - 1].staff?.id !== staffId ||
                            (flattened[idx - 1].kid.schools?.id ??
                              "no-school") !== schoolId;

                          return (
                            <Draggable
                              key={entry.kid.id}
                              draggableId={entry.kid.id}
                              index={idx}
                            >
                              {(rowProvided) => (
                                <Droppable
                                  droppableId={`resp-${entry.kid.id}`}
                                  type="staff"
                                >
                                  {(respProvided, snap) => (
                                    <div
                                      ref={(node) => {
                                        rowProvided.innerRef(node);
                                        respProvided.innerRef(node);
                                      }}
                                      {...rowProvided.draggableProps}
                                      {...rowProvided.dragHandleProps}
                                      {...respProvided.droppableProps}
                                      className="van-table row"
                                    >
                                      <span>{idx + 1}</span>
                                      <span>{entry.kid.name}</span>
                                      <span>
                                        {entry.kid.schools?.name || "—"}
                                      </span>

                                      {/* 🟢 Responsible cell */}
                                      <div
                                        className={
                                          snap.isDraggingOver
                                            ? "dragging-over"
                                            : ""
                                        }
                                        style={{
                                          minHeight: 24,
                                          display: "flex",
                                          gap: 4,
                                          alignItems: "center",
                                        }}
                                      >
                                        {entry.staff && (
                                          <Draggable
                                            draggableId={`staff-${entry.staff.id}`}
                                            index={0}
                                            type="staff"
                                          >
                                            {(provided) => (
                                              <span
                                                className="resp-chip"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                              >
                                                {entry.staff.name}
                                              </span>
                                            )}
                                          </Draggable>
                                        )}

                                        {isFirstOfGroup && entry.staff && (
                                          <button
                                            className="back-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setStaff((prev) =>
                                                prev.some(
                                                  (s) => s.id === entry.staff.id
                                                )
                                                  ? prev
                                                  : [...prev, entry.staff]
                                              );
                                              setAssigned((prev) => {
                                                const upd = { ...prev };
                                                upd[van.id] = upd[van.id].map(
                                                  (r) =>
                                                    r.kid.schools?.id ===
                                                    schoolId
                                                      ? { ...r, staff: null }
                                                      : r
                                                );
                                                return upd;
                                              });
                                            }}
                                          >
                                            ↩
                                          </button>
                                        )}

                                        {respProvided.placeholder}
                                      </div>

                                      <span>{getDismissal(entry.kid)}</span>

                                      <button
                                        className="back-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          returnKid(entry.kid, van.id);
                                        }}
                                      >
                                        ↩
                                      </button>
                                    </div>
                                  )}
                                </Droppable>
                              )}
                            </Draggable>
                          );
                        })}

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {isFull && <p className="warning-text">⚠ This van is full</p>}
                </Card>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
