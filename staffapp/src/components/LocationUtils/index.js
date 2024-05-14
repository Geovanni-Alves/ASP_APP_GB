import { API, graphqlOperation } from "aws-amplify";
import { updateRoute } from "../../graphql/mutations";

export const updateLocation = async (routeId, latitude, longitude) => {
  try {
    const response = await API.graphql(
      graphqlOperation(updateRoute, {
        input: {
          id: routeId,
          lat: latitude,
          lng: longitude,
        },
      })
    );

    return response;
  } catch (error) {
    console.error("Error updating route", error);
    throw error; // Re-throw the error so it can be caught where the function is called.
  }
};
