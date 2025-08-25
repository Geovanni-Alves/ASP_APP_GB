// server/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Supabase (service role only on the server)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OSRM base URL (container / local)
const OSRM_URL = process.env.OSRM_URL || "http://localhost:5000";

// Simple health endpoint (easy to test)
app.get("/healthz", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Directions proxy: returns polyline6 + duration/distance
app.post("/api/directions", async (req, res) => {
  try {
    const { points, roundTrip = false } = req.body || {};
    if (!Array.isArray(points) || points.length < 2) {
      return res
        .status(400)
        .json({ error: "points must have at least 2 items" });
    }

    const coords = points.map((p) => `${p.lng},${p.lat}`);
    const seq = roundTrip ? [...coords, coords[0]] : coords;

    const url = new URL(`${OSRM_URL}/route/v1/driving/${seq.join(";")}`);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    // url.searchParams.set("steps", "false");
    url.searchParams.set("steps", "true");

    // Use Node 18+ built-in fetch
    const r = await fetch(url.toString());
    if (!r.ok) {
      return res
        .status(502)
        .json({ error: "osrm_error", detail: await r.text() });
    }
    const data = await r.json();
    const route = data?.routes?.[0];
    if (!route) return res.status(500).json({ error: "no_route" });

    // Build per-leg LineString coords by concatenating each step geometry
    const legGeometries = (route.legs || []).map((leg) => {
      const coords = [];
      (leg.steps || []).forEach((st) => {
        const c = st.geometry?.coordinates;
        if (Array.isArray(c) && c.length) {
          // Avoid duplicating the shared vertex when concatenating
          if (coords.length && c.length) coords.pop();
          coords.push(...c);
        }
      });
      return coords; // array of [lng,lat]
    });

    res.json({
      distance: Math.round(route.distance),
      duration: Math.round(route.duration),
      // polyline6: route.geometry,
      geometry: route.geometry,
      // legs: (route.legs || []).map((l) => ({
      //   distance: Math.round(l.distance),
      //   duration: Math.round(l.duration),
      // })),
      legs: (route.legs || []).map((l, i) => ({
        distance: Math.round(l.distance),
        duration: Math.round(l.duration),
        geometry: { type: "LineString", coordinates: legGeometries[i] || [] },
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

// Matrix (table) proxy: fast ETAs/distances for many points
app.post("/api/table", async (req, res) => {
  try {
    const { points } = req.body || {};
    if (!Array.isArray(points) || points.length < 2) {
      return res
        .status(400)
        .json({ error: "points must have at least 2 items" });
    }

    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = new URL(`${OSRM_URL}/table/v1/driving/${coords}`);
    url.searchParams.set("annotations", "duration,distance");

    const r = await fetch(url.toString());
    if (!r.ok) {
      return res
        .status(502)
        .json({ error: "osrm_error", detail: await r.text() });
    }
    const data = await r.json();

    res.json({ durations: data.durations, distances: data.distances });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

// Invite contact (your existing route)
app.post("/api/invite-contact", async (req, res) => {
  const { email, firstName, lastName } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const { error, data } = await supabase.auth.admin.createUser({
    email,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (!error) {
    await supabase.auth.admin.inviteUserByEmail(email);
  }

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ success: true, data });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
