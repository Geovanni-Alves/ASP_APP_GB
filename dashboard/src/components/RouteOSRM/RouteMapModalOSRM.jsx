// src/components/RouteOSRM/RouteMapModalOSRM.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "antd";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./RouteMapModalOSRM.css";
import { message } from "antd";

/**
 * Route modal using MapLibre + OSRM (via your backend)
 * - Forward route: Start -> Stop1 -> Stop2 -> ...
 * - Back route: LastStop -> ... -> Start (reverse order)
 * - Numbered school pins for Stops (per-school color)
 * - Start pin remains a school icon (non-numbered)
 * - Native MapLibre popups for reliable click behavior
 * - LRU cache (by orderKey) for forward/back/table results
 * - Sends combined total ETA (forward+back) to parent via onRouteETA
 */

const FWD_SOURCE_ID = "osrm-fwd-src";
const FWD_LAYER_ID = "osrm-fwd";
const BACK_SOURCE_ID = "osrm-back-src";
const BACK_LAYER_ID = "osrm-back";

/* -----------------------------
   Helpers: school colors
------------------------------ */
const SCHOOL_COLORS = [
  "#0074D9",
  "#FF4136",
  "#2ECC40",
  "#FF851B",
  "#FFDC00",
  "#7FDBFF",
  "#39CCCC",
  "#3D9970",
];
function getSchoolColor(id) {
  if (id == null) return SCHOOL_COLORS[0];
  const s = String(id);
  const idx =
    Math.abs([...s].reduce((a, c) => a + c.charCodeAt(0), 0)) %
    SCHOOL_COLORS.length;
  return SCHOOL_COLORS[idx];
}

/* -----------------------------
   SVG pins
------------------------------ */
// Start pin (non-numbered school/bus)

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

// Numbered school pin for stops (use per-school color as body)
function buildNumberedSchoolPin({
  number = "",
  size = 26,
  body = "#facc15", // background color
  outline = "#1f1f1f", // circle outline
  text = "white", // text color
} = {}) {
  const w = 32,
    h = 32;
  const scale = size / 32;
  const safeNum = String(number);

  const svg = `
    <svg width="${w}" height="${h}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>

      <!-- Background Circle -->
      <circle cx="16" cy="16" r="14"
        fill="${body}"
        stroke="${outline}"
        stroke-width="1.5"
        filter="url(#shadow)"/>

      <!-- Number -->
      <text x="16" y="21" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
            font-size="19" font-weight="400" fill="${text}">
        ${safeNum}
      </text>
    </svg>
  `;

  const img = document.createElement("img");
  img.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  img.style.width = `${w * scale}px`;
  img.style.height = `${h * scale}px`;
  img.style.cursor = "pointer";
  img.draggable = false;
  img.className = "ml-marker school-pin";
  return img;
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
  const markersRef = useRef([]); // keep markers to clean up
  const rebuildTimerRef = useRef(null);

  // console.log(blockSchoolOrder);

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

  // Convenient “map loaded” helper
  const whenMapReady = (fn) => {
    if (!map.current) return;
    if (map.current.loaded()) fn();
    else map.current.once("load", fn);
  };

  /* -----------------------------
     Map init / destroy per modal
  ------------------------------ */
  useEffect(() => {
    if (!open) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: orderedPoints[0]
          ? [orderedPoints[0].lng, orderedPoints[0].lat]
          : [-123.1207, 49.2827],
        zoom: 11,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");

      map.current.on("load", () => {
        // Add forward line
        if (!map.current.getSource(FWD_SOURCE_ID)) {
          map.current.addSource(FWD_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }
        if (!map.current.getLayer(FWD_LAYER_ID)) {
          map.current.addLayer({
            id: FWD_LAYER_ID,
            type: "line",
            source: FWD_SOURCE_ID,
            paint: {
              "line-color": "#0d6efd",
              "line-width": 5,
              "line-opacity": 0.95,
            },
          });
        }

        // Add back (return) line
        if (!map.current.getSource(BACK_SOURCE_ID)) {
          map.current.addSource(BACK_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }
        if (!map.current.getLayer(BACK_LAYER_ID)) {
          map.current.addLayer({
            id: BACK_LAYER_ID,
            type: "line",
            source: BACK_SOURCE_ID,
            paint: {
              "line-color": "#10b981",
              "line-width": 4,
              "line-opacity": 0.9,
              "line-dasharray": [2, 2],
            },
          });
        }

        // Initial markers
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
      applyLines(fwd?.geometry, back?.geometry);
      const { legsMin: fwdLegs, totalMin: fwdTotal } = legsFromTable(
        orderedPoints,
        fwdTable
      );
      const { legsMin: backLegs, totalMin: backTotal } = legsFromTable(
        [...orderedPoints].reverse(),
        backTable
      );
      setEtasForward(fwdLegs);
      setEtasBack(backLegs);
      const combined = (fwdTotal ?? 0) + (backTotal ?? 0);
      setTotalTime(combined);
      onRouteETA?.(combined);
      return;
    }

    const fwdPoints = orderedPoints; // e.g. [Guildford, Mary Jane, Harold]
    const backPoints = [...orderedPoints].reverse(); // e.g. [Harold, Mary Jane, Guildford]

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

    // DEBUG: log legs per route with names + coordinate counts (if server provides leg geometries)
    if (Array.isArray(fwd?.legs)) {
      console.groupCollapsed("Forward legs (Start -> ... -> Last)");
      fwd.legs.forEach((leg, idx) => {
        const from = fwdPoints[idx];
        const to = fwdPoints[idx + 1];
        const nameFrom = from?.name || (idx === 0 ? "Start" : `Stop ${idx}`);
        const nameTo = to?.name || `Stop ${idx + 1}`;
        const coords = leg?.geometry?.coordinates || [];
        console.log(
          `Leg ${idx}: ${nameFrom} -> ${nameTo} | points=${coords.length} | dist=${leg?.distance}m | dur=${leg?.duration}s`,
          coords
        );
      });
      console.groupEnd();
    }
    if (Array.isArray(back?.legs)) {
      console.groupCollapsed("Back legs (Last -> ... -> Start)");
      back.legs.forEach((leg, idx) => {
        const from = backPoints[idx];
        const to = backPoints[idx + 1];
        const nameFrom = from?.name || (idx === 0 ? "Last" : `Stop ${idx}`);
        const nameTo = to?.name || `Stop ${idx + 1}`;
        const coords = leg?.geometry?.coordinates || [];
        console.log(
          `Leg ${idx}: ${nameFrom} -> ${nameTo} | points=${coords.length} | dist=${leg?.distance}m | dur=${leg?.duration}s`,
          coords
        );
      });
      console.groupEnd();
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
    applyLines(fwd?.geometry, back?.geometry);

    // Compute ETAs
    const { legsMin: fwdLegs, totalMin: fwdTotal } = legsFromTable(
      fwdPoints,
      fwdTable
    );
    const { legsMin: backLegs, totalMin: backTotal } = legsFromTable(
      backPoints,
      backTable
    );
    setEtasForward(fwdLegs);
    setEtasBack(backLegs);

    const combined = (fwdTotal ?? 0) + (backTotal ?? 0);
    setTotalTime(combined);
    onRouteETA?.(combined);

    // cache it
    lruSet(orderKey, { fwd, back, fwdTable, backTable });
  }

  // Put both lines on the map and fit bounds
  function applyLines(fwdGeom, backGeom) {
    whenMapReady(() => {
      const setLine = (sourceId, geometry) => {
        const src = map.current.getSource(sourceId);
        if (!src || !geometry) return;
        const feature = { type: "Feature", geometry, properties: {} };
        src.setData({ type: "FeatureCollection", features: [feature] });
      };

      setLine(FWD_SOURCE_ID, fwdGeom);
      setLine(BACK_SOURCE_ID, backGeom);

      // Fit to both polylines
      const b = new maplibregl.LngLatBounds();
      if (fwdGeom?.coordinates) fwdGeom.coordinates.forEach((c) => b.extend(c));
      if (backGeom?.coordinates)
        backGeom.coordinates.forEach((c) => b.extend(c));
      if (!b.isEmpty()) map.current.fitBounds(b, { padding: 60 });
      setTimeout(() => map.current?.resize(), 40);
    });
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
    if (!orderedPoints.length || !map.current) return;

    // Start (keep as your non-numbered school icon)
    const start = orderedPoints[0];
    console.log("start", start);
    // const startEl = buildOriginAfterSchoolPin({ size: 28 });
    const startEl = buildBusIcon({ size: 36 });
    const startMarker = new maplibregl.Marker({
      element: startEl,
      anchor: "bottom",
    })
      .setLngLat([start.lng, start.lat])
      .addTo(map.current);

    const startPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      anchor: "bottom",
      offset: 18,
      maxWidth: "280px",
    }).setHTML(`
      <div style="min-width:220px">
        <div style="font-weight:600">Start</div>
        <div>${start.name || "Start Point"}</div>
        <div>${start.address}</div>
        <div>Lat/Lng: ${Number(start.lat).toFixed(5)}, ${Number(
      start.lng
    ).toFixed(5)}</div>
      </div>
    `);
    startMarker.setPopup(startPopup);
    markersRef.current.push(startMarker);

    // Stops: numbered school pins with per-school color
    orderedPoints.slice(1).forEach((s, idx0) => {
      const i = idx0 + 1; // 1..N
      const color = getSchoolColor(s.schoolId ?? "default");
      const el = buildNumberedSchoolPin({ number: i, size: 30, body: color });

      const stopMarker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([s.lng, s.lat])
        .addTo(map.current);

      // Show ETA for the forward leg to this stop (if present)
      const etaMin = etasForward[idx0] ?? null;
      const stopPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        anchor: "bottom",
        offset: 18,
        maxWidth: "280px",
      }).setHTML(`
        <div style="min-width:220px">
          <div style="font-weight:600">Stop ${i}</div>
          <div>${s.name || "Stop"}</div>
          <div>${s.schoolAddress}</div>
          <div>Lat/Lng: ${Number(s.lat).toFixed(5)}, ${Number(s.lng).toFixed(
        5
      )}</div>
        </div>
      `);
      stopMarker.setPopup(stopPopup);

      // ensure interactivity
      const wrap = stopMarker.getElement();
      wrap.style.pointerEvents = "auto";
      wrap.style.zIndex = "5";

      markersRef.current.push(stopMarker);
    });
  }

  // console.log("orderedPoints:", orderedPoints);

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
        "❌ Route closed. If you want to change the School Order, you need to re-open."
      );
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const next = reorder(stops, source.index, destination.index);
    setStops(next);

    // Notify parent of new school order (ids only)
    onReorderStops?.(
      vanId,
      next.map((s) => s.schoolId ?? null).filter(Boolean)
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
                      const accent = getSchoolColor(s.schoolId);
                      const draggableId = String(
                        s.schoolId ?? `${s.lat},${s.lng}` ?? idx
                      );
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
                              }`}
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

                              <div className="stop-meta">
                                <div className="stop-name">
                                  {s.name || "Stop"}
                                </div>
                                {etasForward[idx] != null && (
                                  <div className="stop-eta">
                                    ETA (forward): {etasForward[idx]} min
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

          <hr />
          <h4>
            Total Route Time (forward + back):{" "}
            {totalTime != null ? `${totalTime} min` : "—"}
          </h4>
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Note: ETAs use OSRM (OpenStreetMap) and may differ from Google Maps’
            real-time traffic.
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
