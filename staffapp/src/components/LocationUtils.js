import { supabase } from "../lib/supabase";

export const updateLocation = async (routeId, latitude, longitude) => {
  try {
    const { data, error } = await supabase
      .from("route")
      .update({ lat: latitude, lng: longitude })
      .eq("id", routeId);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating route", error);
    throw error; // Re-throw the error so it can be caught where the function is called.
  }
};
