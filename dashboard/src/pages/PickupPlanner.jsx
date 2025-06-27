import React, { useState, useMemo, useEffect } from "react";
import { Card, DatePicker, Spin, Collapse, Tag } from "antd";
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

export default function PickupPlanner({ closeMenu }) {
  const { kids: students } = useKidsContext();

  /* ------------ local state ------------ */
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [absents, setAbsents] = useState([]);
  const [assigned, setAssigned] = useState({}); // { vanId: [kid…] }
  const [vans, setVans] = useState([]); // fetched from DB
  const [loadingVans, setLoadingVans] = useState(true);

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
          .map((k) => k.id)
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
  /* ---------------- drag-and-drop handler ---------------- */
  const handleDragEnd = ({ source, destination, draggableId, type }) => {
    if (!destination) return;

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
            ...kidsToMove,
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
          (k) => k.id !== kid.id
        );
        return updated;
      });
    }

    /* add to destination */
    if (destination.droppableId === "absents") {
      setAbsents((prev) => [...prev, kid]);
    } else if (isVan(destination.droppableId)) {
      setAssigned((prev) => ({
        ...prev,
        [destination.droppableId]: [
          ...(prev[destination.droppableId] || []),
          kid,
        ],
      }));
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
      className={`students-container ${
        closeMenu ? "menu-closed" : "menu-open"
      }`}
    >
      <div className="pickup-planner">
        <h1>Pickup Planner</h1>

        <DatePicker
          value={selectedDate}
          onChange={(v) => setSelectedDate(v || dayjs())}
          allowClear={false}
          disabledDate={(d) => d && d.isoWeekday() >= 6}
          style={{ marginBottom: 16 }}
        />

        <DragDropContext onDragEnd={handleDragEnd}>
          {/* LEFT COLUMN */}
          <div className="planner-grid">
            <Card title="Kids of the Day" className="planner-card">
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
                                              >
                                                <span>{kid.name}</span>
                                                <span>{getDismissal(kid)}</span>
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

            <Card title="Absents Drop" className="planner-card">
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
                          >
                            {kid.name} — {kid.schools?.name || "—"}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </Card>
          </div>

          {/* RIGHT COLUMN: VANS */}
          <div className="vans-list">
            {vans.map((van) => {
              const kidsInVan = assigned[van.id] || [];
              const seatsLeft = (van.seats - 2 ?? 0) - kidsInVan.length;
              const isFull = seatsLeft <= 0;

              return (
                <Card
                  key={van.id}
                  title={
                    <>
                      {van.name}{" "}
                      <Tag color={isFull ? "red" : "blue"}>
                        {seatsLeft}/{van.seats - 2} seats
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
                          <span>Time</span>
                        </div>

                        {/* --- draggable kid rows --- */}
                        {kidsInVan.map((kid, idx) => (
                          <Draggable
                            key={kid.id}
                            draggableId={kid.id}
                            index={idx}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="van-table row"
                              >
                                <span>{idx + 1}</span>
                                <span>{kid.name}</span>
                                <span>{kid.schools?.name || "—"}</span>
                                {/* <span>{getResponsible(kid)}</span> */}
                                <span>{getDismissal(kid)}</span>
                              </div>
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
        </DragDropContext>
      </div>
    </div>
  );
}
