import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useUsersContext } from "./UsersContext";

const FeedContext = createContext({});

const FeedContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState([]);
  const { currentUserData } = useUsersContext();

  const createNewFeedForKid = async (
    kidId,
    mediaPath = "",
    mediaType,
    notes
  ) => {
    try {
      // format correct time
      const currentTime = new Date();
      const year = currentTime.getFullYear();
      const month = String(currentTime.getMonth() + 1).padStart(2, "0");
      const day = String(currentTime.getDate()).padStart(2, "0");
      const hours = String(currentTime.getHours()).padStart(2, "0");
      const minutes = String(currentTime.getMinutes()).padStart(2, "0");
      const seconds = String(currentTime.getSeconds()).padStart(2, "0");

      const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      // Format mediaType to capitalize the first letter and lowercase the rest

      const formattedMediaType =
        mediaType.charAt(0).toUpperCase() + mediaType.slice(1).toLowerCase();

      const feedText = `has a new ${formattedMediaType}`;

      const feedData = {
        type: mediaType, // "photo" or "video"
        dateTime: formattedTime, // Current date and time
        studentId: kidId,
        mediaName: mediaPath || "", // Path to the media
        text: feedText, // Text for the feed
        creatorId: currentUserData.id, // Replace with actual creatorId when available
        notes: notes,
      };

      // Insert the data into the Supabase "kidFeeds" table
      //console.log("feedData", feedData);
      const { data, error } = await supabase
        .from("kidFeeds")
        .insert([feedData]);

      if (error) {
        throw new Error(`Failed to create feed: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error creating feed for kid ${kidId}:`, error);
    }
  };

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
    <FeedContext.Provider value={{ feeds, createNewFeedForKid }}>
      {children}
    </FeedContext.Provider>
  );
};

export default FeedContextProvider;

export const useFeedContext = () => useContext(FeedContext);
