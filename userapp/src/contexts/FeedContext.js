import React, { createContext, useContext, useEffect, useState } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { listFeeds } from "../graphql/queries";
import { onCreateFeed } from "../graphql/subscriptions";

const FeedContext = createContext({});

const FeedContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState([]);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const { data } = await API.graphql({ query: listFeeds });
        setFeeds(data.listFeeds.items);
      } catch (error) {
        console.error("Error fetching feeds:", error);
      }
    };

    fetchFeeds();
  }, []); // Empty dependency array means this effect runs only once, when component mounts

  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onCreateFeed)).subscribe({
      next: ({ provider, value }) => {
        // Add the new feed to the feeds array
        setFeeds((prevFeeds) => [...prevFeeds, value.data.onCreateFeed]);
        // Perform push notification here
      },
      error: (error) => console.error("Subscription error:", error),
    });

    return () => {
      // Clean-up function, unsubscribe from the subscription
      subscription.unsubscribe();
    };
  }, []);

  return (
    <FeedContext.Provider value={{ feeds }}>{children}</FeedContext.Provider>
  );
};

export default FeedContextProvider;

export const useFeedContext = () => useContext(FeedContext);
