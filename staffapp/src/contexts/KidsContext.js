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
        .select("*")
        .order("name", { ascending: true });

      if (kidsError) throw kidsError;

      const kidsWithParents = await Promise.all(
        fetchedKids.map(async (kid) => {
          if (kid.parent1Id !== null) {
            const { data: parent1Data, error: parent1Error } = await supabase
              .from("users")
              .select("*")
              .eq("id", kid.parent1Id)
              .single();
            if (parent1Error) throw parent1Error;
            kid.Parent1 = parent1Data;
          }
          if (kid.parent2Id !== null) {
            const { data: parent2Data, error: parent2Error } = await supabase
              .from("users")
              .select("*")
              .eq("id", kid.parent2Id)
              .single();
            if (parent2Error) throw parent2Error;
            kid.Parent2 = parent2Data;
          }
          return kid;
        })
      );

      setKids(kidsWithParents);
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

  return (
    <KidsContext.Provider value={{ kids, RefreshKidsData }}>
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
