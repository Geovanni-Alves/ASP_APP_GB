import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const StaffContext = createContext({});

const StaffContextProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);

  const fetchStaffData = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select()
        .or(`userType.eq.STAFF,userType.eq.DRIVER`);
      if (error) {
        throw error;
      }

      const fetchedStaff = data;

      setStaff(fetchedStaff);
    } catch (error) {
      console.error("Error fetching staff data", error);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  return (
    <StaffContext.Provider value={{ staff }}>{children}</StaffContext.Provider>
  );
};

export default StaffContextProvider;

export const useStaffContext = () => useContext(StaffContext);
