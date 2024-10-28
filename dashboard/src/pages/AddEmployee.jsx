import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddStudent.css";

const AddEmployeeToVan = () => {
  const [formData, setFormData] = useState({
    employeId: "",
    vanId: "",
  });

  const [employes, setEmployes] = useState([]); // Corrected variable name here
  const [vans, setVans] = useState([]);
  const [selectedVanEmployes, setSelectedVanEmployes] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  useEffect(() => {
    // Fetch the list of employes and vans from your API
    const fetchEmployesAndVans = async () => {
      try {
        const employesResponse = await axios.get(
          "https://drop-off-app-dere.onrender.com/api/employes"
        );
        const vansResponse = await axios.get(
          "https://drop-off-app-dere.onrender.com/api/vans"
        );

        setEmployes(employesResponse.data.employes); // Corrected variable name here
        setVans(vansResponse.data.vans);
      } catch (error) {
        console.error(error.response.data);
      }
    };

    fetchEmployesAndVans();
  }, []);
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (e.target.name === "vanId") {
      const selectedVan = vans.find((van) => van._id === e.target.value);
      setSelectedVanEmployes(selectedVan ? selectedVan.employes : []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://drop-off-app-dere.onrender.com/api/vans/addEmployee",
        formData
      );
      setSuccessMessage("Employee has been successfully added!");
      window.location.reload();
      console.log(response.data); // Handle success
      alert("Employee has been added to van");
    } catch (error) {
      console.error(error.response.data); // Handle errors
    }
  };

  // Filter students by name
  const filteredEmployes = employes.filter((employe) =>
    employe.name.toLowerCase().includes(nameFilter.toLowerCase())
  );

  return (
    <div className="add-employee-container">
      <h2>Add Employee to Van</h2>
      <div className="filter-inputs">
        <input
          type="text"
          placeholder="Filter by Name"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>
      <form onSubmit={handleSubmit}>
        <select
          className="sel"
          name="employeId"
          onChange={handleChange}
          required
        >
          <option value="">Select a Employee</option>
          {filteredEmployes.map((employe) => (
            <option key={employe._id} value={employe._id}>
              {employe.name}
            </option>
          ))}
        </select>
        <select className="sel" name="vanId" onChange={handleChange} required>
          <option value="">Select a Van</option>
          {vans.map((van) => (
            <option key={van._id} value={van._id}>
              {van.model} - {van.plate}
            </option>
          ))}
        </select>
        <button className="sel-btn sel" type="submit">
          Assign Employee to Van
        </button>
        {successMessage && <p className="success-message">{successMessage}</p>}
      </form>
    </div>
  );
};

export default AddEmployeeToVan;
