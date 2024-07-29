import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
//import { usePicturesContext } from "./PicturesContext";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState([]);
  //const { getPhotoInBucket } = usePicturesContext();

  const fetchKidsData = async () => {
    try {
      const { data: fetchedKids, error: kidsError } = await supabase
        .from("students")
        .select("*");

      if (kidsError) throw kidsError;

      //console.log("kids", fetchedKids);

      // const kidsWithPhotos = await Promise.all(
      //   fetchedKids.map(async (kid) => {
      //     if (kid.Parent1Id !== null) {
      //       const { data: parent1Data, error: parent1Error } = await supabase
      //         .from("users")
      //         .select("*")
      //         .eq("id", kid.Parent1Id)
      //         .single();
      //       if (parent1Error) throw parent1Error;
      //       kid.Parent1 = parent1Data;
      //     }

      //     if (kid.Parent2Id !== null) {
      //       const { data: parent2Data, error: parent2Error } = await supabase
      //         .from("users")
      //         .select("*")
      //         .eq("id", kid.Parent2Id)
      //         .single();
      //       if (parent2Error) throw parent2Error;
      //       kid.Parent2 = parent2Data;
      //     }

      //     if (kid.photo) {
      //       const uriKid = await getPhotoInBucket(kid.photo);
      //       return { ...kid, uriKid };
      //     } else {
      //       return kid;
      //     }
      //   })
      // );

      setKids(fetchedKids);
    } catch (error) {
      console.error("Error fetching kids data", error);
    }
  };

  useEffect(() => {
    fetchKidsData();
  }, []);

  useEffect(() => {
    if (kids) {
      setLoading(false);
    }
  }, [kids]);

  return (
    <KidsContext.Provider value={{ kids }}>
      {loading ? <ActivityIndicator /> : children}
    </KidsContext.Provider>
  );
};

export default KidsContextProvider;

export const useKidsContext = () => useContext(KidsContext);
