import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Card,
  Upload,
  Input,
  InputNumber,
  Segmented,
  Tag,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "../../lib/api";
import { uploadFile, deleteFile } from "../../lib/files";
import RemoteImage from "../../components/RemoteImage/RemoteImage";
import DeactivateModal from "../../components/DeactivateModal/DeactivateModal";
import { VAN_REASONS } from "../../lib/inactiveReasons";
import "./Vans.css";

const EMPTY_FORM = {
  name: "",
  plate: "",
  model: "",
  year: null,
  seats: null,
  boosterSeats: 0,
  image: "",
};

const isActive = (van) => van.active !== false;

function Vans({ closeMenu }) {
  const [vans, setVans] = useState([]);
  const [selectedVan, setSelectedVan] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [fileList, setFileList] = useState([]); // what the Upload box shows
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Active"); // "Active" | "Inactive" | "All"
  const [inUse, setInUse] = useState(new Set()); // ids of the vans that have route history
  const [vanToDeactivate, setVanToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  /* ──────────────────────────────────────────────────────────────── */
  /* Fetch                                                            */
  /* ──────────────────────────────────────────────────────────────── */
  const fetchVans = async () => {
    try {
      const { data } = await api.get("/vans", { params: { order: "name" } });
      setVans(data);

      // Which vans were ever used: those can only be deactivated, never deleted
      const { data: usage } = await api.get("/vans/usage");
      setInUse(new Set(usage.inUse));
    } catch (error) {
      console.error("Error fetching vans:", error);
    }
  };

  useEffect(() => {
    fetchVans();
  }, []);

  const activeCount = vans.filter(isActive).length;
  const inactiveCount = vans.length - activeCount;
  const visibleVans = vans.filter(
    (van) =>
      statusFilter === "All" ||
      (statusFilter === "Inactive" ? !isActive(van) : isActive(van)),
  );

  /* ──────────────────────────────────────────────────────────────── */
  /* Helpers                                                          */
  /* ──────────────────────────────────────────────────────────────── */
  // Booster seats can only use the seats that are left after the driver and the helper
  const maxBoosterSeats = Math.max((formValues.seats || 0) - 2, 0);

  const setField = (field, value) =>
    setFormValues((prev) => ({ ...prev, [field]: value }));

  // Forget the chosen photo AND what the Upload box shows. Before, the box kept the name of the
  // previous photo (it keeps its own list), so the next van looked as if it had the old photo.
  const clearPhoto = () => {
    setImageFile(null);
    setFileList([]);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setFormValues(EMPTY_FORM);
    clearPhoto();
    setSelectedVan(null);
  };

  const openNewVan = () => {
    setSelectedVan(null);
    setFormValues(EMPTY_FORM);
    clearPhoto();
    setIsModalVisible(true);
  };

  const openEditVan = (van) => {
    setSelectedVan(van);
    // Only the fields of the form (not id, active...)
    setFormValues({
      name: van.name || "",
      plate: van.plate || "",
      model: van.model || "",
      year: van.year ?? null,
      seats: van.seats ?? null,
      boosterSeats: van.boosterSeats ?? 0,
      image: van.image || "",
    });
    clearPhoto();
    setIsModalVisible(true);
  };

  /* ──────────────────────────────────────────────────────────────── */
  /* Create / Update                                                  */
  /* ──────────────────────────────────────────────────────────────── */
  const handleSaveVan = async () => {
    if (saving) return;
    if (!formValues.name.trim()) {
      message.warning("The van needs a name.");
      return;
    }

    setSaving(true);
    let uploadedName = null;
    try {
      // The server chooses the file name of the photo and returns it
      let imagePath = formValues.image || null;
      if (imageFile) {
        uploadedName = await uploadFile("vans", imageFile);
        imagePath = uploadedName;
      }

      const payload = {
        name: formValues.name.trim(),
        plate: formValues.plate.trim() || null,
        model: formValues.model.trim() || null,
        year: formValues.year ?? null,
        seats: formValues.seats ?? null,
        boosterSeats: Math.min(formValues.boosterSeats || 0, maxBoosterSeats),
        image: imagePath,
      };

      if (selectedVan) {
        await api.patch(`/vans/${selectedVan.id}`, payload);
      } else {
        await api.post("/vans", payload);
      }

      // The photo that was replaced is no longer used
      if (imageFile && selectedVan?.image) {
        deleteFile("vans", selectedVan.image).catch(() => {});
      }

      message.success("Saved!");
      await fetchVans();
      closeModal();
    } catch (error) {
      console.error("Error saving the van:", error);
      // The new photo was uploaded but the van was not saved: nothing points to the file, remove it
      if (uploadedName) {
        deleteFile("vans", uploadedName).catch(() => {});
      }
      message.error("Failed to save the van.");
    } finally {
      setSaving(false);
    }
  };

  /* ──────────────────────────────────────────────────────────────── */
  /* Deactivate (with a reason) / Reactivate / Delete (never used only) */
  /* ──────────────────────────────────────────────────────────────── */
  const showBlockedMessage = (error, fallback) => {
    const data = error.response?.data;
    if (error.response?.status === 409 && data?.error) {
      // The API says why (open routes, route history...)
      alert(
        data.reasons?.length
          ? `${data.error}\n\n- ${data.reasons.join("\n- ")}`
          : data.error,
      );
    } else {
      alert(fallback);
    }
  };

  const confirmDeactivate = async ({ reason, note }) => {
    setDeactivating(true);
    try {
      await api.put(`/vans/${vanToDeactivate.id}/active`, {
        active: false,
        reason,
        note,
      });
      message.success("Van deactivated.");
      setVanToDeactivate(null);
      await fetchVans();
    } catch (error) {
      console.error("Deactivate error:", error);
      setVanToDeactivate(null);
      showBlockedMessage(error, "Failed to deactivate the van.");
    } finally {
      setDeactivating(false);
    }
  };

  const reactivate = async (van) => {
    try {
      await api.put(`/vans/${van.id}/active`, { active: true });
      message.success("Van reactivated.");
      await fetchVans();
    } catch (error) {
      console.error("Reactivate error:", error);
      alert("Failed to reactivate the van.");
    }
  };

  // Only a van that was never used (a mistake) can be deleted; the API checks it again
  const handleDelete = async (van) => {
    if (
      !window.confirm(
        `Delete ${van.name}?\n\nThis van was never used, so nothing else is lost. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/vans/${van.id}`);
      message.success("Van deleted.");
      await fetchVans();
    } catch (error) {
      console.error("Delete error:", error);
      showBlockedMessage(error, "Failed to delete the van.");
    }
  };

  /* ──────────────────────────────────────────────────────────────── */
  /* UI                                                               */
  /* ──────────────────────────────────────────────────────────────── */
  return (
    <div
      className={`vans-container ${closeMenu ? "menu-closed" : "menu-open"}`}
    >
      <div className="vans-header">
        <h2>Van Management</h2>
        <div className="vans-controls">
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: `Active (${activeCount})`, value: "Active" },
              { label: `Inactive (${inactiveCount})`, value: "Inactive" },
              { label: `All (${vans.length})`, value: "All" },
            ]}
          />
          <Button type="primary" onClick={openNewVan}>
            + New Van
          </Button>
        </div>
      </div>

      <div className="van-list">
        {visibleVans.map((van) => (
          <Card
            title={
              <>
                {van.name}
                {!isActive(van) && <Tag style={{ marginLeft: 8 }}>Inactive</Tag>}
              </>
            }
            className={`van-card ${isActive(van) ? "" : "is-inactive"}`}
            key={van.id}
          >
            <RemoteImage
              path={van.image}
              name={van.name}
              bucketName="vans"
              className="van-photo"
            />
            <div className="van-details">
              <div>
                <strong>Plate:</strong> {van.plate || "-"}
              </div>
              <div>
                <strong>Total of seats:</strong> {van.seats ?? "-"}
              </div>
              <div>
                <strong>Seats for kids:</strong>{" "}
                {van.seats != null ? Math.max(van.seats - 2, 0) : "-"}
              </div>
              <div>
                <strong>Booster Seats:</strong> {van.boosterSeats ?? 0}
              </div>
            </div>
            {!isActive(van) && van.inactiveReason && (
              <div className="van-reason">
                {van.inactiveReason}
                {van.inactiveNote ? `: ${van.inactiveNote}` : ""}
              </div>
            )}
            <div className="van-actions">
              <Button onClick={() => openEditVan(van)}>Edit</Button>
              {isActive(van) ? (
                <Button danger onClick={() => setVanToDeactivate(van)}>
                  Deactivate
                </Button>
              ) : (
                <Button type="primary" onClick={() => reactivate(van)}>
                  Reactivate
                </Button>
              )}
              {!inUse.has(van.id) && (
                <Button danger type="text" onClick={() => handleDelete(van)}>
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
        {visibleVans.length === 0 && (
          <p className="van-empty">No vans in this list.</p>
        )}
      </div>

      <DeactivateModal
        open={!!vanToDeactivate}
        title={`Deactivate ${vanToDeactivate?.name || ""}?`}
        intro="It will disappear from the lists and cannot be used in new routes. Its route history is kept, and you can reactivate it at any time."
        reasons={VAN_REASONS}
        confirmLoading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setVanToDeactivate(null)}
      />

      {/* ──────── Modal ──────── */}
      <Modal
        title={selectedVan ? "Edit Van" : "Add New Van"}
        open={isModalVisible}
        onCancel={closeModal}
        onOk={handleSaveVan}
        confirmLoading={saving}
        okText="Save"
        maskClosable={false}
      >
        <div className="van-form-row">
          <label>Name</label>
          <Input
            value={formValues.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        <div className="van-form-row">
          <label>Plate</label>
          <Input
            value={formValues.plate}
            onChange={(e) => setField("plate", e.target.value)}
          />
        </div>

        <div className="van-form-row">
          <label>Model</label>
          <Input
            value={formValues.model}
            onChange={(e) => setField("model", e.target.value)}
          />
        </div>

        <div className="van-form-row">
          <label>Year</label>
          <InputNumber
            min={1980}
            max={2100}
            value={formValues.year}
            onChange={(value) => setField("year", value)}
          />
        </div>

        <div className="van-form-row">
          <label>Seats</label>
          <InputNumber
            min={0}
            max={30}
            value={formValues.seats}
            onChange={(value) => setField("seats", value)}
          />
        </div>

        <div className="van-form-row">
          <label>Booster Seats</label>
          <InputNumber
            min={0}
            max={maxBoosterSeats}
            value={Math.min(formValues.boosterSeats || 0, maxBoosterSeats)}
            onChange={(value) => setField("boosterSeats", value || 0)}
          />
          <small className="van-hint">
            Up to the seats left after the driver and the helper.
          </small>
        </div>

        <div className="van-form-row">
          <label>Photo</label>
          <Upload
            fileList={fileList}
            beforeUpload={(file) => {
              setImageFile(file);
              setFileList([file]); // only one photo: the new one replaces the old
              return false; // the photo is sent when you press Save
            }}
            onRemove={clearPhoto}
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Select Image</Button>
          </Upload>
          {formValues.image && !imageFile && (
            <small className="van-hint">Current photo: {formValues.image}</small>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default Vans;
