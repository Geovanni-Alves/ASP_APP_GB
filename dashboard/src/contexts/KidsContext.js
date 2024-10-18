import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabase";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const [kids, setKids] = useState([]);
  //const { getPhotoInBucket } = usePicturesContext(); // Assuming this is your method for fetching photos

  // Fetch kids data from Supabase
  const fetchKidsData = async () => {
    try {
      // Fetch all kids with their schedules
      const { data: fetchedKids, error: kidsError } = await supabase
        .from("students") // Assuming your table is 'students'
        .select("*");

      if (kidsError) {
        throw kidsError;
      }

      console.log("fetchedKids", fetchedKids);

      setKids(fetchedKids); // Update the kids state with the processed data
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
    console.log("Fetching Kids Data... Context");
    fetchKidsData(); // Fetch the data on mount
  }, []);

  return (
    <KidsContext.Provider value={{ kids, updateKidOnDb }}>
      {children}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
