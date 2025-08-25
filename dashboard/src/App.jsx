//import Navbar from "./components/Navbar";
// import Employees from "./components/Employees";
// import RoutesPage from "./pages/RoutesPage";
// import Parents from "./pages/ParentsPage";
// import VanDetailPage from "./pages/VanDetailPage";
//import awsExports from "./aws-exports";
// import VansMaps from "./pages/VansMaps.jsx";
// import "./App.css";
//import supabase from "./lib/supabase";
// import PickupPlanner from "./pages/PickupPlanner.jsx";

import "../src/styles/main.scss";
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// import Home from "./pages/Home";
import AuthContextProvider from "./contexts/AuthContext.jsx";
import UsersContextProvider from "./contexts/UsersContext.jsx";
import GoogleMapsLoader from "./components/GoogleMapsLoader/GoogleMapsLoader.jsx";
import "mapbox-gl/dist/mapbox-gl.css";

import Students from "./pages/Students/Students.jsx";
import Vans from "./pages/Vans/Vans.jsx";
import Staff from "./pages/Staff/StaffPage.jsx";
import StudentWeeklySchedule from "./pages/Students/StudentWeeklySchedule.jsx";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import DashBoardHome from "./pages/Home/DashBoardHome.jsx";
import KidsContext from "./contexts/KidsContext.jsx";
import PicturesContext from "./contexts/PicturesContext.jsx";
import PickupPlanner from "./components/PickupPlanner/PickupPlanner.jsx";

function App() {
  const [closeMenu, setCloseMenu] = useState(false);

  const toggleMenu = () => {
    setCloseMenu((prev) => !prev);
  };

  return (
    <>
      {/* <GoogleMapsLoader /> */}
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
                      {/* <Route path="/weekdays" element={<Home />} /> */}
                      <Route
                        path="/students"
                        element={<Students closeMenu={closeMenu} />}
                      />
                      {/* <Route path="/parents" element={<Parents />} /> */}
                      <Route
                        path="/staff"
                        element={<Staff closeMenu={closeMenu} />}
                      />
                      <Route
                        path="/vans"
                        element={<Vans closeMenu={closeMenu} />}
                      />
                      {/* <Route path="/vans/:vanId" element={<VanDetailPage />} /> */}
                      <Route
                        path="/pickupPlanner"
                        element={<PickupPlanner closeMenu={closeMenu} />}
                      />
                      <Route
                        path="/studentSchedule"
                        element={
                          <StudentWeeklySchedule closeMenu={closeMenu} />
                        }
                      />
                      {/* <Route path="/employees" element={<Employees />} /> */}
                      {/* <Route path="/routes" element={<RoutesPage />} />
                      <Route path="/maps" element={<VansMaps />} /> */}
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
