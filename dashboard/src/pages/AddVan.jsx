import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddStudent.css";
const AddVan = () => {
  const [formData, setFormData] = useState({
    weekdayId: "",
    vanId: "",
  });

  const [weekdays, setWeekdays] = useState([]);
  const [vans, setVans] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Fetch the list of weekdays and vans from your API
    const fetchWeekdaysAndVans = async () => {
      try {
        const weekdaysResponse = await axios.get(
          "https://drop-off-app-dere.onrender.com/api/weekdays"
        );
        const vansResponse = await axios.get(
          "https://drop-off-app-dere.onrender.com/api/vans"
        );

        setWeekdays(weekdaysResponse.data.weekdays);
        setVans(vansResponse.data.vans);
      } catch (error) {
        console.error(error.response.data);
      }
    };

    fetchWeekdaysAndVans();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://drop-off-app-dere.onrender.com/api/weekdays/addVan",
        formData
      );
      setSuccessMessage("Van has been successfully added to the weekday!");
      console.log(response.data); // Handle success
      alert("Van has been added to the weekday");
    } catch (error) {
      console.error(error.response.data); // Handle errors
    }
  };

  return (
    <div className="add-vans-container">
      <h2>Add Van to Weekday</h2>
      <form onSubmit={handleSubmit}>
        <select
          className="sel"
          name="weekdayId"
          onChange={handleChange}
          required
        >
          <option value="">Select a Weekday</option>
          {weekdays.map((weekday) => (
            <option key={weekday._id} value={weekday._id}>
              {weekday.weekday}
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
          Add Van to Weekday
        </button>
        {successMessage && <p className="success-message">{successMessage}</p>}
      </form>
    </div>
  );
};

export default AddVan;
