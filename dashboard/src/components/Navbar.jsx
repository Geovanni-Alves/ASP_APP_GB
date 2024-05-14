import { useState } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";
import gbLogo from "../docs/gb-logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTv } from "@fortawesome/free-solid-svg-icons";
export default function Navbar() {
  const [view, setView] = useState("navbar-container");
  const toggleView = () => {
    if (view === "navbar-container") {
      setView("navbar-container-tv");
    } else {
      setView("navbar-container");
    }
  };
  return (
    <header>
      <div className={view}>
        <div className="asp">
          <img src={gbLogo} alt="" className="gb-logo" />
          <Link to="/weekdays">
            <h1>ASP Drop Off</h1>
          </Link>
        </div>

        <div className="link-header-container">
          <Link to="/students">
            <h2>Kids</h2>
          </Link>
          <Link to="/parents">
            <h2>Parents</h2>
          </Link>
          <Link to="/vans">
            <h2>Vans</h2>
          </Link>
          <Link to="/employees">
            <h2>Employees</h2>
          </Link>
          <Link to="/routes">
            <h2>Routes</h2>
          </Link>
          <Link to="/maps">
            <h2>Vans map</h2>
          </Link>
        </div>
      </div>
      <button onClick={toggleView}>
        <FontAwesomeIcon icon={faTv} />
      </button>
    </header>
  );
}
