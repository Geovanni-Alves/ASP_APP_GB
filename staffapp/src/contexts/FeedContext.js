// src/contexts/FeedContext.js
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import api from "../lib/api";

const FeedContext = createContext({});

const REFRESH_MS = 20000; // looks for new feed items every 20 seconds

const FeedContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState([]);
  const lastIdRef = useRef(0); // the newest feed id we already have

  // Adds only what we do not have yet
  const mergeFeeds = (incoming) => {
    setFeeds((prev) => {
      const known = new Set(prev.map((feed) => feed.id));
      const fresh = incoming.filter((feed) => !known.has(feed.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  // First time: the last 30 days. After that: only what is newer than the last one we have.
  const fetchFeeds = async ({ onlyNew = false } = {}) => {
    try {
      const params =
        onlyNew && lastIdRef.current
          ? { afterId: lastIdRef.current }
          : { days: 30 };
      const { data } = await api.get("/app/feeds", { params });
      if (data.length) {
        lastIdRef.current = Math.max(
          lastIdRef.current,
          ...data.map((feed) => feed.id),
        );
        mergeFeeds(data);
      }
    } catch (error) {
      console.error(
        "Error fetching feeds:",
        error?.response?.data || error.message,
      );
    }
  };

  // The API saves the feed item (and, later, warns the family). The new item shows up right away.
  const createNewFeedForKid = async (
    kidId,
    mediaPath = "",
    mediaType,
    notes,
  ) => {
    try {
      const { data } = await api.post("/app/feeds", {
        studentId: kidId,
        type: mediaType, // "photo", "video", "ATTENDANCE"... (any letter case)
        mediaName: mediaPath || "",
        notes,
      });
      lastIdRef.current = Math.max(lastIdRef.current, data.id);
      mergeFeeds([data]);
      return data;
    } catch (error) {
      console.error(
        `Error creating feed for kid ${kidId}:`,
        error?.response?.data || error.message,
      );
      return null;
    }
  };

  useEffect(() => {
    fetchFeeds();

    // No live connection any more: look again every few seconds, and when the app comes back
    const timer = setInterval(() => fetchFeeds({ onlyNew: true }), REFRESH_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchFeeds({ onlyNew: true });
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return (
    <FeedContext.Provider value={{ feeds, createNewFeedForKid }}>
      {children}
    </FeedContext.Provider>
  );
};

export default FeedContextProvider;

export const useFeedContext = () => useContext(FeedContext);
