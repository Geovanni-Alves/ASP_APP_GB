// src/contexts/KidsContext.js
// The children of the family, with how today is going for each. The API only sends the ones linked to
// the signed-in person.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import api from "../lib/api";
import { onFamilyPush } from "../lib/pushEvents";

const KidsContext = createContext({});

const REFRESH_MS = 30000; // looks again while the app is open

export const KidsContextProvider = ({ children }) => {
  const [kids, setKids] = useState([]);
  const [loading, setLoading] = useState(true); // only the FIRST load
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { data } = await api.get("/parent/kids");
      setKids(data);
      setError(null);
    } catch (e) {
      console.log("Could not load the children:", e?.response?.data || e.message);
      setError(e);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  // The person pulled the list down
  const refreshKids = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [load]);

  // A push about a child arrived: the children are looked at again right now
  useEffect(() => onFamilyPush(() => load()), [load]);

  return (
    <KidsContext.Provider
      value={{ kids, loading, refreshing, error, refreshKids, reloadKids: load }}
    >
      {children}
    </KidsContext.Provider>
  );
};

export const useKidsContext = () => useContext(KidsContext);
