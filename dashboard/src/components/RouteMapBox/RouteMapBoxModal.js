import React, { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./RouteMapBoxModal.css";

export default function RouteMapBoxModal({
  open,
  onClose,
  coordinates,
  token,
  onRouteETA,
}) {
  const lastCoordsKey = useRef(null);
  const lastRouteData = useRef(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [etas, setETAs] = useState([]);
  const [totalTime, setTotalTime] = useState(null);

  const getCoordsKey = (coordsArray) =>
    coordsArray.map((c) => `${c.lat},${c.lng}`).join(";");

  const getSchoolColor = (schoolId) => {
    const colors = [
      "#0074D9", // blue
      "#FF4136", // red
      "#2ECC40", // green
      "#FF851B", // orange
      "#B10DC9", // purple
      "#FFDC00", // yellow
      "#7FDBFF", // light blue
      "#39CCCC", // teal
      "#85144b", // dark red
      "#3D9970", // dark green
    ];
    const index =
      Math.abs(
        [...schoolId.toString()].reduce((acc, c) => acc + c.charCodeAt(0), 0)
      ) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    if (!open || !mapContainer.current || !coordinates?.length) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [coordinates[0].lng, coordinates[0].lat],
      zoom: 12,
    });

    mapRef.current = map;

    const now = new Date();
    const isoTime = now.toISOString().split(".")[0] + "Z"; // remove ms

    map.on("load", async () => {
      // Force the map to recalculate size
      map.resize();

      // Fit bounds to all coordinates
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 100 });

      // Add markers
      // Add markers
      coordinates.forEach((coord, idx) => {
        if (idx === 0) {
          // Default Mapbox marker for start point
          const popup = new mapboxgl.Popup({ offset: 25 }).setText(
            coord.name || "Start Point"
          );
          new mapboxgl.Marker() // default icon
            .setLngLat([coord.lng, coord.lat])
            .setPopup(popup)
            .addTo(map);
        } else {
          // Custom numbered marker for stops
          const el = document.createElement("div");
          el.className = "custom-marker-number";
          el.innerText = `${idx}`;
          const schoolId =
            coord.kid?.schools?.id || coord.schoolId || "default";

          // console.log("Marker:", coord.name, "School ID:", schoolId);

          const markerColor = getSchoolColor(schoolId);
          el.style.backgroundColor = markerColor;

          const popup = new mapboxgl.Popup({ offset: 25 }).setText(
            coord.name || `Stop ${idx}`
          );

          new mapboxgl.Marker(el)
            .setLngLat([coord.lng, coord.lat])
            .setPopup(popup)
            .addTo(map);
        }
      });

      // Calculate round trip
      if (coordinates.length >= 2) {
        const roundTrip = [
          ...coordinates, // Start → A → B
          ...coordinates.slice(1).reverse(), // B → A
          coordinates[0], // → Start
        ];

        const coordString = roundTrip.map((c) => `${c.lng},${c.lat}`).join(";");
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordString}?geometries=geojson&overview=full&steps=false&depart_at=${encodeURIComponent(
          isoTime
        )}&access_token=${token}`;

        const coordKey = getCoordsKey(roundTrip);

        // use cache if same coords
        if (coordKey === lastCoordsKey.current && lastRouteData.current) {
          drawRoute(lastRouteData.current, map);
        } else {
          fetch(url)
            .then((res) => res.json())
            .then((data) => {
              if (data.routes?.[0]) {
                lastCoordsKey.current = coordKey;
                lastRouteData.current = data;
                drawRoute(data, map);
              }
            });
        }
      }
    });

    return () => {
      if (map) map.remove();
    };
  }, [open, coordinates, token]);

  const drawRoute = (data, map) => {
    const route = data.routes[0];

    console.log("Total duration (s):", route.duration);
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: route.geometry,
    };

    if (map.getSource("route")) {
      map.removeLayer("route");
      map.removeSource("route");
    }

    map.addSource("route", {
      type: "geojson",
      data: geojson,
    });

    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#0074D9", "line-width": 5 },
    });

    const legs = route.legs || [];
    const etas = legs.map((leg) => Math.round(leg.duration / 60));
    const total = etas.reduce((sum, m) => sum + m, 0);

    setETAs(etas);
    setTotalTime(total);

    if (typeof onRouteETA === "function") {
      onRouteETA(total);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{ top: 10 }}
    >
      <div style={{ display: "flex", height: "80vh" }}>
        {/* LEFT PANEL */}
        <div style={{ width: "300px", padding: "1rem", overflowY: "auto" }}>
          <h3>Route Overview</h3>
          <p>
            <strong>Start:</strong> {coordinates[0]?.name || "Start Point"}
          </p>
          {coordinates.slice(1).map((c, idx) => (
            <div key={idx}>
              <p>
                <strong>Stop {idx + 1}:</strong> {c.name || `Stop ${idx + 1}`}{" "}
                {etas[idx] != null && <span>– ETA: {etas[idx]} min</span>}
              </p>
            </div>
          ))}
          <hr />
          <h4>
            Total Route Time: {totalTime != null ? `${totalTime} min` : "—"}
          </h4>

          <hr />
          <h4>Legend</h4>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {Array.from(
              new Set(
                coordinates.slice(1).map((c) => ({
                  id: c.kid?.schools?.id || c.schoolId,
                  name: c.kid?.schools?.name || c.name || "Unnamed School",
                }))
              )
            ).map(({ id, name }) => (
              <li
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: getSchoolColor(id),
                    borderRadius: "50%",
                    marginRight: 8,
                    border: "1px solid #999",
                  }}
                ></div>
                {name}
              </li>
            ))}
          </ul>
        </div>

        {/* MAP */}
        <div style={{ flex: 1 }} ref={mapContainer} />
      </div>
    </Modal>
  );
}
