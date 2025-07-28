import React, { useState, useMemo, useEffect } from "react";
import { Card, Button, DatePicker, Spin, Collapse, Tag, message } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import supabase from "../lib/supabase";
import { useKidsContext } from "../contexts/KidsContext";
import { FaCar } from "react-icons/fa";
import { MdOutlineAirlineSeatReclineNormal } from "react-icons/md";
import { TbSteeringWheel } from "react-icons/tb";
import RouteMapModal from "../components/RouteMapModal.js";

import "./PickupPlanner.scss";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

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
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [peopleInVanCounts, setPeopleInVanCounts] = useState([]);
  const [staffsInVans, setStaffsInVans] = useState({}); // { vanId: [staffObj, ...] }
  const [isDirty, setIsDirty] = useState(false);
  const [pickupSaved, setPickupSaved] = useState(false);
  const [pickupRouteIds, setPickupRouteIds] = useState({}); // { [vanId]: routeId }
  const [startCoords, setStartCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [aspSchoolName, setAspSchoolName] = useState(null);

  /* ------------ fetch settings (pickup start address) ------------ */
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["pickup_start_address", "after_school_name"]);

      if (error) {
        console.error("Error fetching settings:", error);
        return;
      }

      const startAddress = data.find(
        (s) => s.key === "pickup_start_address"
      )?.value;
      const schoolName = data.find((s) => s.key === "after_school_name")?.value;

      if (startAddress) {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            startAddress
          )}.json?access_token=${MAPBOX_TOKEN}`
        );
        const geo = await res.json();
        const [lng, lat] = geo.features?.[0]?.center || [];
        if (lat && lng) setStartCoords({ lat, lng });
      }

      if (schoolName) setAspSchoolName(schoolName);
    };

    fetchSettings();
  }, []);

  /* ------------ fetch vans ------------ */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("vans")
        .select("*")
        .order("name");
      if (!error) {
        const vansWithTempFields = data.map((van) => ({
          ...van,
          driver: null,
          helpers: [],
          booster: van.boosterSeats ?? 0,
        }));
        setVans(vansWithTempFields);
        const initialCounts = {};
        data.forEach((van) => {
          initialCounts[van.id] = 0;
        });
        setPeopleInVanCounts(initialCounts);
      }
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

  const allSchoolKeys = useMemo(
    () => Object.keys(groupedBySchool),
    [groupedBySchool]
  );
  const expandAll = () => setExpandedKeys(allSchoolKeys);
  const collapseAll = () => setExpandedKeys([]);

  // count absents and staff
  const absentsCount = absents.length;
  const staffPoolCount = staff.length;
  const dayLabel = selectedDate.format("dddd"); // e.g. Monday
  const totalKidsToday = studentsToday.length; // all kids scheduled for that day
  const totalSchoolsToday = Object.keys(groupedBySchool).length; // distinct schools

  function needsBooster(kid) {
    if (!kid.birthDate) return true;
    const age = dayjs().diff(dayjs(kid.birthDate), "year");
    return age < 9;
  }

  function countBoostersInVan(vanId) {
    const kids = assigned[vanId] || [];
    return kids.filter((e) => needsBooster(e.kid)).length;
  }

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

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function handleDateChange(date) {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. If you switch the date, everything will be lost. Continue?"
      );
      if (!confirmed) return;
    }
    setSelectedDate(date);
  }

  const isDriver = (staff) =>
    vans.some((van) => {
      const driver = van.driver;
      if (!driver) return false;

      return driver.id === staff.id || driver.originalId === staff.id;
    });

  const promoteToDriver = (staff, van) => {
    setIsDirty(true);
    setVans((prevVans) =>
      prevVans.map((v) => {
        if (v.id !== van.id) return v;

        const newHelpers = v.helpers.filter(
          (h) =>
            h.id !== staff.id &&
            h.originalId !== staff.id &&
            h.id !== staff.originalId
        );

        if (v.driver) {
          // Return the previous driver back to helpers
          const driverBack = {
            ...v.driver,
            instanceId: crypto.randomUUID(),
            originalId: v.driver.originalId ?? v.driver.id,
          };
          newHelpers.push(driverBack);
        }

        return {
          ...v,
          helpers: newHelpers,
          driver: staff,
        };
      })
    );
  };

  const demoteFromDriver = (van) => {
    setIsDirty(true);
    setVans((prevVans) =>
      prevVans.map((v) => {
        if (v.id !== van.id || !v.driver) return v;

        const driver = v.driver;

        // Create a new helper from the driver
        const demotedHelper = {
          ...driver,
          instanceId: crypto.randomUUID(),
          originalId: driver.originalId ?? driver.id,
        };

        // Filter out any accidental duplicates
        const newHelpers = v.helpers.filter(
          (h) =>
            h.id !== demotedHelper.id &&
            h.originalId !== demotedHelper.id &&
            h.id !== demotedHelper.originalId
        );

        return {
          ...v,
          driver: null,
          helpers: [...newHelpers, demotedHelper],
        };
      })
    );
  };

  function handleViewRoute(van) {
    const orderedSchoolIds = schoolOrder[van.id] || [];
    console.log("Assigned Kids:", assigned[van.id]);

    const orderedStops = orderedSchoolIds
      .map((schoolId) => {
        const entry = (assigned[van.id] || []).find(
          (e) => e.kid.schools?.id === schoolId
        );
        const school = entry?.kid?.schools;
        if (school?.lat && school?.lng) {
          return {
            lat: school.lat,
            lng: school.lng,
            name: school.name || "Unnamed School",
          };
        }
        return null;
      })
      .filter(Boolean);

    console.log("Ordered Stops (coordinates):", orderedStops);

    if (!startCoords) {
      message.error("Starting location not available.");
      return;
    }

    if (orderedStops.length === 0) {
      message.warning("No valid school coordinates found for this van.");
      return;
    }

    setRouteCoords([
      { ...startCoords, name: aspSchoolName || "Start Location" },
      ...orderedStops,
    ]);
    setShowMap(true);
  }

  async function savePickupRoute() {
    message.success("saving the route");
    setIsDirty(false);
    return;
    // const today = dayjs(selectedDate).format("YYYY-MM-DD");

    // for (const van of vans) {
    //   const kids = assigned[van.id] || [];

    //   // 1. Cria a rota
    //   const { data: route, error } = await supabase
    //     .from("routes")
    //     .insert({
    //       date: today,
    //       type: "pickup",
    //       van_id: van.id,
    //       driver: van.driver?.name ?? null,
    //       helper: van.helpers?.map((h) => h.name).join(", ") ?? null,
    //       depart_time: null, // preenchido no envio
    //       current_destination: null,
    //       status: "planned",
    //     })
    //     .select()
    //     .single();

    //   if (error) {
    //     message.error("Erro ao salvar rota da van: " + van.name);
    //     return;
    //   }

    //   // 2. Cria os pontos de parada
    //   const stops = kids.map((entry, index) => ({
    //     route_id: route.id,
    //     student_id: entry.kid.id,
    //     stop_order: index,
    //     school_id: entry.kid.schools?.id ?? null,
    //     responsible_staff_id: entry.staff?.id ?? null,
    //     status: "pending",
    //   }));

    //   const { error: stopError } = await supabase
    //     .from("route_stops")
    //     .insert(stops);

    //   if (stopError) {
    //     message.error("Erro ao salvar as paradas da van: " + van.name);
    //     return;
    //   }
    // }

    // setIsDirty(false);
    // setPickupSaved(true);
    // message.success("Rota de pickup salva com sucesso!");
  }

  function addKidToVan(kid, vanId) {
    setIsDirty(true);
    setAssigned((prev) => {
      const list = [...(prev[vanId] || [])];

      // Prevent duplicate kid
      if (list.some((e) => e.kid.id === kid.id)) return prev;

      const schoolId = kid.schools?.id ?? null;

      // Check if another kid from same school already exists and has staff
      const staff =
        list.find((e) => e.kid.schools?.id === schoolId && e.staff)?.staff ??
        null;

      const updatedList = [...list, { kid, staff }];

      // Copy staff to all kids of the same school (in case added after the new kid)
      const finalList = updatedList.map((entry) => {
        if ((entry.kid.schools?.id ?? null) === schoolId) {
          return { ...entry, staff };
        }
        return entry;
      });

      return {
        ...prev,
        [vanId]: finalList,
      };
    });

    // add one more people at peopleVanCounts
    setPeopleInVanCounts((prev) => ({
      ...prev,
      [vanId]: (prev[vanId] || 0) + 1,
    }));

    // Ensure school is added to visual order
    const schoolId = kid.schools?.id ?? "no-school";
    addSchoolToOrder(vanId, schoolId);
  }

  const sendPickupRoute = () => {
    return;
  };

  function returnKid(kid, fromVanId = null) {
    setIsDirty(true);
    // Always remove from absents
    setAbsents((prev) => prev.filter((k) => k.id !== kid.id));

    if (!fromVanId) return;

    setAssigned((prev) => {
      const updated = { ...prev };
      const list = updated[fromVanId] || [];

      const kidEntry = list.find((e) => e.kid.id === kid.id);
      const staff = kidEntry?.staff ?? null;
      const schoolId = kid.schools?.id ?? null;

      // Remove the kid
      updated[fromVanId] = list.filter((e) => e.kid.id !== kid.id);

      // make sure remove kid from van counts
      setPeopleInVanCounts((prev) => ({
        ...prev,
        [fromVanId]: Math.max((prev[fromVanId] || 1) - 1, 0),
      }));

      // If no school or staff to return, skip cleanup
      if (!staff || !schoolId) return updated;

      // Check if there are still other kids from same school in the van
      const stillUsingThisStaff = updated[fromVanId].some((e) => {
        const s = e.staff;
        if (!s) return false;
        return (
          s.id === staff.id ||
          s.originalId === staff.id ||
          s.id === staff.originalId
        );
      });

      if (!stillUsingThisStaff) {
        // Return the staff to pool, if not already there
        setStaff((prev) =>
          prev.some((s) => s.id === staff.id) ? prev : [...prev, staff]
        );

        // Remove the staff from other entries of same school
        updated[fromVanId] = updated[fromVanId].map((e) =>
          e.kid.schools?.id === schoolId && e.staff?.id === staff.id
            ? { ...e, staff: null }
            : e
        );

        setStaffsInVans((prev) => {
          const current = prev[fromVanId] || [];
          const filtered = current.filter(
            (s) =>
              s.id !== staff.id &&
              s.originalId !== staff.id &&
              s.id !== staff.originalId
          );
          return { ...prev, [fromVanId]: filtered };
        });

        // remove staff from count
        setPeopleInVanCounts((prev) => ({
          ...prev,
          [fromVanId]: Math.max((prev[fromVanId] || 1) - 1, 0),
        }));
      }

      return updated;
    });
  }

  function addStaffToVan(staffObj, targetVanId, targetSchoolId) {
    setIsDirty(true);

    // 1. Assign the staff to all kids from the same school in that van
    setAssigned((prev) => {
      const updated = { ...prev };
      updated[targetVanId] = updated[targetVanId].map((entry) =>
        (entry.kid.schools?.id ?? null) === targetSchoolId
          ? { ...entry, staff: staffObj }
          : entry
      );
      return updated;
    });

    // 2. Add the staff to the van's visual staff list if not already there
    setStaffsInVans((prev) => {
      const current = prev[targetVanId] || [];
      const alreadyThere = current.some(
        (s) =>
          s.id === staffObj.id ||
          s.originalId === staffObj.id ||
          s.id === staffObj.originalId
      );
      if (alreadyThere) return prev;

      return {
        ...prev,
        [targetVanId]: [...current, staffObj],
      };
    });

    setVans((prev) =>
      prev.map((v) => {
        if (v.id !== targetVanId) return v;

        const isDriver = v.driver?.id === staffObj.id;
        const alreadyHelper = v.helpers?.some((h) => h.id === staffObj.id);

        return {
          ...v,
          helpers:
            !isDriver && !alreadyHelper ? [...v.helpers, staffObj] : v.helpers,
        };
      })
    );
  }

  function returnStaff(staff, vanId) {
    setIsDirty(true);

    // 1. Return staff to the pool if not already there
    setStaff((prev) =>
      prev.some((s) => s.id === staff.id) ? prev : [...prev, staff]
    );

    // 2. Remove the staff from all kids in the same school
    setAssigned((prev) => {
      const updated = { ...prev };
      updated[vanId] = updated[vanId].map((entry) =>
        entry.staff &&
        (entry.staff.id === staff.id ||
          entry.staff.originalId === staff.id ||
          staff.originalId === entry.staff.id)
          ? { ...entry, staff: null }
          : entry
      );
      return updated;
    });

    // 3. Decrease the people count in the van
    setPeopleInVanCounts((prev) => ({
      ...prev,
      [vanId]: Math.max((prev[vanId] || 1) - 1, 0),
    }));

    // 4. Remove staff from the van's visible staff list
    setStaffsInVans((prev) => {
      const filtered = (prev[vanId] || []).filter(
        (s) =>
          s.id !== staff.id &&
          s.originalId !== staff.id &&
          s.id !== staff.originalId
      );
      return {
        ...prev,
        [vanId]: filtered,
      };
    });

    // 5. Remove from driver if currently assigned
    setVans((prev) =>
      prev.map((v) => {
        if (v.id !== vanId) return v;

        return {
          ...v,
          helpers: v.helpers.filter((h) => h.id !== staff.id),
          driver: v.driver?.id === staff.id ? null : v.driver,
        };
      })
    );
  }

  /* ---------------- drag-and-drop handler ---------------- */
  const onDragStart = (start) => {
    // console.log(start.type);
    if (start.type === "school") {
      const schoolKey = start.draggableId.replace("school-", "");
      setExpandedKeys((prev) => prev.filter((key) => key !== schoolKey));
    }
  };

  const handleDragEnd = ({ source, destination, draggableId, type }) => {
    // console.log("Type: ", type);
    if (!destination) return;

    if (type === "staff" && !destination.droppableId.startsWith("resp-")) {
      return; // Prevent invalid staff drop
    }

    const droppingBackToSchool =
      destination.droppableId.startsWith("school-") ||
      destination.droppableId === "schools";

    if (
      droppingBackToSchool &&
      (source.droppableId === "absents" || isVan(source.droppableId))
    ) {
      return; // Invalid return to school list
    }

    // Reorder school pills within same van
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
      return;
    }

    // Handle staff drop onto a responsible target
    if (type === "staff" && destination.droppableId.startsWith("resp-")) {
      const raw = draggableId.slice("staff-".length);
      const cameFromPool = source.droppableId === "staffPool";
      const cameFromResp = source.droppableId.startsWith("resp-");
      const UUID_LENGTH = 36;
      const rawStaffId = cameFromPool ? raw : raw.substring(0, UUID_LENGTH);

      let staffObj;

      if (cameFromPool) {
        staffObj = staff.find((s) => s.id === rawStaffId);
        if (!staffObj) return;
      } else if (cameFromResp) {
        staffObj = Object.values(assigned)
          .flat()
          .map((e) => e.staff)
          .find((s) => s?.id === rawStaffId);
        if (!staffObj) return;
      } else return;

      const kidId = destination.droppableId.replace("resp-", "");
      const targetVanId = Object.entries(assigned).find(([, list]) =>
        list.some((e) => e.kid.id === kidId)
      )?.[0];

      if (!targetVanId) return;

      const kidEntry = assigned[targetVanId].find((e) => e.kid.id === kidId);
      const targetSchoolId = kidEntry?.kid.schools?.id ?? null;

      if (kidEntry?.staff) {
        message.info(
          "This child already has a responsible. Use ↩ to remove it first."
        );
        return;
      }

      if (cameFromResp) {
        const allowDup = window.confirm(
          "This staff is already assigned to another school in this van.\nDo you want to assign this staff to multiple schools?"
        );
        if (!allowDup) return;
        staffObj = {
          ...staffObj,
          instanceId: crypto.randomUUID(),
          originalId: staffObj.id,
        };
      }

      if (cameFromPool) {
        setStaff((prev) => prev.filter((s) => s.id !== rawStaffId));
      }

      addStaffToVan(staffObj, targetVanId, targetSchoolId);

      if (!cameFromResp) {
        setPeopleInVanCounts((prev) => ({
          ...prev,
          [targetVanId]: (prev[targetVanId] || 0) + 1,
        }));
      }

      return;
    }

    // Moving a whole school group
    if (type === "school" && source.droppableId === "schools") {
      const schoolName = draggableId.replace("school-", "");
      const kidsToMove = studentsToday.filter(
        (k) => (k.schools?.name || "— No School —") === schoolName
      );

      if (destination.droppableId === "absents") {
        setAbsents((prev) => [
          ...prev,
          ...kidsToMove.filter((k) => !prev.some((a) => a.id === k.id)),
        ]);
      } else if (isVan(destination.droppableId)) {
        kidsToMove.forEach((kid) => {
          addKidToVan(kid, destination.droppableId);
        });
      }

      return;
    }

    // Single kid being moved
    const kid = students.find((k) => k.id === draggableId);
    if (!kid) return;

    if (source.droppableId === "absents") {
      setAbsents((prev) => prev.filter((k) => k.id !== kid.id));
    } else if (isVan(source.droppableId)) {
      returnKid(kid, source.droppableId); // Use centralized removal logic
    }

    if (destination.droppableId === "absents") {
      setAbsents((prev) => [...prev, kid]);
    } else if (isVan(destination.droppableId)) {
      addKidToVan(kid, destination.droppableId); // Use centralized addition logic
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
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>Pickup Planner</h1>

        <Button type="primary" onClick={savePickupRoute} disabled={!isDirty}>
          Save
        </Button>

        <Button
          type="default"
          onClick={sendPickupRoute}
          disabled={!pickupSaved}
        >
          Send
        </Button>
      </div>

      <div>
        <RouteMapModal
          open={showMap}
          onClose={() => setShowMap(false)}
          coordinates={routeCoords}
          token={MAPBOX_TOKEN}
        />

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
              const seatsLeft =
                (van.seats ?? 0) - (peopleInVanCounts[van.id] || 0);
              const isOverCapacity = seatsLeft < 0;
              const boostersNeeded = countBoostersInVan(van.id);
              const boosterCapacity = van.boosterSeats ?? 0;
              const isBoosterExceeded = boostersNeeded > boosterCapacity;

              // console.log(boostersNeeded);

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
              // const schoolIds = [...orderedIds, ...unorderedIds];
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
                      {/* First line: Van Info */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <strong>{van.name} -</strong>
                        <span>{van.model}</span>
                        <span>Plate: {van.plate}</span>
                        <Tag color={isOverCapacity ? "red" : "blue"}>
                          {seatsLeft}/{van.seats} seats
                        </Tag>
                        <Tag color={isBoosterExceeded ? "red" : "gold"}>
                          Booster Need: {boostersNeeded}/{boosterCapacity}
                        </Tag>
                      </div>

                      {/* Second line: Route Order pills (Droppable) */}
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
                            {(schoolOrder[van.id] || [])
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
                  <Button size="small" onClick={() => handleViewRoute(van)}>
                    View Route
                  </Button>
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

                        {/* --- mini-table header --- */}
                        <div className="van-table header">
                          <span>Seats</span>
                          <span>Student Name</span>
                          <span>School</span>
                          <span>Responsible</span>
                          <span>Dismissal Time</span>
                          <span>Actions</span>
                        </div>

                        {/* --- draggable kid rows --- */}
                        {flattened.map((entry, idx) => {
                          const schoolId = entry.kid.schools?.id ?? "no-school";
                          const staffId = entry.staff?.id;
                          const isFirstOfGroup =
                            idx === 0 ||
                            flattened[idx - 1].staff?.id !== staffId ||
                            (flattened[idx - 1].kid.schools?.id ??
                              "no-school") !== schoolId;

                          const schoolStaffs = [];
                          flattened.forEach((entry) => {
                            if (entry.staff) {
                              schoolStaffs.push(entry.staff);
                            }
                          });

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
                                {needsBooster(entry.kid) && (
                                  <MdOutlineAirlineSeatReclineNormal
                                    title="Needs Booster Seat"
                                    style={{ color: "green" }}
                                    size={21}
                                  />
                                )}
                              </span>

                              <span>{entry.kid.schools?.name || "—"}</span>

                              {/*  Responsible cell */}
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
                                            van.driver?.id === entry.staff.id
                                              ? "Demote from Driver"
                                              : "Promote to Driver"
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              van.driver?.id === entry.staff.id
                                            ) {
                                              // Demote if this staff is already the driver
                                              demoteFromDriver(van);
                                            } else {
                                              // Otherwise promote to driver
                                              promoteToDriver(entry.staff, van);
                                            }
                                          }}
                                        >
                                          <FaCar
                                            style={{
                                              color:
                                                van.driver?.id ===
                                                entry.staff.id
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
                                    setVans((prev) =>
                                      prev.map((v) =>
                                        v.id === van.id
                                          ? {
                                              ...v,
                                              driver:
                                                v.driver?.id &&
                                                entry.staff &&
                                                v.driver.id === entry.staff.id
                                                  ? null
                                                  : v.driver,
                                            }
                                          : v
                                      )
                                    );
                                    returnKid(entry.kid, van.id);
                                  }}
                                >
                                  ↩
                                </button>
                                <button
                                  className="absent-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVans((prev) =>
                                      prev.map((v) =>
                                        v.id === van.id
                                          ? {
                                              ...v,
                                              driver:
                                                v.driver?.id &&
                                                entry.staff &&
                                                v.driver.id === entry.staff.id
                                                  ? null
                                                  : v.driver,
                                            }
                                          : v
                                      )
                                    );
                                    returnKid(entry.kid, van.id);
                                    setAbsents((prev) => [...prev, entry.kid]);
                                  }}
                                >
                                  🚫
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {(staffsInVans[van.id] || []).map((staff, idx) => (
                          <div
                            className="van-table row staff-row"
                            key={`vanstaff-${staff.id}`}
                          >
                            <span
                              style={{
                                alignSelf: "center",
                                justifySelf: "center",
                                textAlign: "center",
                              }}
                            >
                              {kidsInVan.length + idx + 1}
                            </span>
                            <span colSpan={5}>
                              {isDriver(staff) ? (
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
                              {staff.name}
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
