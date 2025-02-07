import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Checkbox, Button } from "antd";
import "./ContactModal.css"; // Import the CSS file

const ContactModal = ({ isVisible, onClose, onSave, contactToEdit }) => {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactType, setContactType] = useState("Parent");
  const [canPickup, setCanPickup] = useState(false);
  const [code, setCode] = useState(Math.random().toString(36).substring(7));

  // Populate form fields if editing
  useEffect(() => {
    if (contactToEdit) {
      setContactName(contactToEdit.name);
      setContactEmail(contactToEdit.email);
      setContactPhone(contactToEdit.phone);
      setContactType(contactToEdit.type);
      setCanPickup(contactToEdit.canPickup);
      setCode(contactToEdit.code); // Keep the existing code
    } else {
      resetForm();
    }
  }, [contactToEdit]);

  const handleSave = () => {
    if (contactName && contactEmail && contactPhone) {
      onSave({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        type: contactType,
        canPickup,
        code,
        signedUp: contactToEdit ? contactToEdit.signedUp : false,
      });
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setContactType("Parent");
    setCanPickup(false);
    setCode(Math.random().toString(36).substring(7));
  };

  return (
    <Modal
      title={contactToEdit ? "Edit Contact" : "Add Contact"}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      className="contact-modal"
    >
      <div className="contact-modal">
        <label>Name:</label>
        <Input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Enter contact's name"
        />

        <label>Email:</label>
        <Input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="Enter contact's email"
        />

        <label>Phone:</label>
        <Input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="Enter contact's phone number"
        />

        <label>Type:</label>
        <Select
          value={contactType}
          onChange={(value) => setContactType(value)}
          className="contact-type-select"
        >
          <Select.Option value="Parent">Parent</Select.Option>
          <Select.Option value="Family">Family</Select.Option>
          <Select.Option value="Approved Pickup">Approved Pickup</Select.Option>
        </Select>

        <div className="checkbox-container">
          <Checkbox
            checked={canPickup}
            onChange={(e) => setCanPickup(e.target.checked)}
          />
          <label>Can Pickup</label>
        </div>

        <Button onClick={handleSave} type="primary" className="save-btn">
          {contactToEdit ? "Update Contact" : "Save Contact"}
        </Button>
      </div>
    </Modal>
  );
};

export default ContactModal;
