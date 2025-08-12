import React, { useState, useMemo, useEffect } from "react";
import { Card, Button, DatePicker, Spin, Collapse, Tag, message } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import supabase from "../lib/supabase";
import { useKidsContext } from "../contexts/KidsContext";
import { useUsersContext } from "../contexts/UsersContext.js";
import { FaCar } from "react-icons/fa";
import { MdOutlineAirlineSeatReclineNormal } from "react-icons/md";
import { TbSteeringWheel } from "react-icons/tb";
// import RouteMapBoxModal from "../components/RouteMapBoxModal.js";
import RouteGoogleMapsModal from "../components/RouteGoogleMapsModal.js";

import "./PickupPlanner.scss";

// const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

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
  const { currentUserData: currentUser } = useUsersContext();

  /* ------------ local state ------------ */
  // const [selectedDate, setSelectedDate] = useState(() => nextBusinessDay());
  // const [absents, setAbsents] = useState([]);
  // const [assigned, setAssigned] = useState({}); // { vanId: [kid…] }
  // const [schoolOrder, setSchoolOrder] = useState({});
  // const [peopleInVanCounts, setPeopleInVanCounts] = useState([]);
  // const [routeStatus, setRouteStatus] = useState("planned");
  // const isRouteLocked =
  // routeStatus === "waiting_to_start" || routeStatus === "in_progress";
  // const [startCoords, setStartCoords] = useState(null);
  // const [aspSchoolName, setAspSchoolName] = useState(null);

  const [localVans, setLocalVans] = useState([]); // fetched from DB
  const [selectedVanId, setSelectedVanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);

  // local state route
  const [route, setRoute] = useState({
    date: nextBusinessDay(),
    status: "planned", // or 'waiting_to_start', 'in_progress', etc.
    vans: [], // van objects
    kids: {}, // { vanId: [ { kid, staff? } ] }
    absents: [],
    schoolOrder: {}, // { vanId: [schoolIds] }
    staffInVan: {}, // { vanId: [staffObj] }
    vanEta: {},
    startCoords: {},
    aspSchoolName: [],
  });

  const isRouteInProgress = route.status === "in_progress";
  const isRouteLocked =
    route.status === "waiting_to_start" || route.status === "in_progress";

  const peopleInVanCounts = useMemo(() => {
    const counts = {};
    for (const van of route.vans) {
      const vanId = van.id;
      const numKids = route.kids[vanId]?.length || 0;
      const numStaff = route.staffInVan[vanId]?.length || 0;
      counts[vanId] = numKids + numStaff;
    }
    return counts;
  }, [route.kids, route.staffInVan, route.vans]);

  /* ------------ fetch settings (pickup start address) ------------ */
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["pickup_start_coords", "after_school_name"]);

      if (error) {
        console.error("Error fetching settings:", error);
        setLoading(false);
        return;
      }

      const coordsValue = data.find(
        (s) => s.key === "pickup_start_coords"
      )?.value;
      const schoolName = data.find((s) => s.key === "after_school_name")?.value;

      if (coordsValue) {
        try {
          const parsed = JSON.parse(coordsValue);
          if (parsed.lat && parsed.lng) {
            setRoute((prev) => ({
              ...prev,
              startCoords: { lat: parsed.lat, lng: parsed.lng },
            }));
          }
        } catch (err) {
          console.error("Invalid JSON for pickup_start_coords:", coordsValue);
        }
      }

      if (schoolName) {
        setRoute((prev) => ({
          ...prev,
          aspSchoolName: schoolName,
        }));
      }

      setLoading(false);
    };

    fetchSettings();
  }, []);

  /* ------------ fetch vans ------------ */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("vans")
        .select("*")
        .order("name");

      if (!error) {
        const vansList = data;

        setLocalVans(vansList);
      }
      setLoading(false);
    })();
  }, []);

  /* ------------ fetch staff ------------ */
  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .eq("userType", "STAFF")
      .order("name");

    if (!error) {
      setStaff(data || []);
    }

    setLoading(false);
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchStaff();
  }, []);

  // Fetch all saved route info (pickup)
  useEffect(() => {
    if (!route.date || !staff.length || !students.length) return;

    const fetchPickupRouteForDate = async () => {
      setLoading(true);
      const dateStr = route.date.format("YYYY-MM-DD");

      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("*")
        .eq("type", "pickup")
        .eq("date", dateStr)
        .maybeSingle();

      if (routeError) {
        console.error("❌ Error fetching route:", routeError);
        setLoading(false);
        return;
      }

      if (!routeData) {
        // console.log("ℹ️ No pickup route found for selected date.");
        setLoading(false);
        return;
      }

      const routeId = routeData.id;

      const { data: vansData, error: vansError } = await supabase
        .from("route_vans")
        .select("*")
        .eq("route_id", routeId);

      if (vansError) {
        console.error("❌ Error fetching route vans:", vansError);
        setLoading(false);
        return;
      }

      const { data: stopsData, error: stopsError } = await supabase
        .from("route_stops")
        .select(
          `
      *,
      students (*, schools (*)),
      users!responsible_staff_id (id, name)
    `
        )
        .in(
          "route_van_id",
          vansData.map((v) => v.id)
        );

      if (stopsError) {
        console.error("❌ Error fetching route stops:", stopsError);
        setLoading(false);
        return;
      }

      // Build route state
      const routeMap = {};
      const orderMap = {};
      const etaMap = {};
      const staffsMap = {};
      const usedStaffIds = new Set();

      // Create fresh copy of vans from DB
      const newVans = localVans.map((v) => ({ ...v }));

      vansData.forEach((vanData) => {
        const vanId = vanData.van_id;
        const routeVanId = vanData.id;
        const van = newVans.find((v) => v.id === vanId);
        if (!van) return;

        // Driver
        let driver = null;
        if (vanData.driver_id) {
          const match = staff.find((s) => s.id === vanData.driver_id);
          if (match) {
            driver = {
              id: `van-driver-${vanId}`,
              name: match.name,
              originalId: match.id,
              isDriver: true,
            };
            usedStaffIds.add(match.id);
          }
        }

        // Helpers
        const helpers = (vanData.helper_ids ?? [])
          .map((id, idx) => {
            const match = staff.find((s) => s.id === id);
            if (!match) return null;
            usedStaffIds.add(id);
            return {
              id: `van-helper-${vanId}-${idx}`,
              name: match.name,
              originalId: id,
              isDriver: false,
            };
          })
          .filter(Boolean);

        van.driver = driver;
        van.helpers = helpers;

        staffsMap[vanId] = [...(driver ? [driver] : []), ...helpers];
        etaMap[vanId] = vanData.total_eta ?? null;
        if (vanData.school_order) orderMap[vanId] = vanData.school_order;

        const stops = stopsData.filter((s) => s.route_van_id === routeVanId);
        routeMap[vanId] = stops.map((s) => ({
          kid: { ...s.students, schools: s.students.schools },
          staff: s.users || null,
        }));
      });

      const restoredAbsents = students.filter((s) =>
        (routeData.absents || []).includes(s.id)
      );

      const availableStaff = staff.filter((s) => !usedStaffIds.has(s.id));

      setRoute((prev) => ({
        ...prev,
        status: routeData.status,
        kids: routeMap,
        schoolOrder: orderMap,
        vanEta: etaMap,
        staffInVan: staffsMap,
        absents: restoredAbsents,
        vans: newVans,
      }));

      // setStaff(availableStaff);
      setIsDirty(false);
      setLoading(false);
    };

    fetchPickupRouteForDate();
  }, [route.date, staff.length, students.length]);

  /* ------------ helpers ------------ */
  const vanIdSet = useMemo(
    () => new Set(localVans.map((v) => v.id)),
    [localVans]
  );
  const isVan = (id) => vanIdSet.has(id);

  /* ------------ day / kid filters ------------ */
  const selectedDay = useMemo(
    () => dayMap[route.date?.isoWeekday()] ?? null,
    [route.date]
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
        Object.values(route.kids)
          .flat()
          .map((e) => e.kid.id)
      ),
    [route.kids]
  );
  const absentIds = useMemo(
    () => new Set(route.absents.map((k) => k.id)),
    [route.absents]
  );

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
    () => Object.values(route.kids).reduce((sum, arr) => sum + arr.length, 0),
    [route.kids]
  );

  const allSchoolKeys = useMemo(
    () => Object.keys(groupedBySchool),
    [groupedBySchool]
  );
  const expandAll = () => setExpandedKeys(allSchoolKeys);
  const collapseAll = () => setExpandedKeys([]);

  // count absents and staff
  const absentsCount = route.absents.length;
  const staffPoolCount = staff.length;
  const dayLabel = route.date?.format("dddd"); // e.g. Monday
  const totalKidsToday = studentsToday.length; // all kids scheduled for that day
  const totalSchoolsToday = Object.keys(groupedBySchool).length; // distinct schools

  function needsBooster(kid) {
    if (!kid.birthDate) return true;
    const age = dayjs().diff(dayjs(kid.birthDate), "year");
    return age < 9;
  }

  function countBoostersInVan(vanId) {
    const kids = route.kids?.[vanId] || [];
    return kids.filter((e) => needsBooster(e.kid)).length;
  }

  /* ────────────────────────────────────────────
   Remove orphan school IDs whenever kids move
  ──────────────────────────────────────────── */
  useEffect(() => {
    setRoute((prev) => {
      let changed = false;
      const nextOrder = { ...prev.schoolOrder };

      Object.keys(prev.schoolOrder).forEach((vanId) => {
        const present = new Set(
          (prev.kids[vanId] || []).map((e) => e.kid.schools?.id ?? "no-school")
        );

        const filtered =
          nextOrder[vanId]?.filter((id) => present.has(id)) || [];

        if (nextOrder[vanId] && filtered.length !== nextOrder[vanId].length) {
          nextOrder[vanId] = filtered;
          changed = true;
        }
      });

      return changed
        ? {
            ...prev,
            schoolOrder: nextOrder,
          }
        : prev;
    });
  }, [route.kids]);

  // const addSchoolToOrder = (vanId, schoolId) => {
  //   setRoute((prev) => {
  //     const currentList = prev.schoolOrder?.[vanId] || [];
  //     return currentList.includes(schoolId)
  //       ? prev
  //       : {
  //           ...prev,
  //           schoolOrder: {
  //             ...prev.schoolOrder,
  //             [vanId]: [...currentList, schoolId],
  //           },
  //         };
  //   });
  // };

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

  useEffect(() => {
    setRoute((prev) => ({
      ...prev,
      date: nextBusinessDay(),
    }));
  }, []);

  function handleDateChange(date) {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. If you switch the date, everything will be lost. Continue?"
      );
      if (!confirmed) return;
    }

    // Reset route state
    setRoute({
      date,
      kids: {},
      vans: [],
      absents: [],
      schoolOrder: {},
      vanEta: {},
    });

    // fetchStaff();
    setIsDirty(false);
  }

  const isDriver = (staff) =>
    route.vans.some((van) => {
      const driver = van.driver;
      if (!driver) return false;
      return (
        driver.id === staff.id ||
        driver.originalId === staff.id ||
        driver.originalId === staff.originalId ||
        driver.id === staff.originalId
      );
    });

  const isDriverOfVan = (staff, van) => {
    if (!van.driver) return false;
    return (
      van.driver.id === staff.id ||
      van.driver.originalId === staff.id ||
      van.driver.id === staff.originalId
    );
  };

  const promoteToDriver = (staff, van) => {
    if (isRouteLocked) {
      message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
      return;
    }

    setIsDirty(true);

    setRoute((prev) => {
      const updatedVans = prev.vans.map((v) => {
        if (v.id !== van.id) return v;

        const isSameStaff = (a, b) =>
          a.id === b.id || a.originalId === b.id || a.id === b.originalId;

        const newHelpers = (v.helpers || []).filter(
          (h) => !isSameStaff(h, staff)
        );

        if (v.driver) {
          const driverBack = {
            ...v.driver,
            instanceId: crypto.randomUUID(),
            originalId: v.driver.originalId ?? v.driver.id,
          };
          newHelpers.push(driverBack);
        }

        const newDriver = {
          ...staff,
          instanceId: crypto.randomUUID(),
          originalId: staff.originalId ?? staff.id,
          isDriver: true,
        };

        return {
          ...v,
          helpers: newHelpers,
          driver: newDriver,
        };
      });
      console.log("updatedVan", updatedVans);
      return { ...prev, vans: updatedVans };
    });
  };

  const demoteFromDriver = (van) => {
    if (isRouteLocked) {
      message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
      return;
    }

    setIsDirty(true);

    setRoute((prev) => {
      const updatedVans = prev.vans.map((v) => {
        if (v.id !== van.id || !v.driver) return v;

        const driver = v.driver;

        const demotedHelper = {
          ...driver,
          instanceId: crypto.randomUUID(),
          originalId: driver.originalId ?? driver.id,
        };

        const isSameStaff = (a, b) =>
          a.id === b.id ||
          a.id === b.originalId ||
          a.originalId === b.id ||
          a.originalId === b.originalId;

        const newHelpers = v.helpers.filter(
          (h) => !isSameStaff(h, demotedHelper)
        );

        return {
          ...v,
          driver: null,
          helpers: [...newHelpers, demotedHelper],
        };
      });

      return { ...prev, vans: updatedVans };
    });
  };

  function handleViewRoute(van) {
    if (isRouteLocked) {
      message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
      return;
    }

    const orderedSchoolIds = route.schoolOrder?.[van.id] || [];

    const orderedStops = orderedSchoolIds
      .map((schoolId) => {
        const entry = (route.kids[van.id] || []).find(
          (e) => e.kid.schools?.id === schoolId
        );
        const school = entry?.kid?.schools;
        if (school?.lat && school?.lng) {
          return {
            lat: school.lat,
            lng: school.lng,
            name: school.name || "Unnamed School",
            schoolId: school.id || school.name || "default",
          };
        }
        return null;
      })
      .filter(Boolean);

    if (!route.startCoords) {
      message.error("Starting location not available.");
      return;
    }

    if (orderedStops.length === 0) {
      message.warning("No valid school coordinates found for this van.");
      return;
    }

    setSelectedVanId(van.id);
    setRouteCoords([
      { ...route.startCoords, name: route.aspSchoolName || "Start Location" },
      ...orderedStops,
    ]);
    setShowMap(true);
  }

  const savePickupRoute = async () => {
    const today = route.date.format("YYYY-MM-DD");
    let routeId;

    // Step 1: Fetch or create the route
    const { data: existingRoute, error: fetchError } = await supabase
      .from("routes")
      .select("*")
      .eq("date", today)
      .eq("type", "pickup")
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Failed to fetch route:", fetchError);
      message.error("Error fetching existing route.");
      return;
    }

    if (existingRoute) {
      const { error: updateError } = await supabase
        .from("routes")
        .update({
          status: "planned",
          absents: route.absents.map((a) => a.id),
        })
        .eq("id", existingRoute.id);

      if (updateError) {
        console.error("❌ Failed to update route:", updateError);
        message.error("Error updating existing route.");
        return;
      }

      routeId = existingRoute.id;
    } else {
      const { data: newRoute, error: insertError } = await supabase
        .from("routes")
        .insert({
          date: today,
          type: "pickup",
          status: "planned",
          absents: route.absents.map((a) => a.id),
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Failed to create route:", insertError);
        message.error("Error creating new route.");
        return;
      }

      routeId = newRoute.id;
    }

    // Step 2: Save vans and stops
    for (const van of route.vans) {
      const kids = route.kids[van.id] || [];
      if (kids.length === 0) continue;

      // // Booster count (if needed elsewhere)
      // const boosterCount = kids.filter((e) => needsBooster(e.kid)).length;

      const { data: savedVan, error: vanError } = await supabase
        .from("route_vans")
        .upsert(
          {
            route_id: routeId,
            van_id: van.id,
            driver_id: van.driver?.originalId ?? van.driver?.id ?? null,
            helper_ids: van.helpers?.map((h) => h.originalId ?? h.id) ?? [],
            school_order: route.schoolOrder[van.id] ?? [],
            total_eta: route.vanEta[van.id] ?? null,
            total_people: peopleInVanCounts[van.id] ?? kids.length,
          },
          { onConflict: ["route_id", "van_id"] }
        )
        .select()
        .single();

      if (vanError || !savedVan) {
        console.error(`❌ Error saving van ${van.name}:`, vanError);
        message.error(`Error saving van ${van.name}`);
        continue;
      }

      const routeVanId = savedVan.id;

      // Delete previous stops
      await supabase
        .from("route_stops")
        .delete()
        .eq("route_van_id", routeVanId);

      // Insert stops
      const stops = kids.map((entry, index) => ({
        route_van_id: routeVanId,
        student_id: entry.kid.id,
        responsible_staff_id: entry.staff?.id ?? null,
        stop_order: index,
      }));

      const { error: stopError } = await supabase
        .from("route_stops")
        .insert(stops);

      if (stopError) {
        console.error(`❌ Error saving stops for van ${van.name}:`, stopError);
        message.error(`Error saving stops for van ${van.name}`);
        return;
      }
    }

    setIsDirty(false);
    message.success("✅ Pickup route saved!");
  };

  function addKidToVan(kid, vanId) {
    if (isRouteLocked) {
      message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
      return;
    }

    setIsDirty(true);

    setRoute((prev) => {
      const prevKids = prev.kids || {};
      const list = [...(prevKids[vanId] || [])];

      // Prevent duplicate
      if (list.some((e) => e.kid.id === kid.id)) return prev;

      const schoolId = kid.schools?.id ?? "no-school";

      // Check if another kid from the same school has staff
      const staff =
        list.find(
          (e) => (e.kid.schools?.id ?? "no-school") === schoolId && e.staff
        )?.staff ?? null;

      const updatedList = [...list, { kid, staff }];

      // Copy staff to all kids of the same school (in case added after the new kid)
      const finalList = updatedList.map((entry) =>
        (entry.kid.schools?.id ?? "no-school") === schoolId
          ? { ...entry, staff }
          : entry
      );

      // Determine if it's the first time this school is added
      const isFirstTime = !(prev.kids?.[vanId] || []).some(
        (e) => (e.kid.schools?.id ?? "no-school") === schoolId
      );

      return {
        ...prev,
        kids: {
          ...prev.kids,
          [vanId]: finalList,
        },
        // peopleInVanCounts: {
        //   ...prev.peopleInVanCounts,
        //   [vanId]: (prev.peopleInVanCounts?.[vanId] || 0) + 1,
        // },
        vanEta: isFirstTime ? { ...prev.vanEta, [vanId]: null } : prev.vanEta,
        schoolOrder: {
          ...prev.schoolOrder,
          [vanId]: prev.schoolOrder?.[vanId]?.includes(schoolId)
            ? prev.schoolOrder[vanId]
            : [...(prev.schoolOrder?.[vanId] || []), schoolId],
        },
      };
    });
  }

  function returnKid(kid, fromVanId = null) {
    if (route.status === "waiting_to_start" || route.status === "in_progress") {
      message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
      return;
    }

    setIsDirty(true);

    // Always remove from absents
    setRoute((prev) => ({
      ...prev,
      absents: prev.absents?.filter((k) => k.id !== kid.id) ?? [],
    }));

    if (!fromVanId) return;

    setRoute((prev) => {
      const updated = { ...prev };

      const existingList = updated.kids?.[fromVanId] ?? [];
      const filteredList = existingList.filter((e) => e.kid.id !== kid.id);

      // Save the modified list back
      updated.kids = {
        ...updated.kids,
        [fromVanId]: filteredList,
      };

      const kidEntry = existingList.find((e) => e.kid.id === kid.id);
      const staff = kidEntry?.staff ?? null;
      const schoolId = kid.schools?.id ?? null;

      // ⚠️ Only try to update ETA if schoolId is valid
      if (schoolId) {
        const stillOthersFromSameSchool = filteredList.some(
          (e) => e.kid.schools?.id === schoolId
        );

        if (!stillOthersFromSameSchool) {
          updated.vanEta[fromVanId] = null;
        }
      }

      // If there's no staff assigned, nothing else to do
      if (!staff || !schoolId) return updated;

      // Check if the same staff is still used by other kids of that school
      const stillUsed = filteredList.some((e) => {
        const s = e.staff;
        if (!s) return false;
        return (
          s.id === staff.id ||
          s.originalId === staff.id ||
          s.id === staff.originalId
        );
      });

      if (!stillUsed) {
        // Add back to staff pool if not already there
        setStaff((prev) => {
          if (prev.some((s) => s.id === staff.id)) return prev;
          return [...prev, staff];
        });

        // Remove this staff from all kids of same school in that van
        updated.kids[fromVanId] = filteredList.map((entry) => {
          if (
            entry.kid.schools?.id === schoolId &&
            (entry.staff?.id === staff.id ||
              entry.staff?.originalId === staff.id ||
              entry.staff?.id === staff.originalId)
          ) {
            return { ...entry, staff: null };
          }
          return entry;
        });

        // Remove from staffInVan tracking
        const currStaffs = updated.staffInVan?.[fromVanId] ?? [];
        updated.staffInVan[fromVanId] = currStaffs.filter(
          (s) =>
            s.id !== staff.id &&
            s.originalId !== staff.id &&
            s.id !== staff.originalId
        );
      }

      return updated;
    });
  }

  const sendPickupRoute = async () => {
    // Save route if dirty
    if (isDirty) {
      await savePickupRoute();
    }

    const { kids = {}, vans = [], date } = route;

    // Validation: Ensure all kids are assigned
    if (kidsRemaining > 0) {
      message.warning("All the kids must be on the route!");
      return;
    }

    for (const van of vans) {
      const kids = kids[van.id] || [];

      // Skip vans with no kids
      if (kids.length === 0) continue;

      // Validate driver
      if (!van.driver) {
        message.warning(`🚐 ${van.name}: No driver assigned.`);
        return;
      }

      // Group kids by school to validate staff assignment
      const schoolGroups = {};
      for (const entry of kids) {
        const schoolId = entry.kid.schools?.id ?? "no-school";
        (schoolGroups[schoolId] ??= []).push(entry);
      }

      for (const [schoolId, group] of Object.entries(schoolGroups)) {
        const hasResponsible = group.some((e) => e.staff);
        const schoolName = group[0]?.kid.schools?.name || "Unnamed School";

        if (!hasResponsible) {
          message.warning(
            `🚐 ${van.name}: No responsible assigned for ${schoolName}`
          );
          return;
        }
      }
    }

    // Update the route status in the DB
    const { error } = await supabase
      .from("routes")
      .update({ status: "waiting_to_start" })
      .eq("type", "pickup")
      .eq("date", date);

    if (error) {
      console.error("❌ Failed to update route status:", error);
      message.error("Error sending the route.");
      return;
    }

    // Update local route state
    setRoute((prev) => ({ ...prev, status: "waiting_to_start" }));
    message.success("✅ Route sent and now waiting to start.");
  };

  function addStaffToVan(staffObj, targetVanId, targetSchoolId) {
    setIsDirty(true);

    setRoute((prev) => {
      const updated = { ...prev };

      // 1. Assign staff to all kids from the same school in the van
      const list = updated.kids[targetVanId] || [];
      updated.kids[targetVanId] = list.map((entry) =>
        (entry.kid.schools?.id ?? null) === targetSchoolId
          ? { ...entry, staff: staffObj }
          : entry
      );

      // 2. Add to visible staff list (if not already there)
      const current = updated.staffInVan[targetVanId] || [];
      const alreadyThere = current.some(
        (s) =>
          s.id === staffObj.id ||
          s.originalId === staffObj.id ||
          s.id === staffObj.originalId
      );
      if (!alreadyThere) {
        updated.staffInVan[targetVanId] = [...current, staffObj];
      }

      // 3. Add to van helpers (unless already helper or driver)
      updated.vans = updated.vans.map((van) => {
        if (van.id !== targetVanId) return van;
        const isDriver = van.driver?.id === staffObj.id;
        const alreadyHelper = van.helpers?.some((h) => h.id === staffObj.id);
        return {
          ...van,
          helpers:
            !isDriver && !alreadyHelper
              ? [...van.helpers, staffObj]
              : van.helpers,
        };
      });

      return updated;
    });
  }

  function returnStaff(staff, vanId) {
    setIsDirty(true);

    setRoute((prev) => {
      const updated = { ...prev };
      // remove staff from all kids
      const list = updated.kids?.[vanId] ?? [];
      updated.kids = {
        ...(updated.kids ?? {}),
        [vanId]: list.map((entry) =>
          entry.staff?.id === staff.id ||
          entry.staff?.originalId === staff.id ||
          staff.originalId === entry.staff?.id
            ? { ...entry, staff: null }
            : entry
        ),
      };

      // Remove from staffInVan
      const current = updated.staffInVan?.[vanId] ?? [];
      updated.staffInVan = {
        ...(updated.staffInVan ?? {}),
        [vanId]: current.filter(
          (s) =>
            s.id !== staff.id &&
            s.originalId !== staff.id &&
            s.id !== staff.originalId
        ),
      };

      // Remove from driver/helpers
      updated.vans = updated.vans.map((van) => {
        if (van.id !== vanId) return van;
        return {
          ...van,
          driver: van.driver?.id === staff.id ? null : van.driver,
          helpers: van.helpers.filter((h) => h.id !== staff.id),
        };
      });

      return updated;
    });

    // Add the staff back if not there yet
    setStaff((prev) => {
      if (prev.some((s) => s.id === staff.id)) return prev;
      return [...prev, staff];
    });
  }

  // debug part (console.log (states))
  // console.log("route", route);

  /* ---------------- drag-and-drop handler ---------------- */
  const onDragStart = (start) => {
    // console.log(start.type);
    if (start.type === "school") {
      const schoolKey = start.draggableId.replace("school-", "");
      setExpandedKeys((prev) => prev.filter((key) => key !== schoolKey));
    }
  };

  const handleDragEnd = ({ source, destination, draggableId, type }) => {
    // console.log("Source: ", source);
    // console.log("Type: ", type);
    // console.log("destination: ", destination);
    // console.log("draggaleId: ", draggableId);

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
        setIsDirty(true);

        setRoute((prev) => {
          const updated = { ...prev };

          // Clear ETA for the van (reset route)
          updated.vanEta = { ...updated.vanEta, [vanId]: null };

          const currentOrder = [...(updated.schoolOrder[vanId] || [])];
          const [moved] = currentOrder.splice(source.index, 1);
          currentOrder.splice(destination.index, 0, moved);

          updated.schoolOrder = {
            ...updated.schoolOrder,
            [vanId]: currentOrder,
          };

          return updated;
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
        staffObj = Object.values(route.kids)
          .flat()
          .map((e) => e.staff)
          .find((s) => s?.id === rawStaffId);
        if (!staffObj) return;
      } else return;

      const kidId = destination.droppableId.replace("resp-", "");
      const targetVanId = Object.entries(route.kids).find(([, list]) =>
        list.some((e) => e.kid.id === kidId)
      )?.[0];

      if (!targetVanId) return;

      const kidEntry = route.kids[targetVanId].find((e) => e.kid.id === kidId);
      const targetSchoolId = kidEntry?.kid.schools?.id ?? null;

      if (kidEntry?.staff) {
        message.info(
          "This child already has a responsible. Use ↩ to remove it first."
        );
        return;
      }

      // If assigning from resp zone to another school in the same van
      if (cameFromResp) {
        const allowDup = window.confirm(
          "This staff is already assigned to another school in this van.\nDo you want to assign this staff to multiple schools?"
        );
        if (!allowDup) return;

        // Create a unique staff instance to allow multiple school assignment
        staffObj = {
          ...staffObj,
          instanceId: crypto.randomUUID(),
          originalId: staffObj.id,
        };
      }

      // remove from pool (staff global)
      if (cameFromPool) {
        setStaff((prev) => prev.filter((s) => s.id !== rawStaffId));
      }

      // add the staff inside the route.staffInVan
      addStaffToVan(staffObj, targetVanId, targetSchoolId);

      setIsDirty(true);
      return;
    }

    // Moving a whole school group
    if (type === "school" && source.droppableId === "schools") {
      const schoolName = draggableId.replace("school-", "");

      // Get all kids from that school
      const kidsToMove = studentsToday.filter(
        (k) => (k.schools?.name || "— No School —") === schoolName
      );

      if (destination.droppableId === "absents") {
        // Move to absents if not already there
        setRoute((prev) => {
          const existing = prev.absents || [];
          const newAbsents = kidsToMove.filter(
            (k) => !existing.some((a) => a.id === k.id)
          );
          return {
            ...prev,
            absents: [...existing, ...newAbsents],
          };
        });
        setIsDirty(true);
      } else if (isVan(destination.droppableId)) {
        // Move to a van, one by one
        kidsToMove.forEach((kid) => {
          addKidToVan(kid, destination.droppableId);
        });
      }

      return;
    }
    // Single kid being moved
    const kid = students.find((k) => k.id === draggableId);
    if (!kid) return;

    const movingFrom = source.droppableId;
    const movingTo = destination.droppableId;

    // 1. Remove from current location
    if (movingFrom === "absents") {
      setRoute((prev) => ({
        ...prev,
        absents: prev.absents?.filter((k) => k.id !== kid.id) || [],
      }));
    } else if (isVan(movingFrom)) {
      returnKid(kid, movingFrom); // Handles cleaning from assignment + staff
    }

    // 2. Add to new location
    if (movingTo === "absents") {
      setRoute((prev) => {
        const alreadyThere = prev.absents?.some((k) => k.id === kid.id);
        return {
          ...prev,
          absents: alreadyThere ? prev.absents : [...(prev.absents || []), kid],
        };
      });
      setIsDirty(true);
    } else if (isVan(movingTo)) {
      addKidToVan(kid, movingTo); // Handles inserting into assignment list
    }
  };

  // console.log("🧒 students:", students);
  // console.log("🚐 vans:", vans);
  // console.log("👨‍🏫 staff:", staff);

  /* ------------ loading screen ------------ */
  if (!students.length || loading) {
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

        {route.status === "waiting_to_start" ? (
          <Button
            danger
            onClick={async () => {
              const confirm = window.confirm("This route is locked. Re-open?");
              if (!confirm) return;

              const { error } = await supabase
                .from("routes")
                .update({ status: "planned" })
                .eq("date", route.date.format("YYYY-MM-DD"))
                .eq("type", "pickup");

              if (error) {
                message.error("❌ Failed to re-open the route.");
              } else {
                message.success("✅ Route is now editable again.");
                setRoute((prev) => ({ ...prev, status: "planned" }));
              }
            }}
          >
            Re-open Route
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={sendPickupRoute}
            disabled={isRouteLocked}
          >
            Send Route
          </Button>
        )}

        {/* {isRouteLocked && <span>Route sent (closed)</span>} */}
        <span>{route.status}</span>
        {isRouteInProgress && (
          <span>❌ Cannot re-open. This route is already in progress.</span>
        )}
      </div>

      <div>
        <RouteGoogleMapsModal
          open={showMap}
          onClose={() => setShowMap(false)}
          coordinates={routeCoords}
          onRouteETA={(eta) => {
            // console.log("⚙️ ETA received:", eta, "for van:", selectedVanId);
            if (selectedVanId) {
              setIsDirty(true);
              setRoute((prev) => ({
                ...prev,
                vanEta: {
                  ...prev.vanEta,
                  [selectedVanId]: eta,
                },
              }));
            }
          }}
        />

        <DatePicker
          value={route.date}
          onChange={(v) => handleDateChange(v || nextBusinessDay())}
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
            title={`Staff List (${staffPoolCount})`}
          >
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
          </Card>
          <div className="vans-card">
            {localVans.map((van) => {
              const kidsInVan = route.kids[van.id] || [];
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
              const orderedIds = (route.schoolOrder?.[van.id] || []).filter(
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
                        {/* <strong>{van.name} -</strong> */}
                        <span>{van.id}</span>
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
                                            isDriverOfVan(entry.staff, van)
                                              ? "Demote from Driver"
                                              : "Promote to Driver"
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              isDriverOfVan(entry.staff, van)
                                            ) {
                                              demoteFromDriver(van);
                                            } else {
                                              promoteToDriver(entry.staff, van);
                                            }
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

                                    // Update route.vans to remove driver if matched
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
                                    e.stopPropagation();

                                    // Remove driver if needed and update absents list
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

                                    returnKid(entry.kid, van.id);
                                  }}
                                >
                                  🚫
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {(route.staffInVan?.[van.id] ?? []).map(
                          (staff, idx) => (
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
                          )
                        )}

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
