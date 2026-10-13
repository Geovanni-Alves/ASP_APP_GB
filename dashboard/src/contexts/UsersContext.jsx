import { createContext, useState, useEffect, useContext, useCallback } from "react";
import api from "../lib/api";
import { useAuthContext } from "./AuthContext";
import CompleteProfile from "../components/CompleteProfile/CompleteProfile";

const UsersContext = createContext({});

// Role values can be stored with different casing ("Staff", "STAFF", "parent", "PARENT"...),
// so we always compare them in lower case.
const userTypeOf = (user) => (user?.userType || "").toLowerCase();

// Only administrators use the dashboard (the ASP manager and the super admin).
// Staff and drivers use the staff app, parents use the parent app.
const PORTAL_TYPES = ["admin", "superadmin"];
const canUsePortal = (user) => PORTAL_TYPES.includes(userTypeOf(user));

const UsersContextProvider = ({ children }) => {
  const { session, logout } = useAuthContext();

  // With our own API there is ONE table for login + profile ("users").
  // The login (email + password) and the profile (name, phone...) live in the same row,
  // so "authUser" and "dbUser" now come from the same place.
  const authUser = session?.user ?? null;
  const userEmail = authUser?.email ?? null;

  const [dbUser, setDbUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  // GET /users/me -> full profile of the logged-in user
  const loadCurrentUser = useCallback(async () => {
    try {
      const { data } = await api.get("/users/me");
      setDbUser(data);
      setCurrentUserData(data);
      return data;
    } catch (error) {
      console.error("Error fetching user:", error.message);
      return null;
    }
  }, []);

  // GET /users -> all users (staff and admins only)
  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
      setStaff(
        data.filter(
          (user) => userTypeOf(user) === "staff" && user.active !== false,
        ),
      );
    } catch (error) {
      console.error("Error fetching users:", error.message);
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    const init = async () => {
      const me = await loadCurrentUser();
      setLoading(false);
      // Only administrators may use this portal (the API refuses everybody else anyway).
      if (canUsePortal(me)) {
        loadUsers();
      }
    };
    init();
  }, [session, loadCurrentUser, loadUsers]);

  // Called by the CompleteProfile screen: saves name/phone on the user's own row
  // and clears the "firstLogin" flag (PATCH /users/me).
  const completeProfile = async (profileData) => {
    try {
      const { data } = await api.patch("/users/me", {
        ...profileData,
        firstLogin: false,
      });
      setDbUser(data);
      setCurrentUserData(data);
    } catch (error) {
      console.error("Error saving profile:", error.message);
      alert("Could not save your profile. Please try again.");
    }
  };

  const RefreshCurrentUserData = async () => {
    await loadCurrentUser();
  };

  const RefreshUsers = async () => {
    await loadUsers();
  };

  // The profile screen is shown while the account is flagged as "firstLogin"
  // (the flag is set when an admin creates/invites the user, and cleared by completeProfile).
  const needsProfile = dbUser?.firstLogin === true;

  return (
    <UsersContext.Provider
      value={{
        users,
        staff,
        authUser,
        dbUser,
        setDbUser,
        userEmail,
        currentUserData,
        RefreshCurrentUserData,
        RefreshUsers,
      }}
    >
      {loading ? (
        <div>Loading...</div>
      ) : dbUser && !canUsePortal(dbUser) ? (
        <div style={{ padding: 30, textAlign: "center", color: "#444" }}>
          <h2>Access Restricted</h2>
          <p>
            This web portal is for administrators only. <br />
            {userTypeOf(dbUser) === "parent"
              ? "Please use the Parent App to manage your profile and view your child’s activity."
              : "Please use the Staff App."}
          </p>
          <button onClick={logout}>Sign out</button>
        </div>
      ) : needsProfile ? (
        <CompleteProfile email={authUser.email} onCreateUser={completeProfile} />
      ) : (
        children
      )}
    </UsersContext.Provider>
  );
};

export default UsersContextProvider;

export const useUsersContext = () => useContext(UsersContext);
