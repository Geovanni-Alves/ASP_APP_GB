// components/PickupPlanner/usePickupPlanner.js
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import supabase from "../../lib/supabase.js";
import { message } from "antd";
import { useKidsContext } from "../../contexts/KidsContext.js";
import { useUsersContext } from "../../contexts/UsersContext.js";

dayjs.extend(isoWeek);

const dayMap = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
};
const getDismissal = (kid) =>
  kid.dismissalTime || kid.schools?.dismissal_time || "—";
const nextBusinessDay = () => {
  const today = dayjs();
  const wd = today.isoWeekday();
  return wd >= 6 ? today.add(8 - wd, "day") : today;
};

export function usePickupPlanner({ closeMenu }) {
  // Loadings states per section (vans, staff and kids)
  const [vansLoading, setVansLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [restoringRoute, setRestoringRoute] = useState(true);

  const { kids: students } = useKidsContext();
  const { currentUserData: currentUser } = useUsersContext();
  const [localVans, setLocalVans] = useState([]);
  const [selectedVanId, setSelectedVanId] = useState(null);
  const [staff, setStaff] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [route, setRoute] = useState({
    date: nextBusinessDay(),
    status: "planned",
    vans: [],
    kids: {}, // { vanId: [{ kid, staff? }]}
    absents: [],
    schoolOrder: {}, // { vanId: [schoolIds] }
    staffInVan: {}, // { vanId: [staffObj] }
    vanEta: {},
    startCoords: {},
    aspSchoolName: [],
  });

  const canRestore = !vansLoading && !staffLoading && students; // after all items loaded, the restore fetch can work
  const isRouteInProgress = route.status === "in_progress";
  const isRouteLocked =
    route.status === "waiting_to_start" || route.status === "in_progress";
  // Keep the full roster snapshot separate from the UI pool
  const staffRosterRef = React.useRef([]);

  const peopleInVanCounts = useMemo(() => {
    const counts = {};
    for (const van of route.vans) {
      const vanId = van.id;
      const numKids = route.kids[vanId]?.length || 0;
      const numStaff = route.staffInVan?.[vanId]?.length || 0;
      counts[vanId] = numKids + numStaff;
    }
    return counts;
  }, [route.kids, route.staffInVan, route.vans]);

  // settings (pickup start + asp name)
  useEffect(() => {
    const fetchSettings = async () => {
      setSettingsLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["pickup_start_coords", "after_school_name"]);
      if (error) {
        console.error("Error fetching settings:", error);
        setSettingsLoading(false);
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
      if (schoolName)
        setRoute((prev) => ({ ...prev, aspSchoolName: schoolName }));
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  // fetch the vans data from db
  useEffect(() => {
    (async () => {
      setVansLoading(true);
      const { data, error } = await supabase
        .from("vans")
        .select("*")
        .order("name");
      if (!error) {
        setLocalVans(data || []);
        setRoute((prev) => ({
          ...prev,
          vans: (data || []).map((v) => ({
            ...v,
            driver: v.driver ?? null,
            helpers: v.helpers ?? [],
          })),
        }));
      }
      setVansLoading(false);
    })();
  }, []);

  // staff
  const fetchStaff = async () => {
    setStaffLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .eq("userType", "STAFF")
      .order("name");
    if (!error) {
      setStaff(data || []);
      staffRosterRef.current = data || [];
    }
    setStaffLoading(false);
  };
  useEffect(() => {
    fetchStaff();
  }, []);

  // restore saved route for date
  useEffect(() => {
    if (!route.date || !canRestore) return;

    const fetchPickupRouteForDate = async () => {
      setRestoringRoute(true);
      const dateStr = route.date.format("YYYY-MM-DD");

      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("*")
        .eq("type", "pickup")
        .eq("date", dateStr)
        .maybeSingle();
      if (routeError) {
        console.error("❌ Error fetching route:", routeError);
        setRestoringRoute(false);
        return;
      }

      // Choose a stable base roster (full snapshot preferred)
      const baseRoster =
        (staffRosterRef.current && staffRosterRef.current.length
          ? staffRosterRef.current
          : staff) || [];

      if (!routeData) {
        // No saved route for this date → show empty vans so user can plan
        const freshVans = localVans.map((v) => ({
          ...v,
          driver: null,
          helpers: [],
        }));

        if (baseRoster.length) {
          setStaff(baseRoster);
        }

        setRoute((prev) => ({
          ...prev,
          status: "planned",
          kids: {},
          schoolOrder: {},
          vanEta: {},
          staffInVan: {},
          absents: [],
          vans: freshVans,
        }));
        setIsDirty(false);
        setRestoringRoute(false);
        return;
      }

      const { data: vansData, error: vansError } = await supabase
        .from("route_vans")
        .select("*")
        .eq("route_id", routeData.id);
      if (vansError) {
        console.error("❌ Error fetching route vans:", vansError);
        setRestoringRoute(false);
        return;
      }

      const { data: stopsData, error: stopsError } = await supabase
        .from("route_stops")
        .select(
          `*, students (*, schools (*)), users!responsible_staff_id (id, name)`
        )
        .in(
          "route_van_id",
          (vansData || []).map((v) => v.id)
        );
      if (stopsError) {
        console.error("❌ Error fetching route stops:", stopsError);
        setRestoringRoute(false);
        return;
      }

      const routeMap = {};
      const orderMap = {};
      const etaMap = {};
      const staffsMap = {};
      const usedStaffIds = new Set();

      const newVans = localVans.map((v) => ({ ...v }));

      (vansData || []).forEach((vanData) => {
        const vanId = vanData.van_id;
        const routeVanId = vanData.id;
        const van = newVans.find((v) => v.id === vanId);
        if (!van) return;

        // Mark raw ids as used (independent of name matches)
        if (vanData.driver_id) usedStaffIds.add(vanData.driver_id);
        (vanData.helper_ids || []).forEach((id) => usedStaffIds.add(id));

        // Build driver from roster when possible (fallback to placeholder)
        let driver = null;
        if (vanData.driver_id) {
          const m = baseRoster.find((s) => s.id === vanData.driver_id);
          driver = {
            id: `van-driver-${vanId}`,
            name: m?.name || "",
            originalId: m?.id || vanData.driver_id,
            isDriver: true,
          };
        }

        // Build helpers similarly
        const helpers = (vanData.helper_ids ?? []).map((id, idx) => {
          const m = baseRoster.find((s) => s.id === id);
          return {
            id: `van-helper-${vanId}-${idx}`,
            name: m?.name || "",
            originalId: id,
            isDriver: false,
          };
        });

        van.driver = driver;
        van.helpers = helpers;

        staffsMap[vanId] = [...(driver ? [driver] : []), ...helpers];
        etaMap[vanId] = vanData.total_eta ?? null;
        if (vanData.school_order) orderMap[vanId] = vanData.school_order;

        const stops = (stopsData || []).filter(
          (s) => s.route_van_id === routeVanId
        );
        routeMap[vanId] = stops.map((s) => ({
          kid: { ...s.students, schools: s.students.schools },
          staff: s.users || null,
        }));
      });

      // Also mark responsibles from stops (join may be null → fallback to FK)
      (stopsData || []).forEach((st) => {
        const respId = st?.users?.id ?? st?.responsible_staff_id ?? null;
        if (respId) usedStaffIds.add(respId);
      });

      const restoredAbsents = students.filter((s) =>
        (routeData.absents || []).includes(s.id)
      );

      const availableStaff = baseRoster.filter((s) => !usedStaffIds.has(s.id));
      setStaff(availableStaff);
      // console.log("usedStaffIds: ", usedStaffIds);
      // console.log("vansData: ", vansData);

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

      // console.log("staffsMap: ", staffsMap);
      // console.log("staffInVan:", route.staffInVan);

      setIsDirty(false);
      setRestoringRoute(false);
    };
    fetchPickupRouteForDate();
  }, [route.date, canRestore]);

  const vanIdSet = useMemo(() => {
    const src = (route.vans?.length ? route.vans : localVans) || [];
    return new Set(src.map((v) => v.id));
  }, [route.vans, localVans]);
  const isVan = (id) => vanIdSet.has(id);

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

  const absentsCount = route.absents.length;
  const staffPoolCount = staff.length;
  const dayLabel = route.date?.format("dddd");
  const totalKidsToday = studentsToday.length;
  const totalSchoolsToday = Object.keys(groupedBySchool).length;

  function needsBooster(kid) {
    if (!kid.birthDate) return true;
    const age = dayjs().diff(dayjs(kid.birthDate), "year");
    return age < 9;
    // NOTE: replace with your local rule if height matters too
  }
  function countBoostersInVan(vanId) {
    const kids = route.kids?.[vanId] || [];
    return kids.filter((e) => needsBooster(e.kid)).length;
  }

  // clean orphan school ids if needed
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
      return changed ? { ...prev, schoolOrder: nextOrder } : prev;
    });
  }, [route.kids]);

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
    setRoute((prev) => ({ ...prev, date: nextBusinessDay() }));
  }, []);

  function handleDateChange(date) {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. If you switch the date, everything will be lost. Continue?"
      );
      if (!confirmed) return;
    }
    setRoute((prev) => ({
      date,
      status: "planned",
      vans: [],
      kids: {},
      absents: [],
      schoolOrder: {},
      staffInVan: {},
      vanEta: {},
      startCoords: prev.startCoords ?? {},
      aspSchoolName: prev.aspSchoolName ?? [],
    }));
    setIsDirty(false);
  }

  const isDriver = (staffObj) =>
    route.vans.some((van) => {
      const driver = van.driver;
      if (!driver) return false;
      return (
        driver.id === staffObj.id ||
        driver.originalId === staffObj.id ||
        driver.originalId === staffObj.originalId ||
        driver.id === staffObj.originalId
      );
    });

  const isDriverOfVan = (staffObj, van) => {
    if (!van.driver) return false;
    return (
      van.driver.id === staffObj.id ||
      van.driver.originalId === staffObj.id ||
      van.driver.id === staffObj.originalId
    );
  };

  const promoteToDriver = (staffObj, van) => {
    if (isRouteLocked)
      return message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
    setIsDirty(true);
    setRoute((prev) => {
      const updatedVans = prev.vans.map((v) => {
        if (v.id !== van.id) return v;
        const isSameStaff = (a, b) =>
          a.id === b.id || a.originalId === b.id || a.id === b.originalId;
        const newHelpers = (v.helpers || []).filter(
          (h) => !isSameStaff(h, staffObj)
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
          ...staffObj,
          instanceId: crypto.randomUUID(),
          originalId: staffObj.originalId ?? staffObj.id,
          isDriver: true,
        };
        return { ...v, helpers: newHelpers, driver: newDriver };
      });
      return { ...prev, vans: updatedVans };
    });
  };

  const demoteFromDriver = (van) => {
    if (isRouteLocked)
      return message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
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
        return { ...v, driver: null, helpers: [...newHelpers, demotedHelper] };
      });
      return { ...prev, vans: updatedVans };
    });
  };

  function addKidToVan(kid, vanId) {
    if (isRouteLocked)
      return message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
    setIsDirty(true);
    setRoute((prev) => {
      const prevKids = prev.kids || {};
      const list = [...(prevKids[vanId] || [])];
      if (list.some((e) => e.kid.id === kid.id)) return prev; // duplicate guard
      const schoolId = kid.schools?.id ?? "no-school";
      const staffForSchool =
        list.find(
          (e) => (e.kid.schools?.id ?? "no-school") === schoolId && e.staff
        )?.staff ?? null;
      const updatedList = [...list, { kid, staff: staffForSchool }];
      const finalList = updatedList.map((entry) =>
        (entry.kid.schools?.id ?? "no-school") === schoolId
          ? { ...entry, staff: staffForSchool }
          : entry
      );
      const isFirstTime = !(prev.kids?.[vanId] || []).some(
        (e) => (e.kid.schools?.id ?? "no-school") === schoolId
      );
      return {
        ...prev,
        kids: { ...prev.kids, [vanId]: finalList },
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

  function returnKid(kid, fromVanId = null, toAbsents = false) {
    if (isRouteLocked)
      return message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );

    setIsDirty(true);

    // Always remove from absents
    // setRoute((prev) => ({
    //   ...prev,
    //   absents: prev.absents?.filter((k) => k.id !== kid.id) ?? [],
    // }));
    setRoute((prev) => ({
      ...prev,
      absents: toAbsents
        ? prev.absents?.some((a) => a.id === kid.id)
          ? prev.absents
          : [...(prev.absents || []), kid]
        : prev.absents?.filter((a) => a.id !== kid.id) ?? [],
    }));

    if (!fromVanId) return;

    setRoute((prev) => {
      const next = { ...prev };

      // clone parents first
      const nextKids = { ...(prev.kids || {}) };
      const nextVanEta = { ...(prev.vanEta || {}) };
      const nextStaffInVan = { ...(prev.staffInVan || {}) };

      const existingList = nextKids?.[fromVanId] ?? [];
      const filteredList = existingList.filter((e) => e.kid.id !== kid.id);

      nextKids[fromVanId] = filteredList;

      const kidEntry = existingList.find((e) => e.kid.id === kid.id);
      const staffObj = kidEntry?.staff ?? null;
      const schoolId = kid.schools?.id ?? null;

      if (schoolId) {
        const stillOthersFromSameSchool = filteredList.some(
          (e) => e.kid.schools?.id === schoolId
        );
        if (!stillOthersFromSameSchool) {
          nextVanEta[fromVanId] = null; // write into cloned map
        }
      }
      if (!staffObj || !schoolId) {
        return { ...next, kids: nextKids, vanEta: nextVanEta };
      }

      const stillUsed = filteredList.some((e) => {
        const s = e.staff;
        if (!s) return false;
        return (
          s.id === staffObj.id ||
          s.originalId === staffObj.id ||
          s.id === staffObj.originalId
        );
      });

      if (!stillUsed) {
        // return staff to pool if missing
        setStaff((prevPool) =>
          prevPool.some((s) => s.id === staffObj.id)
            ? prevPool
            : [...prevPool, staffObj]
        );

        // clear staff for entries in the same school
        nextKids[fromVanId] = filteredList.map((entry) => {
          if (
            entry.kid.schools?.id === schoolId &&
            (entry.staff?.id === staffObj.id ||
              entry.staff?.originalId === staffObj.id ||
              entry.staff?.id === staffObj.originalId)
          ) {
            return { ...entry, staff: null };
          }
          return entry;
        });

        // remove from staffInVan (using cloned map)
        const currStaffs = nextStaffInVan?.[fromVanId] ?? [];
        nextStaffInVan[fromVanId] = currStaffs.filter(
          (s) =>
            s.id !== staffObj.id &&
            s.originalId !== staffObj.id &&
            s.id !== staffObj.originalId
        );
      }

      return {
        ...next,
        kids: nextKids,
        vanEta: nextVanEta,
        staffInVan: nextStaffInVan,
      };
    });
  }

  function addStaffToVan(staffObj, targetVanId, targetSchoolId) {
    // Hard stop if the route is locked
    if (isRouteLocked) {
      message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
      return;
    }

    setIsDirty(true);

    setRoute((prev) => {
      // 1) Normalize staff identity so comparisons are stable across copies/instances
      const normalizedStaff = {
        ...staffObj,
        originalId: staffObj.originalId ?? staffObj.id,
      };

      // 2) Prepare shallow copies of top-level containers to preserve immutability
      const next = { ...prev };

      // --- kids (by van) ---
      const nextKidsByVan = { ...(prev.kids || {}) };
      const currentList = Array.isArray(nextKidsByVan[targetVanId])
        ? [...nextKidsByVan[targetVanId]]
        : [];

      // Map only entries for the target school and only if staff is not already set
      const updatedList = currentList.map((entry) => {
        const entrySchoolId = entry?.kid?.schools?.id ?? null;
        if (entrySchoolId !== targetSchoolId) return entry;
        if (entry?.staff) return entry; // do not overwrite existing responsible
        return { ...entry, staff: normalizedStaff };
      });

      nextKidsByVan[targetVanId] = updatedList;
      next.kids = nextKidsByVan;

      // --- staffInVan (visible staff list per van, used by UI badges etc.) ---
      const nextStaffInVan = { ...(prev.staffInVan || {}) };
      const visible = Array.isArray(nextStaffInVan[targetVanId])
        ? [...nextStaffInVan[targetVanId]]
        : [];

      const alreadyVisible = visible.some(
        (s) =>
          s.id === normalizedStaff.id ||
          s.originalId === normalizedStaff.id ||
          s.id === normalizedStaff.originalId
      );

      if (!alreadyVisible) {
        visible.push(normalizedStaff);
      }
      nextStaffInVan[targetVanId] = visible;
      next.staffInVan = nextStaffInVan;

      // --- vans.helpers (do not add if the person is the driver; avoid duplicates) ---
      const clonedVans = Array.isArray(prev.vans)
        ? prev.vans.map((v) => ({ ...v }))
        : [];
      const updatedVans = clonedVans.map((van) => {
        if (van.id !== targetVanId) return van;

        const helpers = Array.isArray(van.helpers) ? [...van.helpers] : [];

        const isDriver =
          van.driver?.id === normalizedStaff.id ||
          van.driver?.originalId === normalizedStaff.id ||
          normalizedStaff.originalId === van.driver?.id;

        const alreadyHelper = helpers.some(
          (h) =>
            h.id === normalizedStaff.id ||
            h.originalId === normalizedStaff.id ||
            h.id === normalizedStaff.originalId
        );

        return {
          ...van,
          helpers:
            !isDriver && !alreadyHelper
              ? [...helpers, normalizedStaff]
              : helpers,
        };
      });

      next.vans = updatedVans;

      return next;
    });
  }

  function returnStaff(staffObj, vanId) {
    setIsDirty(true);
    setRoute((prev) => {
      const next = { ...prev };

      // clone parents
      const nextKids = { ...(prev.kids || {}) };
      const nextStaffInVan = { ...(prev.staffInVan || {}) };
      const nextVans = (prev.vans || []).map((v) => ({ ...v }));

      // remove from kids (new array reference)
      const list = nextKids?.[vanId] ?? [];
      nextKids[vanId] = list.map((entry) =>
        entry.staff?.id === staffObj.id ||
        entry.staff?.originalId === staffObj.id ||
        staffObj.originalId === entry.staff?.id
          ? { ...entry, staff: null }
          : entry
      );

      // remove from staffInVan (new array reference)
      const current = nextStaffInVan?.[vanId] ?? [];
      nextStaffInVan[vanId] = current.filter(
        (s) =>
          s.id !== staffObj.id &&
          s.originalId !== staffObj.id &&
          s.id !== staffObj.originalId
      );

      // remove from van driver/helpers (new array reference)
      const vansUpdated = nextVans.map((van) => {
        if (van.id !== vanId) return van;
        const driver =
          van.driver?.id === staffObj.id ||
          van.driver?.originalId === staffObj.id
            ? null
            : van.driver;
        const helpers = Array.isArray(van.helpers) ? van.helpers : [];
        return {
          ...van,
          driver,
          helpers: helpers.filter(
            (h) =>
              h.id !== staffObj.id &&
              h.originalId !== staffObj.id &&
              h.id !== staffObj.originalId
          ),
        };
      });

      return {
        ...next,
        kids: nextKids,
        staffInVan: nextStaffInVan,
        vans: vansUpdated,
      };
    });

    setStaff((prevPool) =>
      prevPool.some((s) => s.id === staffObj.id)
        ? prevPool
        : [...prevPool, staffObj]
    );
  }

  function handleViewRoute(van) {
    if (isRouteLocked)
      return message.warning(
        "❌ Route closed. If you want to change, you need to re-open."
      );
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
    if (!route.startCoords)
      return message.error("Starting location not available.");
    if (orderedStops.length === 0)
      return message.warning("No valid school coordinates found for this van.");
    setSelectedVanId(van.id);
    setRouteCoords([
      { ...route.startCoords, name: route.aspSchoolName || "Start Location" },
      ...orderedStops,
    ]);
    setShowMap(true);
  }

  async function savePickupRoute() {
    const today = route.date.format("YYYY-MM-DD");
    let routeId;

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
        .update({ status: "planned", absents: route.absents.map((a) => a.id) })
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

    for (const van of route.vans) {
      const kids = route.kids[van.id] || [];
      if (kids.length === 0) continue;

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
      await supabase
        .from("route_stops")
        .delete()
        .eq("route_van_id", routeVanId);
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
  }

  async function sendPickupRoute() {
    if (isDirty) await savePickupRoute();

    const { kids = {}, vans = [], date } = route;
    if (kidsRemaining > 0) {
      message.warning("All the kids must be on the route or absent!");
      return;
    }

    for (const van of vans) {
      const list = kids[van.id] || [];
      if (list.length === 0) continue;
      if (!van.driver) {
        message.warning(`🚐 ${van.name}: No driver assigned.`);
        return;
      }

      const schoolGroups = {};
      for (const entry of list) {
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

    setRoute((prev) => ({ ...prev, status: "waiting_to_start" }));
    message.success("✅ Route sent and now waiting to start.");
  }

  // dnd handlers
  const onDragStart = (start) => {
    if (start.type === "school") {
      const schoolKey = start.draggableId.replace("school-", "");
      setExpandedKeys((prev) => prev.filter((key) => key !== schoolKey));
    }
  };

  function parseStaffDragId(draggableId) {
    const PREFIX = "staff-";
    if (!draggableId.startsWith(PREFIX))
      return { staffId: null, instanceId: null };
    const raw = draggableId.slice(PREFIX.length);
    const staffId = raw.slice(0, 36); // canonical id (UUID length)
    const rest = raw.slice(36);
    const instanceId = rest.startsWith("-") ? rest.slice(1) : null;
    return { staffId, instanceId };
  }

  const handleDragEnd = ({ source, destination, draggableId, type }) => {
    // console.log("type", type);
    // console.log("destination droppableId ", destination?.droppableId);
    // console.log("source ", source);
    if (!destination) return;
    if (type === "staff" && !destination.droppableId.startsWith("resp-"))
      return;

    const droppingBackToSchool =
      destination.droppableId.startsWith("school-") ||
      destination.droppableId === "schools";
    if (
      droppingBackToSchool &&
      (source.droppableId === "absents" || isVan(source.droppableId))
    )
      return;

    if (type === "schoolOrder") {
      if (source.droppableId === destination.droppableId) {
        const vanId = source.droppableId.replace("order-", "");
        setIsDirty(true);
        setRoute((prev) => {
          const updated = { ...prev };
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

    if (type === "staff" && destination.droppableId.startsWith("resp-")) {
      // 1) Target kid context
      const kidId = destination.droppableId.replace("resp-", "");
      const fromPool = source.droppableId === "staffPool";
      const fromResp = source.droppableId.startsWith("resp-");

      // 2) Parse draggableId to get canonical staffId (and optional instanceId)
      const { staffId, instanceId } = parseStaffDragId(draggableId);
      if (!staffId) return;

      // 3) Resolve staff object from the proper source
      let staffObj = null;

      if (fromPool) {
        // Pool: find by canonical id
        staffObj = staff.find((s) => s.id === staffId) || null;
      } else if (fromResp) {
        // resp-* : try to find by instanceId first (more precise), then by identity
        const visible = Object.values(route.staffInVan || {}).flat();
        if (instanceId) {
          staffObj = visible.find((s) => s?.instanceId === instanceId) || null;
        }
        if (!staffObj) {
          const assigned = Object.values(route.kids || {})
            .flat()
            .map((e) => e?.staff)
            .filter(Boolean);
          staffObj =
            assigned.find(
              (s) =>
                s?.instanceId === instanceId ||
                s?.id === staffId ||
                s?.originalId === staffId
            ) ||
            visible.find(
              (s) =>
                s?.instanceId === instanceId ||
                s?.id === staffId ||
                s?.originalId === staffId
            ) ||
            null;
        }
      }
      if (!staffObj) return;

      // 4) Find van for this kid
      const targetVanId = Object.entries(route.kids || {}).find(([, list]) =>
        (list || []).some((e) => e.kid?.id === kidId)
      )?.[0];
      if (!targetVanId) return;

      // 5) Check if the kid already has a responsible
      const kidEntry = (route.kids[targetVanId] || []).find(
        (e) => e.kid?.id === kidId
      );
      if (kidEntry?.staff) {
        message.info(
          "This child already has a responsible. Use ↩ to remove it first."
        );
        return;
      }
      const targetSchoolId = kidEntry?.kid?.schools?.id ?? null;

      // 6) If dragging from resp- to another school in the same van, clone with a fresh instanceId
      if (fromResp) {
        const allowDup = window.confirm(
          "This staff is already assigned to another school in this van.\nDo you want to assign this staff to multiple schools?"
        );
        if (!allowDup) return;

        // Create a new instance but keep the canonical id intact
        staffObj = {
          ...staffObj,
          instanceId:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${staffObj.id}-${Date.now()}`,
          originalId: staffObj.originalId || staffObj.id,
        };
      }

      if (fromPool) {
        // setStaffPool((prev) => prev.filter((s) => s.id !== staffId));
        setStaff((prev) => prev.filter((s) => s.id !== staffId));
      }

      // 8) Centralized update (immutably updates kids + staffInVan + van.helpers)
      addStaffToVan(staffObj, targetVanId, targetSchoolId);

      setIsDirty(true);
      return;
    }

    // moving school group from pool
    if (type === "school" && source.droppableId === "schools") {
      const schoolName = draggableId.replace("school-", "");
      const kidsToMove = studentsToday.filter(
        (k) => (k.schools?.name || "— No School —") === schoolName
      );
      if (destination.droppableId === "absents") {
        setRoute((prev) => {
          const existing = prev.absents || [];
          const newAbsents = kidsToMove.filter(
            (k) => !existing.some((a) => a.id === k.id)
          );
          return { ...prev, absents: [...existing, ...newAbsents] };
        });
        setIsDirty(true);
      } else if (isVan(destination.droppableId)) {
        kidsToMove.forEach((kid) => addKidToVan(kid, destination.droppableId));
      }
      return;
    }

    // single kid
    const kid = students.find((k) => k.id === draggableId);
    if (!kid) return;

    const from = source.droppableId;
    const to = destination.droppableId;

    if (from === "absents") {
      setRoute((prev) => ({
        ...prev,
        absents: prev.absents?.filter((k) => k.id !== kid.id) || [],
      }));
    } else if (isVan(from)) {
      returnKid(kid, from);
    }

    if (to === "absents") {
      setRoute((prev) => {
        const alreadyThere = prev.absents?.some((k) => k.id === kid.id);
        return {
          ...prev,
          absents: alreadyThere ? prev.absents : [...(prev.absents || []), kid],
        };
      });
      setIsDirty(true);
    } else if (isVan(to)) {
      addKidToVan(kid, to);
    }
  };

  // map modal callback
  function onRouteETA(eta) {
    if (selectedVanId) {
      setIsDirty(true);
      setRoute((prev) => ({
        ...prev,
        vanEta: { ...prev.vanEta, [selectedVanId]: eta },
      }));
    }
  }

  return {
    // external props for render:
    closeMenu,
    settingsLoading,
    restoringRoute,
    vansLoading,
    staffLoading,
    route,
    setRoute,
    isDirty,
    setIsDirty,

    localVans,
    staff,
    setStaff,

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

    // helpers/logic used by render:
    getDismissal,
    needsBooster,
    countBoostersInVan,
    isDriver,
    isDriverOfVan,
    promoteToDriver,
    demoteFromDriver,
    addKidToVan,
    returnKid,
    addStaffToVan,
    returnStaff,

    // actions:
    handleDateChange,
    savePickupRoute,
    sendPickupRoute,
    handleViewRoute,

    // drag and drop:
    onDragStart,
    handleDragEnd,

    // map modal
    showMap,
    setShowMap,
    routeCoords,
    onRouteETA,
  };
}
