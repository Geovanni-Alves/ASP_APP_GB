import React, { useState, useMemo, useEffect } from "react";
import { Card, DatePicker, Spin, Collapse, Tag, message } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
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

  // ─── helper: remove the staff from a kid and return chip to the pool ───
  function unassignStaff(kidId, staffObj) {
    // ① put the chip back into the pool (only if it is not there already)
    setStaff((prev) =>
      prev.some((s) => s.id === staffObj.id) ? prev : [...prev, staffObj]
    );

    // ② strip this staff from every van entry of that kid
    setAssigned((prev) => {
      const upd = { ...prev };
      for (const v in upd) {
        upd[v] = upd[v].map((e) =>
          e.kid.id === kidId ? { ...e, staff: null } : e
        );
      }
      return upd;
    });
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

    /* STAFF chip onto a kid row */
    if (type === "staff" && destination.droppableId.startsWith("resp-")) {
      const kidId = destination.droppableId.replace("resp-", "");
      const staffId = draggableId.replace("staff-", "");
      const staffObj = staff.find((s) => s.id === staffId);

      // If this kid already has a staff assigned, ignore the drop.
      const alreadyHasStaff = Object.values(assigned)
        .flat()
        .some((e) => e.kid.id === kidId && e.staff);

      if (alreadyHasStaff) {
        message.info(
          "That child already has a responsible - use the ↩ button to change it."
        );
        return; // <- bounce back, nothing changes
      }

      // ─────────────────────

      // remove chip from the pool
      setStaff((prev) => prev.filter((s) => s.id !== staffId));

      const targetSchoolId =
        students.find((k) => k.id === kidId)?.schools?.id ?? null;

      setAssigned((prev) => {
        const upd = { ...prev };
        for (const vid in upd) {
          upd[vid] = upd[vid].map((e) =>
            e.kid.schools?.id === targetSchoolId ? { ...e, staff: staffObj } : e
          );
        }
        return upd;
      });
      return; // stop further processing
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

      <DatePicker
        value={selectedDate}
        onChange={(v) => setSelectedDate(v || nextBusinessDay())}
        allowClear={false}
        disabledDate={(d) => d && d.isoWeekday() >= 6}
        style={{ marginBottom: 16 }}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="planner-body">
          <Card className="kids-card" title="Kids of the Day">
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
          <Card className="absents-card" title="Absents Drop">
            <Droppable droppableId="absents" type="school">
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={snapshot.isDraggingOver ? "dragging-over" : ""}
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
          <Card className="staff-card" title="Staff List">
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
                    className={snapshot.isDraggingOver ? "dragging-over" : ""}
                    style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
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
                            className="staff-chip"
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

              return (
                <Card
                  key={van.id}
                  title={
                    <>
                      {van.name}{" "}
                      <Tag color={isFull ? "red" : "blue"}>
                        {seatsLeft}/{van.seats} seats
                      </Tag>
                    </>
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
                        {kidsInVan.map((entry, idx) => (
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
                                    {/* ------- Responsible cell (column 4) ------- */}
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
                                        <>
                                          <span className="resp-chip">
                                            {entry.staff.name}
                                          </span>
                                          {/* ↩ for just this staff-kid link */}
                                          <button
                                            className="back-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              unassignStaff(
                                                entry.kid.id,
                                                entry.staff
                                              ); // ← pass staff object
                                            }}
                                          >
                                            ↩
                                          </button>
                                        </>
                                      )}
                                      {respProvided.placeholder}
                                    </div>
                                    <span>{getDismissal(entry.kid)}</span>
                                    {/* ↩ button that returns the whole kid-row (kid + staff) */}
                                    <button
                                      className="back-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        // 1 ▸ move the staff chip (if any) back to the pool
                                        if (entry.staff) {
                                          setStaff((prev) =>
                                            prev.some(
                                              (s) => s.id === entry.staff.id
                                            )
                                              ? prev
                                              : [...prev, entry.staff]
                                          );
                                        }

                                        // 2 ▸ remove the kid entry from this van
                                        setAssigned((prev) => {
                                          const upd = { ...prev };
                                          upd[van.id] = upd[van.id].filter(
                                            (e) => e.kid.id !== entry.kid.id
                                          );
                                          return upd;
                                        });

                                        // 3 ▸ done – kid will re-appear in the main list automatically
                                      }}
                                    >
                                      ↩
                                    </button>
                                  </div>
                                )}
                              </Droppable>
                            )}
                          </Draggable>
                        ))}

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
