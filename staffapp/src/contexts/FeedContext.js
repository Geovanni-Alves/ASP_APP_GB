import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useUsersContext } from "./UsersContext";
import { usePushNotificationsContext } from "./PushNotificationsContext";

const FeedContext = createContext({});

const FeedContextProvider = ({ children }) => {
  const [feeds, setFeeds] = useState([]);
  const { currentUserData } = useUsersContext();
  const { sendPushNotification } = usePushNotificationsContext();

  const createNewFeedForKid = async (
    kidId,
    mediaPath = "",
    mediaType,
    notes
  ) => {
    try {
      // console.log({ kidId, mediaPath, mediaType, notes });
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
        notes,
      };

      // Insert the data into the Supabase "kidFeeds" table
      //console.log("feedData", feedData);
      const { data, error } = await supabase
        .from("kidFeeds")
        .insert([feedData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create feed: ${error.message}`);
      }

      // 1️⃣ Fetch all contacts linked to this student via student_family
      const { data: familyLinks, error: familyError } = await supabase
        .from("student_family")
        .select("contact_id")
        .eq("student_id", kidId);

      if (familyError) {
        console.error("❌ Error fetching family links:", familyError);
      } else if (familyLinks.length > 0) {
        // Extract only the contact IDs
        const contactIds = familyLinks.map((f) => f.contact_id);

        // 2️⃣ Fetch user_id for each contact
        const { data: contacts, error: contactsError } = await supabase
          .from("contacts")
          .select("id, user_id")
          .in("id", contactIds);

        if (contactsError) {
          console.error("❌ Error fetching contacts:", contactsError);
        } else {
          // Extract valid user_ids
          const userIds = contacts
            .map((c) => c.user_id)
            .filter((uid) => uid !== null);

          if (userIds.length === 0) {
            console.log("⚠ No linked users found for contacts.");
          } else {
            // 3️⃣ Fetch Expo tokens from users table
            const { data: userRows, error: usersError } = await supabase
              .from("users")
              .select("id, pushToken")
              .in("id", userIds);

            console.log({ userRows });

            if (usersError) {
              console.error("❌ Error fetching users:", usersError);
            } else {
              // 4️⃣ Send notification to each user that has a valid Expo token
              for (const user of userRows) {
                if (user.pushToken) {
                  await sendPushNotification(
                    user.pushToken,
                    "Photo",
                    "A new pickup photo has been uploaded for your child.",
                    { kidID: kidId }
                  );
                }
              }
            }
          }
        }
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
    const channel = supabase
      .channel(`kidfeeds-realtime-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "kidFeeds",
          filter: "id=not.is.null",
        },
        (payload) => {
          console.log("🔥 NEW FEED:", payload.new);
          setFeeds((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
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
