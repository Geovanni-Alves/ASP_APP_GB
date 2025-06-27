import React, { useState, useRef, useEffect } from "react";
import GbIcon from "../Images/gb-logo.png";
//import Profile from "../Images/avatar-image.png";
import Dashboard from "../Images/dashboard.png";
import People from "../Images/people.png";
import School from "../Images/school.png";
import House from "../Images/house.png";
import GbBus from "../Images/vanDashboard.png";
import Settings from "../Images/settings.png";
import ArrowIcon from "../Images/drop-down-arrow.png";
import { useLocation } from "react-router-dom";
import { useUsersContext } from "../contexts/UsersContext";
import { useAuthContext } from "../contexts/AuthContext";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import RemoteImage from "./RemoteImage";
import DialogBox from "./UiComponents/DialogBox";

const Sidebar = ({ closeMenu, toggleMenu }) => {
  const location = useLocation();
  //const [closeMenu, setCloseMenu] = useState(false);
  const [subMenuPeopleOpen, setSubMenuPeopleOpen] = useState(false);
  const [subMenuPickupOpen, setSubMenuPickupOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentUserData } = useUsersContext();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { logout } = useAuthContext();
  const dropdownRef = useRef(null);

  // const handleCloseMenu = () => {
  //   setCloseMenu(!closeMenu);
  // };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // const handleLogout = () => {
  //   setShowDropdown(false);
  //   logout();
  // };

  const handleSubmenuToggle = (menu) => {
    if (menu === "people") {
      setSubMenuPeopleOpen(!subMenuPeopleOpen);
    }
    if (menu === "pickup") {
      setSubMenuPickupOpen(!subMenuPickupOpen);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true); // Show the custom dialog
  };

  const handleConfirmLogout = () => {
    setShowLogoutDialog(false); // Close the dialog
    logout(); // Trigger the logout function
  };

  const handleCancelLogout = () => {
    setShowLogoutDialog(false); // Close the dialog without logging out
  };

  return (
    <div className={closeMenu === false ? "sidebar" : "sidebar active"}>
      <div
        className={
          closeMenu === false ? "logoContainer" : "logoContainer active"
        }
      >
        <img src={GbIcon} alt="icon" className="logo" />
        <h2 className="title">Gracie Barra</h2>
      </div>
      <div
        className={
          closeMenu === false ? "burgerContainer" : "burgerContainer active"
        }
      >
        <div className="burgerTrigger" onClick={toggleMenu}></div>
        <div className="burgerMenu"></div>
      </div>

      {/* <div
        className={
          closeMenu === false ? "profileContainer" : "profileContainer active"
        }
      >
        <RemoteImage
          path={currentUserData?.photo}
          name={currentUserData?.name}
          bucketName="profilePhotos"
          className="profile"
        />
        <div className="profileContents">
          <p className="name">{currentUserData?.name}</p>
          <p>{currentUserData?.email}</p>
        </div>
      </div> */}

      {/* Profile Button (Styled as a card) */}
      <div
        className="profileContainer"
        onClick={toggleDropdown}
        ref={dropdownRef}
      >
        <RemoteImage
          path={currentUserData?.photo}
          name={currentUserData?.name}
          bucketName="profilePhotos"
          style={{
            width: closeMenu ? "40px" : "85px", // Smaller when sidebar is collapsed
            height: closeMenu ? "40px" : "85px",
            borderRadius: "50%",
            transition: "width 0.3s ease, height 0.3s ease",
            objectFit: "cover",
          }}
        />
        {!closeMenu && (
          <div className="profileContents">
            <p className="name">{currentUserData?.name}</p>
            <p>{currentUserData?.email}</p>
          </div>
        )}

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="dropdownMenu">
            <p className="dropdownTitle">User Options</p>
            <ul>
              <li>
                <FaUser className="dropdownIcon" />
                <a href="/profile">Profile</a>
              </li>
              <li className="signout" onClick={handleLogoutClick}>
                <FaSignOutAlt className="dropdownIcon" />
                <span>Sign Out</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      <div
        className={
          closeMenu === false ? "contentsContainer" : "contentsContainer active"
        }
      >
        <ul>
          <li className={location.pathname === "/" ? "active" : ""}>
            <img src={Dashboard} alt="dashboard" />
            <a href="/">Dashboard</a>
          </li>

          <li
            className={location.pathname === "/students" ? "active" : ""}
            onClick={() => handleSubmenuToggle("people")}
          >
            <img src={People} alt="students" />
            <p>People</p>
            <img
              src={ArrowIcon}
              alt="submenu-toggle"
              className={`arrow ${subMenuPeopleOpen ? "open" : ""}`}
            />
          </li>
          {subMenuPeopleOpen && !closeMenu && (
            <ul className="submenu">
              <li>
                <a href="/students">Students</a>
              </li>
              {/* <li>
                <a href="/parents">Parents/Family</a>
              </li> */}
              <li>
                <a href="/staff">Staff</a>
              </li>
            </ul>
          )}

          <li className={location.pathname === "/vans" ? "active" : ""}>
            <img src={GbBus} alt="vehicles" />
            <a href="/vans">Vehicles</a>
          </li>
          <li
            className={location.pathname === "/pickup" ? "active" : ""}
            onClick={() => handleSubmenuToggle("pickup")}
          >
            <img src={School} alt="pickup" />
            <p>Pickup</p>
            <img
              src={ArrowIcon}
              alt="submenu-toggle"
              className={`arrow ${subMenuPickupOpen ? "open" : ""}`}
            />
          </li>
          {subMenuPickupOpen && !closeMenu && (
            <ul className="submenu">
              <li>
                <a href="/studentSchedule">Student Weekly Schedule</a>
              </li>
              {/* <li>
                <a href="/parents">Parents/Family</a>
              </li> */}
              <li>
                <a href="/pickupPlanner">Pickup Planner</a>
              </li>
            </ul>
          )}
          <li className={location.pathname === "/drop-off" ? "active" : ""}>
            <img src={House} alt="drop-off" />
            <a href="/routes">Drop-Off</a>
          </li>
          <li className={location.pathname === "/settings" ? "active" : ""}>
            <img src={Settings} alt="settings" />
            <a href="/settings">Settings</a>
          </li>
        </ul>
      </div>
      {/* Logout button */}
      {/* <button className="logoutButton" onClick={handleLogoutClick}>
        <FaSignOutAlt className="logoutIcon" />
        {closeMenu === false && <span>Logout</span>}
      </button> */}
      <DialogBox
        isVisible={showLogoutDialog}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        confirmText="Yes, Log out"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Sidebar;
