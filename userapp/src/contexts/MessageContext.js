import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../backend/lib/supabase";

const MessageContext = createContext({});

const MessageContextProvider = ({ children }) => {
  const [newMessages, setNewMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);

  const fetchUnreadMessages = async () => {
    try {
      const { data: unreadMessages, error } = await supabase
        .from("message")
        .select("*")
        .eq("isRead", false);
      if (error) {
        throw error;
      }
      setUnreadMessages(unreadMessages);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  };

  useEffect(() => {
    fetchUnreadMessages();
  }, []);

  // useEffect(() => {
  //   const subscription = supabase
  //     .from("message")
  //     .on("INSERT", (payload) => {
  //       const newMessage = payload.new;
  //       setNewMessages((prevMessages) => [...prevMessages, newMessage]);
  //       setUnreadMessages((prevUnreadMessages) => [
  //         ...prevUnreadMessages,
  //         newMessage,
  //       ]);
  //     })
  //     .subscribe();

  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, []);

  const getAllMessagesByUser = async (filter, limit) => {
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq(filter.field, filter.value)
        .limit(limit);
      if (error) {
        throw error;
      }
      return messages;
    } catch (error) {
      console.error("Error fetching messages by user:", error);
      return [];
    }
  };

  const sendAndNotifyMsg = async (msg, kidData) => {
    // Send notifications to all staffs in kid chat
    // Implement your notification logic here
  };

  return (
    <MessageContext.Provider
      value={{
        newMessages,
        unreadMessages,
        setUnreadMessages,
        setNewMessages,
        getAllMessagesByUser,
        sendAndNotifyMsg,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export default MessageContextProvider;

export const useMessageContext = () => useContext(MessageContext);
