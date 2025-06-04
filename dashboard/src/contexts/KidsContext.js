import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabase";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const [kids, setKids] = useState([]);

  // Fetch kids data from Supabase
  const fetchKidsData = async () => {
    try {
      const { data: fetchedKids, error: kidsError } = await supabase
        .from("students")
        .select(
          `
        *,
        schools(*),  
        drop_off_route(*),
        contacts(*),
        students_schedule(*)
      `
        )
        .order("name", { ascending: true });

      if (kidsError) {
        throw kidsError;
      }

      // Process each kid and flatten students_schedule to avoid accessing it as an array
      const kidsWithFlattenedSchedule = fetchedKids.map((kid) => {
        if (kid.students_schedule && kid.students_schedule.length > 0) {
          kid.students_schedule = kid.students_schedule[0]; // Assign the first schedule object directly to the student
        } else {
          kid.students_schedule = null; // Set it to null if there is no schedule
        }

        return kid; // Return the updated kid object
      });

      // Fetch current drop-off addresses for each student manually
      const kidsWithAddresses = await Promise.all(
        kidsWithFlattenedSchedule.map(async (kid) => {
          // Check if the student has a currentDropOffAddressId
          if (kid.currentDropOffAddress) {
            const { data: currentDropOffAddress, error: addressError } =
              await supabase
                .from("students_address")
                .select("*")
                .eq("id", kid.currentDropOffAddress)
                .single(); // Fetch the specific address

            if (addressError) {
              console.error("Error fetching address:", addressError);
            } else {
              // Add the fetched drop-off address to the student object
              kid.dropOffAddress = currentDropOffAddress;
            }
          }

          return kid; // Return the kid with the drop-off address attached (if available)
        })
      );

      setKids(kidsWithAddresses);
    } catch (error) {
      console.error("Error fetching kids data:", error);
    }
  };

  // Update kid information in Supabase
  const updateKidOnDb = async (id, updates) => {
    try {
      const updatedFields = updates.reduce((obj, item) => {
        obj[item.fieldName] = item.value;
        return obj;
      }, {});

      // Update the kid record in Supabase
      const { data, error } = await supabase
        .from("students")
        .update(updatedFields)
        .eq("id", id);

      if (error) {
        throw error;
      }

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
