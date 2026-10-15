import React, { useState } from "react";
import api from "../../lib/api";
import AddressAutocomplete from "../AddressAutocomplete/AddressAutocomplete";
import { Button, Input } from "antd";

function AddSchool({ onSchoolAdded, closeModal, existingSchools }) {
  const [schoolName, setSchoolName] = useState("");
  const [addressKey, setAddressKey] = useState(0); // a new key empties the address box
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [error, setError] = useState("");

  const handleAddressSelect = (selectedPlace) => {
    // console.log("selectedPlace", selectedPlace.formatted_address);
    setAddress(selectedPlace.formatted_address);
    setLat(selectedPlace.geometry.location.lat());
    setLng(selectedPlace.geometry.location.lng());
  };

  const reset = () => {
    setSchoolName("");
    setAddress("");
    setLat(null);
    setLng(null);
    setError("");
    setAddressKey((key) => key + 1);
  };

  const handleSubmit = async () => {
    const cleanName = schoolName.trim();
    if (!cleanName || !address) {
      setError("Please fill in all required fields.");
      return;
    }

    // The same name twice would make two schools that look identical in the list
    const duplicate = existingSchools.some(
      (school) =>
        (school.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (duplicate) {
      setError("There is already a school with this name.");
      return;
    }

    try {
      // The API answers with the new school (including its id)
      const { data: created } = await api.post("/schools", {
        name: cleanName,
        address,
        lat,
        lng,
      });

      // Empty the form: the dialog stays mounted, so it would show the old school next time
      reset();

      onSchoolAdded(created);
      closeModal(); // Ensure modal closes after successful addition
    } catch (error) {
      console.error("Error adding school:", error);
      setError("Failed to add school. Please try again.");
    }
  };

  return (
    <div className="add-school">
      <div className="add-school-field">
        <label>School name</label>
        <Input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="For example: Lord Selkirk Elementary"
        />
      </div>

      <div className="add-school-field">
        <label>Address</label>
        <AddressAutocomplete
          key={addressKey}
          onPlaceSelect={handleAddressSelect}
        />
        <small className="add-school-hint">
          Type the address and choose it from the list.
        </small>
      </div>

      {error && <div className="add-school-error">{error}</div>}

      <div className="add-school-actions">
        <Button
          onClick={() => {
            reset();
            closeModal();
          }}
        >
          Cancel
        </Button>
        <Button style={{ marginLeft: 5 }} type="primary" onClick={handleSubmit}>
          Add School
        </Button>
      </div>
    </div>
  );
}

export default AddSchool;
