import React, { useState } from "react";
import api from "../../lib/api";
import AddressAutocomplete from "../AddressAutocomplete/AddressAutocomplete";
import { Button, Input } from "antd";

function AddSchool({ onSchoolAdded, closeModal }) {
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [error, setError] = useState("");

  const handleAddressSelect = (selectedPlace) => {
    console.log("selectedPlace", selectedPlace.formatted_address);
    setAddress(selectedPlace.formatted_address);
    setLat(selectedPlace.geometry.location.lat());
    setLng(selectedPlace.geometry.location.lng());
  };

  const handleSubmit = async () => {
    if (!schoolName || !address) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      await api.post("/schools", { name: schoolName, address, lat, lng });

      onSchoolAdded();
      closeModal(); // Ensure modal closes after successful addition
    } catch (error) {
      console.error("Error adding school:", error);
      setError("Failed to add school. Please try again.");
    }
  };

  return (
    <div>
      <div className="form-item">
        <label>School Name:</label>
        <Input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
        />
      </div>

      <div className="form-item">
        <label>Address:</label>
        <div className="autocomplete-container">
          <AddressAutocomplete onPlaceSelect={handleAddressSelect} />
        </div>
      </div>

      <Button type="primary" onClick={handleSubmit}>
        Add School
      </Button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default AddSchool;
