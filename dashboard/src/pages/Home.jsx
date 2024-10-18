import React, { useState, useEffect } from "react";
import { useKidsContext } from "../contexts/KidsContext";
import "./Home.css";

const ProfileCard = ({ kid, onCheckInClick }) => {
  const getInitials = (name) => {
    const initials = name
      .split(" ")
      .map((word) => word[0])
      .join("");
    return initials.toUpperCase();
  };

  return (
    <div className="profile-card">
      {kid.photo ? (
        <img src={kid.photo} alt={kid.name} />
      ) : (
        <div className="initials-circle">{getInitials(kid.name)}</div>
      )}
      <p className="kid-name">{kid.name}</p>
      <p>{kid.checkedIn ? "Checked In" : "Not Checked In"}</p>
      {kid.checkedIn ? (
        <div className="check-mark">&#10004;</div>
      ) : (
        <button className="check-in-button" onClick={() => onCheckInClick(kid)}>
          Check In
        </button>
      )}
    </div>
  );
};

const Home = () => {
  const { kids, fetchKidsData, updateKidOnDb } = useKidsContext(); // Use context
  const [selectedKid, setSelectedKid] = useState(null);

  useEffect(() => {
    // Fetch kids data on mount
    console.log("Kids", kids);
    //fetchKidsData();
  });

  const openConfirmationModal = (kid) => {
    setSelectedKid(kid);
  };

  const closeConfirmationModal = () => {
    setSelectedKid(null);
  };

  const confirmCheckIn = async () => {
    if (selectedKid) {
      try {
        const currentDate = new Date().toISOString();

        // Use the updateKidOnDb method from context to update the kid's check-in status
        await updateKidOnDb(selectedKid.id, [
          { fieldName: "checkedIn", value: true },
          { fieldName: "lastCheckIn", value: currentDate },
        ]);

        // Update the local state after successful check-in
        fetchKidsData(); // Refetch the kids data to reflect changes

        closeConfirmationModal();
      } catch (error) {
        console.error("Error checking in kid:", error);
      }
    }
  };

  return (
    <div>
      <h2>Kids Check-In</h2>
      <div className="profile-cards">
        {kids.map((kid) => (
          <ProfileCard
            key={kid.id}
            kid={kid}
            onCheckInClick={openConfirmationModal}
          />
        ))}
      </div>
      {selectedKid && selectedKid.id && (
        <div className="confirmation-modal">
          <p>Are you sure you want to check in {selectedKid.name}?</p>
          <button onClick={confirmCheckIn}>Yes</button>
          <button onClick={closeConfirmationModal}>No</button>
        </div>
      )}
    </div>
  );
};

export default Home;
