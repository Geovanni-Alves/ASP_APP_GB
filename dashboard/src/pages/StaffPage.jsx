import React, { useEffect, useState } from "react";
import supabase from "../lib/supabase";
import "./StaffPage.css";
import RemoteImage from "../components/RemoteImage";
import { Button, Modal, Input, Card } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

function StaffPage({ closeMenu }) {
  /* ──────────────────────────────────
     LIST + FILTER
  ────────────────────────────────── */
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [filter, setFilter] = useState("");

  /* ──────────────────────────────────
     SELECTION + DIALOGS
  ────────────────────────────────── */
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);

  /* ──────────────────────────────────
     INVITE FORM
  ────────────────────────────────── */
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteAddress, setInviteAddress] = useState("");

  /* ──────────────────────────────────
     EDIT FORM (when selectedStaff)
  ────────────────────────────────── */
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRole, setEditRole] = useState("");

  /* ────────────────────────────────── */
  useEffect(() => fetchStaff(), []);

  async function fetchStaff() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("userType", "STAFF");

    if (!error) {
      setStaffList(data || []);
      setFilteredStaff(data || []);
    } else console.error("Fetch staff error:", error);
  }

  /* ──────────────────────────────────
     FILTER
  ────────────────────────────────── */
  function handleFilterChange(e) {
    const val = e.target.value.toLowerCase();
    setFilter(val);
    setFilteredStaff(
      staffList.filter((s) => s.name?.toLowerCase().includes(val))
    );
  }

  /* ──────────────────────────────────
     EDIT — populate fields
  ────────────────────────────────── */
  useEffect(() => {
    if (!selectedStaff) return;
    setEditName(selectedStaff.name || "");
    setEditPhone(selectedStaff.phoneNumber || "");
    setEditAddress(selectedStaff.address || "");
    setEditRole(selectedStaff.role || "");
  }, [selectedStaff]);

  async function handleSaveEdits() {
    if (!selectedStaff) return;
    const updates = {
      name: editName.trim(),
      phoneNumber: editPhone.trim() || null,
      address: editAddress.trim() || null,
      role: editRole.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", selectedStaff.id);

    if (!error) {
      alert("Staff updated!");
      await fetchStaff();
      setSelectedStaff(null);
    } else alert("Update failed.");
  }

  /* ──────────────────────────────────
     INVITE NEW STAFF
  ────────────────────────────────── */
  // async function handleSaveInvite() {
  //   const email = inviteEmail.trim().toLowerCase();
  //   if (!email || !inviteName.trim()) {
  //     return alert("Name and e-mail are required.");
  //   }

  //   try {
  //     const { data: existing } = await supabase
  //       .from("users")
  //       .select("id, userType")
  //       .eq("email", email)
  //       .single();

  //     const payload = {
  //       name: inviteName.trim(),
  //       phoneNumber: invitePhone.trim() || null,
  //       address: inviteAddress.trim() || null,
  //       userType: "STAFF",
  //       firstLogin: true,
  //       updated_at: new Date().toISOString(),
  //     };

  //     let userId;
  //     if (existing) {
  //       userId = existing.id;
  //       await supabase.from("users").update(payload).eq("id", userId);
  //     } else {
  //       const { data: created, error: createErr } = await supabase
  //         .from("users")
  //         .insert([{ ...payload, email }])
  //         .select()
  //         .single();
  //       if (createErr) throw createErr;
  //       userId = created.id;
  //     }

  //     const confirmInvite = window.confirm(`Send invite to ${email} now?`);
  //     if (confirmInvite) {
  //       const res = await fetch("http://localhost:3001/api/invite-contact", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ email, name: inviteName }),
  //       });
  //       const ok = res.ok;
  //       if (!ok) {
  //         const txt = await res.text();
  //         alert(txt || "Invite failed");
  //         return;
  //       }
  //       await supabase.from("users").update({ invited: true }).eq("id", userId);
  //       alert("Invite sent!");
  //     }
  //     fetchStaff();
  //     resetInviteForm();
  //   } catch (err) {
  //     console.error(err);
  //     alert("Invite error.");
  //   }
  // }

  async function handleSaveStaff() {
    /* 1️⃣  validate */
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !inviteName.trim()) {
      return alert("Name and e-mail are required.");
    }

    /* 2️⃣  upsert user row */
    const payload = {
      name: inviteName.trim(),
      phoneNumber: invitePhone.trim() || null,
      address: inviteAddress.trim() || null,
      userType: "STAFF",
      firstLogin: true,
      updated_at: new Date().toISOString(),
      email, // keep email in the table
    };

    try {
      // upsert by email
      const { data: upserted, error } = await supabase
        .from("users")
        .upsert(payload, { onConflict: "email" })
        .select()
        .single();

      if (error) throw error;

      /* 3️⃣  ask if they want to invite now */
      Modal.confirm({
        title: `Send onboarding invite to ${email}?`,
        okText: "Send Invite",
        cancelText: "Not Now",
        async onOk() {
          const res = await fetch("http://localhost:3001/api/invite-contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: inviteName }),
          });
          if (!res.ok) {
            const txt = await res.text();
            Modal.error({
              title: "Invite failed",
              content: txt || "Unknown error.",
            });
            return;
          }
          await supabase
            .from("users")
            .update({ invited: true })
            .eq("id", upserted.id);
          Modal.success({ title: "Invite sent!" });
          fetchStaff();
        },
      });

      /* 4️⃣  refresh list + reset form either way */
      fetchStaff();
      resetInviteForm();
    } catch (err) {
      console.error(err);
      Modal.error({ title: "Error saving staff member." });
    }
  }

  async function handleStaffInvite(staff) {
    if (!staff.email) return alert("No email on record.");

    const confirm = window.confirm(
      `${staff.invited ? "Resend" : "Send"} invite to ${staff.email}?`
    );
    if (!confirm) return;

    try {
      const res = await fetch("http://localhost:3001/api/invite-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: staff.email, name: staff.name }),
      });
      if (!res.ok) {
        alert("Invite failed.");
        return;
      }
      await supabase.from("users").update({ invited: true }).eq("id", staff.id);
      alert("Invite sent!");
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert("Invite error.");
    }
  }

  function resetInviteForm() {
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    setInviteAddress("");
    setIsInviteModalVisible(false);
  }

  /* ──────────────────────────────────
     DELETE
  ────────────────────────────────── */
  async function handleDelete() {
    if (!selectedStaff) return;
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", selectedStaff.id);
    if (!error) {
      alert("Deleted.");
      setSelectedStaff(null);
      setIsDeleteModalVisible(false);
      fetchStaff();
    } else alert("Delete failed.");
  }

  /* ──────────────────────────────────
     RENDER
  ────────────────────────────────── */
  return (
    <div
      className={`staff-container ${closeMenu ? "menu-closed" : "menu-open"}`}
    >
      {/* ───────────── LIST ───────────── */}
      {!selectedStaff && (
        <div>
          <h3 style={{ textAlign: "center" }}>Staff Members</h3>
          <div className="filters">
            <Input
              placeholder="Filter by name"
              value={filter}
              onChange={handleFilterChange}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              onClick={() => setIsInviteModalVisible(true)}
            >
              + New Staff
            </Button>
          </div>

          <div className="staff-list">
            {filteredStaff.map((staff) => (
              <div className="staff-card" key={staff.id}>
                <RemoteImage
                  path={staff.photo}
                  name={staff.name}
                  bucketName="profilePhotos"
                  className="staff-photo"
                />
                <div className="staff-details">
                  <div className="staff-name">
                    {staff.name || "(no name)"}
                    {staff.invited && (
                      <span className="invited-badge">Invited</span>
                    )}
                  </div>
                </div>
                <div className="staff-actions">
                  <Button
                    size="small"
                    onClick={() => handleStaffInvite(staff)}
                    type={staff.invited ? "default" : "primary"}
                  >
                    {staff.invited ? "Resend Invite" : "Invite"}
                  </Button>
                  <button onClick={() => setSelectedStaff(staff)}>
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStaff(staff);
                      setIsDeleteModalVisible(true);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────── EDIT PAGE ───────────── */}
      {selectedStaff && (
        <div className="staff-edit-page">
          <div className="staff-header">
            <RemoteImage
              path={selectedStaff.photo}
              name={selectedStaff.name}
              bucketName="profilePhotos"
              className="staff-photo-lg"
            />
            <h2>Edit Staff</h2>
            <Button
              icon={<FontAwesomeIcon icon={faArrowLeft} />}
              onClick={() => setSelectedStaff(null)}
            >
              Back to list
            </Button>
          </div>

          <Card className="form-item" title="Basic Info">
            <label>Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <label>Email (read-only)</label>
            <Input value={selectedStaff.email || ""} readOnly />

            <label>Phone</label>
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />

            <label>Address</label>
            <Input
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />

            <label>Role</label>
            <Input
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            />
          </Card>

          <div className="profile-actions">
            <Button type="primary" onClick={handleSaveEdits}>
              Save Changes
            </Button>
            <Button onClick={() => setSelectedStaff(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ───────────── MODALS ───────────── */}
      <Modal
        open={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        onOk={handleDelete}
        okText="Delete"
        okType="danger"
        cancelText="Cancel"
        title="Delete staff?"
      >
        <p>Delete {selectedStaff?.name || selectedStaff?.email} permanently?</p>
      </Modal>

      <Modal
        open={isInviteModalVisible}
        onCancel={() => setIsInviteModalVisible(false)}
        onOk={handleSaveStaff}
        okText="Save Staff"
        cancelText="Cancel"
        title="Register New Staff"
      >
        <div className="invite-form">
          <label>Name *</label>
          <Input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Full name"
          />
          <label>Email *</label>
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <label>Phone</label>
          <Input
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            placeholder="(optional)"
          />
          <label>Address</label>
          <Input
            value={inviteAddress}
            onChange={(e) => setInviteAddress(e.target.value)}
            placeholder="(optional)"
          />
        </div>
      </Modal>
    </div>
  );
}

export default StaffPage;
