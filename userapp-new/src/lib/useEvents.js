// src/lib/useEvents.js
// The next events of the program (the Home shows them in a slide).
import { useCallback, useEffect, useState } from "react";
import api from "./api";

export default function useEvents() {
  const [events, setEvents] = useState([]);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/parent/events");
      setEvents(data);
    } catch (error) {
      console.log("Could not load the events:", error?.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { events, reload };
}
