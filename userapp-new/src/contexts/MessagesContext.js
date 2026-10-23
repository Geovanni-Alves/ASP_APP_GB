// src/contexts/MessagesContext.js
// How many messages of the team are waiting to be read, by child. It looks again now and then, when the app
// comes back, and right away when a push arrives.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import api from "../lib/api";
import { onFamilyPush } from "../lib/pushEvents";

const MessagesContext = createContext({ unread: {}, total: 0 });

const REFRESH_MS = 30000;

export const MessagesContextProvider = ({ children }) => {
  const [unread, setUnread] = useState({}); // child id -> how many

  const reloadUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/parent/messages/unread");
      const byKid = {};
      data.forEach((row) => {
        byKid[row.studentId] = Number(row.count);
      });
      setUnread(byKid);
    } catch (error) {
      console.log("Could not load the unread messages:", error?.message);
    }
  }, []);

  useEffect(() => {
    reloadUnread();
    const timer = setInterval(reloadUnread, REFRESH_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reloadUnread();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [reloadUnread]);

  useEffect(() => onFamilyPush(() => reloadUnread()), [reloadUnread]);

  const total = useMemo(
    () => Object.values(unread).reduce((sum, n) => sum + n, 0),
    [unread],
  );

  return (
    <MessagesContext.Provider value={{ unread, total, reloadUnread }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessagesContext = () => useContext(MessagesContext);
