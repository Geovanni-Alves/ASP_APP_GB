import React, { useEffect, useState } from "react";
import "./StaffPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { API } from "aws-amplify";
import {
  faPenToSquare,
  faTrash,
  faArrowRight,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { listUsers } from "../graphql/queries";
//import ParentsForm from "../components/ParentsForm";

function StaffPage() {
  const [staffs, setStaffs] = useState([]);
  const [selectedStaffs, setSelectedStaffs] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [updatedName, setUpdatedName] = useState("");
  const staffsPerPage = 4;
  useEffect(() => {
    const fetchStaff = async () => {
      const variables = {
        filter: {
          userType: { eq: "STAFF" },
        },
      };
      const employeesResponse = await API.graphql({
        query: listUsers,
        variables: variables,
      });
      const staff = employeesResponse.data.listUsers.items;
      setStaffs(staff);
    };
    fetchStaff();
  }, []);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => prevPage - 1);
  };

  const startIndex = (currentPage - 1) * staffsPerPage;
  const endIndex = startIndex + staffsPerPage;

  const filteredStaffs = staffs.filter((staffs) => {
    return (
      nameFilter === "" ||
      staffs.name.toLowerCase().includes(nameFilter.toLowerCase())
    );
  });

  const displayedStaffs = filteredStaffs.slice(startIndex, endIndex);

  const handleStaffsClick = (staffs) => {
    setSelectedStaffs(staffs);
    setUpdatedName(staffs.name);
    setMode("details");
  };
  const handleDeleteClick = (employee) => {
    setSelectedStaffs(employee);
    setMode("delete");
  };
  const handleDeletestaffs = async () => {
    try {
      const response = await fetch(
        `https://drop-off-app-dere.onrender.com/api/employes/${selectedStaffs._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const updatedstaffs = staffs.filter(
          (staffs) => staffs._id !== selectedStaffs._id
        );
        setStaffs(updatedstaffs);
        setSelectedStaffs(null);
        setMode("list");
      } else {
        console.error("Failed to delete Employee.");
      }
    } catch (error) {
      console.error("Error deleting Employee:", error);
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      const response = await fetch(
        `https://drop-off-app-dere.onrender.com/api/employes/${selectedStaffs._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: updatedName,
          }),
        }
      );

      if (response.ok) {
        const updatedstaffs = staffs.map((employee) =>
          employee._id === selectedStaffs._id
            ? {
                ...employee,
                name: updatedName,
              }
            : employee
        );
        setStaffs(updatedstaffs);

        setSelectedStaffs(null);
        setMode("list");
        setUpdatedName("");
      } else {
        console.error("Failed to update Employee.");
      }
    } catch (error) {
      console.error("Error updating Employee:", error);
    }
  };

  const handlestaffsAdded = async () => {
    try {
      const response = await fetch(
        "https://drop-off-app-dere.onrender.com/api/employes"
      );
      const json = await response.json();

      if (response.ok) {
        setStaffs(json.staffs);
      }
    } catch (error) {
      console.error("Error fetching Employees:", error);
    }
  };

  return (
    <div className="home-main">
      <div className="home">
        <div className="home-container">
          <div className="students-container">
            {mode === "list" && (
              <div>
                <h3>staffs</h3>
                <div className="filters">
                  <input
                    type="text"
                    placeholder="Filter by Name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
                <div className="student">
                  {displayedStaffs.map((employee) => (
                    <div
                      className="student-details-container"
                      key={employee._id}
                    >
                      <img
                        src={employee.photo}
                        alt=""
                        className="student-photo"
                      />
                      <div className="student-details">
                        <div className="student-name">{employee.name}</div>
                        <div className="student-address">{employee.role}</div>
                      </div>
                      <div className="student-details-btn">
                        <button
                          onClick={() => handleStaffsClick(employee)}
                          className="btn btn-student-edit"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          className="btn btn-student-delete"
                          onClick={() => {
                            handleDeleteClick(employee);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pagination">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="btn"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} beat />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={endIndex >= filteredStaffs.length}
                    className="btn"
                  >
                    <FontAwesomeIcon icon={faArrowRight} beat />
                  </button>
                </div>
              </div>
            )}
            {mode === "details" && selectedStaffs && (
              <div className="update-student-container">
                <h2>Update Employee</h2>
                <div className="update-student">
                  <h4>{selectedStaffs.name}</h4>
                  <form onSubmit={handleUpdateEmployee}>
                    <label>Name:</label>
                    <input
                      type="text"
                      value={updatedName}
                      onChange={(e) => setUpdatedName(e.target.value)}
                    />
                    {/* <label>Photo:</label>
                    <input
                      type="text"
                      value={updatedPhoto}
                      onChange={(e) => setUpdatedPhoto(e.target.value)}
                    />
                    <label>Role:</label>
                    <input
                      type="text"
                      value={updatedRole}
                      onChange={(e) => setUpdatedRole(e.target.value)}
                    /> */}
                    <button type="submit" className="btn">
                      Update Employee
                    </button>
                    <button onClick={() => setMode("list")} className="btn">
                      Back to List
                    </button>
                  </form>
                </div>
              </div>
            )}
            {mode === "delete" && selectedStaffs && (
              <div className="delete-student-container">
                <h2>Delete Employee</h2>
                <div className="delete-student">
                  <h4>{selectedStaffs.name}</h4>
                  <p>Are you sure you want to delete this student?</p>
                  <button onClick={handleDeletestaffs} className="btn">
                    Yes
                  </button>
                  <button onClick={() => setMode("list")} className="btn">
                    No
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* <div className="left-container">
            <staffsForm onstaffsAdded={handlestaffsAdded} />
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default StaffPage;
