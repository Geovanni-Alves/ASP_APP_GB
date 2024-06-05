import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../backend/lib/supabase";
import { usePicturesContext } from "./PicturesContext";
import { useUsersContext } from "./UsersContext";
import { ActivityIndicator } from "react-native";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const { userEmail } = useUsersContext();
  const { getPhotoInBucket } = usePicturesContext();
  const [kids, setKids] = useState([]);
  const [kidCurrentStateData, setKidCurrentStateData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noKids, setNoKids] = useState(true);

  const fetchKidsData = async (userEmail) => {
    if (userEmail) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select()
          .or(`parent1Email.eq.${userEmail},parent2Email.eq.${userEmail}`);
        if (error) {
          throw error;
        }

        const fetchedKids = data;
        if (fetchedKids.length === 0) {
          setNoKids(true);
          setKids([]);
        } else {
          const completeKids = await Promise.all(
            fetchedKids.map(async (kid) => {
              if (kid.currentStateId) {
                const { data: currentStateData, error: currentStateError } =
                  await supabase
                    .from("check_in_out")
                    .select()
                    .eq("id", kid.currentStateId)
                    .single();
                if (currentStateError) {
                  throw currentStateError;
                }

                kid.CurrentState = currentStateData;
              }
              // if (kid.photo) {
              //   const uriKid = await getPhotoInBucket(kid.photo);
              //   return { ...kid, uriKid };
              // } else {
              return kid;
              // }
            })
          );
          setNoKids(false);
          setKids(completeKids);
        }
      } catch (error) {
        console.error("Error fetching kids:", error);
        setNoKids(true);
        setKids([]);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchKidsData(userEmail);
  }, [userEmail]);

  const fetchCurrentStateData = async () => {
    if (kids.length > 0) {
      const currentStateArray = [];
      for (const kid of kids) {
        if (kid.CurrentState?.state) {
          const associatedUser = users.find(
            (member) => member.id === kid.CurrentState.userIdState
          );
          const stateInfo = {
            kidId: kid.id,
            state: kid.CurrentState.state,
            userId: kid.CurrentState.userIdState,
            userName: associatedUser?.name,
            kidName: kid.name,
            stateTime: kid.CurrentState.TimeState,
            stateDate: kid.CurrentState.dateState,
          };
          currentStateArray.push(stateInfo);
        }
      }
      setKidCurrentStateData(currentStateArray);
    }
  };

  useEffect(() => {
    fetchCurrentStateData();
  }, [kids]);

  // Function to change kid state
  const ChangeKidState = async (
    kidId,
    state,
    userId,
    dateTimeState,
    currentStateId
  ) => {
    // Your logic here for changing the kid state
  };

  useEffect(() => {
    // Your subscription logic here
  }, []); // Subscribe to onUpdateKid only once

  useEffect(() => {
    if (!loading && kids.length === 0) {
      setNoKids(true);
    }
  }, [loading, kids]);

  return (
    <KidsContext.Provider
      value={{ kids, noKids, kidCurrentStateData, ChangeKidState }}
    >
      {loading ? (
        // Render a loading indicator while the context is loading
        <ActivityIndicator size="large" color="gray" />
      ) : (
        // Render children when context has finished loading
        children
      )}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
