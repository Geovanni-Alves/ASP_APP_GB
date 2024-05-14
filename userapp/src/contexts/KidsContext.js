import React, { createContext, useContext, useEffect, useState } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { onUpdateKid } from "../graphql/subscriptions";
import { useAuthContext } from "./AuthContext";
import { usePicturesContext } from "./PicturesContext";
import {
  createCheckInOut,
  updateKid,
  deleteCheckInOut,
} from "../graphql/mutations";
import { listKids, getCheckInOut } from "../graphql/queries";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const { users, userEmail } = useAuthContext();
  const [kids, setKids] = useState([]);
  const [kidCurrentStateData, setKidCurrentStateData] = useState([]);
  const { getPhotoInBucket } = usePicturesContext();

  const fetchKidsData = async (userEmail) => {
    if (userEmail) {
      try {
        const variables = {
          filter: {
            or: [
              { parent1Email: { eq: userEmail } },
              { parent2Email: { eq: userEmail } },
            ],
          },
        };
        const response = await API.graphql({
          query: listKids,
          variables: variables,
        });
        const fetchedKids = response.data.listKids.items;
        //console.log("fetchedKids", fetchedKids);

        if (fetchedKids.length === 0) {
          //navigation.navigate("Wait");
          //await Auth.signOut();
        } else {
          const completeKids = await Promise.all(
            fetchedKids.map(async (kid) => {
              if (kid.currentStateId) {
                //console.log(kid.currentStateId);
                const currentStateData = await API.graphql({
                  query: getCheckInOut,
                  variables: { id: kid.currentStateId },
                });

                kid.CurrentState = currentStateData.data.getCheckInOut;
              }
              if (kid.photo) {
                const uriKid = await getPhotoInBucket(kid.photo);
                return { ...kid, uriKid };
              } else {
                return kid;
              }
            })
          );
          //console.log("completeKids", completeKids);
          // Set the kids state if there is data
          setKids(completeKids);
        }
        // setKids(response.data.listKids.items);
      } catch (error) {
        console.error("Error fetching kids:", error);
      } finally {
        //setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchKidsData(userEmail);
    //console.log(isEmailVerified);
  }, [userEmail]);

  const fetchCurrentStateData = async () => {
    if (kids && users) {
      const currentStateArray = [];

      kids.forEach((kid) => {
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
      });

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
    const datePart = dateTimeState.toISOString().split("T")[0];
    const timePart = formatTime(dateTimeState);

    if (state === "ABSENT") {
      try {
        const checkCheckOutDetails = {
          state: state,
          userIdState: userId,
          dateState: datePart,
          TimeState: timePart,
          kidID: kidId,
        };
        const newState = await API.graphql({
          query: createCheckInOut,
          variables: { input: checkCheckOutDetails },
        });

        const newStateId = newState.data.createCheckInOut.id;

        // updating the kid with the currentstateID "ABSENT"
        const updatedKidDetails = {
          id: kidId,
          currentStateId: newStateId,
        };

        await API.graphql({
          query: updateKid,
          variables: { input: updatedKidDetails },
        });

        // Fetch and update getCheckInOut for the kid
        const currentStateData = await API.graphql({
          query: getCheckInOut,
          variables: { id: newStateId },
        });

        const updatedKid = {
          ...kids.find((kid) => kid.id === kidId),
          currentStateId: newStateId,
          CurrentState: currentStateData.data.getCheckInOut,
        };

        setKids((prevKids) => {
          return prevKids.map((kid) => {
            if (kid.id === kidId) {
              return updatedKid;
            }
            return kid;
          });
        });

        //fetchKidsData(userEmail);
      } catch (error) {
        console.error("error change status", error);
      }
    } else if (state === "REMOVE") {
      try {
        // first clean the currentStateId, at Kid model
        const kidDetails = {
          id: kidId,
          currentStateId: "",
        };

        await API.graphql({
          query: updateKid,
          variables: { input: kidDetails },
        });
        // now delete the state at checkInOut Model
        const stateDetails = { id: currentStateId };
        await API.graphql({
          query: deleteCheckInOut,
          variables: { input: stateDetails },
        });

        const updatedKid = {
          ...kids.find((kid) => kid.id === kidId),
          currentStateId: "",
          CurrentState: null, // Set CurrentState to null as it's been removed
        };

        setKids((prevKids) => {
          return prevKids.map((kid) => {
            if (kid.id === kidId) {
              return updatedKid;
            }
            return kid;
          });
        });

        //fetchKidsData(userEmail);
      } catch (error) {
        console.error("error change status", error);
      }
    }
  };

  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onUpdateKid)).subscribe({
      next: (data) => {
        const updatedKid = data.value.data.onUpdateKid;
        // Only update if currentStateId changes
        if (updatedKid.currentStateId) {
          console.log("subscription executed");
          fetchCurrentStateData(); // Fetch and update kidCurrentStateData
        }
      },
      error: (error) => {
        console.error("Subscription error:", error);
      },
    });

    return () => subscription.unsubscribe();
  }, []); // Subscribe to onUpdateKid only once

  return (
    <KidsContext.Provider value={{ kids, kidCurrentStateData, ChangeKidState }}>
      {children}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
