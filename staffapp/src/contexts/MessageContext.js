import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MessageContext = createContext({});

const MessageContextProvider = ({ children }) => {
  const [newMessages, setNewMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);

  const fetchUnreadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("message")
        .select(`*, users(*), students(*)`)
        .eq("isread", false);
      if (error) throw error;

      setUnreadMessages(data || []);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  };

  useEffect(() => {
    fetchUnreadMessages();
  }, []);

  useEffect(() => {
    const message = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message" },
        async (payload) => {
          console.log("📩 Realtime event received:", payload);
          if (payload.eventType === "INSERT") {
            const newMessage = payload.new;
            const { data, error } = await supabase
              .from("message")
              .select(`*, users(*), students(*)`)
              .eq("id", newMessage.id)
              .single();

            if (!error) {
              setNewMessages((prev) => [...prev, data]);
              if (!data.isRead) setUnreadMessages((prev) => [...prev, data]);
            }
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new;
            setUnreadMessages((prev) =>
              prev.map((msg) => (msg.id === updated.id ? updated : msg))
            );
          }
        }
      )
      .subscribe();

    return () => {
      message.unsubscribe();
    };
  }, []);

  const getMessagesByStudent = async (student_id, limit = 50) => {
    try {
      const { data, error } = await supabase
        .from("message")
        .select(`*, users(*), students(*)`)
        .eq("student_id", student_id)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  };

  const sendAndNotifyMsg = async (student_id, sender_id, text) => {
    try {
      // 1️⃣ Salva mensagem
      const { data: newMessage, error } = await supabase
        .from("message")
        .insert([{ student_id, sender_id, text }])
        .select()
        .single();

      if (error) throw error;

      // 2️⃣ Busca contatos ligados ao aluno
      const { data: family, error: familyError } = await supabase
        .from("student_family")
        .select(`contacts(id, email, user_id, firstName, lastName)`)
        .eq("student_id", student_id);

      if (familyError) throw familyError;

      // 3️⃣ Envia notificações (push ou e-mail)
      for (const rel of family) {
        const contact = rel.contacts;
        // exemplo: enviar push/email usando sua lógica
        console.log(`Notify ${contact.firstName} ${contact.lastName}`);
      }

      return newMessage;
    } catch (error) {
      console.error("Error sending message:", error);
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
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export default MessageContextProvider;

export const useMessageContext = () => useContext(MessageContext);
