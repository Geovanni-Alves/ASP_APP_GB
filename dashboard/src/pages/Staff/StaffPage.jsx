import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import "./StaffPage.css";
import RemoteImage from "../../components/RemoteImage/RemoteImage";
import {
  Button,
  Modal,
  Input,
  Card,
  Segmented,
  Select,
  Tag,
  message,
} from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useUsersContext } from "../../contexts/UsersContext";
import DeactivateModal from "../../components/DeactivateModal/DeactivateModal";
import { STAFF_REASONS } from "../../lib/inactiveReasons";
import {
  ROLE_LABELS,
  assignableTypes,
  canManage,
  canManagePeople,
  canUseDashboard,
} from "../../lib/roles";

// Everybody listed on this page (GET /users also returns parents, who are not staff)
const STAFF_TYPES = [
  "owner",
  "manager",
  "admin",
  "staff",
  "driver",
  "superadmin",
];
const TYPE_LABELS = ROLE_LABELS;

const typeOf = (user) => (user?.userType || "").toLowerCase();
const isStaffMember = (user) => STAFF_TYPES.includes(typeOf(user));
const isActive = (user) => user?.active !== false;

function StaffPage({ closeMenu }) {
  // Only the owner and the managers manage people, and only people of a lower level than theirs.
  // The types in the list are the ones THIS person may give (the API checks it again).
  const { dbUser, RefreshCurrentUserData } = useUsersContext();
  const assignableOptions = assignableTypes(dbUser);
  const canCreate = canManagePeople(dbUser);

  /* ──────────────────────────────────
     LIST + FILTERS
  ────────────────────────────────── */
  const [staffList, setStaffList] = useState([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active"); // "Active" | "Inactive" | "All"

  /* ──────────────────────────────────
     SELECTION + DIALOGS
  ────────────────────────────────── */
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffToDeactivate, setStaffToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  /* ──────────────────────────────────
     NEW STAFF FORM
  ────────────────────────────────── */
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState("STAFF");

  /* ──────────────────────────────────
     EDIT FORM (when selectedStaff)
  ────────────────────────────────── */
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState("STAFF");

  /* ──────────────────────────────────
     LOAD
  ────────────────────────────────── */
  // GET /users returns every user: keep only the staff
  const fetchStaff = async () => {
    try {
      const { data } = await api.get("/users");
      setStaffList(data.filter(isStaffMember));
    } catch (error) {
      console.error("Fetch staff error:", error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const activeCount = staffList.filter(isActive).length;
  const inactiveCount = staffList.length - activeCount;

  const filteredStaff = staffList.filter((staff) => {
    const text = filter.trim().toLowerCase();
    const matchesText =
      text === "" ||
      (staff.name || "").toLowerCase().includes(text) ||
      (staff.email || "").toLowerCase().includes(text);
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Inactive" ? !isActive(staff) : isActive(staff));
    return matchesText && matchesStatus;
  });

  /* ──────────────────────────────────
     EDIT
  ────────────────────────────────── */
  // Opens the edit page and fills the form in the same step
  const openStaff = (staff) => {
    setEditName(staff.name || "");
    setEditPhone(staff.phoneNumber || "");
    setEditAddress(staff.address || "");
    setEditType(typeOf(staff).toUpperCase());
    setSelectedStaff(staff);
  };

  const hasChanges =
    !!selectedStaff &&
    (editName.trim() !== (selectedStaff.name || "") ||
      editPhone.trim() !== (selectedStaff.phoneNumber || "") ||
      editAddress.trim() !== (selectedStaff.address || "") ||
      editType !== typeOf(selectedStaff).toUpperCase());

  // Keeps an account type that cannot be chosen here (for example the owner) visible
  const currentType = typeOf(selectedStaff);
  const typeOptions = assignableOptions.some(
    (option) => option.value === currentType.toUpperCase(),
  )
    ? assignableOptions
    : [
        ...assignableOptions,
        {
          value: currentType.toUpperCase(),
          label: TYPE_LABELS[currentType] || currentType,
        },
      ];

  // Can this person change the one that is open?
  const canEditSelected = !!selectedStaff && canManage(dbUser, selectedStaff);
  const canChangeType =
    canEditSelected &&
    assignableOptions.some(
      (option) => option.value === currentType.toUpperCase(),
    );

  // The person who is signed in may always change their own name, phone and address
  // (their type and status are changed by somebody above them)
  const isSelf = !!selectedStaff && selectedStaff.id === dbUser?.id;
  const canEditBasic = canEditSelected || isSelf;

  const handleBackToList = () => {
    if (
      hasChanges &&
      !window.confirm("You have unsaved changes. Leave without saving?")
    ) {
      return;
    }
    setSelectedStaff(null);
  };

  const handleSaveEdits = async () => {
    if (!selectedStaff || saving) return;
    if (!editName.trim()) {
      message.warning("The name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: editName.trim(),
        phoneNumber: editPhone.trim() || null,
        address: editAddress.trim() || null,
      };
      if (isSelf) {
        // Your own profile: only name, phone and address (the type is never sent)
        await api.patch("/users/me", updates);
        await RefreshCurrentUserData(); // so the name in the menu changes too
      } else {
        // The type is sent only when it was changed
        if (editType !== currentType.toUpperCase()) {
          updates.userType = editType;
        }
        await api.patch(`/staff/${selectedStaff.id}`, updates);
      }
      message.success("Person updated.");
      await fetchStaff();
      setSelectedStaff(null);
    } catch (error) {
      console.error("Update staff error:", error);
      const status = error.response?.status;
      if (status === 409 || status === 403) {
        // The API says exactly why (your own account, the only owner, a level you cannot manage...)
        message.error(
          error.response.data?.error || "You cannot change this account.",
        );
      } else {
        message.error("Failed to update the person.");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ──────────────────────────────────
     INVITE
  ────────────────────────────────── */
  // Emails a one-time code (staff and drivers, who enter it in the staff app) or a link (the people
  // who use the dashboard).
  const sendInvite = async (staff) => {
    if (!staff.email) {
      message.warning("This person has no email.");
      return;
    }

    try {
      const { data } = await api.post(`/staff/${staff.id}/invite`);
      if (data.status === "already_registered") {
        message.info(`${staff.email} already has an account.`);
      } else {
        message.success(
          `Invite sent to ${staff.email}. The code is valid for ${data.validDays} days.`,
        );
      }
      await fetchStaff();
    } catch (error) {
      console.error("Invite error:", error);
      const status = error.response?.status;
      if (status === 502) {
        message.error(
          "The invite could not be emailed. Please try again in a moment.",
        );
      } else if (status === 409) {
        message.error("This person is inactive.");
      } else if (status === 400) {
        message.error("This person has no valid email address.");
      } else if (status === 403) {
        message.error(
          error.response.data?.error || "You cannot invite this person.",
        );
      } else {
        message.error("An unexpected error occurred while sending the invite.");
      }
    }
  };

  const handleInviteClick = (staff) => {
    const verb = staff.invited ? "Resend" : "Send";
    Modal.confirm({
      title: `${verb} the invite to ${staff.email}?`,
      okText: `${verb} Invite`,
      cancelText: "Cancel",
      onOk: () => sendInvite(staff),
    });
  };

  /* ──────────────────────────────────
     NEW STAFF
  ────────────────────────────────── */
  const resetNewForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewAddress("");
    setNewType("STAFF");
    setIsNewModalVisible(false);
  };

  const handleSaveStaff = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !newName.trim()) {
      message.warning("Name and email are required.");
      return;
    }

    setSaving(true);
    try {
      const { data: created } = await api.post("/staff", {
        name: newName.trim(),
        email,
        phoneNumber: newPhone.trim() || null,
        address: newAddress.trim() || null,
        userType: newType,
      });

      resetNewForm();
      await fetchStaff();

      // Offer to send the invite right away
      Modal.confirm({
        title: `Send the invite to ${email} now?`,
        content: canUseDashboard(created)
          ? "They will receive an e-mail with a link to create their password in the dashboard."
          : "They will receive a code to create their password in the staff app.",
        okText: "Send Invite",
        cancelText: "Not Now",
        onOk: () => sendInvite(created),
      });
    } catch (error) {
      console.error("Create staff error:", error);
      const status = error.response?.status;
      if (status === 409) {
        message.error(
          error.response.data?.error || "This email is already registered.",
        );
      } else if (status === 400 || status === 403) {
        // The API says exactly what is wrong (for example "Please enter a valid email address")
        message.error(
          error.response.data?.error ||
            "Please check the name and the email address.",
        );
      } else {
        message.error("Error saving the person.");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ──────────────────────────────────
     DEACTIVATE / REACTIVATE (people are never deleted from the app)
  ────────────────────────────────── */
  const showBlockedMessage = (error, fallback) => {
    console.error("Change status error:", error);
    const data = error.response?.data;
    if ([403, 409].includes(error.response?.status) && data?.error) {
      // The API says why (open routes, your own account, the last owner or manager...)
      alert(
        data.reasons?.length
          ? `${data.error}\n\n- ${data.reasons.join("\n- ")}`
          : data.error,
      );
    } else {
      alert(fallback);
    }
  };

  // The reason comes from the dialog (DeactivateModal)
  const confirmDeactivate = async ({ reason, note }) => {
    setDeactivating(true);
    try {
      await api.put(`/staff/${staffToDeactivate.id}/active`, {
        active: false,
        reason,
        note,
      });
      message.success("Person deactivated.");
      setStaffToDeactivate(null);
      await fetchStaff();
      setSelectedStaff(null);
    } catch (error) {
      setStaffToDeactivate(null);
      showBlockedMessage(error, "Failed to deactivate the person.");
    } finally {
      setDeactivating(false);
    }
  };

  const reactivate = async (staff) => {
    try {
      await api.put(`/staff/${staff.id}/active`, { active: true });
      message.success("Person reactivated.");
      await fetchStaff();
      setSelectedStaff(null);
    } catch (error) {
      showBlockedMessage(error, "Failed to reactivate the person.");
    }
  };

  /* ──────────────────────────────────
     RENDER
  ────────────────────────────────── */
  const statusTags = (staff) => (
    <>
      {!isActive(staff) && <Tag>Inactive</Tag>}
      {staff.registered && <Tag color="green">Registered</Tag>}
      {!staff.registered && staff.invited && <Tag color="blue">Invited</Tag>}
    </>
  );

  return (
    <div className={`app-page ${closeMenu ? "menu-closed" : "menu-open"}`}>
      {/* ───────────── LIST ───────────── */}
      {!selectedStaff && (
        <div>
          <div className="app-page-header">
            <h2 className="app-page-title">People</h2>
            <div className="app-page-controls">
              <Input
                placeholder="Filter by name or email"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ width: 240 }}
              />
              <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: `Active (${activeCount})`, value: "Active" },
                  { label: `Inactive (${inactiveCount})`, value: "Inactive" },
                  { label: `All (${staffList.length})`, value: "All" },
                ]}
              />
              {canCreate && (
                <Button
                  type="primary"
                  onClick={() => setIsNewModalVisible(true)}
                >
                  + New Person
                </Button>
              )}
            </div>
          </div>

          <div className="staff-list">
            {filteredStaff.map((staff) => (
              <div
                className={`staff-card ${isActive(staff) ? "" : "is-inactive"}`}
                key={staff.id}
              >
                <RemoteImage
                  path={staff.photo}
                  name={staff.name}
                  bucketName="profilePhotos"
                  className="staff-photo"
                />
                <div className="staff-details">
                  <div>
                    <div className="staff-name">
                      {staff.name || "(no name)"}
                    </div>
                    <div className="staff-email">{staff.email}</div>
                  </div>
                  <div className="staff-tags">
                    <Tag>{TYPE_LABELS[typeOf(staff)] || staff.userType}</Tag>
                    {statusTags(staff)}
                  </div>
                </div>
                <div className="staff-actions">
                  {isActive(staff) &&
                    !staff.registered &&
                    canManage(dbUser, staff) && (
                      <Button
                        size="small"
                        onClick={() => handleInviteClick(staff)}
                        type={staff.invited ? "default" : "primary"}
                      >
                        {staff.invited ? "Resend Invite" : "Invite"}
                      </Button>
                    )}
                  <button onClick={() => openStaff(staff)} title="Edit">
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                </div>
              </div>
            ))}
            {filteredStaff.length === 0 && (
              <p style={{ textAlign: "center", color: "#999" }}>
                Nobody matches.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ───────────── EDIT PAGE ───────────── */}
      {selectedStaff && (
        <div className="staff-edit-page">
          <div className="staff-header">
            <div className="staff-photo-wrap">
              <RemoteImage
                path={selectedStaff.photo}
                name={selectedStaff.name}
                bucketName="profilePhotos"
                className="staff-photo-lg"
                fullscreenOnClick
              />
            </div>
            <h2 className="staff-title">{selectedStaff.name || "(no name)"}</h2>
          </div>

          <div className="staff-body">
            {!canEditSelected && (
              <div className="staff-banner">
                {isSelf
                  ? "This is you: you can change your name, phone and address. Your account type and status are changed by the person above you."
                  : "You can look at this person, but you cannot change them: only an owner or a manager changes people of a lower level."}
              </div>
            )}
            {!isActive(selectedStaff) && (
              <div className="staff-banner">
                This person is inactive: they cannot sign in and are hidden from
                the lists. Reactivate them below to restore access.
                {selectedStaff.inactiveReason && (
                  <div>
                    <strong>Reason:</strong> {selectedStaff.inactiveReason}
                    {selectedStaff.inactiveNote
                      ? `: ${selectedStaff.inactiveNote}`
                      : ""}
                  </div>
                )}
              </div>
            )}

            <Card title="Basic Info" className="staff-card-block">
              <div className="staff-field">
                <label>Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canEditBasic}
                />
              </div>

              <div className="staff-field">
                <label>Email (read-only)</label>
                <Input value={selectedStaff.email || ""} readOnly />
              </div>

              <div className="staff-field">
                <label>Phone</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={!canEditBasic}
                />
              </div>

              <div className="staff-field">
                <label>Address</label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  disabled={!canEditBasic}
                />
              </div>

              <div className="staff-field">
                <label>Account type</label>
                <Select
                  value={editType}
                  onChange={setEditType}
                  options={typeOptions}
                  disabled={!canChangeType}
                />
                <small className="staff-hint">
                  Staff and drivers only use the Staff app. The owner, managers
                  and admins also use this dashboard.
                </small>
              </div>
            </Card>

            <Card title="Account" className="staff-card-block">
              <div className="staff-account-row">
                <div>
                  <div>
                    {selectedStaff.registered
                      ? "This person has created a password and can sign in."
                      : selectedStaff.invited
                        ? "An invite was sent. The person has not created a password yet."
                        : "No invite was sent yet."}
                  </div>
                </div>
                {canEditSelected &&
                  isActive(selectedStaff) &&
                  !selectedStaff.registered && (
                    <Button onClick={() => handleInviteClick(selectedStaff)}>
                      {selectedStaff.invited ? "Resend Invite" : "Send Invite"}
                    </Button>
                  )}
              </div>

              <div className="staff-account-row">
                <div>
                  Status:{" "}
                  <strong>
                    {isActive(selectedStaff) ? "Active" : "Inactive"}
                  </strong>
                </div>
                {canEditSelected &&
                  (isActive(selectedStaff) ? (
                    <Button
                      danger
                      onClick={() => setStaffToDeactivate(selectedStaff)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      onClick={() => reactivate(selectedStaff)}
                    >
                      Reactivate
                    </Button>
                  ))}
              </div>
            </Card>
          </div>

          <div className="staff-footer">
            {hasChanges && (
              <span className="staff-unsaved">You have unsaved changes</span>
            )}
            <Button
              icon={<FontAwesomeIcon icon={faArrowLeft} />}
              onClick={handleBackToList}
            >
              Back to list
            </Button>
            <Button
              type="primary"
              disabled={!hasChanges || !canEditBasic}
              loading={saving}
              onClick={handleSaveEdits}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      <DeactivateModal
        open={!!staffToDeactivate}
        title={`Deactivate ${staffToDeactivate?.name || staffToDeactivate?.email || ""}?`}
        intro="They will no longer be able to sign in and will disappear from the lists. Their history is kept, and you can reactivate them at any time."
        reasons={STAFF_REASONS}
        confirmLoading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setStaffToDeactivate(null)}
      />

      {/* ───────────── NEW PERSON MODAL ───────────── */}
      <Modal
        open={isNewModalVisible}
        onCancel={resetNewForm}
        onOk={handleSaveStaff}
        confirmLoading={saving}
        okText="Save"
        cancelText="Cancel"
        title="Register New Person"
        maskClosable={false}
      >
        <div className="staff-form">
          <div className="staff-field">
            <label>Name *</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="staff-field">
            <label>Email *</label>
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="staff-field">
            <label>Phone</label>
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="(optional)"
            />
          </div>
          <div className="staff-field">
            <label>Address</label>
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="(optional)"
            />
          </div>
          <div className="staff-field">
            <label>Account type</label>
            <Select
              value={newType}
              onChange={setNewType}
              options={assignableOptions}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StaffPage;
