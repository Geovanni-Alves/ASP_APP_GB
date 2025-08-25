// src/pages/DashboardRouteLibre.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Optional: MapTiler key (nicer tiles). If not set, we use free OSM raster.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const DEFAULT_CENTER = [-123.1207, 49.2827]; // Vancouver [lng, lat]

// British Columbia bounding box [west, south, east, north]
const BBOX_BC = [-139.06, 48.3, -114.03, 60.0];

// Search behavior: "restrict" = results MUST be in bbox, "bias" = prefer bbox
const NOMINATIM_MODE = "restrict"; // "restrict" | "bias"
const COUNTRY_CODE = "ca"; // prefer Canada results

export default function DashboardRouteLibre() {
  const mapRef = useRef(null);
  const map = useRef(null);

  const routeLayerId = "osrm-route";
  const routeSourceId = "osrm-route-src";

  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");

  const [start, setStart] = useState(null); // { lat, lng }
  const [end, setEnd] = useState(null); // { lat, lng }

  const [summary, setSummary] = useState(null);
  const [suggestions, setSuggestions] = useState({ start: [], end: [] });

  // Abort controllers per box so we can cancel stale requests
  const aborters = useRef({ start: null, end: null });
  // Debounce timers per box
  const timers = useRef({ start: null, end: null });

  // ------------ Map init ------------
  useEffect(() => {
    if (!mapRef.current) return;

    const style = MAPTILER_KEY
      ? {
          version: 8,
          sources: {
            basemap: {
              type: "raster",
              tiles: [
                `https://api.maptiler.com/maps/bright/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors © MapTiler",
            },
          },
          layers: [{ id: "basemap", type: "raster", source: "basemap" }],
        }
      : {
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
        };

    map.current = new maplibregl.Map({
      container: mapRef.current,
      style,
      center: DEFAULT_CENTER,
      zoom: 11,
    });

    // Keep view inside BC
    map.current.setMaxBounds([
      [BBOX_BC[0], BBOX_BC[1]], // SW
      [BBOX_BC[2], BBOX_BC[3]], // NE
    ]);

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (!map.current.getSource(routeSourceId)) {
        map.current.addSource(routeSourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }
      if (!map.current.getLayer(routeLayerId)) {
        map.current.addLayer({
          id: routeLayerId,
          type: "line",
          source: routeSourceId,
          paint: {
            "line-color": "#0d6efd",
            "line-width": 5,
            "line-opacity": 0.9,
          },
        });
      }
    });

    // Click to set start/end quickly
    map.current.on("click", (e) => {
      const lngLat = e.lngLat.wrap();
      if (!start) {
        setStart({ lat: lngLat.lat, lng: lngLat.lng });
        setStartQuery(`${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`);
      } else if (!end) {
        setEnd({ lat: lngLat.lat, lng: lngLat.lng });
        setEndQuery(`${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`);
      }
    });

    return () => map.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);

  const dropMarker = (lngLat, color) =>
    new maplibregl.Marker({ color }).setLngLat(lngLat).addTo(map.current);

  useEffect(() => {
    if (!map.current || !start) return;
    startMarker?.remove();
    setStartMarker(dropMarker([start.lng, start.lat], "#2ecc71"));
  }, [start]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map.current || !end) return;
    endMarker?.remove();
    setEndMarker(dropMarker([end.lng, end.lat], "#e67e22"));
  }, [end]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------ Nominatim search (bounded/bias to BC) ------------
  const bboxParam = useMemo(() => {
    const [left, bottom, right, top] = BBOX_BC;
    // viewbox = left,top,right,bottom (lon,lat)
    return `${left},${top},${right},${bottom}`;
  }, []);

  const searchNominatim = async (query, which) => {
    if (!query) {
      setSuggestions((s) => ({ ...s, [which]: [] }));
      return;
    }

    // Cancel previous request for this box
    try {
      aborters.current[which]?.abort();
    } catch {}
    const ac = new AbortController();
    aborters.current[which] = ac;

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("dedupe", "1");
    url.searchParams.set("countrycodes", COUNTRY_CODE);
    url.searchParams.set("viewbox", bboxParam);
    if (NOMINATIM_MODE === "restrict") {
      url.searchParams.set("bounded", "1"); // must be inside BC
    }
    try {
      const r = await fetch(url.toString(), {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "ASP-Dashboard/1.0 (contact@example.com)",
        },
        signal: ac.signal,
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();

      const cleaned = data.map((d) => {
        const a = d.address || {};
        const main =
          d.name ||
          d.display_name?.split(",")[0] ||
          a.road ||
          a.suburb ||
          a.city ||
          a.town ||
          a.village ||
          d.display_name;

        const locality =
          a.city || a.town || a.village || a.municipality || a.suburb;
        const region = a.state || a.province || a.county;
        const tail = [locality, region, a.postcode].filter(Boolean).join(", ");
        return {
          place_id: d.place_id,
          lat: parseFloat(d.lat),
          lon: parseFloat(d.lon),
          label: tail ? `${main} — ${tail}` : main,
          display_name: d.display_name,
        };
      });

      setSuggestions((s) => ({ ...s, [which]: cleaned }));
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      aborters.current[which] = null;
    }
  };

  // Debounced handlers for typing
  const onType = (which) => (e) => {
    const val = e.target.value;
    which === "start" ? setStartQuery(val) : setEndQuery(val);

    if (timers.current[which]) clearTimeout(timers.current[which]);
    timers.current[which] = setTimeout(() => {
      searchNominatim(val, which);
    }, 300);
  };

  // ------------ Route fetch via your API ------------
  function decodePolyline6(str) {
    // minimal polyline decode (precision 6)
    let index = 0,
      lat = 0,
      lng = 0,
      coords = [];
    while (index < str.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      coords.push([lng / 1e6, lat / 1e6]); // [lng, lat]
    }
    return coords;
  }

  const getRoute = async () => {
    if (!start || !end) return;
    try {
      const r = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: [start, end], roundTrip: false }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      // Server might return either:
      //  A) { geometry: { type:"LineString", coordinates:[ [lng,lat], ... ] }, distance, duration }
      //  B) { polyline6: "....", distance, duration }
      let line;
      if (data.geometry?.type === "LineString") {
        line = data.geometry.coordinates;
      } else if (data.polyline6) {
        line = decodePolyline6(data.polyline6);
      } else {
        throw new Error("No geometry or polyline6 in response");
      }

      // Update source
      const feature = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: line },
        properties: {},
      };
      const src = map.current.getSource(routeSourceId);
      src.setData({ type: "FeatureCollection", features: [feature] });

      // Fit map
      const b = new maplibregl.LngLatBounds();
      line.forEach((c) => b.extend(c));
      map.current.fitBounds(b, { padding: 50 });

      setSummary({
        distanceKm: (data.distance / 1000).toFixed(2),
        durationMin: Math.round(data.duration / 60),
      });
    } catch (e) {
      console.error(e);
      alert("Route failed. Check API/OSRM.");
    }
  };

  // ------------ UI ------------
  const SuggestBox = ({ which }) => {
    const list = suggestions[which] || [];
    if (!list.length) return null;
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          position: "absolute",
          zIndex: 5,
          maxHeight: 240,
          overflowY: "auto",
          width: "100%",
        }}
      >
        {list.map((s) => (
          <div
            key={s.place_id}
            style={{ padding: 8, cursor: "pointer" }}
            onClick={() => {
              const point = { lat: s.lat, lng: s.lon };
              if (which === "start") {
                setStart(point);
                setStartQuery(s.label);
              } else {
                setEnd(point);
                setEndQuery(s.label);
              }
              setSuggestions((x) => ({ ...x, [which]: [] }));
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginLeft: "16rem", padding: 16 }}>
      <h1>Route test (MapLibre + OSRM, BC-only search)</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 8,
          maxWidth: 900,
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            value={startQuery}
            onChange={onType("start")}
            placeholder="Start address (BC)"
            style={{ width: "100%", height: 36, padding: "0 8px" }}
          />
          <SuggestBox which="start" />
        </div>

        <div style={{ position: "relative" }}>
          <input
            value={endQuery}
            onChange={onType("end")}
            placeholder="End address (BC)"
            style={{ width: "100%", height: 36, padding: "0 8px" }}
          />
          <SuggestBox which="end" />
        </div>

        <button onClick={getRoute} disabled={!start || !end}>
          Get route
        </button>
      </div>

      {summary && (
        <div style={{ margin: "8px 0 12px" }}>
          <strong>Distance:</strong> {summary.distanceKm} km &nbsp; | &nbsp;
          <strong>ETA:</strong> {summary.durationMin} min
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 520,
          borderRadius: 8,
          border: "1px solid #eee",
          marginTop: 8,
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        Tip: click the map to set Start, then click again to set End.
      </div>
    </div>
  );
}
