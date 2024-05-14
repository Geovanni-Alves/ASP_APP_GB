import { createContext, useState, useEffect, useContext } from "react";
import { useAuthContext } from "./AuthContext";
import { API, graphqlOperation } from "aws-amplify";
import {
  listRoutes,
  kidsByRouteID,
  getVan,
  getUser,
  listAddressLists,
  getKid,
} from "../../src/graphql/queries";
import { onUpdateRoute, onUpdateAddressList } from "../graphql/subscriptions";
import { useKidsContext } from "./KidsContext";

const RouteContext = createContext({});

const RouteContextProvider = ({ children }) => {
  const { dbUser, currentUserData, userEmail } = useAuthContext();
  const { kids } = useKidsContext();
  const [currentRouteData, setCurrentRouteData] = useState(null);
  //const navigation = useNavigation();
  const [routesData, setRoutesData] = useState(null);
  //const [noKidsAvailable, setNoKidsAvailable] = useState(false);
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
      const variables = {
        filter: {
          routeID: { eq: currentRouteData.id },
        },
      };
      const responseListAddress = await API.graphql({
        query: listAddressLists,
        variables: variables,
      });
      const AddressListsData = responseListAddress.data.listAddressLists.items;
      const sortedAddressList = AddressListsData.sort(
        (a, b) => a.order - b.order
      );

      const addressListWithKids = await Promise.all(
        sortedAddressList.map(async (addressListItem) => {
          try {
            const responseGetKid = await API.graphql({
              query: getKid,
              variables: { id: addressListItem.addressListKidId },
            });
            const kidData = responseGetKid.data.getKid;
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
        // groupedAddress.AddressList.push(address);
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
      const variables = {
        filter: {
          or: [
            { status: { eq: "WAITING_TO_START" } },
            { status: { eq: "IN_PROGRESS" } }, //status: { eq: "IN_PROGRESS" }, //
            { status: { eq: "PAUSED" } }, //status: { eq: "IN_PROGRESS" }, //
          ],
        },
      };

      // Fetch route data
      const responseListRoutes = await API.graphql({
        query: listRoutes,
        variables: variables,
      });

      const routeData = responseListRoutes.data.listRoutes.items;
      if (routeData.length === 0) {
        console.log("routesData not found any route", routeData);
        // alert(
        //   "Hi there, there is no route in progress now! come back later or contact us for more information!"
        // );
        setIsRouteInProgress(false);
        //await navigation.navigate("Wait");
      }

      // Fetch kids data for each route
      const mergedData = await Promise.all(
        routeData.map(async (route) => {
          const responseKidsByRouteID = await API.graphql({
            query: kidsByRouteID,
            variables: { routeID: route.id },
          });
          const kidsData = responseKidsByRouteID.data.kidsByRouteID.items;
          // fetch the van
          const responseGetVan = await API.graphql({
            query: getVan,
            variables: { id: route.routeVanId },
          });
          const vansData = responseGetVan.data.getVan;

          return { ...route, Kid: kidsData, Van: vansData };
        })
      );
      //console.log(mergedData);
      setRoutesData(mergedData);
    } catch (error) {
      console.error("Error fetching data getROutesData: ", error);
    }
  };

  const checkKidsInRoutes = () => {
    // Find the first route that has at least one kid from the context
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
      // Update the state variable with the route that has matching kids
      setCurrentRouteData(routeWithMatchingKids);
      //
      const matchingKidsArray = kids.filter((contextKid) =>
        routeWithMatchingKids.Kid.some(
          (routeKid) => routeKid.id === contextKid.id
        )
      );
      if (matchingKidsArray.length > 0) {
        // Update the state variable with matching kids
        setMatchingKids(matchingKidsArray);

        // Loop through matching kids and extract dropOffAddress and dropOffLatLng
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
      const responseGetDriver = await API.graphql({
        query: getUser,
        variables: { id: currentRouteData.driver },
      });
      const driverData = responseGetDriver.data.getUser;
      setDriver(driverData);
    }
    if (currentRouteData.helper) {
      //
      const responseGetHelper = await API.graphql({
        query: getUser,
        variables: { id: currentRouteData.helper },
      });
      const helperData = responseGetHelper.data.getUser;
      setHelper(helperData);
    }
  };

  //
  //Start useEffect
  //

  useEffect(() => {
    // Fetch initial data when the component mounts
    if (dbUser && userEmail) {
      const fetchInitialData = async () => {
        await getRoutesData();
        setIsLoading(false); // Set loading to false after data is fetched
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
    // Fetch initial data when the component mounts
    if (routesData) {
      setIsLoading(false); // Set loading to false after data is fetched
    }
  }, [routesData]);

  useEffect(() => {
    if (routesData && kids) {
      // Check kids in routes after fetching initial data
      if (!checkKidsInRoutes()) {
        //console.log("noKidsAvailadsdable", noKidsAvailable);
        setIsLoading(false);
        //setNoKidsAvailable(true);
        setIsRouteInProgress(false);
      }
    }
  }, [routesData, kids]);

  useEffect(() => {
    // Update the bus location state when currentRouteData changes
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
    const sub = API.graphql(graphqlOperation(onUpdateRoute)).subscribe({
      next: ({ value }) => {
        console.log(
          "subscribe onUpdateRoute to check busLocation and route status",
          value
        );
        const idUpdatedRoute = value.data.onUpdateRoute.id;
        // console.log("current route ID", currentRouteData.id);
        // console.log("idUpdatedRoute", idUpdatedRoute);
        const routeStatus = value.data.onUpdateRoute.status;
        const newBusLocation = {
          latitude: value.data.onUpdateRoute.lat,
          longitude: value.data.onUpdateRoute.lng,
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
      },
      error: (error) => {
        console.error("Subscription Error:", error);
      },
    });

    return () => {
      // Cleanup subscription on component unmount
      sub.unsubscribe();
    };
  }, [busLocation]);

  // useEffect(() => {
  //   if (!currentRouteData) {
  //     return;
  //   }
  //   const sub = API.graphql(graphqlOperation(onUpdateRoute)).subscribe({
  //     next: ({ value }) => {
  //       if (value && value.data && value.data.onUpdateRoute) {
  //         const idUpdatedRoute = value.data.onUpdateRoute.id;
  //         const routeStatus = value.data.onUpdateRoute.status;

  //         console.log(
  //           "subscribe on updateRoute Route in Progress",
  //           idUpdatedRoute
  //         );
  //         if (
  //           idUpdatedRoute === currentRouteData.id &&
  //           routeStatus === "IN_PROGRESS" &&
  //           !routeFinished
  //         ) {
  //           setIsRouteInProgress(true);
  //         } else {
  //           setIsRouteInProgress(false);
  //         }
  //       }
  //     },
  //     error: (error) => {
  //       console.error("Subscription Error:", error);
  //     },
  //   });

  //   return () => {
  //     // Cleanup subscription on component unmount
  //     sub.unsubscribe();
  //   };
  // }, [routeFinished]);

  useEffect(() => {
    if (!matchingKids) {
      return;
    }
    const sub = API.graphql(graphqlOperation(onUpdateAddressList)).subscribe({
      next: ({ value }) => {
        if (value && value.data && value.data.onUpdateAddressList) {
          const addressListStatus = value.data.onUpdateAddressList;

          if (addressListStatus.addressListKidId === matchingKids[0].id) {
            if (addressListStatus.status === "FINISHED") {
              setRouteFinished(true);
              //setIsRouteInProgress(false);
            }
          }
        }
      },
      error: (error) => {
        console.error("Subscription Error:", error);
      },
    });

    return () => {
      // Cleanup subscription on component unmount
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
        //noKidsAvailable,
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
