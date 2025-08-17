import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./VanDetailPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocation } from "@fortawesome/free-solid-svg-icons";

function VanDetailPage() {
  const { vanId } = useParams();
  const [van, setVan] = useState(null);
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    const fetchVanDetails = async () => {
      try {
        const response = await axios.get(
          `https://drop-off-app-dere.onrender.com/api/vans/${vanId}`
        );
        if (response.status === 200) {
          setVan(response.data.van);
        } else {
          console.error("Failed to fetch van details");
        }
      } catch (error) {
        console.error("Error fetching van details:", error);
      }
    };

    fetchVanDetails();
  }, [vanId]);
  useEffect(() => {
    const fetchStudents = async () => {
      const response = await fetch(
        "https://drop-off-app-dere.onrender.com/api/students"
      );
      const json = await response.json();

      if (response.ok) {
        setStudents(json.students);
      }
    };
    fetchStudents();
  }, []);
  useEffect(() => {
    const fetchEmployees = async () => {
      const response = await fetch(
        "https://drop-off-app-dere.onrender.com/api/employes"
      );
      const json = await response.json();

      if (response.ok) {
        setEmployees(json.employes);
      }
    };
    fetchEmployees();
  }, []);

  if (!van) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Van Details</h2>
      <p>Name: {van.model}</p>
      <div className="van-details">
        <ul className="van-detail-employees">
          {van.employes?.map((employeeId) => {
            const employee = employees.find((s) => s._id === employeeId);
            if (!employee) {
              return null;
            }
            return (
              <li key={employee._id} className="van-detail-employee">
                <img src={employee.photo} alt="" />
                <div className="van-employee-detail">
                  <div>{employee.name}</div>
                  <div>{employee.role}</div>
                </div>
              </li>
            );
          })}
        </ul>
        <h4>Students:</h4>
        <ul className="van-detail-students">
          {van.students?.map((studentId) => {
            const student = students.find((s) => s._id === studentId);
            if (!student) {
              return null;
            }
            return (
              <li key={student._id} className="van-detail-student">
                <img src={student.photo} alt="" />
                <div className="van-student-detail">
                  <div className="detail-student-name">{student.name}</div>
                  <div className="detail-student-address">
                    {student.address}
                    <Link
                      to={`https://www.google.com/maps/place/${encodeURIComponent(
                        student.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button className="address-icon">
                        <FontAwesomeIcon
                          icon={faMapLocation}
                          className="address-icon"
                        />
                      </button>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default VanDetailPage;
