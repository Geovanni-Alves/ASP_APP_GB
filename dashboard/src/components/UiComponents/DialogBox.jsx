import React from "react";
import "./DialogBox.css"; // Add this CSS file for styling

const DialogBox = ({
  isVisible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  children, // This allows passing custom content (optional)
}) => {
  if (!isVisible) return null;

  return (
    <div className="dialogOverlay">
      <div className="dialogContainer">
        <div className="dialogHeader">
          <h2>{title}</h2>
        </div>
        <div className="dialogBody">
          {message && <p>{message}</p>}
          {children} {/* Custom content will appear here */}
        </div>
        <div className="dialogFooter">
          <button className="confirmButton" onClick={onConfirm}>
            {confirmText}
          </button>
          <button className="cancelButton" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogBox;
