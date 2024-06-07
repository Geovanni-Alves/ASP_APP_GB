import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useUsersContext } from "./UsersContext";
import { ActivityIndicator } from "react-native";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const { userEmail, users } = useUsersContext();
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
  }, [kids, users]);

  const formatTime = (dateTime) => {
    const hours = dateTime.getHours().toString().padStart(2, "0");
    const minutes = dateTime.getMinutes().toString().padStart(2, "0");
    const seconds = dateTime.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const ChangeKidState = async (
    kidId,
    state,
    userId,
    dateTimeState,
    currentStateId
  ) => {
    //console.log("kids", kids);
    const datePart = dateTimeState.toISOString().split("T")[0];
    const timePart = formatTime(dateTimeState);

    if (state === "ABSENT") {
      try {
        const checkCheckOutDetails = {
          state: state,
          userIdState: userId,
          dateState: datePart,
          timeState: timePart,
          studentId: kidId,
        };

        const { data, error } = await supabase
          .from("check_in_out")
          .insert(checkCheckOutDetails)
          .select();

        if (error) {
          throw error;
        }

        const newState = data[0];
        const newStateId = newState.id;

        // updating the kid with the currentstateID "ABSENT"
        const updatedKidDetails = {
          currentStateId: newStateId,
        };

        const { data: updatedKidData, error: updateError } = await supabase
          .from("students")
          .update(updatedKidDetails)
          .eq("id", kidId)
          .select();

        if (updateError) {
          throw updateError;
        }

        // Fetch and update getCheckInOut for the kid
        const { data: currentStateData, error: fetchError } = await supabase
          .from("check_in_out")
          .select()
          .eq("id", newStateId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        const updatedKid = {
          ...kids.find((kid) => kid.id === kidId),
          currentStateId: newStateId,
          CurrentState: currentStateData,
        };

        setKids((prevKids) => {
          return prevKids.map((kid) => {
            if (kid.id === kidId) {
              return updatedKid;
            }
            return kid;
          });
        });
      } catch (error) {
        console.error("error change status", error);
      }
    } else if (state === "REMOVE") {
      try {
        // first clean the currentStateId in the students table
        const updatedKidDetails = {
          currentStateId: null,
        };

        const { error: updateError } = await supabase
          .from("students")
          .update(updatedKidDetails)
          .eq("id", kidId);

        if (updateError) {
          throw updateError;
        }

        // now delete the state in the check_in_out table
        const { error: deleteError } = await supabase
          .from("check_in_out")
          .delete()
          .eq("id", currentStateId);

        if (deleteError) {
          throw deleteError;
        }

        const updatedKid = {
          ...kids.find((kid) => kid.id === kidId),
          currentStateId: null,
          CurrentState: null,
        };

        setKids((prevKids) => {
          return prevKids.map((kid) => {
            if (kid.id === kidId) {
              return updatedKid;
            }
            return kid;
          });
        });
      } catch (error) {
        console.error("error change status", error);
      }
    }
  };

  useEffect(() => {
    const check_in_out_Updates = supabase
      .channel("custom-update-channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "check_in_out" },
        (payload) => {
          const newUpdates = payload.new;
          // console.log("Change received!", payload);
          fetchCurrentStateData();
        }
      )
      .subscribe();

    return () => check_in_out_Updates.unsubscribe();
  }, []);

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
