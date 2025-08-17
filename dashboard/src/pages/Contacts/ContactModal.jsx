import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Checkbox, Button, message } from "antd";
import "./ContactModal.css";

const ContactModal = ({
  isVisible,
  onClose,
  onSave,
  contactToEdit,
  allContacts = [],
  assignedContacts = [],
}) => {
  const [mode, setMode] = useState(""); // "new" | "existing" | "edit"
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactType, setContactType] = useState("Parent");
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [canPickup, setCanPickup] = useState(false);
  const [invited, setInvited] = useState(false);
  const [existingEmailInput, setExistingEmailInput] = useState("");

  const generateNumericCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const [code, setCode] = useState(generateNumericCode());

  useEffect(() => {
    if (contactToEdit) {
      // Editing mode
      setMode("edit");
      setFirstName(contactToEdit.firstName || "");
      setLastName(contactToEdit.lastName || "");
      setContactEmail(contactToEdit.email || "");
      setContactPhone(contactToEdit.phone || "");
      setContactType(contactToEdit.type || "Parent");
      setCanPickup(contactToEdit.canPickup || false);
      setCode(contactToEdit.code || generateNumericCode());
      setInvited(contactToEdit.invited || false);
    } else {
      // Reset everything for new add
      setMode("");
      resetForm();
    }
  }, [contactToEdit]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setContactEmail("");
    setContactPhone("");
    setContactType("Parent");
    setCanPickup(false);
    setInvited(false);
    setExistingEmailInput("");
    setCode(generateNumericCode());
  };

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      message.warning("First name and last name are required.");
      return;
    }

    if (!contactEmail && !contactPhone) {
      message.warning("You must provide at least an email or phone.");
      return;
    }

    // Prevent duplicate on new contact
    if (mode === "new") {
      const duplicate = allContacts.find(
        (c) =>
          c.email === contactEmail.trim() &&
          (!contactToEdit || c.id !== contactToEdit.id)
      );
      if (duplicate) {
        message.warning("This email is already used by another contact.");
        return;
      }
    }

    const contactData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: contactEmail.trim(),
      phone: contactPhone.trim(),
      type: contactType,
      canPickup,
      code,
      invited,
      signed: contactToEdit ? contactToEdit.signed : false,
    };

    onSave(contactData);
    onClose();
    resetForm();
    setMode("");
  };

  return (
    <Modal
      title={contactToEdit ? "Edit Contact" : "Add Contact"}
      open={isVisible}
      onCancel={() => {
        onClose();
        setMode("");
        resetForm();
      }}
      footer={null}
      maskClosable={false}
      className="contact-modal"
    >
      <div className="contact-modal">
        {!mode && (
          <div>
            <p>Is this contact already registered?</p>
            <Button
              onClick={() => setMode("existing")}
              style={{ marginRight: 10 }}
            >
              Use Existing Contact
            </Button>
            <Button type="primary" onClick={() => setMode("new")}>
              Add New Contact
            </Button>
          </div>
        )}

        {mode === "existing" && (
          <div style={{ marginTop: 20 }}>
            <label>Search contact by Email or Name:</label>
            <Input
              value={existingEmailInput}
              onChange={(e) => {
                const value = e.target.value;
                setExistingEmailInput(value);

                if (value.trim().length >= 3) {
                  const lowercase = value.toLowerCase();
                  const results = allContacts.filter((c) => {
                    const fullName = `${c.firstName || ""} ${
                      c.lastName || ""
                    }`.toLowerCase();

                    const email = c.email?.toLowerCase() || "";
                    return (
                      !assignedContacts.some((a) => a.email === c.email) &&
                      (email.includes(lowercase) ||
                        fullName.includes(lowercase))
                    );
                  });

                  setFilteredContacts(results);
                } else {
                  setFilteredContacts([]); // Hide results when input is too short
                }
              }}
              placeholder="Type at least 3 characters"
            />
            {filteredContacts.length > 0 && (
              <div style={{ marginTop: 15 }}>
                <p>Matching Contacts:</p>
                <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                  {filteredContacts.map((c) => (
                    <li
                      key={c.id}
                      style={{
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                        marginBottom: "8px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        message.success("Contact selected.");
                        const contactData = {
                          firstName: c.firstName,
                          lastName: c.lastName,
                          email: c.email,
                          phone: c.phone,
                          type: c.type,
                          canPickup: c.canPickup || false,
                          code:
                            c.code || Math.random().toString(36).substring(7),
                          signed: c.signed || false,
                          user_id: c.user_id,
                        };
                        onSave(contactData);
                        onClose();
                        setMode("");
                        resetForm();
                      }}
                    >
                      <strong>
                        {c.firstName} {c.lastName}
                      </strong>{" "}
                      – {c.email}
                      <br />
                      <small>{c.phone}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {(mode === "new" || mode === "edit") && (
          <>
            <label>First Name:</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />

            <label>Last Name:</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
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
              <Select.Option value="Approved Pickup">
                Approved Pickup
              </Select.Option>
            </Select>

            <div className="checkbox-container">
              <Checkbox
                checked={canPickup}
                onChange={(e) => setCanPickup(e.target.checked)}
              />
              <label style={{ marginLeft: 8 }}>Can Pickup</label>
            </div>

            <Button onClick={handleSave} type="primary" className="save-btn">
              {contactToEdit ? "Update Contact" : "Save Contact"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ContactModal;
