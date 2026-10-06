import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const [kids, setKids] = useState([]);

  // Fetch kids data from our API.
  // GET /students/full returns every student with its school, contacts (student_family),
  // schedule and current drop-off address already nested inside, in ONE request.
  const fetchKidsData = async () => {
    try {
      const { data: fetchedKids } = await api.get("/students/full");

      // The API returns the schedule as a list; the dashboard expects a single object
      // (or null when the student has no schedule).
      const kidsWithFlattenedSchedule = fetchedKids.map((kid) => ({
        ...kid,
        students_schedule:
          kid.students_schedule && kid.students_schedule.length > 0
            ? kid.students_schedule[0]
            : null,
      }));

      setKids(kidsWithFlattenedSchedule);
    } catch (error) {
      console.error("Error fetching kids data:", error);
    }
  };

  // Update kid information through the API
  const updateKidOnDb = async (id, updates) => {
    try {
      const updatedFields = updates.reduce((obj, item) => {
        obj[item.fieldName] = item.value;
        return obj;
      }, {});

      // PATCH /students/{id} changes only the fields we send
      const { data } = await api.patch(`/students/${id}`, updatedFields);

      console.log("Kid updated successfully!", data);
    } catch (error) {
      console.error("Error updating kid:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchKidsData(); // Fetch the data on mount
  }, []);

  return (
    <KidsContext.Provider value={{ kids, updateKidOnDb, fetchKidsData }}>
      {children}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
