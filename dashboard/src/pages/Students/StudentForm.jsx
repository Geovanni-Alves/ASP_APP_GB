import React, { useState } from "react";
import api from "../../lib/api";
import { Card, Button, Modal } from "antd";
import AddSchool from "../../components/AddSchool/AddSchool";
import { usePicturesContext } from "../../contexts/PicturesContext";
import "./StudentForm.css";

function StudentForm({ onStudentAdded }) {
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState(null);
  const [schoolList, setSchoolList] = useState([]);
  const [birthDate, setBirthDate] = useState("");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [isAddSchoolModalVisible, setIsAddSchoolModalVisible] = useState(false);
  const { savePhotoInBucket } = usePicturesContext();

  // Attendance State
  const [attendanceDays, setAttendanceDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
  });

  const toggleDay = (day) => {
    setAttendanceDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  // Fetch schools
  const fetchSchools = async () => {
    try {
      const { data } = await api.get("/schools", {
        params: { select: "id,name", order: "name" },
      });
      setSchoolList(data);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  React.useEffect(() => {
    fetchSchools();
  }, []);

  const handleSubmit = async () => {
    if (!name || !schoolId) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      // 1) Upload the photo first (if any): the server returns the stored file name
      const photoPath = photo
        ? await savePhotoInBucket(photo, "profilePhotos")
        : null;

      // 2) Create the student; the API answers with the new row (including its id)
      const { data: student } = await api.post("/students", {
        name,
        schoolId,
        birthDate: birthDate || null,
        photo: photoPath,
        status: "Active",
      });

      // 3) Create the weekly schedule of that student
      await api.post("/students_schedule", {
        studentId: student.id,
        ...attendanceDays,
      });

      alert("Student saved successfully!");
      onStudentAdded();
    } catch (error) {
      console.error("Error saving student:", error);
      setError("Failed to save student. Please try again.");
    }
  };

  const handlePhotoChange = (e) => {
    const selectedPhoto = e.target.files[0];
    if (selectedPhoto) {
      setPhoto(selectedPhoto);
    }
  };

  return (
    <Card className="create">
      <div className="form-container">
        <div className="form-item">
          <label>
            Name: <span className="required">*</span>
          </label>
          <input
            type="text"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>

        <div className="form-item">
          <label>
            School: <span className="required">*</span>
          </label>
          <select
            onChange={(e) => setSchoolId(e.target.value)}
            value={schoolId || ""}
          >
            <option value="">Select a school</option>
            {schoolList.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setIsAddSchoolModalVisible(true)}>
            Add School
          </Button>
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
          <label>Photo:</label>
          <input
            type="file"
            accept="image/jpeg, image/png"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="form-item">
          <label>Attendance Days:</label>
          <div className="attendance-row-horizontal">
            {["monday", "tuesday", "wednesday", "thursday", "friday"].map(
              (day) => (
                <div className="attendance-day" key={day}>
                  <div className="day-label">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </div>
                  <input
                    type="checkbox"
                    checked={attendanceDays[day]}
                    onChange={() => toggleDay(day)}
                  />
                </div>
              ),
            )}
          </div>
        </div>

        <button className="create-btn" onClick={handleSubmit}>
          Add Student
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      {/* Add School Modal */}
      <Modal
        title="Add New School"
        open={isAddSchoolModalVisible}
        onCancel={() => setIsAddSchoolModalVisible(false)}
        footer={null}
        maskClosable={false} // Prevents closing by clicking outside
        getPopupContainer={(trigger) => trigger.parentNode} // Ensures proper rendering inside the modal
      >
        <AddSchool
          onSchoolAdded={() => {
            fetchSchools();
            setIsAddSchoolModalVisible(false);
          }}
          closeModal={() => setIsAddSchoolModalVisible(false)}
        />
      </Modal>
    </Card>
  );
}

export default StudentForm;
