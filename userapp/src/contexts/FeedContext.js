import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../backend/lib/supabase";

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
  }, []); // Empty dependency array means this effect runs only once, when component mounts

  // useEffect(() => {
  //   // Subscribe to feed creation events
  //   const subscription = supabase
  //     .from("feeds")
  //     .on("INSERT", (payload) => {
  //       // Add the new feed to the feeds array
  //       setFeeds((prevFeeds) => [...prevFeeds, payload.new]);
  //       // Perform push notification here
  //     })
  //     .subscribe();

  //   return () => {
  //     // Clean-up function, unsubscribe from the subscription
  //     subscription.unsubscribe();
  //   };
  // }, []);

  return (
    <FeedContext.Provider value={{ feeds }}>{children}</FeedContext.Provider>
  );
};

export default FeedContextProvider;

export const useFeedContext = () => useContext(FeedContext);
