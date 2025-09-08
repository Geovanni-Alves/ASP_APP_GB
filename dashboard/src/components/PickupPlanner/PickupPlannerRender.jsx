// components/PickupPlanner/PickupPlannerRender.jsx
import React from "react";
import { Card, Button, DatePicker, Spin, Collapse, Tag, message } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { RightOutlined } from "@ant-design/icons";
import { FaCar } from "react-icons/fa";
import { MdOutlineAirlineSeatReclineNormal } from "react-icons/md";
import { TbSteeringWheel } from "react-icons/tb";
// import PickupRouteGoogleMapsModal from "../RouteGoogleMaps/PickupRouteGoogleMapsModal.jsx";
import RouteMapModalOSRM from "../RouteOSRM/RouteMapModalOSRM";
import supabase from "../../lib/supabase";
import dayjs from "dayjs";
import "./PickupPlanner.scss";

const { Panel } = Collapse;

export default function PickupPlannerRender(props) {
  const {
    // top-level
    closeMenu,
    // page/section loadings
    settingsLoading,
    restoringRoute,
    vansLoading,
    staffLoading,

    // state
    route,
    setRoute,
    isDirty,

    // collections
    localVans,
    staff,
    setStaff,
    selectedVanId,

    // derived
    groupedBySchool,
    expandedKeys,
    setExpandedKeys,
    expandAll,
    collapseAll,
    absentsCount,
    staffPoolCount,
    dayLabel,
    totalKidsToday,
    totalSchoolsToday,
    kidsOnRoute,
    kidsRemaining,
    peopleInVanCounts,

    // helpers
    getDismissal,
    needsBooster,
    countBoostersInVan,
    isDriver,
    isDriverOfVan,
    promoteToDriver,
    demoteFromDriver,
    addKidToVan,
    returnKid,
    returnStaff,

    // actions
    handleDateChange,
    savePickupRoute,
    sendPickupRoute,
    handleViewRoute,
    handleModalReorder,

    // dnd
    onDragStart,
    handleDragEnd,

    // map
    showMap,
    setShowMap,
    routeCoords,
    onRouteETA,
  } = props;

  const loadingPage =
    settingsLoading || vansLoading || staffLoading || restoringRoute;

  if (loadingPage) {
    return (
      <div className="pickupContainer">
        <Spin tip="Loading planner…">
          <div style={{ minHeight: 80 }} />
        </Spin>
      </div>
    );
  }

  const isRouteInProgress = route.status === "in_progress";
  // const isRouteInPlanning = route.status === "planning" || route.status === "";
  const isRouteLocked =
    route.status === "waiting_to_start" ||
    route.status === "in_progress" ||
    route.status === "finished";

  function getRouteStatusLabel(status) {
    switch (status) {
      case "planning":
      case "":
        return "Planning"; // user is still planning
      case "waiting_to_start":
        return "Ready to Start"; // locked, but can be reverted
      case "in_progress":
        return "In Progress"; // currently running
      case "finished":
        return "View Only (Finished)"; // completed and blocked
      default:
        return "Not started";
    }
  }

  return (
    <div
      className={`planner-container ${closeMenu ? "menu-closed" : "menu-open"}`}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>Pickup Planner</h1>

        <Button
          type="primary"
          onClick={savePickupRoute}
          disabled={!isDirty || loadingPage}
        >
          Save
        </Button>

        {route.status === "waiting_to_start" ? (
          <Button
            danger
            onClick={async () => {
              const confirm = window.confirm("This route is locked. Re-open?");
              if (!confirm) return;
              const { error } = await supabase
                .from("routes")
                .update({ status: "planning" })
                .eq("date", route.date.format("YYYY-MM-DD"))
                .eq("type", "pickup");
              if (error) message.error("❌ Failed to re-open the route.");
              else {
                message.success("✅ Route is now editable again.");
                setRoute((prev) => ({ ...prev, status: "planning" }));
              }
            }}
          >
            Re-open Route
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={sendPickupRoute}
            disabled={isRouteLocked || loadingPage}
          >
            Send Route
          </Button>
        )}

        <span>Route Status: {getRouteStatusLabel(route.status)}</span>
        {isRouteInProgress && (
          <span>❌ Cannot re-open. This route is already in progress.</span>
        )}
      </div>

      <div>
        {/* <PickupRouteGoogleMapsModal
          open={showMap}
          onClose={() => setShowMap(false)}
          coordinates={routeCoords}
          onRouteETA={onRouteETA}
          vanId={selectedVanId}
          onReorderStops={handleModalReorder}
        /> */}

        <RouteMapModalOSRM
          open={showMap}
          onClose={() => setShowMap(false)}
          coordinates={routeCoords}
          onRouteETA={onRouteETA}
          vanId={selectedVanId}
          onReorderStops={handleModalReorder}
          blockSchoolOrder={isRouteLocked}
        />

        <DatePicker
          value={route.date}
          onChange={(v) => handleDateChange(v || dayjs())}
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

      <DragDropContext onDragStart={onDragStart} onDragEnd={handleDragEnd}>
        <div className="planner-body">
          <Card
            className="kids-card"
            title={
              <div className="kids-card-header">
                <span className="kids-title">
                  Kids of the Day ({kidsRemaining} kids • {totalSchoolsToday}{" "}
                  schools)
                </span>
                {restoringRoute && (
                  <Spin size="small" style={{ marginLeft: 8 }} />
                )}
                <div className="expand-buttons">
                  <button onClick={expandAll}>Expand All</button>
                  <button onClick={collapseAll}>Collapse All</button>
                </div>
              </div>
            }
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
                            <Collapse
                              activeKey={expandedKeys}
                              onChange={(keys) => setExpandedKeys(keys)}
                            >
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
            title={`🚫 Absents Drop (${absentsCount})`}
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
                  {route.absents.map((kid, idx) => (
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
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Staff List ({staffPoolCount})</span>
                {staffLoading && <Spin size="small" />}
              </div>
            }
          >
            <Spin spinning={staffLoading}>
              <Droppable
                droppableId="staffPool"
                type="staff"
                direction="horizontal"
              >
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
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
                            {/* {s.id} */}
                            {s.name}
                          </span>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </Spin>
          </Card>

          <div className="vans-card">
            {(vansLoading || restoringRoute) && (
              <Spin size="small" style={{ marginBottom: 8 }} />
            )}
            {route.vans.map((van) => {
              const kidsInVan = route.kids[van.id] || [];
              const seatsLeft =
                (van.seats ?? 0) - (peopleInVanCounts[van.id] || 0);
              const isOverCapacity = seatsLeft < 0;
              const boostersNeeded = countBoostersInVan(van.id);
              const boosterCapacity = van.boosterSeats ?? 0;
              const isBoosterExceeded = boostersNeeded > boosterCapacity;

              const groups = {};
              kidsInVan.forEach((e) => {
                const sid = e.kid.schools?.id ?? "no-school";
                (groups[sid] ??= []).push(e);
              });

              const orderedIds = (route.schoolOrder?.[van.id] || []).filter(
                (id) => groups[id]
              );
              const unorderedIds = Object.keys(groups).filter(
                (id) => !orderedIds.includes(id)
              );
              const flattened = [...orderedIds, ...unorderedIds].flatMap(
                (id) => groups[id]
              );

              return (
                <Card
                  key={van.id}
                  title={
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {/* <span>{van.id}</span> */}
                        <span>{van.name}</span>
                        <span>{van.model}</span>
                        <span>Plate: {van.plate}</span>
                        <Tag color={isOverCapacity ? "red" : "blue"}>
                          {seatsLeft}/{van.seats} seats
                        </Tag>
                        <Tag color={isBoosterExceeded ? "red" : "gold"}>
                          Booster Need: {boostersNeeded}/{boosterCapacity}
                        </Tag>
                        <Button
                          size="small"
                          onClick={() => handleViewRoute(van)}
                        >
                          View Map Route
                        </Button>
                        {route.vanEta[van.id] != null && (
                          <span style={{ marginLeft: "10px" }}>
                            <span>Total ETA:</span> {route.vanEta[van.id]} min
                          </span>
                        )}
                      </div>

                      <Droppable
                        droppableId={`order-${van.id}`}
                        type="schoolOrder"
                        direction="horizontal"
                      >
                        {(orderProvided) => (
                          <div
                            ref={orderProvided.innerRef}
                            {...orderProvided.droppableProps}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                              marginTop: 4,
                            }}
                          >
                            <span>Route Order:</span>
                            {(route.schoolOrder[van.id] || [])
                              .filter((sid) =>
                                kidsInVan.some(
                                  (e) =>
                                    (e.kid.schools?.id ?? "no-school") === sid
                                )
                              )
                              .map((sid, idx) => {
                                const schoolName =
                                  kidsInVan.find(
                                    (e) =>
                                      (e.kid.schools?.id ?? "no-school") === sid
                                  )?.kid.schools?.name || "—";
                                return (
                                  <React.Fragment key={sid}>
                                    {idx > 0 && (
                                      <RightOutlined
                                        style={{
                                          fontSize: 13,
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
                                            fontSize: 13,
                                            whiteSpace: "nowrap",
                                            cursor: "grab",
                                            ...pillProvided.draggableProps
                                              .style,
                                          }}
                                        >
                                          {schoolName}
                                        </span>
                                      )}
                                    </Draggable>
                                  </React.Fragment>
                                );
                              })}
                            {orderProvided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  }
                  className={`van-card ${isOverCapacity ? "full" : ""}`}
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
                        <div className="staffs-row">
                          <span className="driver-label">Driver:</span>
                          <span className="staff-chip driver-name">
                            {van.driver ? van.driver.name : "—"}
                          </span>
                          <span className="helper-label">Helpers:</span>
                          <div className="helper-chips">
                            {van.helpers?.length ? (
                              van.helpers.map((h) => (
                                <span key={h.id} className="staff-chip">
                                  {h.name}
                                </span>
                              ))
                            ) : (
                              <span className="staff-chip">—</span>
                            )}
                          </div>
                        </div>

                        <div className="van-table header">
                          <span>Seats</span>
                          <span>Student Name</span>
                          <span>School</span>
                          <span>Responsible</span>
                          <span>Dismissal Time</span>
                          <span>Actions</span>
                        </div>

                        {flattened.map((entry, idx) => {
                          const schoolId = entry.kid.schools?.id ?? "no-school";
                          const staffId = entry.staff?.id;
                          const isFirstOfGroup =
                            idx === 0 ||
                            flattened[idx - 1].staff?.id !== staffId ||
                            (flattened[idx - 1].kid.schools?.id ??
                              "no-school") !== schoolId;

                          return (
                            <div className="van-table row" key={entry.kid.id}>
                              <span
                                style={{
                                  alignSelf: "center",
                                  justifySelf: "center",
                                  textAlign: "center",
                                }}
                              >
                                {idx + 1}
                              </span>

                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {entry.kid.name}
                                {/* {entry.kid.id} */}
                                {needsBooster(entry.kid) && (
                                  <MdOutlineAirlineSeatReclineNormal
                                    title="Needs Booster Seat"
                                    style={{ color: "green" }}
                                    size={21}
                                  />
                                )}
                              </span>

                              <span>{entry.kid.schools?.name || "—"}</span>

                              <Droppable
                                droppableId={`resp-${entry.kid.id}`}
                                type="staff"
                              >
                                {(respProvided, snap) => (
                                  <div
                                    ref={respProvided.innerRef}
                                    {...respProvided.droppableProps}
                                    className={
                                      snap.isDraggingOver ? "dragging-over" : ""
                                    }
                                    style={{
                                      minHeight: 24,
                                      display: "flex",
                                      gap: 4,
                                      alignItems: "center",
                                    }}
                                  >
                                    {entry.staff ? (
                                      <Draggable
                                        draggableId={`staff-${entry.staff.id}-${entry.kid.id}`}
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
                                    ) : (
                                      <span>-</span>
                                    )}

                                    {isFirstOfGroup && entry.staff?.id && (
                                      <>
                                        <button
                                          className="promote-btn"
                                          title={
                                            isDriverOfVan(entry.staff, van)
                                              ? "Demote from Driver"
                                              : "Promote to Driver"
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isDriverOfVan(entry.staff, van))
                                              demoteFromDriver(van);
                                            else
                                              promoteToDriver(entry.staff, van);
                                          }}
                                        >
                                          <FaCar
                                            style={{
                                              color: isDriverOfVan(
                                                entry.staff,
                                                van
                                              )
                                                ? "green"
                                                : "gray",
                                            }}
                                          />
                                        </button>

                                        <button
                                          className="back-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            returnStaff(entry.staff, van.id);
                                          }}
                                        >
                                          ↩
                                        </button>
                                      </>
                                    )}

                                    {respProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              <span>{getDismissal(entry.kid)}</span>

                              <div className="action-buttons">
                                <button
                                  className="back-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRoute((prevRoute) => {
                                      const updatedVans = prevRoute.vans.map(
                                        (v) => {
                                          if (v.id !== van.id) return v;
                                          const isSameDriver =
                                            v.driver?.id &&
                                            entry.staff &&
                                            v.driver.id === entry.staff.id;
                                          return {
                                            ...v,
                                            driver: isSameDriver
                                              ? null
                                              : v.driver,
                                          };
                                        }
                                      );
                                      return {
                                        ...prevRoute,
                                        vans: updatedVans,
                                      };
                                    });
                                    returnKid(entry.kid, van.id);
                                  }}
                                >
                                  ↩
                                </button>
                                <button
                                  className="absent-btn"
                                  onClick={(e) => {
                                    if (isRouteLocked)
                                      return message.warning(
                                        "❌ Route closed. If you want to change, you need to re-open."
                                      );
                                    e.stopPropagation();
                                    setRoute((prevRoute) => {
                                      const updatedVans = prevRoute.vans.map(
                                        (v) => {
                                          if (v.id !== van.id) return v;
                                          const isSameDriver =
                                            v.driver?.id &&
                                            entry.staff &&
                                            v.driver.id === entry.staff.id;
                                          return {
                                            ...v,
                                            driver: isSameDriver
                                              ? null
                                              : v.driver,
                                          };
                                        }
                                      );
                                      const updatedAbsents = [
                                        ...(prevRoute.absents || []),
                                        entry.kid,
                                      ];
                                      return {
                                        ...prevRoute,
                                        vans: updatedVans,
                                        absents: updatedAbsents,
                                      };
                                    });
                                    returnKid(entry.kid, van.id, true);
                                  }}
                                >
                                  🚫
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {(route.staffInVan?.[van.id] ?? []).map((s, idx) => (
                          <div
                            className="van-table row staff-row"
                            key={`vanstaff-${s.id}`}
                          >
                            <span
                              style={{
                                alignSelf: "center",
                                justifySelf: "center",
                                textAlign: "center",
                              }}
                            >
                              {(route.kids[van.id] || []).length + idx + 1}
                            </span>
                            <span>
                              {isDriver(s) ? (
                                <TbSteeringWheel
                                  size={20}
                                  style={{
                                    color: "#1677ff",
                                    marginLeft: 2,
                                    marginRight: 2,
                                    marginTop: 1,
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: 15 }}>🧍‍♂️</span>
                              )}{" "}
                              {s.name}
                            </span>
                          </div>
                        ))}

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {isOverCapacity && (
                    <p className="warning-text">⚠ Van capacity exceeded</p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
