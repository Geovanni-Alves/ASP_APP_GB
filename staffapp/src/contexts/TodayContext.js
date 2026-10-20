// src/contexts/TodayContext.js
// Who is at the school TODAY, in one place for the whole app: the students list, the home, the chat
// and the lists where kids are tagged. The API decides (by the clock of the school) and the app
// looks again every 30 seconds, so everything shows the same thing.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import api from "../lib/api";

const TodayContext = createContext({});

const REFRESH_MS = 30000;

// For each kid: "checked_in" (picked up: HERE), "waiting" (expected, not here yet), "absent",
// or "none" (not coming today)
export const TodayContextProvider = ({ children }) => {
  const [today, setToday] = useState({}); // by kid id
  const [loaded, setLoaded] = useState(false);
  const [day, setDay] = useState(null); // the day of the school ("2026-10-19"), as the API says it

  const refreshToday = useCallback(async () => {
    try {
      const { data } = await api.get("/app/today");
      const byKid = {};
      data.forEach((row) => {
        byKid[row.id] = row;
      });
      setToday(byKid);
      setDay(data[0]?.date || null);
      setLoaded(true);
    } catch (error) {
      console.error(
        "Error loading today:",
        error?.response?.data || error.message,
      );
    }
  }, []);

  useEffect(() => {
    refreshToday();

    // Looks again every few seconds, and when the app comes back to the front
    const timer = setInterval(refreshToday, REFRESH_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshToday();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refreshToday]);

  // What happened with a kid today ("unknown" until the first answer arrives)
  const statusOf = useCallback(
    (kid) => (loaded ? today[kid?.id]?.status || "none" : "unknown"),
    [today, loaded],
  );

  // Only the kids who are HERE (checked in today): the ones that can be tagged
  const hereKids = useCallback(
    (kids) =>
      (kids || []).filter((kid) => today[kid.id]?.status === "checked_in"),
    [today],
  );

  return (
    <TodayContext.Provider
      value={{ today, loaded, day, refreshToday, statusOf, hereKids }}
    >
      {children}
    </TodayContext.Provider>
  );
};

export default TodayContextProvider;

export const useTodayContext = () => useContext(TodayContext);
