import { createContext, useContext, useEffect, useState } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { onCreateMessage, onUpdateMessage } from "../graphql/subscriptions";
import { listMessages } from "../graphql/queries";
import { createMessage } from "../graphql/mutations";
import { usePushNotificationsContext } from "./PushNotificationsContext";

const MessageContext = createContext({});

const MessageContextProvider = ({ children }) => {
  const [newMessages, setNewMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const { sendPushNotification } = usePushNotificationsContext();

  const sendAndNotifyMsg = async (msg, kidData) => {
    // Send notifications to all staffs in kid chat
  };

  // check all unreadMessages and setUnreadMessages
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      const response = await API.graphql({
        query: listMessages,
        variables: { filter: { isRead: { eq: false } } },
      });
      const fetchedMessages = response.data.listMessages.items;
      setUnreadMessages(fetchedMessages);
    };

    fetchUnreadMessages();
    // }
  }, []);

  const getAllMessagesByUser = async (filter, limit) => {
    const variables = { filter, limit };

    const response = await API.graphql({
      query: listMessages,
      variables: variables,
    });
    const fetchedMessages = response.data.listMessages.items;
    return fetchedMessages;
  };

  useEffect(() => {
    // subscribe to get new messages
    const subscription = API.graphql(
      graphqlOperation(onCreateMessage)
    ).subscribe({
      next: ({ provider, value }) => {
        const newMessage = value.data.onCreateMessage;
        // Update newMessages state with the new message
        setNewMessages((prevMessages) => [...prevMessages, newMessage]);
        setUnreadMessages((prevUnreadMessages) => [
          ...prevUnreadMessages,
          newMessage,
        ]);
      },
      error: (error) => console.error("Subscription error:", error),
    });

    const updateSubscription = API.graphql({
      query: onUpdateMessage,
    }).subscribe({
      next: ({ provider, value }) => {
        const updatedMessage = value.data.onUpdateMessage;
        setUnreadMessages((unreadPrevMessages) => {
          return unreadPrevMessages.map((msg) =>
            msg.id === updatedMessage.id ? updatedMessage : msg
          );
        });
      },
    });

    return () => {
      subscription.unsubscribe();
      updateSubscription.unsubscribe();
    };
  }, []);

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
