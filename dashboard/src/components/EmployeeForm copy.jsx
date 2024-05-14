import { useState } from "react";
import { API } from "aws-amplify";
import { createUser } from "../graphql/mutations";

import "./StudentForm.css";

function EmployeeForm({ onEmployeeAdded }) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validation checks
    if (!name || !role) {
      // If any required field is blank, show an error message and return early
      setError("Please fill in all required fields.");
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const newEmployeeDetails = {
        name: name,
        photo: photo,
        userType: role,
      };
      const newEmployee = await API.graphql({
        query: createUser,
        variables: { input: newEmployee },
      });
      setName("");
      setPhoto("");
      setRole("");
      setError(null);
      console.log("new employee added");
      alert("New employee added!");
      onEmployeeAdded();
    } catch (error) {
      console.error("Error adding Employee", error);
    }
  };

  return (
    <form className="create" onSubmit={handleSubmit}>
      <h3>Add a New Employee</h3>
      <div className="form-container">
        <div className="form-item">
          <label>Employee Name:</label>
          <input
            type="text"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </div>
        <div className="form-item">
          <label>Employee Photo:</label>
          <input
            type="text"
            onChange={(e) => {
              setPhoto(e.target.value);
            }}
            value={photo}
          />
        </div>
        <div className="form-item">
          <label>Employee Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="STAFF">STAFF</option>
            <option value="DRIVER">DRIVER</option>
          </select>
        </div>
        <button className="create-btn">Add Employee</button>
        {error && <div className="error">{error}</div>}
      </div>
    </form>
  );
}

export default EmployeeForm;
