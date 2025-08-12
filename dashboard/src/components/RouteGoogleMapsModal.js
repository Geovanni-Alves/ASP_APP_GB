import React, { useEffect, useRef, useState } from "react";
import { Modal } from "antd";

export default function RouteMapModalGoogle({
  open,
  onClose,
  coordinates,
  onRouteETA,
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

  console.log(coordinates);

  const getCoordsKey = (coordsArray) =>
    coordsArray.map((c) => `${c.lat},${c.lng}`).join(";");

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

  // Same idea as your Mapbox getSchoolColor
  // const getSchoolColor = (schoolId) => {
  //   const colors = [
  //     "#0074D9",
  //     "#FF4136",
  //     "#2ECC40",
  //     "#FF851B",
  //     "#B10DC9",
  //     "#FFDC00",
  //     "#7FDBFF",
  //     "#39CCCC",
  //     "#85144b",
  //     "#3D9970",
  //   ];

  //   if (schoolId == null) return colors[0];
  //   const str = String(schoolId);
  //   const idx =
  //     Math.abs([...str].reduce((a, c) => a + c.charCodeAt(0), 0)) %
  //     colors.length;
  //   return colors[idx];
  // };

  const getSchoolColor = (id) => {
    if (id == null) return SCHOOL_COLORS[0];
    const s = String(id);
    const idx =
      Math.abs([...s].reduce((a, c) => a + c.charCodeAt(0), 0)) %
      SCHOOL_COLORS.length;
    return SCHOOL_COLORS[idx];
  };

  function buildNumberedPin({ color = "#1677ff", number = "", size = 26 }) {
    // Base pin is 32x48, we scale to requested size
    const w = 32,
      h = 48;
    const scale = size / 32; // width basis
    const fontSize = Math.max(10, Math.round(12 * scale)); // readable but small

    const svg = `
  <svg width="${w}" height="${h}" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
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
      anchor: new window.google.maps.Point((w * scale) / 2, h * scale), // tip at bottom
    };
  }

  function buildOriginAfterSchoolPin({ size = 28 }) {
    const w = 32,
      h = 48;
    const scale = size / 32;

    const svg = `
  <svg width="${w}" height="${h}" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
    <!-- Pin shape -->
    <path d="M16 1C8.268 1 2 7.268 2 15c0 9.73 14 31 14 31s14-21.27 14-31C30 7.268 23.732 1 16 1z"
      fill="#facc15" stroke="#1f1f1f" stroke-width="1.5" filter="url(#shadow)"/>
    
    <!-- School bus body -->
    <rect x="7" y="10" width="18" height="10" rx="2" ry="2" fill="#fbbf24" stroke="#000" stroke-width="1"/>
    <!-- Bus windows -->
    <rect x="9" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
    <rect x="13" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
    <rect x="17" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
    <rect x="21" y="12" width="3" height="4" fill="#93c5fd" stroke="#000" stroke-width="0.5"/>
    <!-- Bus door -->
    <rect x="21" y="12" width="3" height="6" fill="#e5e7eb" stroke="#000" stroke-width="0.5"/>
    <!-- Bus wheels -->
    <circle cx="11" cy="20" r="2" fill="#1f2937" stroke="#000" stroke-width="0.5"/>
    <circle cx="21" cy="20" r="2" fill="#1f2937" stroke="#000" stroke-width="0.5"/>
  </svg>`;

    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(w * scale, h * scale),
      anchor: new window.google.maps.Point((w * scale) / 2, h * scale),
    };
  }

  // Origin icon: gym dumbbell inside a darker pin
  function buildOriginGymPin({ size = 28 }) {
    const w = 32,
      h = 48;
    const scale = size / 32;

    const svg = `
  <svg width="${w}" height="${h}" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
    <path d="M16 1C8.268 1 2 7.268 2 15c0 9.73 14 31 14 31s14-21.27 14-31C30 7.268 23.732 1 16 1z"
      fill="#111827" stroke="#1f1f1f" stroke-width="1.5" filter="url(#shadow)"/>
    <!-- simple dumbbell glyph -->
    <g transform="translate(8,11)" fill="#fff">
      <rect x="0" y="6" width="4" height="6" rx="1"/>
      <rect x="12" y="6" width="4" height="6" rx="1"/>
      <rect x="4" y="7.5" width="8" height="3" rx="1.5"/>
    </g>
  </svg>`;

    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(w * scale, h * scale),
      anchor: new window.google.maps.Point((w * scale) / 2, h * scale),
    };
  }

  // Build a colored pin as an SVG data URL
  const buildPin = (fill = "#1E90FF", stroke = "#333") => ({
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
        <svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11.046 16 32 16 32s16-20.954 16-32C32 7.163 24.837 0 16 0z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
          <circle cx="16" cy="16" r="6" fill="#fff"/>
        </svg>
      `),
    scaledSize: new window.google.maps.Size(32, 48),
    anchor: new window.google.maps.Point(16, 48),
    labelOrigin: new window.google.maps.Point(16, 18), // label inside the white circle
  });

  useEffect(() => {
    if (!open || !coordinates?.length || !mapContainer.current) return;

    if (!window.google || !window.google.maps) {
      // Only load once
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
      // cleanup markers on unmount
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
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

    const directionsService = new google.maps.DirectionsService();
    // const directionsRenderer = new google.maps.DirectionsRenderer();
    // directionsRenderer.setMap(map);
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // <-- stop default A,B,C... markers
      map,
    });

    const waypoints = coordinates.slice(1).map((coord) => ({
      location: { lat: coord.lat, lng: coord.lng },
      stopover: true,
    }));

    const roundTripCoords = [
      ...coordinates,
      ...coordinates.slice(1).reverse(),
      coordinates[0],
    ];
    const coordKey = getCoordsKey(roundTripCoords);

    if (coordKey === lastCoordsKey.current && lastRouteResult.current) {
      directionsRenderer.setDirections(lastRouteResult.current);
      // const legs = lastRouteResult.current.routes[0].legs;
      // const etasInMinutes = legs.map((leg) =>
      //   Math.round(leg.duration.value / 60)
      // );
      // const total = etasInMinutes.reduce((sum, t) => sum + t, 0);
      // setETAs(etasInMinutes);
      // setTotalTime(total);
      // if (typeof onRouteETA === "function") {
      //   onRouteETA(total);
      // }
      handleETAs(lastRouteResult.current);
      drawCustomMarkers(coordinates); // <-- add our numbered/color markers
      return;
    }

    directionsService.route(
      {
        origin: { lat: coordinates[0].lat, lng: coordinates[0].lng },
        destination: { lat: coordinates[0].lat, lng: coordinates[0].lng },
        waypoints: [...waypoints, ...waypoints.slice().reverse()],
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess",
        },
      },
      (result, status) => {
        if (status === "OK") {
          lastCoordsKey.current = coordKey;
          lastRouteResult.current = result;
          directionsRenderer.setDirections(result);
          // const legs = result.routes[0].legs;
          // const etasInMinutes = legs.map((leg) =>
          //   Math.round(leg.duration.value / 60)
          // );
          // const total = etasInMinutes.reduce((sum, t) => sum + t, 0);
          // setETAs(etasInMinutes);
          // setTotalTime(total);
          // if (typeof onRouteETA === "function") {
          //   onRouteETA(total);
          // }
          handleETAs(result);
          drawCustomMarkers(coordinates); // <-- add our custom markers
        } else {
          console.warn("Directions request failed due to " + status);
        }
      }
    );
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
    // clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (infoRef.current) infoRef.current.close();

    if (!coords?.length) return;

    // Start marker: distinct color (e.g., black pin with white label "S")
    // const startMarker = new google.maps.Marker({
    //   position: { lat: coords[0].lat, lng: coords[0].lng },
    //   map: mapRef.current,
    //   icon: buildPin("#000000"),
    //   label: { text: "S", color: "#000", fontWeight: "700" },
    //   title: coords[0].name || "Start",
    // });
    const startMarker = new google.maps.Marker({
      position: { lat: coords[0].lat, lng: coords[0].lng },
      map: mapRef.current,
      icon: buildOriginAfterSchoolPin({ size: 28 }), // distinct origin icon
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
      <a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${
        coords[0].lat
      },${coords[0].lng}">
        Abrir no Google Maps
      </a>
    </div>`;
      infoRef.current.setContent(html);
      infoRef.current.open({
        anchor: startMarker,
        map: mapRef.current,
        shouldFocus: false,
      });
    });

    markersRef.current.push(startMarker);

    // Stops: numbered + colored by school id
    coords.slice(1).forEach((c, i) => {
      const schoolId = c.kid?.schools?.id ?? c.schoolId ?? "default";
      const color = getSchoolColor(schoolId);
      // const marker = new google.maps.Marker({
      //   position: { lat: c.lat, lng: c.lng },
      //   map: mapRef.current,
      //   icon: buildPin(color),
      //   label: { text: String(i + 1), color: "#000", fontWeight: "700" },
      //   title: c.name || `Stop ${i + 1}`,
      // });
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: mapRef.current,
        icon: buildNumberedPin({ color, number: String(i + 1), size: 24 }), // smaller & crisp
        title: c.name || `Stop ${i + 1}`,
      });
      const html = `
      <div style="min-width:240px">
        <div style="font-weight:600">Stop ${i + 1}</div>
        <div>${c.name || "School"}</div>
        <div>Lat/Lng: ${Number(c.lat).toFixed(5)}, ${Number(c.lng).toFixed(
        5
      )}</div>
      </div>
    `;

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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{ top: 10 }}
    >
      <div style={{ display: "flex", height: "80vh" }}>
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
        </div>
        <div style={{ flex: 1 }} ref={mapContainer} />
      </div>
    </Modal>
  );
}
