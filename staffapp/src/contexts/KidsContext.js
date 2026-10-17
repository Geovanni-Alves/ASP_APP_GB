// src/contexts/KidsContext.js
import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import CustomLoading from "../components/CustomLoading";

const KidsContext = createContext({});

const KidsContextProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [kids, setKids] = useState([]);

  // ONE request: every kid that is not archived, with the school, the family (contacts), the
  // schedule and the current drop-off address already inside. Same shape the screens already use:
  //   { ...student, schools, contacts, dropOffAddress, drop_off_route, students_schedule }
  const fetchKidsData = async () => {
    try {
      const { data } = await api.get("/app/students");
      setKids(data);
    } catch (error) {
      console.error(
        "Error fetching kids data",
        error?.response?.data || error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKidsData();
  }, []);

  const RefreshKidsData = async () => {
    await fetchKidsData();
  };

  const fetchSelectedKid = async (kidId) => {
    try {
      // Check if the kid is already in the kids state
      const foundKid = kids.find((kid) => kid.id === kidId);
      if (foundKid) {
        return foundKid;
      }

      // If not found in state, ask the API
      const { data } = await api.get(`/app/students/${kidId}`);
      return data;
    } catch (error) {
      console.error(
        "Error in fetchSelectedKid:",
        error?.response?.data || error.message,
      );
      return null;
    }
  };

  return (
    <KidsContext.Provider value={{ kids, RefreshKidsData, fetchSelectedKid }}>
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
