import "../src/styles/main.scss";
import "./App.css";
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import supabase from "./lib/supabase";

import Home from "./pages/Home";
import AuthContextProvider from "./contexts/AuthContext";
import UsersContextProvider from "./contexts/UsersContext.js";
import GoogleMapsLoader from "./components/GoogleMapsLoader";

//import Navbar from "./components/Navbar";
//import Employees from "./components/Employees";
import Students from "./pages/Students.jsx";
import Parents from "./pages/ParentsPage";
import Vans from "./pages/Vans.jsx";
import VanDetailPage from "./pages/VanDetailPage";
import Staff from "./pages/StaffPage";
//import awsExports from "./aws-exports";
import VansMaps from "./pages/VansMaps.jsx";
import RoutesPage from "./pages/RoutesPage";
import Sidebar from "./components/Sidebar";
import DashBoardHome from "./pages/DashBoardHome";
import PickupPage from "./pages/PickupPage.jsx";
import KidsContext from "./contexts/KidsContext";
import PicturesContext from "./contexts/PicturesContext.js";

function App() {
  const [closeMenu, setCloseMenu] = useState(false);

  const toggleMenu = () => {
    setCloseMenu((prev) => !prev);
  };

  return (
    <>
      <GoogleMapsLoader />
      <AuthContextProvider>
        <UsersContextProvider>
          <PicturesContext>
            <KidsContext>
              <Router>
                <div
                  className={`App ${
                    closeMenu ? "sidebar-closed" : "sidebar-open"
                  }`}
                >
                  <Sidebar closeMenu={closeMenu} toggleMenu={toggleMenu} />
                  {/* <Navbar /> */}
                  <div
                    className={`pages ${
                      closeMenu ? "menu-closed" : "menu-open"
                    }`}
                  >
                    <Routes>
                      <Route path="/" element={<DashBoardHome />} />
                      <Route path="/weekdays" element={<Home />} />
                      <Route
                        path="/students"
                        element={<Students closeMenu={closeMenu} />}
                      />
                      <Route path="/parents" element={<Parents />} />
                      <Route path="/staff" element={<Staff />} />
                      <Route path="/vans" element={<Vans />} />
                      <Route path="/vans/:vanId" element={<VanDetailPage />} />
                      <Route path="/pickup" element={<PickupPage />} />
                      {/* <Route path="/employees" element={<Employees />} /> */}
                      <Route path="/routes" element={<RoutesPage />} />
                      <Route path="/maps" element={<VansMaps />} />
                    </Routes>
                  </div>
                </div>
              </Router>
            </KidsContext>
          </PicturesContext>
        </UsersContextProvider>
      </AuthContextProvider>
    </>
  );
}

export default App;
