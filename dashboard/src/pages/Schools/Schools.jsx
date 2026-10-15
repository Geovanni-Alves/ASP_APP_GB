import React, { useEffect, useState } from "react";
import { Button, Input, Modal, Tag, message } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import api from "../../lib/api";
import { useKidsContext } from "../../contexts/KidsContext";
import AddressAutocomplete from "../../components/AddressAutocomplete/AddressAutocomplete";
import "./Schools.css";

// Schools: only a name and an address. The address is chosen from the search box (our API),
// which also gives the latitude and longitude the planner needs to draw the map.
function Schools({ closeMenu }) {
  const { kids } = useKidsContext();
  const [schools, setSchools] = useState([]);
  const [filter, setFilter] = useState("");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalKey, setModalKey] = useState(0); // a new key empties the address box every time
  const [editing, setEditing] = useState(null); // the school being edited (null = a new one)
  const [name, setName] = useState("");
  const [place, setPlace] = useState(null); // { address, lat, lng } of the chosen address
  const [saving, setSaving] = useState(false);

  /* ───────────── load ───────────── */
  const fetchSchools = async () => {
    try {
      const { data } = await api.get("/schools", { params: { order: "name" } });
      setSchools(data);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // Students that point to each school. Archived students count too: they still block a delete.
  const studentsOf = (schoolId) =>
    kids.filter((kid) => kid.schoolId === schoolId);

  const text = filter.trim().toLowerCase();
  const visibleSchools = schools.filter(
    (school) =>
      text === "" ||
      (school.name || "").toLowerCase().includes(text) ||
      (school.address || "").toLowerCase().includes(text),
  );

  /* ───────────── modal ───────────── */
  const closeModal = () => {
    setIsModalVisible(false);
    setEditing(null);
    setName("");
    setPlace(null);
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setPlace(null);
    setModalKey((key) => key + 1);
    setIsModalVisible(true);
  };

  const openEdit = (school) => {
    setEditing(school);
    setName(school.name || "");
    // Until a new address is chosen, the saved one stays
    setPlace({ address: school.address, lat: school.lat, lng: school.lng });
    setModalKey((key) => key + 1);
    setIsModalVisible(true);
  };

  const handlePlaceSelect = (selected) => {
    setPlace({
      address: selected.formatted_address,
      lat: selected.geometry.location.lat(),
      lng: selected.geometry.location.lng(),
    });
  };

  /* ───────────── save ───────────── */
  const handleSave = async () => {
    if (saving) return;

    const cleanName = name.trim();
    if (!cleanName) {
      message.warning("The school needs a name.");
      return;
    }
    if (!place?.address) {
      message.warning("Choose the address from the list.");
      return;
    }
    if (place.lat == null || place.lng == null) {
      // old schools may have an address but no position on the map
      message.warning(
        "This address has no map location. Search it again and choose it from the list.",
      );
      return;
    }
    const duplicate = schools.some(
      (school) =>
        school.id !== editing?.id &&
        (school.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (duplicate) {
      message.warning("There is already a school with this name.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      };
      if (editing) {
        await api.patch(`/schools/${editing.id}`, payload);
      } else {
        await api.post("/schools", payload);
      }
      message.success("Saved!");
      await fetchSchools();
      closeModal();
    } catch (error) {
      console.error("Error saving the school:", error);
      message.error("Failed to save the school.");
    } finally {
      setSaving(false);
    }
  };

  /* ───────────── delete (only a school nobody uses) ───────────── */
  const handleDelete = async (school) => {
    if (
      !window.confirm(
        `Delete ${school.name}?\n\nNo student uses this school, so nothing else is lost. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/schools/${school.id}`);
      message.success("School deleted.");
      await fetchSchools();
    } catch (error) {
      console.error("Error deleting the school:", error);
      if (error.response?.status === 409) {
        alert("A student still uses this school, so it cannot be deleted.");
      } else {
        alert("Failed to delete the school.");
      }
    }
  };

  /* ───────────── screen ───────────── */
  return (
    <div className={`app-page ${closeMenu ? "menu-closed" : "menu-open"}`}>
      <div className="app-page-header">
        <h2 className="app-page-title">List of Schools</h2>
        <div className="app-page-controls">
          <Input
            placeholder="Filter by name or address"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 260 }}
          />
          <Button type="primary" onClick={openNew}>
            + New School
          </Button>
        </div>
      </div>

      <div className="schools-grid">
        {visibleSchools.map((school) => {
          const students = studentsOf(school.id);
          const activeCount = students.filter(
            (kid) => kid.status !== "Inactive",
          ).length;
          const inactiveCount = students.length - activeCount;
          const noLocation = school.lat == null || school.lng == null;

          return (
            <div key={school.id} className="schools-card">
              <div className="schools-card-top">
                <div className="schools-badge">
                  {(school.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="schools-card-title">
                  <div className="schools-name">{school.name}</div>
                  <div className="schools-address">
                    <EnvironmentOutlined /> {school.address || "No address"}
                  </div>
                </div>
              </div>

              <div className="schools-tags">
                <Tag>
                  {activeCount} student{activeCount === 1 ? "" : "s"}
                </Tag>
                {inactiveCount > 0 && <Tag>{inactiveCount} inactive</Tag>}
                {noLocation && <Tag color="orange">No map location</Tag>}
              </div>

              <div className="schools-actions">
                {students.length === 0 && (
                  <Button
                    danger
                    type="text"
                    onClick={() => handleDelete(school)}
                  >
                    Delete
                  </Button>
                )}
                <Button onClick={() => openEdit(school)}>Edit</Button>
              </div>
            </div>
          );
        })}
        {visibleSchools.length === 0 && (
          <p className="schools-empty">No schools to show.</p>
        )}
      </div>

      <Modal
        title={editing ? "Edit School" : "New School"}
        open={isModalVisible}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        maskClosable={false}
      >
        <div className="schools-field">
          <label>School name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="For example: Lord Selkirk Elementary"
          />
        </div>

        <div className="schools-field">
          <label>Address</label>
          <AddressAutocomplete
            key={modalKey}
            defaultValue={editing?.address || ""}
            onPlaceSelect={handlePlaceSelect}
          />
          <small className="schools-hint">
            Type the address and choose it from the list: that also sets the
            place on the map.
          </small>
        </div>
      </Modal>
    </div>
  );
}

export default Schools;
