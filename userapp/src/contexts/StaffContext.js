import { createContext, useContext, useEffect, useState } from "react";
import { API } from "aws-amplify";
import { listUsers } from "../graphql/queries";
import { usePicturesContext } from "./PicturesContext";

const StaffContext = createContext({});

const StaffContextProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);
  const { getPhotoInBucket } = usePicturesContext();

  const fetchStaffData = async () => {
    try {
      const variables = {
        filter: {
          or: [{ userType: { eq: "STAFF" } }, { userType: { eq: "DRIVER" } }],
        },
      };
      const response = await API.graphql({
        query: listUsers,
        variables: variables,
      });
      const fetchedStaff = response.data.listUsers.items;

      const staffWithPhotos = await Promise.all(
        fetchedStaff.map(async (staff) => {
          if (staff.photo) {
            const uriStaff = await getPhotoInBucket(staff.photo);
            return { ...staff, uriStaff };
          } else {
            return staff;
          }
        })
      );
      //console.log("staff with photos", staffWithPhotos);

      setStaff(staffWithPhotos);
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
