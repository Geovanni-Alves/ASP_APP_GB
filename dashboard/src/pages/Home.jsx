import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { listKids } from "../graphql/queries";
import { updateKid } from "../graphql/mutations";
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
  const [kids, setKids] = useState([]);
  const [selectedKid, setSelectedKid] = useState(null);
  useEffect(() => {
    const fetchKids = async () => {
      try {
        const result = await API.graphql(graphqlOperation(listKids));
        setKids(result.data.listKids.items);
      } catch (error) {
        console.error("Error fetching kids:", error);
      }
    };

    const updateCheckInStatus = async () => {
      try {
        const currentDate = new Date();
        const twelveHoursAgo = new Date(currentDate - 12 * 60 * 60 * 1000);
        const result = await API.graphql(graphqlOperation(listKids));
        const currentKids = result.data.listKids.items;
        setKids((prevKids) =>
          prevKids.map((kid) =>
            kid.checkedIn && new Date(kid.lastCheckIn) < twelveHoursAgo
              ? { ...kid, checkedIn: false }
              : kid
          )
        );
      } catch (error) {
        console.error("Error updating check-in status:", error);
      }
    };
    fetchKids();
    updateCheckInStatus();
    const updateCheckInStatusTimer = setInterval(() => {
      updateCheckInStatus();
    }, 12 * 60 * 60 * 1000);
    return () => clearInterval(updateCheckInStatusTimer);
  }, []);

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

        const updateResult = await API.graphql(
          graphqlOperation(updateKid, {
            input: {
              id: selectedKid.id,
              checkedIn: true,
              lastCheckIn: currentDate,
            },
          })
        );

        console.log("Kid checked in:", updateResult);

        setKids((prevKids) =>
          prevKids.map((kid) =>
            kid.id === selectedKid.id
              ? { ...kid, checkedIn: true, lastCheckIn: currentDate }
              : kid
          )
        );

        closeConfirmationModal();
      } catch (error) {
        console.error("Error checking in kid:", error);
      }
    }
  };

  const checkInKid = (kidId, kidName) => {
    openConfirmationModal({ id: kidId, name: kidName });
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
