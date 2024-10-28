import React, { useEffect, useState } from "react";
import "./ParentsPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { API } from "aws-amplify";
import {
  faPenToSquare,
  faTrash,
  faArrowRight,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { listUsers } from "../graphql/queries";
import ParentsForm from "./ParentsForm";

function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [selectedParents, setSelectedParents] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [updatedName, setUpdatedName] = useState("");
  const parentsPerPage = 4;

  useEffect(() => {
    const fetchParents = async () => {
      const variables = {
        filter: {
          userType: { eq: "PARENT" },
        },
      };
      const employeesResponse = await API.graphql({
        query: listUsers,
        variables: variables,
      });
      const parents = employeesResponse.data.listUsers.items;
      setParents(parents);
    };
    fetchParents();
  }, []);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => prevPage - 1);
  };

  const startIndex = (currentPage - 1) * parentsPerPage;
  const endIndex = startIndex + parentsPerPage;

  const filteredParents = parents.filter((parents) => {
    return (
      nameFilter === "" ||
      parents.name.toLowerCase().includes(nameFilter.toLowerCase())
    );
  });

  const displayedParents = filteredParents.slice(startIndex, endIndex);

  const handleParentsClick = (parents) => {
    setSelectedParents(parents);
    setUpdatedName(parents.name);
    setMode("details");
  };
  const handleDeleteClick = (employee) => {
    setSelectedParents(employee);
    setMode("delete");
  };
  const handleDeleteParents = async () => {
    try {
      const response = await fetch(
        `https://drop-off-app-dere.onrender.com/api/employes/${selectedParents._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const updatedParents = parents.filter(
          (parents) => parents._id !== selectedParents._id
        );
        setParents(updatedParents);
        setSelectedParents(null);
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
        `https://drop-off-app-dere.onrender.com/api/employes/${selectedParents._id}`,
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
        const updatedParents = parents.map((employee) =>
          employee._id === selectedParents._id
            ? {
                ...employee,
                name: updatedName,
              }
            : employee
        );
        setParents(updatedParents);

        setSelectedParents(null);
        setMode("list");
        setUpdatedName("");
      } else {
        console.error("Failed to update Employee.");
      }
    } catch (error) {
      console.error("Error updating Employee:", error);
    }
  };

  const handleParentsAdded = async () => {
    try {
      const response = await fetch(
        "https://drop-off-app-dere.onrender.com/api/employes"
      );
      const json = await response.json();

      if (response.ok) {
        setParents(json.parents);
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
                <h3>Parents</h3>
                <div className="filters">
                  <input
                    type="text"
                    placeholder="Filter by Name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
                <div className="student">
                  {displayedParents.map((employee) => (
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
                          onClick={() => handleParentsClick(employee)}
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
                    disabled={endIndex >= filteredParents.length}
                    className="btn"
                  >
                    <FontAwesomeIcon icon={faArrowRight} beat />
                  </button>
                </div>
              </div>
            )}
            {mode === "details" && selectedParents && (
              <div className="update-student-container">
                <h2>Update Employee</h2>
                <div className="update-student">
                  <h4>{selectedParents.name}</h4>
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
            {mode === "delete" && selectedParents && (
              <div className="delete-student-container">
                <h2>Delete Employee</h2>
                <div className="delete-student">
                  <h4>{selectedParents.name}</h4>
                  <p>Are you sure you want to delete this student?</p>
                  <button onClick={handleDeleteParents} className="btn">
                    Yes
                  </button>
                  <button onClick={() => setMode("list")} className="btn">
                    No
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="left-container">
            <ParentsForm onParentsAdded={handleParentsAdded} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParentsPage;
