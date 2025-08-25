import React, { useEffect, useState, useRef } from "react";
import supabase from "../../lib/supabase";
import { Modal, Button, Card } from "antd";
import "./Students.css";
import StudentForm from "./StudentForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
// import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import { redirect, useLocation } from "react-router-dom";
import { useKidsContext } from "../../contexts/KidsContext";
import { usePicturesContext } from "../../contexts/PicturesContext";
// import { Storage } from "aws-amplify";
import RemoteImage from "../../components/RemoteImage/RemoteImage";
import ContactModal from "../Contacts/ContactModal";
import AddressModal from "../AddressModal/AddressModal";

function Students({ closeMenu }) {
  const { kids, updateKidOnDb, fetchKidsData } = useKidsContext();
  const { savePhotoInBucket, deleteMediaFromBucket } = usePicturesContext();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [updatedName, setUpdatedName] = useState("");
  const [updatedAge, setUpdatedAge] = useState("");
  // const [updatedParent2Email, setUpdatedParent2Email] = useState("");
  // const [updatedParent1Email, setUpdatedParent1Email] = useState("");
  const [updatedPhoto, setUpdatedPhoto] = useState("");
  const [updatedDropOffAddress, setUpdatedDropOffAddress] = useState("");
  const [updatedLat, setUpdatedLat] = useState("");
  const [updatedLng, setUpdatedLng] = useState("");
  const updateAutoCompleteRef = useRef();
  const location = useLocation();
  const [photo, setPhoto] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null);
  const [notes, setNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicine, setMedicine] = useState("");
  const [doctor, setDoctor] = useState("");
  const [status, setStatus] = useState("Active");
  const [schoolName, setSchoolName] = useState("");
  const [dismissalTime, setDismissalTime] = useState("");
  const [schoolGrade, setSchoolGrade] = useState("");
  const [schoolGradeDivision, setSchoolGradeDivision] = useState("");
  const [dropOffMode, setDropOffMode] = useState("dropOff");
  const [addresses, setAddresses] = useState([]);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const [schoolExitPhotos, setSchoolExitPhotos] = useState([
    { index: 0, path: "" },
    { index: 1, path: "" },
    { index: 2, path: "" },
  ]);
  const [schoolTeacherName, setSchoolTeacherName] = useState("");
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [allSchools, setAllSchools] = useState([]);
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const [statusChanged, setStatusChanged] = useState(false);

  const [attendanceDays, setAttendanceDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  });

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const formatTimeTo12Hour = (time) => {
    if (!time) return "-";
    const [hourStr, minute] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const handleAttendanceToggle = (day) => {
    setAttendanceDays((prev) => {
      const updated = { ...prev, [day]: !prev[day] };
      setScheduleChanged(true);
      return updated;
    });
  };

  const handleSaveAddress = async (addressData) => {
    try {
      const payload = {
        ...addressData,
        studentId: selectedStudent.id,
      };

      const { data: existingAddresses, error: fetchError } = await supabase
        .from("students_address")
        .select("id, isDefault")
        .eq("studentId", selectedStudent.id);

      if (fetchError) throw fetchError;

      let isFirst = existingAddresses.length === 0;
      let makeDefault = false;

      if (isFirst) {
        payload.isDefault = true;
      } else {
        const wantsDefault = window.confirm(
          "Do you want to make this address the default?"
        );
        makeDefault = wantsDefault;
        payload.isDefault = wantsDefault;
      }

      // INSERT or UPDATE
      let newAddressId = null;
      if (editingAddress) {
        const { data, error } = await supabase
          .from("students_address")
          .update(payload)
          .eq("id", editingAddress.id)
          .select("id");

        if (error) throw error;
        newAddressId = data?.[0]?.id;
      } else {
        const { data, error } = await supabase
          .from("students_address")
          .insert([payload])
          .select("id");

        if (error) throw error;
        newAddressId = data?.[0]?.id;
      }

      // If this address should be default:
      if (payload.isDefault && newAddressId) {
        // Step 1: unset other defaults
        await supabase
          .from("students_address")
          .update({ isDefault: false })
          .eq("studentId", selectedStudent.id)
          .neq("id", newAddressId);

        // Step 2: update student
        await supabase
          .from("students")
          .update({ currentDropOffAddress: newAddressId })
          .eq("id", selectedStudent.id);
      }

      // Refresh state
      const { data: refreshed } = await supabase
        .from("students_address")
        .select("*")
        .eq("studentId", selectedStudent.id);

      setAddresses(refreshed || []);
      setEditingAddress(null);
      setIsAddressModalVisible(false);
    } catch (error) {
      console.error("Error saving address:", error);
      alert("Failed to save address.");
    }
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

  // const handleFileChange = () => {
  //   fileInputRef.current.click(); // Trigger click on file input
  // };

  // const handleFileSelection = (event) => {
  //   const selectedPhoto = event.target.files[0];
  //   setSelectedFile(selectedPhoto);
  //   handleUpload(selectedPhoto);
  // };

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

  const fetchContacts = async (studentId) => {
    try {
      const { data: all, error: allErr } = await supabase
        .from("contacts")
        .select("*");
      if (allErr) throw allErr;
      setAllContacts(all);

      const { data: familyRows, error } = await supabase
        .from("student_family")
        .select("contact:contacts (*)") // renomeia a coluna embedada
        .eq("student_id", studentId);

      if (error) throw error;
      const linkedContacts = familyRows.map((row) => row.contact);
      setContacts(linkedContacts);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setAllContacts([]);
      setContacts([]);
    }
  };

  const fetchAddresses = async (studentId) => {
    const { data, error } = await supabase
      .from("students_address")
      .select("*")
      .eq("studentId", studentId);
    if (!error) setAddresses(data || []);
  };

  const fetchSchedule = async (studentId) => {
    const { data, error } = await supabase
      .from("students_schedule")
      .select("monday, tuesday, wednesday, thursday, friday")
      .eq("studentId", studentId)
      .single();

    if (!error && data) {
      setAttendanceDays({
        Monday: data.monday,
        Tuesday: data.tuesday,
        Wednesday: data.wednesday,
        Thursday: data.thursday,
        Friday: data.friday,
      });
    }
  };

  const fetchSchools = async () => {
    const { data, error } = await supabase.from("schools").select("*");
    if (!error) setAllSchools(data);
  };

  useEffect(() => {
    const fetchAllStudentData = async () => {
      await fetchSchools();

      if (!selectedStudent) return;

      await Promise.all([
        fetchContacts(selectedStudent.id),
        fetchAddresses(selectedStudent.id),
        fetchSchedule(selectedStudent.id),
      ]);

      // Set all other fields from selectedStudent
      setUpdatedName(selectedStudent.name);
      setUpdatedDropOffAddress(selectedStudent.dropOffAddress);
      setUpdatedAge(selectedStudent.birthDate);
      // setUpdatedParent1Email(selectedStudent.parent1Email);
      // setUpdatedParent2Email(selectedStudent.parent2Email);
      setUpdatedLat(selectedStudent.lat);
      setUpdatedLng(selectedStudent.lng);
      setNotes(selectedStudent.notes || "");
      setAllergies(selectedStudent.allergies || "");
      setMedicine(selectedStudent.medicine || "");
      setDoctor(selectedStudent.doctor || "");
      setStatus(selectedStudent.status || "Active");
      setSchoolName(selectedStudent.schoolName || "");
      setDismissalTime(selectedStudent.dismissalTime?.slice(0, 5));
      setSchoolGrade(selectedStudent.schoolGrade || "");
      setSchoolGradeDivision(selectedStudent.schoolGradeDivision || "");
      setSchoolTeacherName(selectedStudent.schoolTeacherName || "");
      setSelectedSchool(selectedStudent.schools);
      setUpdatedPhoto(selectedStudent.photo);

      if (selectedStudent.schoolExitPhotos) {
        try {
          const parsedPhotos = Array.isArray(selectedStudent.schoolExitPhotos)
            ? selectedStudent.schoolExitPhotos
            : JSON.parse(selectedStudent.schoolExitPhotos);
          setSchoolExitPhotos(parsedPhotos);
        } catch (e) {
          console.error("Error parsing schoolExitPhotos", e);
          setSchoolExitPhotos([]);
        }
      } else {
        setSchoolExitPhotos([]);
      }
    };

    fetchAllStudentData();
  }, [selectedStudent]);

  const handleInviteContact = async (contactId, contact) => {
    try {
      if (!contact.email) {
        alert("This contact does not have an email.");
        return;
      }

      // 1. Send invite to backend
      const response = await fetch("http://localhost:3001/api/invite-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
        }),
      });

      const result = await response.json();
      console.log("result of post", result);

      if (!response.ok) {
        if (
          result?.error &&
          result.error.toLowerCase().includes("already been registered")
        ) {
          alert(
            `The email "${contact.email}" is already in use.\nPlease edit the contact with a different email before trying again.`
          );
        } else {
          alert("Failed to send invite: " + result.error);
        }
        return;
      }

      // 2. Update Supabase status
      await supabase
        .from("contacts")
        .update({ invited: true, signed: false })
        .eq("id", contactId);

      alert("Invite sent successfully!");
      fetchContacts(selectedStudent.id);
    } catch (err) {
      console.error("Invite failed:", err.message);
      alert("An unexpected error occurred while sending the invite.");
    }
  };

  const handleDeleteAddress = async (idToDelete) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this address?"
    );
    if (!confirm) return;

    try {
      const addressToDelete = addresses.find((addr) => addr.id === idToDelete);

      // Delete the address
      const { error: deleteError } = await supabase
        .from("students_address")
        .delete()
        .eq("id", idToDelete);

      if (deleteError) throw deleteError;

      // If the deleted address was the default
      if (addressToDelete?.isDefault) {
        // Fetch updated addresses
        const { data: remainingAddresses, error: fetchError } = await supabase
          .from("students_address")
          .select("*")
          .eq("studentId", selectedStudent.id);

        if (fetchError) throw fetchError;

        if (remainingAddresses.length > 0) {
          // Set the first one as default
          const newDefault = remainingAddresses[0];

          await supabase
            .from("students_address")
            .update({ isDefault: true })
            .eq("id", newDefault.id);

          await supabase
            .from("students")
            .update({ currentDropOffAddress: newDefault.id })
            .eq("id", selectedStudent.id);
        } else {
          // No addresses left — clear the student's currentDropOffAddress
          await supabase
            .from("students")
            .update({ currentDropOffAddress: null })
            .eq("id", selectedStudent.id);
        }
      }

      // Refresh address list
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("Failed to delete address.");
    }
  };

  const handleDeleteContact = async (contactId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this contact?"
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId);

    if (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact.");
    } else {
      alert("Contact deleted.");
      fetchContacts(selectedStudent.id); // refresh contact list
    }
  };

  const handleSaveContact = async (formData) => {
    const { email, firstName, lastName, phone, type, canPickup, code } =
      formData;
    const isEditing = !!editingContact;
    let userId;
    let contactId;

    try {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        userId = existingUser.id;
        await supabase
          .from("users")
          .update({
            name: `${firstName} ${lastName}`,
            phoneNumber: phone,
          })
          .eq("id", userId);
      } else {
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([
            {
              name: `${firstName} ${lastName}`,
              email,
              phoneNumber: phone,
              userType: "parent",
              firstLogin: true,
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (userError) throw userError;

        userId = newUser.id;
      }

      const contactRecord = {
        firstName,
        lastName,
        email,
        phone,
        type,
        canPickup,
        code,
        invited: formData.invited ?? false,
        signed: formData.signed ?? false,
        user_id: userId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("contacts")
          .update(contactRecord)
          .eq("id", editingContact.id);

        if (error) throw error;
        contactId = editingContact.id;
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert([contactRecord])
          .select()
          .single();

        if (error) throw error;
        contactId = data?.id;
      }
      const { error: linkError } = await supabase
        .from("student_family")
        .upsert([{ student_id: selectedStudent.id, contact_id: contactId }]);
      if (linkError) throw linkError;

      if (!isEditing && email && !formData.invited) {
        const confirmInvite = window.confirm(
          `Do you want to invite ${email} to register now?`
        );

        if (confirmInvite) {
          const response = await fetch(
            "http://localhost:3001/api/invite-contact",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                firstName,
                lastName,
              }),
            }
          );

          const result = await response.json();

          console.log(result);

          if (!response.ok) {
            if (
              result.error &&
              result.error.toLowerCase().includes("already been registered")
            ) {
              alert(
                `The email ${email} is already registered.\nPlease enter a different email or skip the invite.`
              );
            } else {
              console.error("Invite failed:", result.error);
              alert("Failed to send invite.");
            }
          }
        }
      }

      // Refresh state
      await fetchContacts(selectedStudent.id);
      setEditingContact(null);
      setIsContactModalVisible(false);
    } catch (error) {
      console.error("Error saving contact:", error.message);
      alert("An error occurred while saving the contact.");
    }
  };

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
      await fetchKidsData();
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

    const nameUpdated = selectedStudent.name;

    try {
      const updates = {
        name: updatedName,
        birthDate: updatedAge,
        photo: updatedPhoto,
        dropOffAddress: updatedDropOffAddress,
        lat: updatedLat,
        lng: updatedLng,
        notes,
        allergies,
        medicine,
        doctor,
        status,
        schoolId: selectedSchool?.id || selectedStudent.schoolId,
        schoolGrade,
        schoolGradeDivision,
        schoolTeacherName,
        dismissalTime: dismissalTime || null,
      };

      console.log("Updating student with:", updates);

      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", selectedStudent.id);

      if (error) {
        console.error("Supabase update error:", error);
        alert(`Failed to update student.\n${error.message}`);
        return;
      }

      console.log("Update result:", data);
      alert(`Kid - ${nameUpdated}, updated successfully!`);

      setSelectedStudent(null);
      setMode("list");
      setUpdatedName("");
      setUpdatedDropOffAddress("");
      setUpdatedAge("");
      // setUpdatedParent1Email("");
      // setUpdatedParent2Email("");
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
      await fetchKidsData();
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
                <h3 style={{ textAlign: "center" }}>List of Students</h3>
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
                      + New Student
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
                        {/* <button
                          className="btn-student btn-student-delete"
                          onClick={() => {
                            handleDeleteClick(kid);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {mode === "details" && selectedStudent && (
              <div className="update-student-container">
                <div className="profile-header">
                  <div className="photo-wrapper">
                    <RemoteImage
                      path={selectedStudent.photo}
                      name={selectedStudent.name}
                      bucketName="profilePhotos"
                      className="student-photo"
                      fullscreenOnClick
                    />
                    {/* <button
                      className="edit-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Change Photo"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleNewPhotoChange}
                    /> */}
                  </div>
                  <h2 className="student-name-title">{updatedName}</h2>
                </div>
                <div className="profile-columns">
                  <Card
                    title="Personal Info"
                    className="form-item"
                    style={{ flex: 1, marginBottom: 1 }}
                  >
                    <label>Name:</label>
                    <input
                      type="text"
                      value={updatedName}
                      onChange={(e) => setUpdatedName(e.target.value)}
                    />

                    <label>Birthday:</label>
                    <input
                      type="date"
                      value={updatedAge}
                      onChange={(e) => setUpdatedAge(e.target.value)}
                    />

                    <label>Allergies:</label>
                    <input
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />

                    <label>Medications:</label>
                    <input
                      value={medicine}
                      onChange={(e) => setMedicine(e.target.value)}
                    />

                    <label>Notes:</label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    <label>Doctor:</label>
                    <input
                      type="text"
                      value={doctor}
                      onChange={(e) => setDoctor(e.target.value)}
                    />
                  </Card>
                  <Card
                    title="School Details"
                    className="form-item"
                    style={{ flex: 1, marginBottom: 1 }}
                  >
                    {!isEditingSchool ? (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <strong>School:</strong>
                          <p>
                            {selectedStudent.schools?.name || "Not Assigned"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#777" }}>
                            {selectedStudent.schools?.address || ""}
                          </p>
                        </div>

                        <p>
                          <strong>Dismissal Time:</strong>{" "}
                          {dismissalTime
                            ? formatTimeTo12Hour(dismissalTime)
                            : "-"}
                        </p>
                        <p>
                          <strong>Grade:</strong> {schoolGrade || "-"}
                        </p>
                        <p>
                          <strong>Division:</strong>{" "}
                          {schoolGradeDivision || "-"}
                        </p>
                        <p>
                          <strong>Teacher:</strong> {schoolTeacherName || "-"}
                        </p>

                        <Button
                          type="link"
                          onClick={() => setIsEditingSchool(true)}
                        >
                          Edit School details
                        </Button>
                        {schoolExitPhotos?.length > 0 && (
                          <div
                            className="school-photos"
                            style={{ marginTop: "15px" }}
                          >
                            <p
                              style={{ fontSize: "14px", marginBottom: "10px" }}
                            >
                              📷 School Exit Photos
                              <br />
                              <em style={{ fontSize: "12px", color: "#777" }}>
                                To change or add exit photos, please use the
                                Staff App.
                              </em>
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                              }}
                            >
                              {schoolExitPhotos.map((photo, index) =>
                                photo?.path ? (
                                  <RemoteImage
                                    key={index}
                                    path={photo.path}
                                    bucketName="schoolexitphotos"
                                    className="school-exit-photo"
                                    fullscreenOnClick
                                  />
                                ) : null
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <label>School</label>
                        <select
                          value={selectedSchool?.id || ""}
                          onChange={(e) =>
                            setSelectedSchool(
                              allSchools.find((s) => s.id === e.target.value) ||
                                null
                            )
                          }
                        >
                          <option value="">Select School</option>
                          {allSchools.map((school) => (
                            <option key={school.id} value={school.id}>
                              {school.name}
                            </option>
                          ))}
                        </select>

                        <label>
                          Dismissal Time{" "}
                          <span style={{ fontSize: "12px", color: "#888" }}>
                            (Usually 3:00 PM)
                          </span>
                        </label>
                        <input
                          type="time"
                          value={dismissalTime}
                          onChange={(e) => setDismissalTime(e.target.value)}
                          min="13:00"
                          max="18:00"
                          step="300"
                        />

                        <label>Grade</label>
                        <input
                          type="text"
                          value={schoolGrade}
                          onChange={(e) => setSchoolGrade(e.target.value)}
                        />

                        <label>Division</label>
                        <input
                          type="text"
                          value={schoolGradeDivision}
                          onChange={(e) =>
                            setSchoolGradeDivision(e.target.value)
                          }
                        />

                        <label>Teacher</label>
                        <input
                          type="text"
                          value={schoolTeacherName}
                          onChange={(e) => setSchoolTeacherName(e.target.value)}
                        />

                        <div style={{ marginTop: 10 }}>
                          <Button
                            type="primary"
                            onClick={() => setIsEditingSchool(false)}
                            style={{ marginRight: 10 }}
                          >
                            Done
                          </Button>
                          <Button onClick={() => setIsEditingSchool(false)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                </div>
                <Card
                  title="Address Info"
                  className="form-item"
                  style={{ flex: 1, marginBottom: 15 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    {/* Left side - Pickup Mode and Add Address Button */}

                    <div
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "15px",
                        maxWidth: "220px",
                        flexShrink: 0,
                      }}
                    >
                      <h4 style={{ marginTop: 0, marginBottom: "15px" }}>
                        After Class Dismissal
                      </h4>

                      <label
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        <span>Parental pickup</span>
                        <input
                          type="radio"
                          name="dropOffMode"
                          value="parentPickup"
                          checked={dropOffMode === "parentPickup"}
                          onChange={() => {
                            (async () => {
                              if (dropOffMode === "dropOff") {
                                const nonDefaultAddresses = addresses.filter(
                                  (a) => !a.isDefault
                                );

                                if (nonDefaultAddresses.length > 0) {
                                  const confirmed = window.confirm(
                                    "Are you sure you want to switch to Parental Pickup? All addresses except the default will be removed. (This can not be undone!)"
                                  );
                                  if (!confirmed) return;

                                  const idsToDelete = nonDefaultAddresses.map(
                                    (a) => a.id
                                  );
                                  await supabase
                                    .from("students_address")
                                    .delete()
                                    .in("id", idsToDelete);

                                  await fetchAddresses();
                                }

                                setDropOffMode("parentPickup");
                              } else {
                                setDropOffMode("parentPickup");
                              }
                            })();
                          }}
                        />
                      </label>

                      <label
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        <span>Drop-Off service</span>
                        <input
                          type="radio"
                          name="dropOffMode"
                          value="dropOff"
                          checked={dropOffMode === "dropOff"}
                          onChange={() => setDropOffMode("dropOff")}
                        />
                      </label>
                    </div>

                    {/* Right side - Address List */}
                    <div
                      style={{
                        flex: 1,
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                      }}
                    >
                      <h4 style={{ marginTop: 0, marginBottom: "15px" }}>
                        {dropOffMode === "dropOff"
                          ? "Drop-Off Address List"
                          : "Address List"}
                      </h4>
                      <Button
                        type="primary"
                        style={{ marginTop: 15 }}
                        onClick={() => {
                          setEditingAddress(null);
                          setIsAddressModalVisible(true);
                        }}
                        disabled={
                          (dropOffMode === "parentPickup" &&
                            addresses.length >= 1) ||
                          (dropOffMode === "dropOff" && addresses.length >= 3)
                        }
                      >
                        + Add New Address
                      </Button>

                      {dropOffMode === "dropOff" && addresses.length >= 3 && (
                        <p style={{ color: "red", fontSize: 12 }}>
                          Maximum of 3 addresses allowed.
                        </p>
                      )}

                      {addresses.length > 0 ? (
                        <ul style={{ paddingLeft: 10, listStyle: "none" }}>
                          {addresses.map((addr) => (
                            <li
                              key={addr.id}
                              style={{
                                marginBottom: 12,
                                padding: 10,
                                border: "1px solid #ccc",
                                borderRadius: 8,
                                backgroundColor: addr.isDefault
                                  ? "#e6f7ff"
                                  : "#fff",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <strong>
                                  {addr.houseName || "Unnamed Address"}
                                </strong>
                                <br />
                                {addr.addressLine1}, {addr.city},{" "}
                                {addr.province}
                                <br />
                                {dropOffMode === "dropOff" &&
                                  addr.isDefault && (
                                    <span
                                      style={{ fontSize: 12, color: "#888" }}
                                    >
                                      ✅ Default Address
                                    </span>
                                  )}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  paddingLeft: 10,
                                }}
                              >
                                {/* Default star icon */}
                                {dropOffMode === "dropOff" &&
                                  !addr.isDefault && (
                                    <FontAwesomeIcon
                                      icon={faStar}
                                      title="Set as Default"
                                      style={{
                                        color: addr.isDefault ? "gold" : "#ccc",
                                        fontSize: 18,
                                        cursor: addr.isDefault
                                          ? "default"
                                          : "pointer",
                                      }}
                                      onClick={() => {
                                        if (addr.isDefault) return;
                                        const updates = addresses.map((a) => ({
                                          id: a.id,
                                          isDefault: a.id === addr.id,
                                        }));
                                        console.log(updates);
                                        supabase
                                          .from("students_address")
                                          .upsert(updates)
                                          .then(({ error }) => {
                                            if (!error) fetchAddresses();
                                          });
                                      }}
                                    />
                                  )}

                                {/* Edit icon */}
                                <FontAwesomeIcon
                                  icon={faPenToSquare}
                                  title="Edit Address"
                                  style={{
                                    color: "#555",
                                    cursor: "pointer",
                                    fontSize: 16,
                                  }}
                                  onClick={() => {
                                    setEditingAddress(addr);
                                    setIsAddressModalVisible(true);
                                  }}
                                />

                                {/* Trash icon */}
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  title="Delete Address"
                                  style={{
                                    color: "#d00",
                                    cursor: "pointer",
                                    fontSize: 16,
                                  }}
                                  onClick={() => handleDeleteAddress(addr.id)}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "#999" }}>
                          No addresses found.
                          {dropOffMode === "dropOff" && (
                            <>
                              {" "}
                              (For drop-off, you must add at least one address.)
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card
                  title="Attendance & Status"
                  className="form-item"
                  style={{ flex: 1, marginBottom: 15 }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: 15,
                    }}
                  >
                    {/* Status Selector */}
                    <div style={{ minWidth: 140 }}>
                      <label>Status:</label>
                      <select
                        value={status}
                        onChange={(e) => {
                          setStatus(e.target.value);
                          setStatusChanged(true);
                        }}
                        style={{ width: "100%", padding: 5, marginTop: 5 }}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Attendance Days */}
                    <div className="attendance-compact">
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                      ].map((day) => (
                        <div className="day-checkbox" key={day}>
                          <label className="day-label-small">
                            {day.slice(0, 3)}
                          </label>
                          <input
                            type="checkbox"
                            checked={attendanceDays[day]}
                            onChange={() => handleAttendanceToggle(day)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  {(scheduleChanged || statusChanged) && (
                    <Button
                      type="primary"
                      style={{ marginTop: 12 }}
                      onClick={async () => {
                        let success = true;

                        if (scheduleChanged) {
                          const { error } = await supabase
                            .from("students_schedule")
                            .update({
                              monday: attendanceDays.Monday,
                              tuesday: attendanceDays.Tuesday,
                              wednesday: attendanceDays.Wednesday,
                              thursday: attendanceDays.Thursday,
                              friday: attendanceDays.Friday,
                            })
                            .eq("studentId", selectedStudent.id);

                          if (error) {
                            console.error("Error saving schedule:", error);
                            success = false;
                          } else {
                            setScheduleChanged(false);
                          }
                        }

                        if (statusChanged) {
                          const { error } = await supabase
                            .from("students")
                            .update({ status })
                            .eq("id", selectedStudent.id);

                          if (error) {
                            console.error("Error saving status:", error);
                            success = false;
                          } else {
                            setStatusChanged(false);
                          }
                        }

                        if (success) alert("Changes saved!");
                        else alert("Some changes failed to save.");
                      }}
                    >
                      Save Changes
                    </Button>
                  )}
                </Card>

                <Card title="Parents/Family" style={{ marginBottom: 20 }}>
                  <div
                    className="contacts-header"
                    style={{
                      display: "flex",
                      fontWeight: "bold",
                      padding: "8px 12px",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    <div style={{ flex: 2 }}>Name</div>
                    <div style={{ flex: 2 }}>Email</div>
                    <div style={{ flex: 2 }}>Phone</div>
                    <div style={{ flex: 1 }}>Type</div>
                    <div style={{ flex: 1 }}>Can Pickup</div>
                    <div style={{ flex: 1 }}>Signed</div>
                    {/* <div style={{ flex: 1 }}>Code</div> */}
                    <div style={{ flex: 2 }}>Actions</div>
                  </div>

                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      style={{
                        display: "flex",
                        padding: "10px 12px",
                        borderBottom: "1px solid #eee",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 2 }}>
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div style={{ flex: 2 }}>{contact.email}</div>
                      <div style={{ flex: 2 }}>{contact.phone}</div>
                      <div style={{ flex: 1 }}>{contact.type}</div>
                      <div style={{ flex: 1 }}>
                        {contact.canPickup ? "Yes" : "No"}
                      </div>
                      <div style={{ flex: 1 }}>
                        {contact.signed ? "Yes" : "No"}
                      </div>
                      {/* <div style={{ flex: 1 }}>{contact.code}</div> */}
                      <div style={{ flex: 2, display: "flex", gap: 8 }}>
                        {!contact.signed && (
                          <Button
                            size="small"
                            onClick={() =>
                              handleInviteContact(contact.id, contact)
                            }
                          >
                            {contact.invited ? "Resend Invite" : "Invite"}
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingContact(contact);
                            setIsContactModalVisible(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          danger
                          size="small"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="primary"
                    style={{ marginTop: 12 }}
                    onClick={() => {
                      setEditingContact(null);
                      setIsContactModalVisible(true);
                    }}
                  >
                    + Add Parent/Family
                  </Button>
                </Card>

                <Card title="Danger Zone" style={{ border: "1px solid red" }}>
                  <p style={{ color: "red", fontWeight: "bold" }}>
                    Warning: Deleting this student is permanent and cannot be
                    undone.
                  </p>
                  <Button
                    danger
                    onClick={() => setIsDeleteModalVisible(true)}
                    style={{ marginTop: 10 }}
                  >
                    Delete Student
                  </Button>
                </Card>

                <div className="profile-actions">
                  <button className="btn-student" onClick={handleUpdateStudent}>
                    Save Changes
                  </button>
                  <button className="btn-student" onClick={handleBackToList}>
                    Back to List
                  </button>
                </div>
              </div>
            )}
          </div>
          <ContactModal
            isVisible={isContactModalVisible}
            onClose={() => {
              setIsContactModalVisible(false);
              setEditingContact(null);
            }}
            onSave={handleSaveContact}
            contactToEdit={editingContact}
            allContacts={allContacts}
            assignedContacts={contacts}
          />
          <AddressModal
            isVisible={isAddressModalVisible}
            onClose={() => {
              setEditingAddress(null);
              setIsAddressModalVisible(false);
            }}
            onSave={handleSaveAddress}
            addressToEdit={editingAddress}
          />

          <Modal
            open={isDeleteModalVisible}
            title="Are you absolutely sure?"
            onCancel={() => setIsDeleteModalVisible(false)}
            onOk={async () => {
              await handleDeleteStudent();
              setIsDeleteModalVisible(false);
            }}
            okText="Yes, delete"
            okType="danger"
            cancelText="Cancel"
          >
            <p>
              This action cannot be undone. This will permanently delete the
              student record.
            </p>
          </Modal>

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
