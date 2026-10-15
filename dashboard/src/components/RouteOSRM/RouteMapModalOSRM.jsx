// src/components/RouteOSRM/RouteMapModalOSRM.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Segmented, message } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./RouteMapModalOSRM.css";

/**
 * Route modal using MapLibre + OSRM (via your backend)
 * - Forward route: Start -> Stop1 -> Stop2 -> ...  (each leg has the color of the stop it arrives at)
 * - Back route: LastStop -> ... -> Start, drawn as a gray dashed line next to the forward one
 * - Numbered pins (same color as the stop in the list), a start pin, and the travel time on each leg
 * - Hovering a stop in the list highlights its pin (and the other way around)
 * - LRU cache (by orderKey) for forward/back/table results
 * - Sends combined total ETA (forward+back) to parent via onRouteETA
 */

// Base map: a clean vector style. Free and without a key. To use another style, set
// VITE_MAP_STYLE_URL in the .env file (for example ".../styles/liberty").
const MAP_STYLE =
  import.meta.env.VITE_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/positron";

const FWD_SOURCE_ID = "osrm-fwd-src";
const FWD_CASING_ID = "osrm-fwd-casing";
const FWD_LAYER_ID = "osrm-fwd";
const FWD_ARROWS_ID = "osrm-fwd-arrows";
const BACK_SOURCE_ID = "osrm-back-src";
const BACK_LAYER_ID = "osrm-back";
const ARROW_IMAGE_ID = "route-arrow";

// How the numbered stops look on the map:
//   "dot" = a small circle sitting right on the line (like Google Maps)
//   "pin" = a small teardrop whose tip touches the line
const STOP_MARKER_STYLE = "dot";
const IS_DOT = STOP_MARKER_STYLE === "dot";
const STOP_ANCHOR = IS_DOT ? "center" : "bottom";
const STOP_POPUP_OFFSET = IS_DOT ? 16 : 34; // how far above the marker the popup opens

const EMPTY_COLLECTION = { type: "FeatureCollection", features: [] };

/* -----------------------------
   Colors: one per stop, by position (stop 1, stop 2...). The same color is used in the list,
   on the pin and on the leg that arrives at that stop. All of them are dark enough for white text.
------------------------------ */
const STOP_COLORS = [
  "#e63946", // red
  "#d9480f", // orange
  "#2a9d8f", // teal
  "#1d6fb8", // blue
  "#7b2cbf", // purple
  "#c2185b", // magenta
  "#2d6a4f", // green
  "#6d4c41", // brown
];
const stopColor = (index) => STOP_COLORS[index % STOP_COLORS.length];

// Names and addresses are typed by people: never put them in HTML as they are
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

/* -----------------------------
   Pins
------------------------------ */
// Start pin (bus)
function buildBusIcon({ size = 20 } = {}) {
  const svg = `
    <svg width="${size}" height="${(size * 30) / 32}" viewBox="0 0 32 48"
         xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter></defs>
      <path d="M16 1C8.268 1 2 7.268 2 15c0 9.73 14 31 14 31s14-21.27 14-31C30 7.268 23.732 1 16 1z"
        fill="#facc15" stroke="#1f1f1f" stroke-width="1.5" filter="url(#shadow)"/>
      <rect x="7" y="10" width="18" height="10" rx="2" ry="2" fill="#fbbf24" stroke="#000" stroke-width="1"/>
      <rect x="9" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
      <rect x="13" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
      <rect x="17" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
      <rect x="21" y="12" width="3" height="6" fill="#e5e7eb" stroke="#000" stroke-width="0.5"/>
      <circle cx="11" cy="20" r="2" fill="#1f2937" stroke="#000" stroke-width="0.5"/>
      <circle cx="21" cy="20" r="2" fill="#1f2937" stroke="#000" stroke-width="0.5"/>
    </svg>`;

  const img = document.createElement("img");
  img.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  img.style.width = `${size}px`;
  img.style.height = `${(size * 48) / 32}px`; // maintain aspect ratio
  img.style.cursor = "pointer";
  img.style.display = "block";
  return img;
}

// Numbered stop marker (small, so it does not hide the map). MapLibre moves the marker element
// with an inline "transform", so the element we give it is a wrapper and the CSS effects (zoom on
// hover) go on the image inside it.
function buildNumberedPin({ number, color }) {
  const width = 26;
  const height = IS_DOT ? 26 : 34;

  const shape = IS_DOT
    ? `<circle cx="13" cy="13" r="11" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
       <text x="13" y="17.5" text-anchor="middle"
             font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
             font-size="13" font-weight="700" fill="#ffffff">${esc(number)}</text>`
    : `<path d="M17 2C9.27 2 3 8.27 3 16c0 10.5 14 26 14 26s14-15.5 14-26C31 8.27 24.73 2 17 2z"
             fill="${color}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
       <text x="17" y="21.5" text-anchor="middle"
             font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
             font-size="15" font-weight="700" fill="#ffffff">${esc(number)}</text>`;

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${IS_DOT ? "26 26" : "34 44"}"
         xmlns="http://www.w3.org/2000/svg">${shape}</svg>`;

  const img = document.createElement("img");
  img.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  img.width = width;
  img.height = height;
  img.draggable = false;
  img.className = IS_DOT ? "route-pin" : "route-pin route-pin-tip";

  const wrap = document.createElement("div");
  wrap.className = "route-pin-wrap";
  wrap.appendChild(img);
  return wrap;
}

/* -----------------------------
   Map layers (added once, when the style is ready)
------------------------------ */
function addArrowImage(m) {
  if (m.hasImage(ARROW_IMAGE_ID)) return;
  // A small white chevron pointing right; MapLibre turns it along the line
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(8, 5);
  ctx.lineTo(16, 12);
  ctx.lineTo(8, 19);
  ctx.stroke();
  m.addImage(ARROW_IMAGE_ID, ctx.getImageData(0, 0, size, size));
}

function setupLayers(m) {
  addArrowImage(m);

  // The route goes under the street names, so the labels stay readable
  const labelLayerId = m.getStyle().layers.find((l) => l.type === "symbol")?.id;

  // Back route (under the forward one). The offset moves it to the side, so where it follows the
  // same road as the forward route both lines can be seen.
  if (!m.getSource(BACK_SOURCE_ID)) {
    m.addSource(BACK_SOURCE_ID, { type: "geojson", data: EMPTY_COLLECTION });
  }
  if (!m.getLayer(BACK_LAYER_ID)) {
    m.addLayer(
      {
        id: BACK_LAYER_ID,
        type: "line",
        source: BACK_SOURCE_ID,
        layout: { "line-join": "round" },
        paint: {
          "line-color": "#64748b",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [2, 2],
          "line-offset": 8,
        },
      },
      labelLayerId,
    );
  }

  // Forward route: a white casing, the colored legs, and arrows showing the direction
  if (!m.getSource(FWD_SOURCE_ID)) {
    m.addSource(FWD_SOURCE_ID, { type: "geojson", data: EMPTY_COLLECTION });
  }
  if (!m.getLayer(FWD_CASING_ID)) {
    m.addLayer(
      {
        id: FWD_CASING_ID,
        type: "line",
        source: FWD_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 12, "line-opacity": 0.95 },
      },
      labelLayerId,
    );
  }
  if (!m.getLayer(FWD_LAYER_ID)) {
    m.addLayer(
      {
        id: FWD_LAYER_ID,
        type: "line",
        source: FWD_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 8 },
      },
      labelLayerId,
    );
  }
  if (!m.getLayer(FWD_ARROWS_ID)) {
    m.addLayer(
      {
        id: FWD_ARROWS_ID,
        type: "symbol",
        source: FWD_SOURCE_ID,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 90,
          "icon-image": ARROW_IMAGE_ID,
          "icon-size": 0.85,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-rotation-alignment": "map",
        },
      },
      labelLayerId,
    );
  }
}

/* -----------------------------
   Best order of the stops
   The van goes out through the schools (helpers get off at the first ones) and comes back through
   the same schools in the opposite order (to pick the helpers up), so the cost of an order is the
   way out PLUS the way back. matrix[a][b] = cost from point a to point b (index 0 = the start).
------------------------------ */
const MAX_STOPS_FOR_SEARCH = 9; // up to 9 stops every order is tried (362,880): instant

function outAndBackCost(order, matrix) {
  let cost = 0;
  let previous = 0;
  for (const i of order) {
    cost += matrix[previous]?.[i] ?? Infinity;
    previous = i;
  }
  for (let k = order.length - 1; k >= 0; k--) {
    const next = k === 0 ? 0 : order[k - 1];
    cost += matrix[order[k]]?.[next] ?? Infinity;
  }
  return cost;
}

// Tries every order and keeps the cheapest one
function findBestOrder(indexes, matrix) {
  const n = indexes.length;
  const used = new Array(n).fill(false);
  const order = [];
  let best = null;
  let bestCost = Infinity;

  const permute = () => {
    if (order.length === n) {
      const cost = outAndBackCost(order, matrix);
      if (cost < bestCost) {
        bestCost = cost;
        best = [...order];
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      order.push(indexes[i]);
      permute();
      order.pop();
      used[i] = false;
    }
  };

  permute();
  return { order: best, cost: bestCost };
}

/* -----------------------------
   Component
------------------------------ */
export default function RouteMapModalOSRM({
  open,
  onClose,
  coordinates, // [{ lat, lng, name?, schoolId? }, ...] with coordinates[0] = origin
  onRouteETA, // (totalMinutes|null) => void
  vanId,
  onReorderStops,
  blockSchoolOrder,
  // (vanId, schoolIdsInOrder[]) => void
}) {
  const mapRef = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]); // start + stop markers: index 0 = start, index i = stop i
  const stopPinsRef = useRef([]); // the pin elements of the stops (to highlight them)
  const badgeMarkersRef = useRef([]); // travel time written on each leg
  const boundsRef = useRef(null); // the whole route, for the "show whole route" button
  const fwdRouteRef = useRef(null); // { key, fwd }: the forward route that is on the map
  const rebuildTimerRef = useRef(null);

  // LRU cache keyed by orderKey; store { fwd, back, fwdTable, backTable }
  const LRU_MAX = 16;
  const cacheRef = useRef(new Map());
  const lruGet = (key) => {
    const m = cacheRef.current;
    if (!m.has(key)) return null;
    const v = m.get(key);
    m.delete(key);
    m.set(key, v);
    return v;
  };
  const lruSet = (key, val) => {
    const m = cacheRef.current;
    if (m.has(key)) m.delete(key);
    m.set(key, val);
    if (m.size > LRU_MAX) {
      const first = m.keys().next().value;
      m.delete(first);
    }
  };

  // local state
  const [stops, setStops] = useState([]);
  const [etasForward, setEtasForward] = useState([]); // per-leg forward
  const [etasBack, setEtasBack] = useState([]); // per-leg back
  const [totalTime, setTotalTime] = useState(null); // total forward+back
  const [hoverIdx, setHoverIdx] = useState(null); // stop under the mouse (list or pin)
  const [optimizeBy, setOptimizeBy] = useState("time"); // "time" | "distance" (fuel)
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null); // the answer of "Find the best order"

  useEffect(() => {
    setStops(coordinates?.slice(1) ?? []);
  }, [open, coordinates]);

  // Ordered points (start + stops)
  const orderedPoints = useMemo(() => {
    if (!coordinates?.length) return [];
    return [coordinates[0], ...(stops || [])];
  }, [coordinates, stops]);

  // Unique order key for caching
  const orderKey = useMemo(() => {
    if (!orderedPoints.length) return "";
    const startKey = `${orderedPoints[0].lat},${orderedPoints[0].lng}`;
    const stopKey = orderedPoints
      .slice(1)
      .map((s) => s.schoolId ?? `${s.lat},${s.lng}`)
      .join("|");
    return `${startKey}::${stopKey}`;
  }, [orderedPoints]);

  // Runs fn when the map style is ready (the layers are made right before)
  const whenMapReady = (fn) => {
    const m = map.current;
    if (!m) return;
    const run = () => {
      if (!map.current) return;
      setupLayers(map.current);
      fn();
    };
    if (m.isStyleLoaded()) run();
    else m.once("load", run);
  };

  // A suggestion belongs to the order it was calculated for
  useEffect(() => {
    setSuggestion(null);
  }, [orderKey]);

  // Highlight the pin of the stop that is under the mouse
  useEffect(() => {
    stopPinsRef.current.forEach((el, i) =>
      el?.classList.toggle("is-active", i === hoverIdx),
    );
  }, [hoverIdx]);

  /* -----------------------------
     Map init / destroy per modal
  ------------------------------ */
  useEffect(() => {
    if (!open) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapRef.current,
        style: MAP_STYLE,
        center: orderedPoints[0]
          ? [orderedPoints[0].lng, orderedPoints[0].lat]
          : [-123.1207, 49.2827],
        zoom: 11,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");

      map.current.on("load", () => {
        setupLayers(map.current);
        drawMarkers();
        setTimeout(() => map.current?.resize(), 50);
      });
    }

    setTimeout(() => map.current?.resize(), 50);

    return () => {
      if (map.current && !open) {
        try {
          map.current.remove();
        } catch {}
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* -----------------------------
     Rebuild (debounced)
  ------------------------------ */
  const debouncedRebuild = () => {
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(rebuildRoute, 600);
  };

  useEffect(() => {
    if (open) debouncedRebuild();
    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, open]);

  /* -----------------------------
     Fetch + draw forward/back
  ------------------------------ */
  async function rebuildRoute() {
    if (!map.current || !orderedPoints.length) return;

    // Keep markers visible
    whenMapReady(() => drawMarkers());

    // cache
    const cached = lruGet(orderKey);
    if (cached) {
      const { fwd, back, fwdTable, backTable } = cached;
      applyLines(fwd, back);
      const { legsMin: fwdLegs, totalMin: fwdTotal } = legsFromTable(
        orderedPoints,
        fwdTable,
      );
      const { legsMin: backLegs, totalMin: backTotal } = legsFromTable(
        [...orderedPoints].reverse(),
        backTable,
      );
      setEtasForward(fwdLegs);
      setEtasBack(backLegs);
      drawLegBadges(fwd, fwdLegs);
      const combined = (fwdTotal ?? 0) + (backTotal ?? 0);
      setTotalTime(combined);
      onRouteETA?.(combined);
      return;
    }

    const fwdPoints = orderedPoints; // e.g. [Start, School A, School B]
    const backPoints = [...orderedPoints].reverse(); // e.g. [School B, School A, Start]

    // local helpers
    const getDirections = async (points) => {
      const r = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: points.map((p) => ({ lat: p.lat, lng: p.lng })),
          roundTrip: false, // IMPORTANT: we want strict A->...->B, not close loop
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json(); // { geometry, legs:[{distance,duration,geometry?}] }
    };
    const getTable = async (points) => {
      const r = await fetch("/api/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json(); // { durations, distances }
    };

    let fwd, back, fwdTable, backTable;
    try {
      [fwd, back] = await Promise.all([
        getDirections(fwdPoints),
        getDirections(backPoints),
      ]);
    } catch (e) {
      console.error("Directions failed:", e);
      return;
    }

    try {
      [fwdTable, backTable] = await Promise.all([
        getTable(fwdPoints),
        getTable(backPoints),
      ]);
    } catch (e) {
      console.error("Table failed:", e);
    }

    // Draw lines
    applyLines(fwd, back);

    // Compute ETAs
    const { legsMin: fwdLegs, totalMin: fwdTotal } = legsFromTable(
      fwdPoints,
      fwdTable,
    );
    const { legsMin: backLegs, totalMin: backTotal } = legsFromTable(
      backPoints,
      backTable,
    );
    setEtasForward(fwdLegs);
    setEtasBack(backLegs);

    // If the table failed, the minutes of each leg come from the route itself
    const badgeMinutes = fwdLegs.length
      ? fwdLegs
      : (fwd?.legs || []).map((l) => Math.round((l?.duration ?? 0) / 60));
    drawLegBadges(fwd, badgeMinutes);

    const combined = (fwdTotal ?? 0) + (backTotal ?? 0);
    setTotalTime(combined);
    onRouteETA?.(combined);

    // cache it
    lruSet(orderKey, { fwd, back, fwdTable, backTable });
  }

  // Put both lines on the map and fit the view to them
  function applyLines(fwd, back) {
    whenMapReady(() => {
      const m = map.current;

      // Forward: one feature per leg, with the color of the stop where that leg ends
      let features = (fwd?.legs || [])
        .map((leg, i) => ({
          type: "Feature",
          properties: { color: stopColor(i) },
          geometry: leg?.geometry,
        }))
        .filter((f) => f.geometry?.coordinates?.length > 1);

      // If the server did not send the legs, draw the whole route in one color
      if (!features.length && fwd?.geometry) {
        features = [
          {
            type: "Feature",
            properties: { color: stopColor(0) },
            geometry: fwd.geometry,
          },
        ];
      }

      m.getSource(FWD_SOURCE_ID)?.setData({
        type: "FeatureCollection",
        features,
      });
      m.getSource(BACK_SOURCE_ID)?.setData({
        type: "FeatureCollection",
        features: back?.geometry
          ? [{ type: "Feature", properties: {}, geometry: back.geometry }]
          : [],
      });

      // Fit to both lines
      const b = new maplibregl.LngLatBounds();
      features.forEach((f) => f.geometry.coordinates.forEach((c) => b.extend(c)));
      back?.geometry?.coordinates?.forEach((c) => b.extend(c));
      if (!b.isEmpty()) {
        boundsRef.current = b;
        m.fitBounds(b, { padding: 70, maxZoom: 16 });
      }
      setTimeout(() => map.current?.resize(), 40);

      // The markers go where the route really starts and ends (on the road), so they touch the line
      fwdRouteRef.current = { key: orderKey, fwd };
      drawMarkers();
    });
  }

  // The whole route again (after zooming into a stop)
  function fitAll() {
    if (map.current && boundsRef.current) {
      map.current.fitBounds(boundsRef.current, { padding: 70, maxZoom: 16 });
    }
  }

  // Turn table matrix into adjacent-leg minutes and total minutes
  function legsFromTable(points, table) {
    if (!table?.durations) return { legsMin: [], totalMin: null };
    const dur = table.durations;
    const n = points.length;
    const legs = [];
    for (let i = 0; i < n - 1; i++) {
      const s = dur[i][i + 1];
      legs.push(s != null ? Math.round(s / 60) : null);
    }
    const total = legs.reduce((acc, m) => (m != null ? acc + m : acc), 0);
    return { legsMin: legs, totalMin: total };
  }

  /* -----------------------------
     Travel time written on the middle of each forward leg
  ------------------------------ */
  function drawLegBadges(fwd, legsMin) {
    badgeMarkersRef.current.forEach((b) => {
      try {
        b.remove();
      } catch {}
    });
    badgeMarkersRef.current = [];
    if (!map.current) return;

    (fwd?.legs || []).forEach((leg, i) => {
      const coords = leg?.geometry?.coordinates;
      if (!coords || coords.length < 2 || legsMin[i] == null) return;

      const el = document.createElement("div");
      el.className = "leg-badge";
      el.style.borderColor = stopColor(i);
      el.textContent = `${legsMin[i]} min`;

      const badge = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(coords[Math.floor(coords.length / 2)])
        .addTo(map.current);
      badgeMarkersRef.current.push(badge);
    });
  }

  /* -----------------------------
     Markers (Start + numbered Stops)
  ------------------------------ */
  function drawMarkers() {
    // clear previous
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {}
    });
    markersRef.current = [];
    stopPinsRef.current = [];
    if (!orderedPoints.length || !map.current) return;

    // Where each leg of the forward route really starts and ends (on the road). A marker placed
    // there touches the line; the coordinate of the school itself can be some meters from the road.
    const saved = fwdRouteRef.current;
    const legs = saved && saved.key === orderKey ? saved.fwd?.legs || [] : [];
    const legStart = () => legs[0]?.geometry?.coordinates?.[0] ?? null;
    const legEnd = (i) => {
      const c = legs[i]?.geometry?.coordinates;
      return c?.length ? c[c.length - 1] : null;
    };

    // Start
    const start = orderedPoints[0];
    const startMarker = new maplibregl.Marker({
      element: buildBusIcon({ size: 26 }),
      anchor: "bottom",
    })
      .setLngLat(legStart() ?? [start.lng, start.lat])
      .addTo(map.current);

    startMarker.setPopup(
      new maplibregl.Popup({
        closeButton: false,
        closeOnClick: true,
        anchor: "bottom",
        offset: 42,
        maxWidth: "220px",
      }).setHTML(`
        <div class="route-popup">
          <div class="route-popup-title">${esc(start.name || "Start Point")}</div>
          <div>${esc(start.address)}</div>
        </div>
      `),
    );
    markersRef.current.push(startMarker);

    // Stops: numbered pins, with the color of the stop
    orderedPoints.slice(1).forEach((s, idx0) => {
      const el = buildNumberedPin({ number: idx0 + 1, color: stopColor(idx0) });
      el.addEventListener("mouseenter", () => setHoverIdx(idx0));
      el.addEventListener("mouseleave", () => setHoverIdx(null));

      const stopMarker = new maplibregl.Marker({ element: el, anchor: STOP_ANCHOR })
        .setLngLat(legEnd(idx0) ?? [s.lng, s.lat])
        .addTo(map.current);

      stopMarker.setPopup(
        new maplibregl.Popup({
          closeButton: false,
          closeOnClick: true,
          anchor: "bottom",
          offset: STOP_POPUP_OFFSET,
          maxWidth: "220px",
        }).setHTML(`
          <div class="route-popup">
            <div class="route-popup-title">${idx0 + 1}. ${esc(s.name || "Stop")}</div>
            <div>${esc(s.schoolAddress)}</div>
          </div>
        `),
      );

      markersRef.current.push(stopMarker);
      stopPinsRef.current.push(el);
    });
  }

  // Click on a stop of the list: zoom to it and open its popup
  function focusStop(idx) {
    const s = stops[idx];
    const marker = markersRef.current[idx + 1];
    if (!map.current || !s) return;
    map.current.flyTo({
      center: marker ? marker.getLngLat() : [s.lng, s.lat],
      zoom: Math.max(map.current.getZoom(), 15),
    });
    if (marker && !marker.getPopup().isOpen()) marker.togglePopup();
  }

  /* -----------------------------
     Find the best order
  ------------------------------ */
  async function suggestBestOrder() {
    if (stops.length < 2) {
      message.info("Put at least two schools in the van to compare orders.");
      return;
    }
    if (stops.length > MAX_STOPS_FOR_SEARCH) {
      message.warning(
        `Too many schools for the automatic search (maximum ${MAX_STOPS_FOR_SEARCH}).`,
      );
      return;
    }

    setSuggesting(true);
    try {
      // One request: the time and the distance between every pair of points
      const r = await fetch("/api/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: orderedPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const { durations, distances } = await r.json();

      const matrix = optimizeBy === "time" ? durations : distances;
      const current = stops.map((_, i) => i + 1); // 1..N = the stops as they are now
      const best = findBestOrder(current, matrix);

      if (!best.order || !Number.isFinite(best.cost)) {
        message.error("Some of the schools cannot be reached by road.");
        return;
      }

      const currentCost = outAndBackCost(current, matrix);
      setSuggestion({
        same: best.cost >= currentCost - 1e-6, // a tie: the current order is already as good
        order: best.order,
        curMin: Math.round(outAndBackCost(current, durations) / 60),
        bestMin: Math.round(outAndBackCost(best.order, durations) / 60),
        curKm: (outAndBackCost(current, distances) / 1000).toFixed(1),
        bestKm: (outAndBackCost(best.order, distances) / 1000).toFixed(1),
      });
    } catch (e) {
      console.error("Best order failed:", e);
      message.error("Could not calculate the best order.");
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestion() {
    if (blockSchoolOrder) {
      message.warning(
        "❌ Route closed. If you want to change the School Order, you need to re-open.",
      );
      return;
    }
    if (!suggestion) return;

    const next = suggestion.order.map((i) => stops[i - 1]);
    setStops(next);
    onReorderStops?.(
      vanId,
      next.map((s) => s.schoolId ?? null).filter(Boolean),
    );
    onRouteETA?.(null); // the time is recalculated for the new order
    setSuggestion(null);
  }

  /* -----------------------------
     DnD reorder
  ------------------------------ */
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onDragEnd = (result) => {
    if (blockSchoolOrder)
      return message.warning(
        "❌ Route closed. If you want to change the School Order, you need to re-open.",
      );
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const next = reorder(stops, source.index, destination.index);
    setStops(next);

    // Notify parent of new school order (ids only)
    onReorderStops?.(
      vanId,
      next.map((s) => s.schoolId ?? null).filter(Boolean),
    );

    // Clear ETA until recomputed
    onRouteETA?.(null);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{ top: 10 }}
    >
      <div className="route-modal">
        {/* LEFT PANE */}
        <div className="route-left">
          <h3 className="route-title">{`Route Overview${
            blockSchoolOrder ? " (View Only)" : ""
          }`}</h3>
          <p>
            <strong>Start:</strong> {orderedPoints[0]?.name || "Start Point"}
          </p>

          <div style={{ marginTop: 12 }}>
            <div className="stop-list-title">{`Stops ${
              !blockSchoolOrder ? "(drag to reorder)" : ""
            }:`}</div>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="stopsList">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`stop-list ${
                      snapshot.isDraggingOver ? "droppable-over" : ""
                    }`}
                  >
                    {stops.map((s, idx) => {
                      const accent = stopColor(idx);
                      const draggableId = String(
                        s.schoolId ?? `${s.lat},${s.lng}` ?? idx,
                      );
                      // minutes from the start until arriving at this stop
                      const sinceStart = etasForward
                        .slice(0, idx + 1)
                        .reduce((sum, min) => sum + (min ?? 0), 0);
                      return (
                        <Draggable
                          key={draggableId}
                          draggableId={draggableId}
                          index={idx}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`stop-row ${
                                dragSnapshot.isDragging ? "dragging" : ""
                              } ${hoverIdx === idx ? "is-hover" : ""}`}
                              onMouseEnter={() => setHoverIdx(idx)}
                              onMouseLeave={() => setHoverIdx(null)}
                              style={{
                                "--accent": accent,
                                ...dragProvided.draggableProps.style,
                              }}
                            >
                              <div
                                className="drag-handle"
                                title="Drag to reorder"
                                {...dragProvided.dragHandleProps}
                              >
                                ⠿
                              </div>

                              <div className="stop-index">{idx + 1}.</div>

                              <div
                                className="stop-meta"
                                title="Show on the map"
                                onClick={() => focusStop(idx)}
                              >
                                <div className="stop-name">
                                  {s.name || "Stop"}
                                </div>
                                {etasForward[idx] != null && (
                                  <div className="stop-eta">
                                    {etasForward[idx]} min from the previous
                                    stop
                                  </div>
                                )}
                                {etasForward[idx] != null && (
                                  <div className="stop-since">
                                    {sinceStart} min after leaving
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="route-best">
            <div className="route-best-title">Best order</div>
            <Segmented
              size="small"
              value={optimizeBy}
              onChange={(value) => {
                setOptimizeBy(value);
                setSuggestion(null);
              }}
              options={[
                { label: "Fastest", value: "time" },
                { label: "Least distance (fuel)", value: "distance" },
              ]}
            />
            <button
              type="button"
              className="route-fit-btn"
              onClick={suggestBestOrder}
              disabled={suggesting || blockSchoolOrder || stops.length < 2}
            >
              {suggesting ? "Calculating…" : "Find the best order"}
            </button>

            {suggestion && suggestion.same && (
              <div className="route-best-result">
                ✅ Your order is already the best one.
              </div>
            )}
            {suggestion && !suggestion.same && (
              <div className="route-best-result">
                <div>
                  Current: <strong>{suggestion.curMin} min</strong> ·{" "}
                  {suggestion.curKm} km
                </div>
                <div>
                  Suggested: <strong>{suggestion.bestMin} min</strong> ·{" "}
                  {suggestion.bestKm} km
                </div>
                <ol className="route-best-order">
                  {suggestion.order.map((i) => (
                    <li key={i}>{stops[i - 1]?.name || "Stop"}</li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="route-apply-btn"
                  onClick={applySuggestion}
                >
                  Use this order
                </button>
              </div>
            )}
            <div className="route-best-note">
              Counts the way out and the way back, because the van returns
              through the schools to pick up the helpers.
            </div>
          </div>

          <button type="button" className="route-fit-btn" onClick={fitAll}>
            Show the whole route
          </button>

          <hr />
          <h4>
            Total Route Time (forward + back):{" "}
            {totalTime != null ? `${totalTime} min` : "—"}
          </h4>
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Note: ETAs use OSRM (OpenStreetMap), which does not know about
            traffic, so rush hour can take longer.
          </p>
        </div>

        {/* MAP */}
        <div
          className="route-map"
          ref={mapRef}
          style={{ height: 520, borderRadius: 8, border: "1px solid #eee" }}
        />
      </div>
    </Modal>
  );
}
