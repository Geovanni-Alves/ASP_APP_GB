import { createContext, useContext, useEffect, useState } from "react";
import { API } from "aws-amplify";
import { listKids, getUser, listKidsSchedules } from "../graphql/queries";
import { updateKid } from "../graphql/mutations";
import { usePicturesContext } from "./PicturesContext";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  //const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState([]);
  const { getPhotoInBucket } = usePicturesContext();

  const fetchKidsData = async () => {
    try {
      const response = await API.graphql({ query: listKids });
      const fetchedKids = response.data.listKids.items;
      //console.log("fetchedKids", fetchedKids);

      const completeKids = await Promise.all(
        fetchedKids.map(async (kid) => {
          // fetch the schedule of kid
          //console.log(kid);
          const kidSchedule = await API.graphql({
            query: listKidsSchedules,
            variables: { filter: { kidsScheduleKidId: { eq: kid.id } } },
          });
          const kidDays = kidSchedule.data.listKidsSchedules.items;
          const attendanceDays = [];

          // If the kid has a schedule, extract attendance days
          if (kidDays.length > 0) {
            const schedule = kidDays[0];
            // Check each day and add it to the attendanceDays array if it's true
            if (schedule.Monday) {
              attendanceDays.push("Monday");
            }
            if (schedule.Tuesday) {
              attendanceDays.push("Tuesday");
            }
            if (schedule.Wednesday) {
              attendanceDays.push("Wednesday");
            }
            if (schedule.Thursday) {
              attendanceDays.push("Thursday");
            }
            if (schedule.Friday) {
              attendanceDays.push("Friday");
            }
          }

          // Update the kid object with the attendance days array
          kid.AttendanceDays = attendanceDays;

          //console.log("kid Days", kidDays);

          if (kid.Parent1ID !== null) {
            const parent1Data = await API.graphql({
              query: getUser,
              variables: { id: kid.Parent1ID },
            });
            kid.Parent1 = parent1Data.data.getUser;
          }

          if (kid.Parent2ID !== null) {
            const parent2Data = await API.graphql({
              query: getUser,
              variables: { id: kid.Parent2ID },
            });
            kid.Parent2 = parent2Data.data.getUser;
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

      setKids(completeKids);
    } catch (error) {
      console.error("Error fetching kids data", error);
    }
  };

  const updateKidOnDb = async (id, updates) => {
    try {
      const updatedFields = updates.map(({ fieldName, value }) => ({
        [fieldName]: value,
      }));

      // Merge all updated fields into a single object
      const updatedKid = Object.assign({}, ...updatedFields);

      // Perform the update operation using the API or other method
      await API.graphql({
        query: updateKid,
        variables: { input: { id, ...updatedKid } },
      });

      console.log("Kid updated successfully!");
    } catch (error) {
      console.error("Error updating kid:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("fetching KidsData...");
    fetchKidsData();
  }, []);

  return (
    <KidsContext.Provider value={{ kids, fetchKidsData, updateKidOnDb }}>
      {children}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
