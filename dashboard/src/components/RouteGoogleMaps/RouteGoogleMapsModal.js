// components/RouteMapModalGoogle.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Modal } from "antd";
import "./RouteGoogleMapsModal.css";

export default function RouteMapModalGoogle({
  open,
  onClose,
  coordinates,
  onRouteETA,
  vanId,
  onReorderStops,
}) {
  const mapRef = useRef(null);
  const mapContainer = useRef(null);

  const [totalTime, setTotalTime] = useState(null);
  const [etas, setETAs] = useState([]);
  const apikey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const lastCoordsKey = useRef(null);
  const lastRouteResult = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);

  const directionsRendererRef = useRef(null);
  const routeCacheRef = useRef(new Map());
  const rebuildTimerRef = useRef(null);

  const SCHOOL_COLORS = [
    "#0074D9",
    "#FF4136",
    "#2ECC40",
    "#FF851B",
    "#B10DC9",
    "#FFDC00",
    "#7FDBFF",
    "#39CCCC",
    "#85144b",
    "#3D9970",
  ];

  const getSchoolColor = (id) => {
    if (id == null) return SCHOOL_COLORS[0];
    const s = String(id);
    const idx =
      Math.abs([...s].reduce((a, c) => a + c.charCodeAt(0), 0)) %
      SCHOOL_COLORS.length;
    return SCHOOL_COLORS[idx];
  };

  function buildNumberedPin({ color = "#1677ff", number = "", size = 26 }) {
    const w = 32,
      h = 48;
    const scale = size / 32;
    const fontSize = Math.max(10, Math.round(12 * scale));
    const svg = `
      <svg width="${w}" height="${h}" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/></filter></defs>
        <path d="M16 1C8.268 1 2 7.268 2 15c0 9.73 14 31 14 31s14-21.27 14-31C30 7.268 23.732 1 16 1z"
          fill="${color}" stroke="#1f1f1f" stroke-width="1.5" filter="url(#shadow)"/>
        ${
          number
            ? `<text x="16" y="19" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
                font-size="${fontSize}" font-weight="700" fill="#fff">${number}</text>`
            : ""
        }
      </svg>`;
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(w * scale, h * scale),
      anchor: new window.google.maps.Point((w * scale) / 2, h * scale),
    };
  }

  function buildOriginAfterSchoolPin({ size = 28 }) {
    const w = 32,
      h = 48;
    const scale = size / 32;
    const svg = `
      <svg width="${w}" height="${h}" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/></filter></defs>
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
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(w * scale, h * scale),
      anchor: new window.google.maps.Point((w * scale) / 2, h * scale),
    };
  }

  const [stops, setStops] = useState([]);
  useEffect(() => {
    setStops(coordinates?.slice(1) ?? []);
  }, [open, coordinates]);

  const orderKey = useMemo(() => {
    if (!coordinates?.length) return "";
    const startKey = `${coordinates[0].lat},${coordinates[0].lng}`;
    const stopKey = (stops || [])
      .map((s) => s.schoolId ?? `${s.lat},${s.lng}`)
      .join("|");
    return `${startKey}::${stopKey}`;
  }, [coordinates, stops]);

  const debouncedRebuildRoute = () => {
    if (!mapRef.current || !window.google || !coordinates?.length) return;
    const cached = routeCacheRef.current.get(orderKey);
    if (cached) {
      directionsRendererRef.current.setDirections(cached);
      handleETAs(cached);
      drawCustomMarkers([coordinates[0], ...stops]);
      lastCoordsKey.current = orderKey;
      lastRouteResult.current = cached;
      return;
    }

    const run = () => {
      const google = window.google;
      const directionsService = new google.maps.DirectionsService();
      const waypoints = stops.map((coord) => ({
        location: { lat: coord.lat, lng: coord.lng },
        stopover: true,
      }));
      directionsService.route(
        {
          origin: { lat: coordinates[0].lat, lng: coordinates[0].lng },
          destination: { lat: coordinates[0].lat, lng: coordinates[0].lng },
          waypoints,
          optimizeWaypoints: false,
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: "bestguess",
          },
        },
        (result, status) => {
          if (status === "OK") {
            routeCacheRef.current.set(orderKey, result);
            lastCoordsKey.current = orderKey;
            lastRouteResult.current = result;
            directionsRendererRef.current.setDirections(result);
            handleETAs(result);
            drawCustomMarkers([coordinates[0], ...stops]);
          } else {
            console.warn("Directions request failed due to " + status);
          }
        }
      );
    };

    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(run, 700);
  };

  useEffect(() => {
    if (open) debouncedRebuildRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, open]);

  useEffect(() => {
    if (!open || !coordinates?.length || !mapContainer.current) return;

    if (!window.google || !window.google.maps) {
      const existingScript = document.querySelector(
        `script[src*="maps.googleapis.com/maps/api/js"]`
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apikey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => initMap();
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", () => initMap());
      }
    } else {
      initMap();
    }

    return () => {
      mapRef.current = null;
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      directionsRendererRef.current = null;
    };
  }, [open, coordinates]);

  const initMap = () => {
    if (!window.google || !coordinates.length || !mapContainer.current) return;
    const google = window.google;
    const map = new google.maps.Map(mapContainer.current, {
      zoom: 12,
      center: { lat: coordinates[0].lat, lng: coordinates[0].lng },
    });
    mapRef.current = map;

    infoRef.current = new google.maps.InfoWindow();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      map,
    });

    debouncedRebuildRoute();
  };

  function handleETAs(directionsResult) {
    const legs = directionsResult.routes[0]?.legs || [];
    const etasInMinutes = legs.map((leg) =>
      Math.round(leg.duration.value / 60)
    );
    const total = etasInMinutes.reduce((sum, t) => sum + t, 0);
    setETAs(etasInMinutes);
    setTotalTime(total);
    if (typeof onRouteETA === "function") onRouteETA(total);
  }

  function drawCustomMarkers(coords) {
    const google = window.google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (infoRef.current) infoRef.current.close();
    if (!coords?.length) return;

    const startMarker = new google.maps.Marker({
      position: { lat: coords[0].lat, lng: coords[0].lng },
      map: mapRef.current,
      icon: buildOriginAfterSchoolPin({ size: 28 }),
      title: coords[0].name || "Start",
    });
    startMarker.addListener("click", () => {
      const html = `
        <div style="min-width:220px">
          <div style="font-weight:600">Start</div>
          <div>${coords[0].name || "Start Point"}</div>
          <div>Lat/Lng: ${coords[0].lat.toFixed(5)}, ${coords[0].lng.toFixed(
        5
      )}</div>
        </div>`;
      infoRef.current.setContent(html);
      infoRef.current.open({
        anchor: startMarker,
        map: mapRef.current,
        shouldFocus: false,
      });
    });
    markersRef.current.push(startMarker);

    coords.slice(1).forEach((c, i) => {
      const schoolId = c.kid?.schools?.id ?? c.schoolId ?? "default";
      const color = getSchoolColor(schoolId);
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: mapRef.current,
        icon: buildNumberedPin({ color, number: String(i + 1), size: 24 }),
        title: c.name || `Stop ${i + 1}`,
      });

      const html = `
        <div style="min-width:240px">
          <div style="font-weight:600">Stop ${i + 1}</div>
          <div>${c.name || "School"}</div>
          <div>Lat/Lng: ${Number(c.lat).toFixed(5)}, ${Number(c.lng).toFixed(
        5
      )}</div>
        </div>`;
      marker.addListener("click", () => {
        infoRef.current.setContent(html);
        infoRef.current.open({
          anchor: marker,
          map: mapRef.current,
          shouldFocus: false,
        });
      });
      markersRef.current.push(marker);
    });
  }

  const moveUp = (idx) => {
    if (idx <= 0) return;
    const next = stops.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setStops(next);
    onReorderStops?.(
      vanId,
      next.map((s) => s.schoolId ?? null).filter(Boolean)
    );
    if (typeof onRouteETA === "function") onRouteETA(null);
  };

  const moveDown = (idx) => {
    if (idx >= stops.length - 1) return;
    const next = stops.slice();
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setStops(next);
    onReorderStops?.(
      vanId,
      next.map((s) => s.schoolId ?? null).filter(Boolean)
    );
    if (typeof onRouteETA === "function") onRouteETA(null);
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
          <h3 className="route-title">Route Overview</h3>
          <p>
            <strong>Start:</strong> {coordinates[0]?.name || "Start Point"}
          </p>

          <div style={{ marginTop: 12 }}>
            <div className="stop-list-title">Stops (reorder with buttons):</div>
            {stops.map((s, idx) => {
              // set a CSS variable for the accent based on school color
              const accent = getSchoolColor(s.schoolId);
              return (
                <div
                  key={`${s.schoolId ?? s.name ?? idx}-${idx}`}
                  className="stop-row"
                  style={{ "--accent": accent }}
                >
                  <div className="stop-index">{idx + 1}.</div>
                  <div className="stop-meta">
                    <div className="stop-name">{s.name || "Stop"}</div>
                    {etas[idx] != null && (
                      <div className="stop-eta">ETA: {etas[idx]} min</div>
                    )}
                  </div>
                  <div className="stop-actions">
                    <button
                      className="btn btn-up"
                      onClick={() => moveUp(idx)}
                      title="Move up"
                    >
                      ⇧
                    </button>
                    <button
                      className="btn btn-down"
                      onClick={() => moveDown(idx)}
                      title="Move down"
                    >
                      ⇩
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <hr />
          <h4>
            {" "}
            Total Route Time: {totalTime != null
              ? `${totalTime} min`
              : "—"}{" "}
          </h4>
          <div className="tip">
            Changes are debounced & cached to limit Google requests.
          </div>
        </div>

        {/* MAP */}
        <div className="route-map" ref={mapContainer} />
      </div>
    </Modal>
  );
}
