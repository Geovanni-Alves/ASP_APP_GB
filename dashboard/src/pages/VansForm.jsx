import React, { useState, useRef } from "react";
import { API } from "aws-amplify";
import { createVan } from "../graphql/mutations";
import "./StudentForm.css";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import { Card } from "antd";

function VansForm({ onVanAdded }) {
  const [vanName, setVanName] = useState("");
  const [vanPicture, setVanPicture] = useState("");
  const [vanPlate, setVanPlate] = useState("");
  const [vanModel, setVanModel] = useState("");
  const [vanYear, setVanYear] = useState("");
  const [vanSeats, setVanSeats] = useState("");
  const [vanBosterSeats, setVanBosterSeats] = useState("");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState("");

  // const [name, setName] = useState("");
  // const [parent1Email, setParent1Email] = useState("");
  // const [parent2Email, setParent2Email] = useState("");
  // const [dropOffAddress, setDropOffAddress] = useState("");
  // const [lat, setLat] = useState("");
  // const [lng, setLng] = useState("");
  // const [birthDate, setBirthDate] = useState("");
  // const autocompleteRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation checks
    if (!vanName || !vanPlate || !vanModel || !vanYear || !vanSeats) {
      // If any required field is blank, show an error message and return early
      setError("Please fill in all required fields.");
      alert("Please fill in all required fields.");
      return;
    }
    try {
      // Create a new Van object
      const newVanDetails = {
        name: vanName,
        image: vanPicture,
        plate: vanPlate,
        model: vanModel,
        year: vanYear,
        seats: vanSeats,
        bosterSeats: vanBosterSeats,
      };
      const newVan = await API.graphql({
        query: createVan,
        variables: { input: newVanDetails },
      });
      // Reset form fields and clear errors on success
      setVanName("");
      setVanPicture("");
      setVanPlate("");
      setVanModel("");
      setVanYear("");
      setVanSeats("");
      setVanBosterSeats("");
      // Clear the photo state
      setError(null);
      //console.log("New Kid added", newKid);
      alert("New Van added!");
      onVanAdded();
    } catch (error) {
      console.error("Error adding Van", error);
      setError("Failed to add Van.");
      alert("Failed to add Van.");
    }
  };

  const handlePhotoChange = (e) => {
    // Handle photo upload or selection here and update the 'photo' state // For example, you can use FileReader to read the selected file and set it in the state.
    const selectedPhoto = e.target.files[0];
    setPhoto(selectedPhoto);
  };

  return (
    <Card className="create">
      {" "}
      <h3>Add a new Van </h3>{" "}
      <div className="form-container">
        {" "}
        <div className="form-item">
          {" "}
          <label>Van Name:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanName(e.target.value)}
            value={vanName}
          />{" "}
        </div>{" "}
        <div className="form-item">
          {" "}
          <label>Picture:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanPicture(e.target.value)}
            value={vanPicture}
          />{" "}
        </div>{" "}
        <div className="form-item">
          {" "}
          <label>Plate:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanPlate(e.target.value)}
            value={vanPlate}
          />{" "}
        </div>{" "}
        <div className="form-item">
          {" "}
          <label>Model:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanModel(e.target.value)}
            value={vanModel}
          />{" "}
        </div>{" "}
        <div className="form-item">
          {" "}
          <label>Year:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanYear(e.target.value)}
            value={vanYear}
          />{" "}
        </div>{" "}
        <div className="form-item">
          {" "}
          <label>Seats:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanSeats(e.target.value)}
            value={vanSeats}
          />{" "}
        </div>{" "}
        <div className="form-item">
          {" "}
          <label>Booster Seats:</label>{" "}
          <input
            type="text"
            onChange={(e) => setVanBosterSeats(e.target.value)}
            value={vanBosterSeats}
          />{" "}
        </div>{" "}
        <button className="create-btn" onClick={handleSubmit}>
          Add Van
        </button>{" "}
        {error && <div className="error">{error}</div>}{" "}
      </div>{" "}
    </Card>
  );
}
export default VansForm;
