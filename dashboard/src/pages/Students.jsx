import React, { useEffect, useState, useRef } from "react";
import supabase from "../lib/supabase";
import { Modal, Button, Card } from "antd";
import "./Students.css";
import StudentForm from "../pages/StudentForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faArrowRight,
  faArrowLeft,
  faStars,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import { useLocation } from "react-router-dom";
import { useKidsContext } from "../contexts/KidsContext";
import { usePicturesContext } from "../contexts/PicturesContext";
import { Storage } from "aws-amplify";
import RemoteImage from "../components/RemoteImage";

function Students({ closeMenu }) {
  const { kids, updateKidOnDb } = useKidsContext();
  const { savePhotoInBucket, deleteMediaFromBucket } = usePicturesContext();
  const [selectedStudent, setSelectedStudent] = useState(null);
  //const [currentPage, setCurrentPage] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  //const [addressFilter, setAddressFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedAge, setUpdatedAge] = useState("");
  const [updatedParent2Email, setUpdatedParent2Email] = useState("");
  const [updatedParent1Email, setUpdatedParent1Email] = useState("");
  const [updatedPhoto, setUpdatedPhoto] = useState("");
  //const studentsPerPage = 5;
  const [updatedDropOffAddress, setUpdatedDropOffAddress] = useState("");
  const [updatedLat, setUpdatedLat] = useState("");
  const [updatedLng, setUpdatedLng] = useState("");
  const updateAutoCompleteRef = useRef();
  const location = useLocation();
  const [photo, setPhoto] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  const [attendanceDays, setAttendanceDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  });

  const [selectedDays, setSelectedDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  });

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // function getDayOfWeek(index) {
  //   const daysOfWeek = [
  //     "Sunday",
  //     "Monday",
  //     "Tuesday",
  //     "Wednesday",
  //     "Thursday",
  //     "Friday",
  //     "Saturday",
  //   ];
  //   return daysOfWeek[index];
  // }

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

  const handleUpload = async (file) => {
    try {
      console.log("Uploading image to S3...");
      const filename = `kid-photo-${selectedStudent.id}-${Date.now()}`;
      console.log(filename);
      await savePhotoInBucket(filename, file);
      const updates = [{ fieldName: "photo", value: filename }];
      await updateKidOnDb(selectedStudent.id, updates);

      console.log("Image uploaded successfully.");
      const imageURL = await Storage.get(filename);
      console.log("Image URL:", imageURL);
      setUploadedImageUrl(imageURL); // Update state with uploaded image URL
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleFileChange = () => {
    fileInputRef.current.click(); // Trigger click on file input
  };

  const handleFileSelection = (event) => {
    const selectedPhoto = event.target.files[0];
    setSelectedFile(selectedPhoto);
    handleUpload(selectedPhoto);
  };

  const filteredKids = kids.filter((kid) => {
    return (
      nameFilter === "" ||
      kid.name?.toLowerCase().includes(nameFilter.toLowerCase())
    );
  });

  // const displayedKids = filteredKids.slice(startIndex, endIndex);

  // console.log("displayedKids", displayedKids);

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setMode("details");
  };

  // Use useEffect to perform actions after setSelectedStudent has completed
  useEffect(() => {
    if (selectedStudent) {
      setUpdatedName(selectedStudent.name);
      setUpdatedDropOffAddress(selectedStudent.dropOffAddress);
      setUpdatedAge(selectedStudent.birthDate);
      setUpdatedParent1Email(selectedStudent.parent1Email);
      setUpdatedParent2Email(selectedStudent.parent2Email);
      setUpdatedLat(selectedStudent.lat);
      setUpdatedLng(selectedStudent.lng);

      setUpdatedPhoto(selectedStudent.photo);
    }
  }, [selectedStudent]);

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    console.log("handle delete");
    setMode("delete");
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) {
      return;
    }

    try {
      const nameDeleted = selectedStudent.name;
      const { data, error } = await supabase
        .from("students")
        .delete()
        .eq("id", selectedStudent.id);

      if (error) throw error;

      setSelectedStudent(null);
      //await fetchKids();
      setMode("list");
      alert(`Kid - ${nameDeleted}, successful deleted! `);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) {
      return;
    }
    //console.log("kid to update", selectedStudent);
    //console.log(updatedLat);
    //console.log(updatedDropOffAddress);
    const nameUpdated = selectedStudent.name;
    try {
      const { data, error } = await supabase
        .from("students")
        .update({
          name: updatedName,
          parent1Email: updatedParent1Email,
          parent2Email: updatedParent2Email,
          dropOffAddress: updatedDropOffAddress,
          lat: updatedLat,
          lng: updatedLng,
          birthDate: updatedAge,
          photo: updatedPhoto,
        })
        .eq("id", selectedStudent.id);

      if (error) throw error;
      alert(`Kid - ${nameUpdated}, updated successfully!`);

      //await fetchKids();
      //setStudents(updatedStudents);
      setSelectedStudent(null);
      setMode("list");
      setUpdatedName("");
      setUpdatedDropOffAddress("");
      setUpdatedAge("");
      setUpdatedParent1Email("");
      setUpdatedParent2Email("");
      setUpdatedLat("");
      setUpdatedLng("");
      setUpdatedPhoto("");
    } catch (error) {
      console.error("Error updating student:", error);
    }
  };

  // Function to show modal
  const showModal = () => {
    setIsModalVisible(true);
  };

  // Function to hide modal
  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const handleStudentAdded = async () => {
    try {
      //fetchKids();
      handleCloseModal(); // Close the modal when a student is added
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleBackToList = (e) => {
    e.preventDefault();
    setSelectedStudent(null);
    setMode("list");
  };

  const handleUpdateAddressSelect = (selectedPlace) => {
    //console.log("selectd Place", selectedPlace);
    setUpdatedDropOffAddress(selectedPlace.formatted_address);
    setUpdatedLat(selectedPlace.geometry.location.lat());
    setUpdatedLng(selectedPlace.geometry.location.lng());
  };

  return (
    <div>
      <div>
        <div>
          <div
            className={`students-container ${
              closeMenu ? "menu-closed" : "menu-open"
            }`}
          >
            {mode === "list" && (
              <div>
                <h3 style={{ textAlign: "center" }}>
                  List of Students (students.jsx)
                </h3>
                <div className="filters">
                  <input
                    type="text"
                    placeholder="Filter by Name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                  {/* <input
                    type="text"
                    placeholder="Filter by Address"
                    value={addressFilter}
                    onChange={(e) => setAddressFilter(e.target.value)}
                  /> */}
                  <div className="addStudentButton">
                    {/* Button to show modal */}
                    <Button type="primary" onClick={showModal}>
                      New Student
                    </Button>
                  </div>
                </div>
                <div className="student-list">
                  {filteredKids.map((kid) => (
                    <div className="student-details-container" key={kid.id}>
                      <RemoteImage
                        path={kid.photo}
                        name={kid.name}
                        bucketName="profilePhotos"
                        className="student-photo"
                      />
                      <div className="student-details">
                        <div className="student-name">{kid.name}</div>
                        <div className="student-address">
                          {kid.dropOffAddress?.addressLine1}
                          {kid.dropOffAddress?.city}
                        </div>
                        <div className="studentSchedule">
                          <h4>Attendance</h4>
                          <div className="attendance-icons">
                            <div className="days-of-week">
                              <span>Mon</span>
                              <span>Tue</span>
                              <span>Wed</span>
                              <span>Thu</span>
                              <span>Fri</span>
                            </div>
                            <div className="stars">
                              {[
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                              ].map((day) => (
                                <FontAwesomeIcon
                                  key={day}
                                  icon={faStar}
                                  style={{
                                    color:
                                      kid.students_schedule &&
                                      kid.students_schedule?.[day.toLowerCase()]
                                        ? "green"
                                        : "gray",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="student-details-btn">
                        <button
                          className="btn-student btn-student-edit"
                          onClick={() => handleStudentClick(kid)}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          className="btn-student btn-student-delete"
                          onClick={() => {
                            handleDeleteClick(kid);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* <div className="pagination">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="btn-student"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} beat />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={endIndex >= filteredKids.length}
                    className="btn-student"
                  >
                    <FontAwesomeIcon icon={faArrowRight} beat />
                  </button>
                </div> */}
              </div>
            )}
            {mode === "details" && selectedStudent && (
              <div className="update-student-container">
                <h2>Update Student (students.jsx)</h2>
                <div className="update-student">
                  <h4>{selectedStudent.name}</h4>
                  <Card>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileSelection}
                    />
                    <div className="photo-container" onClick={handleFileChange}>
                      <img
                        src={uploadedImageUrl || selectedStudent.uriKid}
                        className="student-photo"
                        alt="pic"
                      />
                      <div className="photo-overlay">
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </div>
                    </div>
                    {/* <div
                      className="photo-container"
                      onClick={() => handleFileChange()}
                    >
                      <img
                        src={selectedStudent.uriKid}
                        className="student-photo"
                        alt="pic"
                      />
                      <div className="photo-overlay">
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </div>
                    </div> */}
                    <label>Name:</label>
                    <input
                      type="text"
                      value={updatedName}
                      onChange={(e) => setUpdatedName(e.target.value)}
                    />
                    <label>Photo:</label>
                    <input
                      type="text"
                      value={updatedPhoto}
                      onChange={(e) => setUpdatedPhoto(e.target.value)}
                    />
                    <label>Address:</label>
                    <GoogleMapsAutocomplete
                      onPlaceSelect={handleUpdateAddressSelect}
                      ref={updateAutoCompleteRef}
                      defaultValue={updatedDropOffAddress}
                    />
                    {/* <input
                      type="text"
                      value={updatedAddress}
                      onChange={(e) => setUpdatedAddress(e.target.value)}
                    /> */}
                    <label>Age:</label>
                    <input
                      type="text"
                      value={updatedAge}
                      onChange={(e) => setUpdatedAge(e.target.value)}
                    />
                    <label>Parent 1 Email:</label>
                    <input
                      type="text"
                      value={updatedParent1Email || ""}
                      onChange={(e) => setUpdatedParent1Email(e.target.value)}
                    />
                    <label>Parent 2 Email:</label>
                    <input
                      type="text"
                      value={updatedParent2Email || ""}
                      onChange={(e) => setUpdatedParent2Email(e.target.value)}
                    />
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
                              attendanceDays[day]
                                ? "star-active"
                                : "star-inactive"
                            }
                            onClick={() => handleAttendanceToggle(day)}
                          />
                        ))}
                      </div>
                    </div>
                    {/* <div className="form-item">
                      <label>Photo:</label>
                      <input
                        type="file"
                        accept="image/jpeg, image/png"
                        onChange={handlePhotoChange}
                      />
                    </div> */}
                    <button
                      onClick={handleUpdateStudent}
                      className="btn-student"
                    >
                      Update Student
                    </button>
                    <button onClick={handleBackToList} className="btn-student">
                      Back to List
                    </button>
                  </Card>
                </div>
              </div>
            )}
            {mode === "delete" && selectedStudent && (
              <div className="delete-student-container">
                <h2>Delete Student</h2>
                <div className="delete-student">
                  <h4>{selectedStudent.name}</h4>
                  <p>Are you sure you want to delete this student?</p>
                  <button onClick={handleDeleteStudent} className="btn-student">
                    Yes
                  </button>
                  <button
                    onClick={() => setMode("list")}
                    className="btn-student"
                  >
                    No
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal for adding student */}
          <Modal
            title="Add a New Student"
            open={isModalVisible}
            onCancel={handleCloseModal}
            footer={null}
            width={800} // Set a base width for larger screens
            className="custom-modal"
            maskClosable={false}
          >
            <StudentForm onStudentAdded={handleStudentAdded} />
          </Modal>
          {/* <div className="right-container">
            <StudentForm onStudentAdded={handleStudentAdded} />
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default Students;
