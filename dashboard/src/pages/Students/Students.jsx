import React, { useEffect, useState, useRef } from "react";
// Sending invites (the email with the code) is still pending: see TODO(part 3) below.
import api from "../../lib/api";
import { Modal, Button, Card, Segmented, Tag } from "antd";
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
  const [statusFilter, setStatusFilter] = useState("Active"); // "Active" | "Inactive" | "All"

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
  const [scheduleId, setScheduleId] = useState(null); // id of this student's row in students_schedule
  const [statusChanged, setStatusChanged] = useState(false);
  const [savedDays, setSavedDays] = useState(null); // schedule as it is saved in the database
  const [loadedStudentId, setLoadedStudentId] = useState(null); // which student the form is showing

  const [attendanceDays, setAttendanceDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  });

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // ---- Unsaved changes detection -------------------------------------------------
  // The form as it is now, compared with the student as it is saved. Empty values count as "".
  const currentForm = {
    name: updatedName || "",
    birthDate: updatedAge || "",
    allergies: allergies || "",
    medicine: medicine || "",
    notes: notes || "",
    doctor: doctor || "",
    status: status || "",
    schoolId: selectedSchool?.id || "",
    dismissalTime: dismissalTime || "",
    schoolGrade: schoolGrade || "",
    schoolGradeDivision: schoolGradeDivision || "",
    schoolTeacherName: schoolTeacherName || "",
  };
  const savedForm = selectedStudent && {
    name: selectedStudent.name || "",
    birthDate: selectedStudent.birthDate || "",
    allergies: selectedStudent.allergies || "",
    medicine: selectedStudent.medicine || "",
    notes: selectedStudent.notes || "",
    doctor: selectedStudent.doctor || "",
    status: selectedStudent.status || "Active",
    schoolId: selectedStudent.schools?.id || "",
    dismissalTime: selectedStudent.dismissalTime?.slice(0, 5) || "",
    schoolGrade: selectedStudent.schoolGrade || "",
    schoolGradeDivision: selectedStudent.schoolGradeDivision || "",
    schoolTeacherName: selectedStudent.schoolTeacherName || "",
  };
  const scheduleDirty =
    !!savedDays && JSON.stringify(attendanceDays) !== JSON.stringify(savedDays);
  const hasChanges =
    !!selectedStudent &&
    loadedStudentId === selectedStudent.id && // ignore the moment the form is still loading
    (scheduleDirty ||
      JSON.stringify(currentForm) !== JSON.stringify(savedForm));

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

  // Creates or updates an address. The API does everything in ONE transaction:
  // it also fixes the "default" flags and the student's current drop-off address.
  const handleSaveAddress = async (addressData) => {
    try {
      // Ask about "default" only when it can matter: there are other addresses
      // and the address being edited is not already the default.
      const othersExist = addresses.length > 0;
      const alreadyDefault = !!editingAddress?.isDefault;
      let makeDefault = false;
      if (othersExist && !alreadyDefault) {
        makeDefault = window.confirm(
          "Do you want to make this address the default?",
        );
      }

      if (editingAddress) {
        await api.put(
          `/students/${selectedStudent.id}/addresses/${editingAddress.id}`,
          { ...addressData, makeDefault },
        );
      } else {
        await api.post(`/students/${selectedStudent.id}/addresses`, {
          ...addressData,
          makeDefault,
        });
      }

      await fetchAddresses(selectedStudent.id);
      await fetchKidsData(); // the student list shows each default address
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
      // The server chooses the file name and returns it as "path"
      const path = await savePhotoInBucket(file, "profilePhotos");
      if (!path) throw new Error("Upload failed");

      // Save that name in the student row
      await updateKidOnDb(selectedStudent.id, [
        { fieldName: "photo", value: path },
      ]);
      await fetchKidsData();
      console.log("Image uploaded successfully.");
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

  const isInactive = (kid) => kid.status === "Inactive";
  const activeCount = kids.filter((kid) => !isInactive(kid)).length;
  const inactiveCount = kids.length - activeCount;

  const filteredKids = kids.filter((kid) => {
    const matchesName =
      nameFilter === "" ||
      kid.name?.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Inactive" ? isInactive(kid) : !isInactive(kid));
    return matchesName && matchesStatus;
  });

  // const displayedKids = filteredKids.slice(startIndex, endIndex);

  // console.log("displayedKids", displayedKids);

  const handleStudentClick = (student) => {
    setLoadedStudentId(null); // the form is reloaded for this student
    setSelectedStudent(student);
    setMode("details");
  };

  const fetchContacts = async (studentId) => {
    try {
      // All contacts (used by the "link an existing contact" list in the modal)
      const { data: all } = await api.get("/contacts");
      setAllContacts(all);

      // The link table says which contacts belong to this student
      const { data: familyRows } = await api.get("/student_family", {
        params: { student_id: studentId },
      });
      // Each family row says whether that contact is the primary one FOR THIS STUDENT
      const rowByContact = new Map(
        familyRows.map((row) => [row.contact_id, row]),
      );
      setContacts(
        all
          .filter((contact) => rowByContact.has(contact.id))
          .map((contact) => ({
            ...contact,
            is_primary_contact: !!rowByContact.get(contact.id).is_primary,
          }))
          // the primary contact comes first
          .sort(
            (a, b) =>
              Number(b.is_primary_contact) - Number(a.is_primary_contact),
          ),
      );
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setAllContacts([]);
      setContacts([]);
    }
  };

  // console.log("contacts", contacts);
  // Some callers pass no id, so we default to the selected student
  const fetchAddresses = async (studentId = selectedStudent?.id) => {
    if (!studentId) return;
    try {
      const { data } = await api.get("/students_address", {
        params: { studentId },
      });
      // The default (favorite) address always comes first
      const sorted = [...(data || [])].sort(
        (a, b) => Number(!!b.isDefault) - Number(!!a.isDefault),
      );
      setAddresses(sorted);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  const fetchSchedule = async (studentId) => {
    try {
      const { data } = await api.get("/students_schedule", {
        params: { studentId, limit: 1 },
      });
      const row = data[0]; // a student has at most one schedule row
      setScheduleId(row ? row.id : null);
      const days = {
        Monday: !!row?.monday,
        Tuesday: !!row?.tuesday,
        Wednesday: !!row?.wednesday,
        Thursday: !!row?.thursday,
        Friday: !!row?.friday,
      };
      setAttendanceDays(days);
      setSavedDays(days);
    } catch (error) {
      console.error("Error fetching schedule:", error);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data } = await api.get("/schools");
      setAllSchools(data);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
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
      setUpdatedAge(selectedStudent.birthDate || "");
      // setUpdatedParent1Email(selectedStudent.parent1Email);
      // setUpdatedParent2Email(selectedStudent.parent2Email);
      setUpdatedLat(selectedStudent.lat ?? "");
      setUpdatedLng(selectedStudent.lng ?? "");
      setNotes(selectedStudent.notes || "");
      setAllergies(selectedStudent.allergies || "");
      setMedicine(selectedStudent.medicine || "");
      setDoctor(selectedStudent.doctor || "");
      setStatus(selectedStudent.status || "Active");
      setSchoolName(selectedStudent.schoolName || "");
      setDismissalTime(selectedStudent.dismissalTime?.slice(0, 5) || "");
      setSchoolGrade(selectedStudent.schoolGrade || "");
      setSchoolGradeDivision(selectedStudent.schoolGradeDivision || "");
      setSchoolTeacherName(selectedStudent.schoolTeacherName || "");
      setSelectedSchool(selectedStudent.schools);
      setUpdatedPhoto(selectedStudent.photo);
      // Restore the saved pickup mode (an empty value counts as Drop-Off service)
      setDropOffMode(
        selectedStudent.useDropOffService === false
          ? "parentPickup"
          : "dropOff",
      );

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

      setLoadedStudentId(selectedStudent.id); // the form now shows this student
    };

    fetchAllStudentData();
  }, [selectedStudent]);

  // Sends (or re-sends) the invite email with a one-time code. The API does all the work.
  const handleInviteContact = async (contactId, contact) => {
    if (!contact.email) {
      alert("This contact does not have an email.");
      return;
    }

    try {
      const { data } = await api.post(`/contacts/${contactId}/invite`);

      if (data.status === "already_registered") {
        alert(
          `${contact.email} already has an account. The child is linked to it, so no invite is needed.`,
        );
      } else {
        alert(
          `Invite sent to ${contact.email}. The code is valid for ${data.validDays} days.`,
        );
      }
      fetchContacts(selectedStudent.id); // refresh the Invite / Signed columns
    } catch (error) {
      console.error("Invite failed:", error);
      if (error.response?.status === 502) {
        alert("The invite could not be emailed. Please try again in a moment.");
      } else if (error.response?.status === 400) {
        alert("This contact does not have a valid email address.");
      } else {
        alert("An unexpected error occurred while sending the invite.");
      }
    }
  };

  // The API deletes the address and, if it was the default, makes another one the default.
  const handleDeleteAddress = async (idToDelete) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this address?",
    );
    if (!confirmed) return;

    try {
      await api.delete(
        `/students/${selectedStudent.id}/addresses/${idToDelete}`,
      );
      await fetchAddresses(selectedStudent.id);
      await fetchKidsData();
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("Failed to delete address.");
    }
  };

  // Saves the pickup mode right away: Drop-Off service = true, Parental pickup = false
  const saveDropOffMode = async (useDropOffService) => {
    try {
      await api.patch(`/students/${selectedStudent.id}`, { useDropOffService });
      await fetchKidsData();
    } catch (error) {
      console.error("Error saving the pickup mode:", error);
      alert("Failed to save the pickup mode.");
      throw error; // the caller keeps the old choice on screen
    }
  };

  // Star icon: make this address the default one
  const handleSetDefaultAddress = async (addressId) => {
    try {
      await api.put(
        `/students/${selectedStudent.id}/addresses/${addressId}/default`,
      );
      await fetchAddresses(selectedStudent.id);
      await fetchKidsData();
    } catch (error) {
      console.error("Error setting the default address:", error);
      alert("Failed to set the default address.");
    }
  };

  const handleDeleteContact = async (contactId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this contact?",
    );
    if (!confirmed) return;

    try {
      // Removes the contact from this student (the contact is deleted only if no sibling uses it)
      await api.delete(`/students/${selectedStudent.id}/contacts/${contactId}`);
      alert("Contact deleted.");
      fetchContacts(selectedStudent.id); // refresh contact list
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact.");
    }
  };

  // Creates or edits a contact of this student. The API does everything in ONE transaction:
  // it finds or creates the parent's user account, saves the contact and links it to the student.
  const handleSaveContact = async (formData) => {
    try {
      let newContact = null;

      if (editingContact) {
        await api.put(
          `/students/${selectedStudent.id}/contacts/${editingContact.id}`,
          formData,
        );
      } else {
        const { data } = await api.post(
          `/students/${selectedStudent.id}/contacts`,
          formData,
        );
        newContact = data;
      }

      // Refresh state
      await fetchContacts(selectedStudent.id);
      setEditingContact(null);
      setIsContactModalVisible(false);

      // A new contact that was never invited: offer to send the invite now
      if (
        newContact?.email &&
        !newContact.invited &&
        !newContact.signed &&
        window.confirm(
          `Do you want to invite ${newContact.email} to register now?`,
        )
      ) {
        await handleInviteContact(newContact.id, newContact);
      }
      return true;
    } catch (error) {
      console.error("Error saving contact:", error);
      alert("An error occurred while saving the contact.");
      return false;
    }
  };

  // const handleDeleteClick = (student) => {
  //   setSelectedStudent(student);
  //   console.log("handle delete");
  //   setMode("delete");
  // };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) {
      return;
    }

    try {
      const nameDeleted = selectedStudent.name;
      await api.delete(`/students/${selectedStudent.id}`);

      setSelectedStudent(null);
      await fetchKidsData();
      setMode("list");
      alert(`Kid - ${nameDeleted}, successful deleted! `);
    } catch (error) {
      console.error("Error deleting student:", error);
      if (error.response?.status === 409) {
        // The database refuses to delete a student that other tables still point to
        alert(
          "This student still has related records (schedule, addresses, attendance, posts...). Set the status to Inactive instead of deleting.",
        );
      } else {
        alert("Failed to delete the student.");
      }
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) {
      return;
    }

    // Archiving a student asks for a confirmation (the API may still refuse, see below)
    const statusChangedNow = status !== (selectedStudent.status || "Active");
    if (statusChangedNow && status === "Inactive") {
      const confirmed = window.confirm(
        `Deactivate ${selectedStudent.name}?\n\n` +
          "- They will disappear from the student lists, routes and notifications.\n" +
          "- Attendance, photos and history are kept.\n" +
          "- You can reactivate them at any time.",
      );
      if (!confirmed) return;
    }

    const nameUpdated = selectedStudent.name;

    try {
      // Empty inputs are sent as null: the database cannot turn "" into a date or a number.
      // NOTE: "dropOffAddress" is no longer sent. It is not a column of "students" (it is the
      // address object attached to each student by GET /students/full); the real column is
      // "currentDropOffAddress", managed by the address handlers.
      // The status has its own rules (open routes, vans), so it has its own endpoint
      if (statusChangedNow) {
        await api.put(`/students/${selectedStudent.id}/status`, { status });
      }

      const updates = {
        name: updatedName,
        birthDate: updatedAge || null,
        photo: updatedPhoto || null,
        lat: updatedLat === "" ? null : updatedLat,
        lng: updatedLng === "" ? null : updatedLng,
        notes,
        allergies,
        medicine,
        doctor,
        schoolId: selectedSchool?.id || selectedStudent.schoolId,
        schoolGrade,
        schoolGradeDivision,
        schoolTeacherName,
        dismissalTime: dismissalTime || null,
        useDropOffService: dropOffMode === "dropOff",
      };

      // console.log("Updating student with:", updates);

      await api.patch(`/students/${selectedStudent.id}`, updates);

      // The weekly schedule is saved together with the rest of the form
      if (scheduleDirty) {
        const days = {
          monday: attendanceDays.Monday,
          tuesday: attendanceDays.Tuesday,
          wednesday: attendanceDays.Wednesday,
          thursday: attendanceDays.Thursday,
          friday: attendanceDays.Friday,
        };
        if (scheduleId) {
          await api.patch(`/students_schedule/${scheduleId}`, days);
        } else {
          await api.post("/students_schedule", {
            studentId: selectedStudent.id,
            ...days,
          });
        }
      }

      await fetchKidsData(); // refresh the list with the saved values
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
      const data = error.response?.data;
      if (error.response?.status === 409 && data?.reasons) {
        alert(`${data.error}\n\n- ${data.reasons.join("\n- ")}`);
        setStatus(selectedStudent.status || "Active"); // put the select back to the saved value
      } else {
        alert(`Failed to update student.\n${data?.error || error.message}`);
      }
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
    if (
      hasChanges &&
      !window.confirm("You have unsaved changes. Leave without saving?")
    ) {
      return;
    }
    setSelectedStudent(null);
    setMode("list");
  };

  // (unused: the search box that called this was removed from the details screen)
  // const handleUpdateAddressSelect = (selectedPlace) => {
  //   setUpdatedDropOffAddress(selectedPlace.formatted_address);
  //   setUpdatedLat(selectedPlace.geometry.location.lat());
  //   setUpdatedLng(selectedPlace.geometry.location.lng());
  // };

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
                  <Segmented
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { label: `Active (${activeCount})`, value: "Active" },
                      {
                        label: `Inactive (${inactiveCount})`,
                        value: "Inactive",
                      },
                      { label: `All (${kids.length})`, value: "All" },
                    ]}
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
                    <div
                      className={`student-details-container ${
                        isInactive(kid) ? "is-inactive" : ""
                      }`}
                      key={kid.id}
                    >
                      <RemoteImage
                        path={kid.photo}
                        name={kid.name}
                        bucketName="profilePhotos"
                        className="student-photo"
                      />
                      <div className="student-details">
                        <div className="student-name">
                          {kid.name}
                          {isInactive(kid) && (
                            <Tag style={{ marginLeft: 8 }}>Inactive</Tag>
                          )}
                        </div>
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
                <div className="profile-body">
                  {selectedStudent.status === "Inactive" && (
                    <div className="inactive-banner">
                      This student is inactive: hidden from the lists, routes
                      and notifications. Set the status to Active to restore.
                    </div>
                  )}
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
                                style={{
                                  fontSize: "14px",
                                  marginBottom: "10px",
                                }}
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
                                  ) : null,
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
                                allSchools.find(
                                  (s) => s.id === e.target.value,
                                ) || null,
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
                            onChange={(e) =>
                              setSchoolTeacherName(e.target.value)
                            }
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
                            onChange={async () => {
                              if (dropOffMode === "parentPickup") return;

                              const nonDefaultAddresses = addresses.filter(
                                (a) => !a.isDefault,
                              );
                              if (nonDefaultAddresses.length > 0) {
                                const confirmed = window.confirm(
                                  "Are you sure you want to switch to Parental Pickup? All addresses except the default will be removed. (This can not be undone!)",
                                );
                                if (!confirmed) return;

                                await api.delete("/students_address", {
                                  params: {
                                    id: `in:${nonDefaultAddresses
                                      .map((a) => a.id)
                                      .join(",")}`,
                                  },
                                });
                                await fetchAddresses();
                              }

                              try {
                                await saveDropOffMode(false);
                                setDropOffMode("parentPickup");
                              } catch (error) {
                                // the message was already shown
                              }
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
                            onChange={async () => {
                              try {
                                await saveDropOffMode(true);
                                setDropOffMode("dropOff");
                              } catch (error) {
                                // the message was already shown
                              }
                            }}
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
                                          color: addr.isDefault
                                            ? "gold"
                                            : "#ccc",
                                          fontSize: 18,
                                          cursor: addr.isDefault
                                            ? "default"
                                            : "pointer",
                                        }}
                                        onClick={() => {
                                          if (addr.isDefault) return;
                                          handleSetDefaultAddress(addr.id);
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
                                (For drop-off, you must add at least one
                                address.)
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
                      <div style={{ flex: 1 }}>Primary</div>
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
                          {contact.is_primary_contact && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 16,
                                color: "#1677ff",
                              }}
                            >
                              🛡
                            </span>
                          )}
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
                        <div style={{ flex: 1 }}>
                          {contact.is_primary_contact ? "Yes" : ""}
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

                  {/* <Card title="Danger Zone" style={{ border: "1px solid red" }}>
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
                  </Card> */}
                </div>
                <div className="profile-footer">
                  {hasChanges && (
                    <span className="unsaved-hint">
                      You have unsaved changes
                    </span>
                  )}
                  <Button onClick={handleBackToList}>Back to List</Button>
                  <Button
                    type="primary"
                    disabled={!hasChanges}
                    onClick={handleUpdateStudent}
                  >
                    Save Changes
                  </Button>
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

          {/* <Modal
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
          </Modal> */}

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
