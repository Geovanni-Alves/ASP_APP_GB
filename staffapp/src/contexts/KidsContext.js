import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import CustomLoading from "../components/CustomLoading";
//import { usePicturesContext } from "./PicturesContext";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState([]);
  const [kidCurrentStateData, setKidCurrentStateData] = useState([]);

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

  const fetchKidsData = async () => {
    try {
      const { data: fetchedKids, error: kidsError } = await supabase
        .from("students")
        .select(
          `
          *,
          schools(*),  
          drop_off_route(*),
          contacts(*)
        `
        )
        .order("name", { ascending: true });

      if (kidsError) throw kidsError;

      // Fetch current drop-off addresses for each student manually
      const kidsWithAddresses = await Promise.all(
        fetchedKids.map(async (kid) => {
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
      console.error("Error fetching kids data", error);
    }
  };

  useEffect(() => {
    fetchKidsData();
  }, []);

  const RefreshKidsData = async () => {
    await fetchKidsData();
    await fetchCurrentStateData();
  };

  useEffect(() => {
    if (kids) {
      setLoading(false);
    }
  }, [kids]);

  const fetchSelectedKid = async (kidId) => {
    try {
      // Check if the kid is already in the kids state
      const foundKid = kids.find((kid) => kid.id === kidId);
      if (foundKid) {
        return foundKid;
      }

      // If not found in state, fetch from the database
      const { data: fetchedKid, error } = await supabase
        .from("students")
        .select(
          `
          *,
          schools(*),  
          drop_off_route(*),
          contacts(*)
        `
        )
        .eq("id", kidId)
        .single();

      if (error) {
        console.error("Error fetching selected kid:", error);
        return null;
      }

      return fetchedKid;
    } catch (error) {
      console.error("Error in fetchSelectedKid:", error);
      return null;
    }
  };

  return (
    <KidsContext.Provider value={{ kids, RefreshKidsData, fetchSelectedKid }}>
      {/* {loading ? <ActivityIndicator /> : children} */}
      {loading ? (
        <CustomLoading imageSize={40} showContainer={false} />
      ) : (
        children
      )}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
