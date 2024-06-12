import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MessageContext = createContext({});

const MessageContextProvider = ({ children }) => {
  const [newMessages, setNewMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);

  const fetchUnreadMessages = async () => {
    try {
      const { data: unreadMessages, error } = await supabase
        .from("message")
        .select(`*, users(*)`)
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

  useEffect(() => {
    const UpdatesOnMessages = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            //console.log("payload!", payload);
            const newMessage = payload.new;
            setNewMessages((prevMessages) => [...prevMessages, newMessage]);
            setUnreadMessages((prevUnreadMessages) => [
              ...prevUnreadMessages,
              newMessage,
            ]);
          } else if (payload.eventType === "UPDATE") {
            const updatedMessage = payload.new;
            setUnreadMessages((unreadPrevMessages) => {
              return unreadPrevMessages.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      UpdatesOnMessages.unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   //subscribe to check the new inserted messages

  //   //subscribe to check the update the messages (mark as read)
  //   const updatedMessages = supabase
  //     .channel("custom-insert-channel")
  //     .on(
  //       "postgres_changes",
  //       { event: "UPDATE", schema: "public", table: "message" },
  //       (payload) => {
  //         console.log("message updated!");
  //         const updatedMessage = payload.new;
  //         setUnreadMessages((unreadPrevMessages) => {
  //           return unreadPrevMessages.map((msg) =>
  //             msg.id === updatedMessage.id ? updatedMessage : msg
  //           );
  //         });
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     updatedMessages.unsubscribe();
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
