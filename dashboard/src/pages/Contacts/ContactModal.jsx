import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Checkbox, Button, message } from "antd";
import "./ContactModal.css";

const CONTACT_TYPES = ["Parent", "Family", "Approved Pickup"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactModal = ({
  isVisible,
  onClose,
  onSave, // may return a Promise; returning false means "it failed, keep the form open"
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
  const [existingEmailInput, setExistingEmailInput] = useState("");
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setIsPrimaryContact(contactToEdit?.is_primary_contact || false);
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
    setIsPrimaryContact(false); // was missing: a new contact opened already marked as primary
    setExistingEmailInput("");
    setFilteredContacts([]);
    setCode(generateNumericCode());
  };

  // Close the modal and clear it
  const finish = () => {
    onClose();
    resetForm();
    setMode("");
  };

  // Sends the contact to the screen. The form is only closed when the save worked,
  // so nothing the user typed is lost when the API answers with an error.
  const submit = async (contactData) => {
    if (saving) return; // blocks a double click (it would create the contact twice)
    setSaving(true);
    try {
      const saved = await onSave(contactData);
      if (saved === false) return;
      finish();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const email = contactEmail.trim();
    const phone = contactPhone.trim();

    if (!firstName.trim() || !lastName.trim()) {
      message.warning("First name and last name are required.");
      return;
    }

    if (!email && !phone) {
      message.warning("You must provide at least an email or phone.");
      return;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      message.warning("Please enter a valid email address.");
      return;
    }

    // A NEW contact cannot reuse the email of an existing one (compared in lower case).
    // Contacts without an email are never compared with each other.
    if (mode === "new" && email) {
      const duplicate = allContacts.some(
        (c) => (c.email || "").toLowerCase() === email.toLowerCase(),
      );
      if (duplicate) {
        message.warning(
          'This email is already used by another contact. Use "Use Existing Contact" instead.',
        );
        return;
      }
    }

    // "invited" and "signed" are controlled by the server (the invite flow), so they are not sent
    submit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      phone,
      type: contactType,
      canPickup,
      code,
      is_primary_contact: isFirstContact || isPrimaryContact,
    });
  };

  const handleSearchExisting = (value) => {
    setExistingEmailInput(value);

    if (value.trim().length < 3) {
      setFilteredContacts([]); // hide results when the input is too short
      return;
    }

    const lowercase = value.toLowerCase();
    setFilteredContacts(
      allContacts.filter((c) => {
        const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const email = c.email?.toLowerCase() || "";
        // compare by id: comparing emails hid every contact without an email
        const alreadyAssigned = assignedContacts.some((a) => a.id === c.id);
        return (
          !alreadyAssigned &&
          (email.includes(lowercase) || fullName.includes(lowercase))
        );
      }),
    );
  };

  const handleSelectExisting = (c) => {
    submit({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      type: c.type,
      canPickup: c.canPickup || false,
      code: c.code || generateNumericCode(),
    });
  };

  // The first contact of a student is always the primary one (the API enforces it too).
  // The current primary contact cannot be un-marked here: to change it, mark another contact.
  const isFirstContact = !contactToEdit && assignedContacts.length === 0;
  const editingPrimary = !!contactToEdit?.is_primary_contact;

  // Keeps a type that is not in the list (for example "Grandparent") visible when editing
  const typeOptions = [...CONTACT_TYPES, ...(CONTACT_TYPES.includes(contactType) ? [] : [contactType])].map(
    (type) => ({ value: type, label: type }),
  );

  return (
    <Modal
      title={contactToEdit ? "Edit Contact" : "Add Contact"}
      open={isVisible}
      onCancel={finish}
      footer={null}
      maskClosable={false}
    >
      <div className="contact-modal">
        {!mode && (
          <div className="contact-field">
            <label>Is this contact already registered?</label>
            <div className="contact-choice">
              <Button onClick={() => setMode("existing")}>
                Use Existing Contact
              </Button>
              <Button type="primary" onClick={() => setMode("new")}>
                Add New Contact
              </Button>
            </div>
          </div>
        )}

        {mode === "existing" && (
          <>
            <div className="contact-field">
              <label>Search contact by email or name</label>
              <Input
                value={existingEmailInput}
                onChange={(e) => handleSearchExisting(e.target.value)}
                placeholder="Type at least 3 characters"
                autoFocus
              />
            </div>

            {filteredContacts.length > 0 && (
              <ul className="contact-results">
                {filteredContacts.map((c) => (
                  <li
                    key={c.id}
                    className="contact-result"
                    onClick={() => {
                      message.success("Contact selected.");
                      handleSelectExisting(c);
                    }}
                  >
                    <strong>
                      {c.firstName} {c.lastName}
                    </strong>
                    {c.email ? ` – ${c.email}` : ""}
                    <br />
                    <small>{c.phone}</small>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Button type="link" onClick={() => setMode("")} style={{ padding: 0 }}>
                ← Back
              </Button>
            </div>
          </>
        )}

        {(mode === "new" || mode === "edit") && (
          <>
            <div className="contact-row">
              <div className="contact-field">
                <label>First name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="contact-field">
                <label>Last name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="contact-field">
              <label>Email</label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div className="contact-row">
              <div className="contact-field">
                <label>Phone</label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="contact-field">
                <label>Type</label>
                <Select
                  value={contactType}
                  onChange={setContactType}
                  options={typeOptions}
                />
              </div>
            </div>

            <div className="contact-checks">
              <Checkbox
                checked={canPickup}
                onChange={(e) => setCanPickup(e.target.checked)}
              >
                Can Pickup
              </Checkbox>
              {!isFirstContact && (
                <Checkbox
                  checked={isPrimaryContact}
                  disabled={editingPrimary}
                  onChange={(e) => setIsPrimaryContact(e.target.checked)}
                >
                  Set as Primary Contact
                </Checkbox>
              )}
            </div>

            {isFirstContact && (
              <div className="contact-hint">
                This is the first contact, so it will be the primary contact.
              </div>
            )}
            {editingPrimary && (
              <div className="contact-hint">
                This is the primary contact. To change it, mark another contact
                as primary.
              </div>
            )}

            <Button
              onClick={handleSave}
              type="primary"
              className="save-btn"
              loading={saving}
            >
              {contactToEdit ? "Update Contact" : "Save Contact"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ContactModal;
