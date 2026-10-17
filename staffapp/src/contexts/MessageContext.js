// src/contexts/MessageContext.js
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import api from "../lib/api";

const MessageContext = createContext({});

const REFRESH_MS = 15000; // looks for new messages every 15 seconds

const MessageContextProvider = ({ children }) => {
  const [newMessages, setNewMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);

  // The ids already seen. Null until the first answer, so the messages that were waiting before
  // the app opened are "unread", but not "new".
  const knownIdsRef = useRef(null);

  // Messages from the families that nobody on the team read yet (with the sender and the kid)
  const fetchUnreadMessages = async () => {
    try {
      const { data } = await api.get("/app/messages/unread");

      if (knownIdsRef.current === null) {
        knownIdsRef.current = new Set(data.map((message) => message.id));
      } else {
        const fresh = data.filter((message) => !knownIdsRef.current.has(message.id));
        if (fresh.length) {
          fresh.forEach((message) => knownIdsRef.current.add(message.id));
          setNewMessages((prev) => [...prev, ...fresh]);
        }
      }

      setUnreadMessages(data);
    } catch (error) {
      console.error(
        "Error fetching unread messages:",
        error?.response?.data || error.message,
      );
    }
  };

  useEffect(() => {
    fetchUnreadMessages();

    // No live connection any more: look again every few seconds, and when the app comes back
    const timer = setInterval(fetchUnreadMessages, REFRESH_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchUnreadMessages();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  // The conversation about one kid, newest first
  const getMessagesByStudent = async (student_id, limit = 100) => {
    try {
      const { data } = await api.get("/app/messages", {
        params: { studentId: student_id, limit },
      });
      return data;
    } catch (error) {
      console.error(
        "Error fetching messages:",
        error?.response?.data || error.message,
      );
      return [];
    }
  };

  // The API saves the message. The sender is the person signed in, so "sender_id" is not needed.
  // (The notification to the family comes with the push service of the API.)
  const sendAndNotifyMsg = async (student_id, sender_id, text) => {
    try {
      const { data } = await api.post("/app/messages", {
        studentId: student_id,
        content: text,
      });
      return data;
    } catch (error) {
      console.error(
        "Error sending message:",
        error?.response?.data || error.message,
      );
    }
  };

  // The team read what the family wrote about this kid
  const markThreadAsRead = async (student_id) => {
    try {
      await api.post("/app/messages/read", { studentId: student_id });
      setUnreadMessages((prev) =>
        prev.filter((message) => message.student_id !== student_id),
      );
    } catch (error) {
      console.error(
        "Error marking messages as read:",
        error?.response?.data || error.message,
      );
    }
  };

  return (
    <MessageContext.Provider
      value={{
        newMessages,
        unreadMessages,
        setUnreadMessages,
        setNewMessages,
        sendAndNotifyMsg,
        getMessagesByStudent,
        markThreadAsRead,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export default MessageContextProvider;

export const useMessageContext = () => useContext(MessageContext);
