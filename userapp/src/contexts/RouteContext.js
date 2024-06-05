import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../../backend/lib/supabase";
import { useUsersContext } from "./UsersContext";
import { useKidsContext } from "./KidsContext";

const RouteContext = createContext({});

const RouteContextProvider = ({ children }) => {
  const { dbUser, currentUserData, userEmail } = useUsersContext();
  const { kids } = useKidsContext();
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const [routesData, setRoutesData] = useState(null);
  const [dropOffLatLng, setDropLatLng] = useState(null);
  const [dropOffAddress, setDropOffAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchingKids, setMatchingKids] = useState(null);
  const [driver, setDriver] = useState(null);
  const [helper, setHelper] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [isRouteInProgress, setIsRouteInProgress] = useState(false);
  const [addressList, setAddressList] = useState(null);
  const [routeFinished, setRouteFinished] = useState(false);

  const getOrderAddress = async () => {
    try {
      const { data: addressData, error } = await supabase
        .from("address_list")
        .select("*")
        .eq("routeId", currentRouteData.id);

      if (error) {
        throw error;
      }

      const sortedAddressList = addressData.sort((a, b) => a.order - b.order);

      const addressListWithKids = await Promise.all(
        sortedAddressList.map(async (addressListItem) => {
          try {
            const { data: kidData, error: kidError } = await supabase
              .from("students")
              .select("*")
              .eq("id", addressListItem.addressListKidId)
              .single();

            if (kidError) {
              throw kidError;
            }

            return {
              ...addressListItem,
              Kid: kidData,
            };
          } catch (kidError) {
            console.error("Error fetching Kid data", kidError);
            return addressListItem;
          }
        })
      );

      const groupedAddressList = new Map();

      addressListWithKids.forEach((address) => {
        const { latitude, longitude } = address;
        const locationKey = `${latitude}_${longitude}`;

        if (!groupedAddressList.has(locationKey)) {
          groupedAddressList.set(locationKey, {
            ...address,
            Kid: [],
            latitude,
            longitude,
          });
        }

        const groupedAddress = groupedAddressList.get(locationKey);
        groupedAddress.Kid.push(address.Kid);
      });

      const uniqueAddressList = Array.from(groupedAddressList.values());

      setAddressList(uniqueAddressList);
    } catch (error) {
      console.error("Error fetching getOrderAddress: ", error);
    }
  };

  const getRoutesData = async () => {
    try {
      const { data: routeData, error } = await supabase
        .from("route")
        .select("*")
        .or(
          "status.eq.WAITING_TO_START, status.eq.IN_PROGRESS, status.eq.PAUSED"
        );

      if (error) {
        throw error;
      }

      const mergedData = await Promise.all(
        routeData.map(async (route) => {
          const { data: kidsData, error: kidsError } = await supabase
            .from("kidsByRouteID")
            .select("*")
            .eq("routeID", route.id);

          if (kidsError) {
            throw kidsError;
          }

          const { data: vansData, error: vanError } = await supabase
            .from("van")
            .select("*")
            .eq("id", route.routeVanId)
            .single();

          if (vanError) {
            throw vanError;
          }

          return { ...route, Kid: kidsData, Van: vansData };
        })
      );

      setRoutesData(mergedData);
    } catch (error) {
      console.error("Error fetching data getRoutesData: ", error);
    }
  };

  const checkKidsInRoutes = () => {
    const routeWithMatchingKids = routesData.find((item) => {
      if (item.Kid && Array.isArray(item.Kid)) {
        return item.Kid.some((routeKid) =>
          kids.some((contextKid) => routeKid.id === contextKid.id)
        );
      } else {
        return false;
      }
    });
    if (routeWithMatchingKids) {
      setCurrentRouteData(routeWithMatchingKids);

      const matchingKidsArray = kids.filter((contextKid) =>
        routeWithMatchingKids.Kid.some(
          (routeKid) => routeKid.id === contextKid.id
        )
      );
      if (matchingKidsArray.length > 0) {
        setMatchingKids(matchingKidsArray);

        matchingKidsArray.forEach((matchingKid) => {
          const { dropOffAddress, lat, lng } = matchingKid;
          setDropLatLng({ latitude: lat, longitude: lng });
          setDropOffAddress(dropOffAddress);
        });
        return true;
      }
    } else {
      return false;
    }
  };

  const getStaffData = async () => {
    if (currentRouteData.driver) {
      const { data: driverData, error: driverError } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentRouteData.driver)
        .single();

      if (driverError) {
        console.error("Error fetching driver data: ", driverError);
      }

      setDriver(driverData);
    }
    if (currentRouteData.helper) {
      const { data: helperData, error: helperError } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentRouteData.helper)
        .single();

      if (helperError) {
        console.error("Error fetching helper data: ", helperError);
      }

      setHelper(helperData);
    }
  };

  useEffect(() => {
    if (dbUser && userEmail) {
      const fetchInitialData = async () => {
        await getRoutesData();
        setIsLoading(false);
      };
      fetchInitialData();
    }
  }, [dbUser]);

  useEffect(() => {
    if (currentRouteData) {
      getOrderAddress();
    }
  }, [currentRouteData]);

  useEffect(() => {
    if (!currentRouteData) {
      return;
    }
    getStaffData();
  }, [currentRouteData]);

  useEffect(() => {
    if (routesData) {
      setIsLoading(false);
    }
  }, [routesData]);

  useEffect(() => {
    if (routesData && kids) {
      if (!checkKidsInRoutes()) {
        setIsLoading(false);
        setIsRouteInProgress(false);
      }
    }
  }, [routesData, kids]);

  useEffect(() => {
    if (currentRouteData) {
      const initialBusLocation = {
        latitude: currentRouteData.lat,
        longitude: currentRouteData.lng,
      };

      setBusLocation(initialBusLocation);

      if (currentRouteData.status === "IN_PROGRESS") {
        setIsRouteInProgress(true);
      }
    }
  }, [currentRouteData]);

  useEffect(() => {
    if (!busLocation) {
      return;
    }
    const sub = supabase
      .from("routes")
      .on("*:onUpdateRoute", (payload) => {
        const updatedRoute = payload.new;
        const idUpdatedRoute = updatedRoute.id;
        const routeStatus = updatedRoute.status;
        const newBusLocation = {
          latitude: updatedRoute.lat,
          longitude: updatedRoute.lng,
        };

        if (routeStatus === "IN_PROGRESS" && !routeFinished) {
          setIsRouteInProgress(true);
        } else if (idUpdatedRoute === currentRouteData.id) {
          setIsRouteInProgress(false);
        }

        if (
          newBusLocation.latitude !== busLocation.lat ||
          newBusLocation.longitude !== busLocation.lng
        ) {
          setBusLocation(newBusLocation);
        }
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [busLocation]);

  useEffect(() => {
    if (!matchingKids) {
      return;
    }
    const sub = supabase
      .from("addressLists")
      .on("*:onUpdateAddressList", (payload) => {
        const updatedAddressList = payload.new;

        if (updatedAddressList.addressListKidId === matchingKids[0].id) {
          if (updatedAddressList.status === "FINISHED") {
            setRouteFinished(true);
          }
        }
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [matchingKids]);

  useEffect(() => {
    if (routeFinished) {
      setIsRouteInProgress(false);
    }
  }, [routeFinished]);

  return (
    <RouteContext.Provider
      value={{
        routesData,
        dropOffLatLng,
        dropOffAddress,
        currentRouteData,
        matchingKids,
        driver,
        helper,
        checkKidsInRoutes,
        busLocation,
        isLoading,
        isRouteInProgress,
        addressList,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

export default RouteContextProvider;

export const useRouteContext = () => useContext(RouteContext);
