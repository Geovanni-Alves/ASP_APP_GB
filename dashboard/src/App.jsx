import "../src/styles/main.scss";
//import "./App.css";
import { Amplify } from "aws-amplify";
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
//import Navbar from "./components/Navbar";
//import Employees from "./components/Employees";
import Students from "./components/Students";
import Parents from "./pages/ParentsPage";
import Vans from "./components/Vans";
import VanDetailPage from "./pages/VanDetailPage";
import Staff from "./pages/StaffPage";
import awsExports from "./aws-exports";
import VansMaps from "./components/VansMaps";
import RoutesPage from "./pages/RoutesPage";
import Sidebar from "./components/Sidebar";
import DashBoardHome from "./pages/DashBoardHome";
import PickupPage from "./pages/PickupPage.jsx";
import KidsContext from "./contexts/KidsContext";
import PicturesContext from "./contexts/PicturesContext.js";

Amplify.configure(awsExports);
function App() {
  return (
    <PicturesContext>
      <KidsContext>
        <Router>
          <div className="App">
            <Sidebar />
            {/* <Navbar /> */}
            <div className="pages">
              <Routes>
                <Route path="/" element={<DashBoardHome />} />
                <Route path="/weekdays" element={<Home />} />
                <Route path="/students" element={<Students />} />
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
  );
}

export default App;
