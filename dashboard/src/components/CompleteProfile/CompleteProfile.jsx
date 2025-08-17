import React, { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuthContext } from "../../contexts/AuthContext";
import "./CompleteProfile.css";

const CompleteProfile = ({ email, onCreateUser }) => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  // const [address, setAddress] = useState("");
  const { logout } = useAuthContext(); // Get the logout function from the auth context

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phoneNumber) {
      alert("Name and phone number are mandatory!");
      return;
    }
    await onCreateUser({ name, phoneNumber });
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    // Capitalize the first letter of each word
    const capitalizedValue = value
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    setName(capitalizedValue);
  };

  return (
    <div className="complete-profile-container">
      <div className="complete-profile-card">
        <h1 className="complete-profile-title">
          Complete Your Profile To Proceed
        </h1>
        <form onSubmit={handleSubmit} className="complete-profile-form">
          <div className="form-group">
            <label className="form-label">Email:</label>
            <input type="email" value={email} disabled className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">
              Full Name: <span className="required">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Phone Number: <span className="required">*</span>
            </label>
            {/* <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="form-input"
              required
            /> */}
            <PhoneInput
              international
              defaultCountry="CA" // Set a default country
              value={phoneNumber}
              onChange={setPhoneNumber} // Update the phone number state
              className="phone-input"
            />
          </div>
          {/* <div className="form-group">
            <label className="form-label">Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-input"
            />
          </div> */}

          <button type="button" onClick={logout} className="logout-button">
            Logout
          </button>

          <button type="submit" className="submit-button">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
