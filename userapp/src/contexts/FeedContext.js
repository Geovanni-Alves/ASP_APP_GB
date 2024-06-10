import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const FeedContext = createContext({});

const FeedContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState([]);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        // Retrieve feeds from Supabase
        const { data, error } = await supabase.from("kidFeeds").select("*");
        if (error) {
          throw error;
        }
        // Update state with fetched feeds
        setFeeds(data);
      } catch (error) {
        console.error("Error fetching feeds:", error.message);
      }
    };

    fetchFeeds();
  }, []);

  useEffect(() => {
    // Subscribe to feed creation events
    //console.log("subscribe to new feeds");
    const newFeedsSubscription = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kidFeeds" },
        (payload) => {
          console.log("changes on feeds table!", payload);
          if (payload.eventType === "INSERT") {
            console.log("new feed reveived!", payload);
            const newFeeds = payload.new;
            setFeeds((prevFeeds) => [...prevFeeds, newFeeds]);
          }
        }
      )
      .subscribe();
    //console.log("newFeedsSubscription", newFeedsSubscription);

    return () => {
      //console.log("subscribe stopped!");
      newFeedsSubscription.unsubscribe();
    };
  }, []);

  return (
    <FeedContext.Provider value={{ feeds }}>{children}</FeedContext.Provider>
  );
};

export default FeedContextProvider;

export const useFeedContext = () => useContext(FeedContext);
