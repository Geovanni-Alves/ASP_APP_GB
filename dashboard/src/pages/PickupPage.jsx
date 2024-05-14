import React, { useState } from "react";
import { Card, Button } from "antd";
import "./PickupPage.scss";

const PickupPage = () => {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const kids = [
    "Emma",
    "Bob",
    "Charlie",
    "David",
    "Eve",
    "Charlie",
    "Noah",
    "Jaxson",
    "Kaia",
    "Lucas",
    "Roger",
  ];
  const [attendance, setAttendance] = useState({});

  const toggleAttendance = (kid, day) => {
    const updatedAttendance = { ...attendance };
    const currentStatus = updatedAttendance[kid]?.[day] || "N";
    let newStatus;
    switch (currentStatus) {
      case "N":
        newStatus = "P";
        break;
      case "P":
        newStatus = "A";
        break;
      case "A":
        newStatus = "N";
        break;
      default:
        newStatus = "N";
    }
    updatedAttendance[kid] = { ...updatedAttendance[kid], [day]: newStatus };
    setAttendance(updatedAttendance);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "A":
        return { backgroundColor: "red", color: "white" };
      case "P":
        return { backgroundColor: "green", color: "white" };
      case "N":
      default:
        return { backgroundColor: "blue", color: "white" };
    }
  };

  return (
    <div className="pickupContainer">
      <Card className="scheduleCard">
        <h1>Pickup Schedule</h1>
        <p>Manage the pickup schedule for the kids:</p>
        <div className="tableWrapper">
          <table>
            <thead>
              <tr>
                <th></th>
                {daysOfWeek.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kids.map((kid) => (
                <tr key={kid}>
                  <td>{kid}</td>
                  {daysOfWeek.map((day) => (
                    <td key={day}>
                      <Button
                        style={getStatusColor(attendance[kid]?.[day])}
                        onClick={() => toggleAttendance(kid, day)}
                      >
                        {attendance[kid]?.[day] || "N"}
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PickupPage;
