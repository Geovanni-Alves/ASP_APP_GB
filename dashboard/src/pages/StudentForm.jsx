import React, { useState, useRef } from "react";
import supabase from "../lib/supabase";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import { Card, Button, Tooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faUserPlus,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { usePicturesContext } from "../contexts/PicturesContext";
import ContactModal from "./ContactModal";
import "./StudentForm.css";

function StudentForm({ onStudentAdded }) {
  const [name, setName] = useState("");
  const [dropOffAddress, setDropOffAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [attendanceDays, setAttendanceDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
  });
  const [photo, setPhoto] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [error, setError] = useState("");
  const [contactToEdit, setContactToEdit] = useState(null);
  const autocompleteRef = useRef();
  const { savePhotoInBucket } = usePicturesContext();

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const handleSubmit = async () => {
    if (!name || !birthDate || contacts.length === 0) {
      setError(
        "Please fill in all required fields and add at least one contact."
      );
      return;
    }

    try {
      // Step 1: Insert student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert([
          {
            name,
            birthDate,
            lat,
            lng,
            currentDropOffAddress: dropOffAddress,
            photo: photo ? await savePhotoInBucket(photo) : null,
            parent1Email: contacts.length > 0 ? contacts[0].email : null,
          },
        ])
        .select("id")
        .single();

      if (studentError) throw studentError;

      // Step 2: Insert contacts with student_id
      const studentId = student.id;
      const contactData = contacts.map((contact) => ({
        student_id: studentId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        relationship: contact.type,
        is_primary_contact: contact.canPickup,
        invited: false,
        signed: false,
      }));

      const { error: contactsError } = await supabase
        .from("contacts")
        .insert(contactData);
      if (contactsError) throw contactsError;

      // Step 3: Insert student address
      const { error: addressError } = await supabase
        .from("student_address")
        .insert([
          {
            student_id: studentId,
            address: dropOffAddress,
            lat,
            lng,
          },
        ]);
      if (addressError) throw addressError;

      // Step 4: Insert attendance schedule
      const { error: scheduleError } = await supabase
        .from("students_schedule")
        .insert([
          {
            studentId: studentId,
            monday: attendanceDays.Monday,
            tuesday: attendanceDays.Tuesday,
            wednesday: attendanceDays.Wednesday,
            thursday: attendanceDays.Thursday,
            friday: attendanceDays.Friday,
          },
        ]);
      if (scheduleError) throw scheduleError;

      alert("Student saved successfully!");
      onStudentAdded();
    } catch (error) {
      console.error("Error saving student:", error);
      setError("Failed to save student. Please try again.");
    }
  };

  const handleAddressSelect = (selectedPlace) => {
    setDropOffAddress(selectedPlace.formatted_address);
    setLat(selectedPlace.geometry.location.lat());
    setLng(selectedPlace.geometry.location.lng());
  };

  const handleAttendanceToggle = (day) => {
    setAttendanceDays((prevDays) => ({
      ...prevDays,
      [day]: !prevDays[day],
    }));
  };

  const handlePhotoChange = (e) => {
    const selectedPhoto = e.target.files[0];
    if (selectedPhoto) {
      setPhoto(selectedPhoto);
    }
  };

  const handleEditContact = (contact) => {
    setContactToEdit(contact);
    setIsContactModalVisible(true);
  };

  const handleDeleteContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleInvite = (contact) => {
    console.log(`Invite sent to ${contact.email}`);
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

        {/* Contacts Table Section */}
        <div className="form-item">
          <label>Contacts:</label>
          <Button onClick={() => setIsContactModalVisible(true)}>
            + Add a Contact
          </Button>
          <div className="contact-table">
            <div className="table-header">
              <span>Contact</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Can Pickup</span>
              <span>Code</span>
              <span>Signed Up</span>
              <span>Actions</span>
            </div>
            {contacts.map((contact, index) => (
              <div key={index} className="table-row">
                <span>
                  {contact.name} - {contact.type}
                </span>
                <span>{contact.email}</span>
                <span>{contact.phone}</span>
                <span>{contact.canPickup ? "Yes" : "No"}</span>
                <span>{contact.code}</span>
                <span>{contact.signedUp ? "Yes" : "No"}</span>
                <span className="actions">
                  <Tooltip title="Edit">
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="icon-button"
                      onClick={() => handleEditContact(contact)}
                    />
                  </Tooltip>
                  <Tooltip title="Delete">
                    <FontAwesomeIcon
                      icon={faTrash}
                      onClick={() => handleDeleteContact(index)}
                      className="icon-button"
                    />
                  </Tooltip>
                  <Tooltip title="Invite">
                    <FontAwesomeIcon
                      icon={faUserPlus}
                      onClick={() => handleInvite(contact)}
                      className="icon-button"
                    />
                  </Tooltip>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-item">
          <label>Drop-Off Address:</label>
          <GoogleMapsAutocomplete
            onPlaceSelect={handleAddressSelect}
            ref={autocompleteRef}
          />
        </div>

        <div className="form-item">
          <label>
            Birth Date: <span className="required">*</span>
          </label>
          <input
            type="date"
            onChange={(e) => setBirthDate(e.target.value)}
            value={birthDate}
          />
        </div>

        <div className="form-item">
          <label>Attendance Days:</label>
          <div className="days-of-week">
            {daysOfWeek.map((day) => (
              <FontAwesomeIcon
                key={day}
                icon={faStar}
                className={
                  attendanceDays[day] ? "star-active" : "star-inactive"
                }
                onClick={() => handleAttendanceToggle(day)}
              />
            ))}
          </div>
        </div>

        <div className="form-item">
          <label>Photo:</label>
          <input
            type="file"
            accept="image/jpeg, image/png"
            onChange={handlePhotoChange}
          />
        </div>

        <button className="create-btn" onClick={handleSubmit}>
          Add Kid
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      <ContactModal
        isVisible={isContactModalVisible}
        onClose={() => {
          setIsContactModalVisible(false);
          setContactToEdit(null);
        }}
        onSave={(contact) => {
          setContacts((prevContacts) =>
            prevContacts.map((c) => (c.code === contact.code ? contact : c))
          );
        }}
        contactToEdit={contactToEdit}
      />
    </Card>
  );
}

export default StudentForm;
