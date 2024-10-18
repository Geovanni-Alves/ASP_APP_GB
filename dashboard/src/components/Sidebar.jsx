import React, { useState } from "react";
import GbIcon from "../Images/gb-logo.png";
import Profile from "../Images/avatar-image.png";
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
import { FaSignOutAlt } from "react-icons/fa";
import RemoteImage from "./RemoteImage";

const Sidebar = () => {
  const location = useLocation();
  const [closeMenu, setCloseMenu] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const { currentUserData } = useUsersContext();
  const { logout } = useAuthContext();

  const handleCloseMenu = () => {
    setCloseMenu(!closeMenu);
  };

  const handleSubmenuToggle = () => {
    setSubMenuOpen(!subMenuOpen);
  };

  const handleLogout = () => {
    logout(); // Trigger the logout function
  };

  return (
    <div className={closeMenu === false ? "sidebar" : "sidebar active"}>
      <div
        className={
          closeMenu === false ? "logoContainer" : "logoContainer active"
        }
      >
        <img src={GbIcon} alt="icon" className="logo" />
        <h2 className="title">Gracie Barra Vancouver</h2>
      </div>
      <div
        className={
          closeMenu === false ? "burgerContainer" : "burgerContainer active"
        }
      >
        <div
          className="burgerTrigger"
          onClick={() => {
            handleCloseMenu();
          }}
        ></div>
        <div className="burgerMenu"></div>
      </div>
      <div
        className={
          closeMenu === false ? "profileContainer" : "profileContainer active"
        }
      >
        <RemoteImage
          path={currentUserData?.photo}
          name={currentUserData?.name}
          bucketName="profilePhotos"
          className="profile"
          //style={{ width: "100px", height: "100px", borderRadius: "50%" }}
        />
        {/* <img src={Profile} alt="profile" className="profile" /> */}
        <div className="profileContents">
          <p className="name">{currentUserData?.name}</p>
          <p>{currentUserData?.email}</p>
        </div>
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
            onClick={handleSubmenuToggle}
          >
            <img src={People} alt="students" />
            <p>People</p>
            <img
              src={ArrowIcon}
              alt="submenu-toggle"
              className={`arrow ${subMenuOpen ? "open" : ""}`}
            />
          </li>
          {subMenuOpen && !closeMenu && (
            <ul className="submenu">
              <li>
                <a href="/students">Students</a>
              </li>
              <li>
                <a href="/parents">Parents</a>
              </li>
              <li>
                <a href="/staff">Staff</a>
              </li>
            </ul>
          )}
          <li className={location.pathname === "/vans" ? "active" : ""}>
            <img src={GbBus} alt="vehicles" />
            <a href="/vans">Vehicles</a>
          </li>
          <li className={location.pathname === "/pickup" ? "active" : ""}>
            <img src={School} alt="pickup" />
            <a href="/pickup">Pickup</a>
          </li>
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
      <div
        className={
          closeMenu === false ? "logoutContainer" : "logoutContainer active"
        }
      >
        <button className="logoutButton" onClick={handleLogout}>
          <FaSignOutAlt className="logoutIcon" />
          {closeMenu === false && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
