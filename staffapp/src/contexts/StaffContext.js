// src/contexts/StaffContext.js
import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const StaffContext = createContext({});

const StaffContextProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);

  const fetchStaffData = async () => {
    try {
      // The team: active staff, drivers and managers (the API decides who is on the list)
      const { data } = await api.get("/app/staff");
      setStaff(data);
    } catch (error) {
      console.error(
        "Error fetching staff data",
        error?.response?.data || error.message,
      );
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
