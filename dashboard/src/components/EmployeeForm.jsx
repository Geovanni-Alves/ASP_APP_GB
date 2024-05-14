import React, { useState } from "react";
import { Auth } from "aws-amplify";
import "./EmployeeForm.css";

function EmployeeForm({ onEmployeeAdded }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const handleEmailSignup = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter an email address.");
      return;
    }

    try {
      // Sign up the user with email
      await Auth.signUp({
        username: email,
        password: generatePassword(), // You should implement a password generation function
        attributes: {
          email,
        },
      });

      // Redirect to confirmation page or show a confirmation message
      alert("Please check your email for confirmation.");
    } catch (error) {
      console.error("Error signing up", error);
      setError("Error signing up. Please try again.");
    }
  };

  const generatePassword = () => {
    // Implement a password generation logic or use a library
    // For simplicity, you can create a random password
    return Math.random().toString(36).slice(-8);
  };

  return (
    <form className="create" onSubmit={handleEmailSignup}>
      <h3>Sign Up with Email</h3>
      <div className="form-container">
        <div className="form-item">
          <label>Email:</label>
          <input
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <button className="create-btn">Sign Up</button>
        {error && <div className="error">{error}</div>}
      </div>
    </form>
  );
}

export default EmployeeForm;
