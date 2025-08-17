import React, { useState } from "react";
import supabase from "../../lib/supabase";
import GoogleMapsAutocomplete from "../GoogleMapsAutocomplete/GoogleMapsAutocomplete";
import { Button, Input } from "antd";

function AddSchool({ onSchoolAdded, closeModal }) {
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [error, setError] = useState("");

  const handleAddressSelect = (selectedPlace) => {
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
      const { error: insertError } = await supabase.from("schools").insert([
        {
          name: schoolName,
          address,
          lat,
          lng,
        },
      ]);

      if (insertError) throw insertError;

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
          <GoogleMapsAutocomplete onPlaceSelect={handleAddressSelect} />
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
