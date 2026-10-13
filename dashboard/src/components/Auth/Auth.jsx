import React, { useEffect, useState } from "react";
import "./Auth.css";

const MIN_PASSWORD_LENGTH = 8; // the same rule as the API

// "onLogin" and "onAcceptInvite" are provided by AuthContext:
// POST /auth/login, and POST /auth/accept-invite (the person sets a password with the emailed code).
const Auth = ({ onLogin, onAcceptInvite }) => {
  const [mode, setMode] = useState("login"); // "login" | "invite"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // An invite link (#invite=CODE&email=EMAIL) opens the activation form with the data already
  // filled in. The data is in the "#" part of the address, which browsers never send to a server.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const inviteCode = params.get("invite");
    const inviteEmail = params.get("email");
    if (inviteCode && inviteEmail) {
      setMode("invite");
      setCode(inviteCode);
      setEmail(inviteEmail);
      // Remove the data from the address bar (history, screenshots...)
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setCode("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const user = await onLogin(email, password);
      console.log("Logged in:", user);
    } catch (error) {
      const reason = error.response?.data?.code;
      if (!error.response) {
        // No response at all: the API is down or the address in .env is wrong
        setError("Cannot reach the server. Please try again later.");
      } else if (reason === "app_not_allowed") {
        // Staff and drivers use the staff app; only administrators use the dashboard
        setError(
          "This account cannot use the dashboard. Staff and drivers use the Staff app.",
        );
      } else if (reason === "account_disabled") {
        setError(
          "This account has been disabled. Please contact the administrator.",
        );
      } else {
        setError("Login failed. Please check your credentials.");
      }
      console.error("Error during login:", error);
    }
  };

  // First access: the person types the code from the invite email and chooses a password
  const handleAcceptInvite = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `The password must have at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await onAcceptInvite(email.trim(), code.trim(), password);
    } catch (error) {
      if (!error.response) {
        setError("Cannot reach the server. Please try again later.");
      } else if (error.response.data?.code === "app_not_allowed") {
        // The code was right and is NOT used up: it works in the Staff app
        setError(
          "This account must be activated in the Staff app. The dashboard is only for administrators.",
        );
      } else {
        setError(
          "This invite code is invalid or has expired. Ask the administrator to send a new invite.",
        );
      }
      console.error("Error accepting the invite:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {mode === "login" ? (
        <>
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Login</button>
            {error && <p className="error-message">{error}</p>}
          </form>
          <button
            type="button"
            className="auth-link"
            onClick={() => switchMode("invite")}
          >
            I have an invite
          </button>
        </>
      ) : (
        <>
          <h2>Activate your account</h2>
          <form onSubmit={handleAcceptInvite}>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Invite code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="XXXX-XXXX"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label>Choose a password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label>Repeat the password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : "Activate account"}
            </button>
            {error && <p className="error-message">{error}</p>}
          </form>
          <button
            type="button"
            className="auth-link"
            onClick={() => switchMode("login")}
          >
            Back to login
          </button>
        </>
      )}
    </div>
  );
};

export default Auth;
