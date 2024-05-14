import React, { useEffect, useState } from "react";
import "./Employees.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { API } from "aws-amplify";
import {
  faPenToSquare,
  faTrash,
  faArrowRight,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import EmployeeForm from "./EmployeeForm";
import { listUsers } from "../graphql/queries";
import { deleteUser, updateUser } from "../graphql/mutations";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [updatedName, setUpdatedName] = useState("");
  const [updatedRole, setUpdatedRole] = useState("");
  const [updatedPhoto, setUpdatedPhoto] = useState("");
  const employeesPerPage = 4;

  const fetchEmployees = async () => {
    try {
      const variables = {
        filter: {
          or: [{ userType: { eq: "STAFF" } }, { userType: { eq: "DRIVER" } }],
        },
      };
      const employeesResponse = await API.graphql({
        query: listUsers,
        variables: variables,
      });

      const staff = employeesResponse.data.listUsers.items;
      setEmployees(staff);
    } catch (error) {
      console.error("Error fetching employees");
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => prevPage - 1);
  };

  const startIndex = (currentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;

  const filteredEmployees = employees.filter((employee) => {
    return (
      nameFilter === "" ||
      employee.name.toLowerCase().includes(nameFilter.toLowerCase())
    );
  });

  const displayedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setMode("details");
  };

  useEffect(() => {
    if (selectedEmployee) {
      setUpdatedName(selectedEmployee.name);
      setUpdatedPhoto(selectedEmployee.photo);
      setUpdatedRole(selectedEmployee.userType);
    }
  }, [selectedEmployee]);

  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setMode("delete");
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) {
      return;
    }

    try {
      await API.graphql({
        query: deleteUser,
        variables: { input: { id: selectedEmployee.id } },
      });
      setSelectedEmployee(null);
      await fetchEmployees();
      setMode("list");
    } catch (error) {
      console.error("Error deleting Employee:", error);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) {
      return;
    }

    try {
      await API.graphql({
        query: updateUser,
        variables: {
          input: {
            id: selectedEmployee.id,
            name: selectedEmployee.name,
            userType: selectedEmployee.role,
          },
        },
      });

      await fetchEmployees();
      setSelectedEmployee(null);
      setMode("list");
      setUpdatedName("");
      setUpdatedName("");
      setUpdatedRole("");
    } catch (error) {
      console.error("Error updating Employee:", error);
    }
  };

  const handleEmployeeAdded = async () => {
    try {
      const response = await fetch(
        "https://drop-off-app-dere.onrender.com/api/employes"
      );
      const json = await response.json();

      if (response.ok) {
        setEmployees(json.employes);
      }
    } catch (error) {
      console.error("Error fetching Employees:", error);
    }
  };

  return (
    <div className="home-main">
      <div className="home">
        <div className="home-container">
          <div className="employees-container">
            {mode === "list" && (
              <div>
                <h3>Employees</h3>
                <div className="filters">
                  <input
                    type="text"
                    placeholder="Filter by Name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
                <div className="employee">
                  {displayedEmployees.map((employee) => (
                    <div
                      className="employee-details-container"
                      key={employee._id}
                    >
                      <img
                        src={employee.photo}
                        alt=""
                        className="employee-photo"
                      />
                      <div className="employee-details">
                        <div className="employee-name">{employee.name}</div>
                        <div className="employee-address">
                          {employee.userType}
                        </div>
                        <div className="employee-email">{employee.email}</div>
                      </div>
                      <div className="employee-details-btn">
                        <button
                          onClick={() => handleEmployeeClick(employee)}
                          className="btn btn-employee-edit"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          className="btn btn-employee-delete"
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
                    disabled={endIndex >= filteredEmployees.length}
                    className="btn"
                  >
                    <FontAwesomeIcon icon={faArrowRight} beat />
                  </button>
                </div>
              </div>
            )}
            {mode === "details" && selectedEmployee && (
              <div className="update-employee-container">
                <h2>Update Employee</h2>
                <div className="update-employee">
                  <h4>{selectedEmployee.name}</h4>
                  <form onSubmit={handleUpdateEmployee}>
                    <label>Name:</label>
                    <input
                      type="text"
                      value={updatedName}
                      onChange={(e) => setUpdatedName(e.target.value)}
                    />
                    <label>Photo:</label>
                    <input
                      type="text"
                      value={updatedPhoto}
                      onChange={(e) => setUpdatedPhoto(e.target.value)}
                    />
                    <label>Role:</label>
                    <select
                      value={updatedRole}
                      onChange={(e) => setUpdatedRole(e.target.value)}
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="DRIVER">DRIVER</option>
                    </select>
                    {/* <input
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
            {mode === "delete" && selectedEmployee && (
              <div className="delete-employee-container">
                <h2>Delete Employee</h2>
                <div className="delete-employee">
                  <h4>{selectedEmployee.name}</h4>
                  <p>Are you sure you want to delete this employee?</p>
                  <button onClick={handleDeleteEmployee} className="btn">
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
            <EmployeeForm onEmployeeAdded={handleEmployeeAdded} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Employees;
