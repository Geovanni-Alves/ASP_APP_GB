import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const FeedContext = createContext({});

const FeedContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState([]);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        // Retrieve feeds from Supabase
        const { data, error } = await supabase.from("feeds").select("*");
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
    const feeds = supabase
      .channel("custom-insert-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feeds" },
        (payload) => {
          console.log("new feed reveived!", payload);
          const newFeeds = payload.new;
          setFeeds((prevFeeds) => [...prevFeeds, newFeeds]);
        }
      )
      .subscribe();

    return () => {
      feeds.unsubscribe();
    };
  }, []);

  return (
    <FeedContext.Provider value={{ feeds }}>{children}</FeedContext.Provider>
  );
};

export default FeedContextProvider;

export const useFeedContext = () => useContext(FeedContext);
