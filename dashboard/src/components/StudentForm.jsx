import React, { useState, useRef } from "react";
import { API } from "aws-amplify";
import { createKid, updateKid } from "../graphql/mutations";
import GoogleMapsAutocomplete from "./GoogleMapsAutocomplete";
import { Card } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { usePicturesContext } from "../contexts/PicturesContext";

function StudentForm({ onStudentAdded }) {
  const [name, setName] = useState("");
  const [parent1Email, setParent1Email] = useState("");
  const [parent2Email, setParent2Email] = useState("");
  const [dropOffAddress, setDropOffAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [attendanceDays, setAttendanceDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  });
  const [photo, setPhoto] = useState(null); // Updated state for the photo
  const [error, setError] = useState("");
  const autocompleteRef = useRef();
  const { savePhotoInBucket } = usePicturesContext();

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation checks
    if (
      !name ||
      !(parent1Email || parent2Email) ||
      !dropOffAddress ||
      lat === "" ||
      lng === "" ||
      !birthDate
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    try {
      const newKidDetails = {
        name,
        parent1Email,
        parent2Email,
        dropOffAddress,
        lat,
        lng,
        birthDate,
        //attendanceDays,
        //photo: uploadedPhotoName, // Use the uploaded photo name
      };
      const {
        data: {
          createKid: { id: kidId },
        },
      } = await API.graphql({
        query: createKid,
        variables: { input: newKidDetails },
      });

      let uploadedPhotoName = null;
      if (photo) {
        uploadedPhotoName = await savePhotoInBucket(
          `kid-photo-${kidId}-${Date.now()}`,
          photo
        );
      }
      // Update the kid with the photo
      const updatedKidDetails = {
        id: kidId,
        photo: uploadedPhotoName,
      };
      await API.graphql({
        query: updateKid, // Assuming you have an updateKid mutation defined
        variables: { input: updatedKidDetails },
      });

      setName("");
      setParent1Email("");
      setParent2Email("");
      setDropOffAddress("");
      if (autocompleteRef.current) {
        autocompleteRef.current.resetAutocompleteInput();
      }
      setLat("");
      setLng("");
      setBirthDate("");
      setAttendanceDays({
        Monday: false,
        Tuesday: false,
        Wednesday: false,
        Thursday: false,
        Friday: false,
      });
      setPhoto(null);
      setError("");
      onStudentAdded();
    } catch (error) {
      console.error("Error adding Kid", error);
      setError("Failed to add Kid.");
    }
  };

  const handleAddressSelect = (selectedPlace) => {
    setDropOffAddress(selectedPlace.formatted_address);
    setLat(selectedPlace.geometry.location.lat());
    setLng(selectedPlace.geometry.location.lng());
  };

  const handleAttendanceToggle = (day) => {
    setAttendanceDays((prevDays) => ({
      ...prevDays,
      [day]: !prevDays[day],
    }));
  };

  // Function to handle photo upload
  const handlePhotoChange = (e) => {
    const selectedPhoto = e.target.files[0];
    setPhoto(selectedPhoto);
  };

  return (
    <Card className="create">
      <h3>Add a New Kid (StudentForm.jsx)</h3>
      <div className="form-container">
        <div className="form-item">
          <label>Kid Name:</label>
          <input
            type="text"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>
        <div className="form-item">
          <label>Parent 1 Email:</label>
          <input
            type="email"
            onChange={(e) => setParent1Email(e.target.value)}
            value={parent1Email}
          />
        </div>
        <div className="form-item">
          <label>Parent 2 Email:</label>
          <input
            type="email"
            onChange={(e) => setParent2Email(e.target.value)}
            value={parent2Email}
          />
        </div>
        <div className="form-item">
          <label>Drop-Off Address:</label>
          <GoogleMapsAutocomplete
            onPlaceSelect={handleAddressSelect}
            ref={autocompleteRef}
          />
        </div>
        <div className="form-item">
          <label>Birth Date:</label>
          <input
            type="date"
            onChange={(e) => setBirthDate(e.target.value)}
            value={birthDate}
          />
        </div>
        <div className="form-item">
          <label>Attendance Days:</label>
          <div className="days-of-week">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
          </div>
          <div className="attendance-options">
            {daysOfWeek.map((day) => (
              <FontAwesomeIcon
                key={day}
                icon={faStar}
                className={
                  attendanceDays[day] ? "star-active" : "star-inactive"
                }
                onClick={() => handleAttendanceToggle(day)}
              />
            ))}
          </div>
        </div>
        <div className="form-item">
          <label>Photo:</label>
          <input
            type="file"
            accept="image/jpeg, image/png"
            onChange={handlePhotoChange}
          />
        </div>
        <button className="create-btn" onClick={handleSubmit}>
          Add Kid
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    </Card>
  );
}

export default StudentForm;
