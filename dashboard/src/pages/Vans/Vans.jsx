import React, { useEffect, useState } from "react";
import { Modal, Button, Card, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import supabase from "../../lib/supabase";
import RemoteImage from "../../components/RemoteImage/RemoteImage";
import { InputNumber } from "antd";
import "./Vans.css";

function Vans({ closeMenu }) {
  const [vans, setVans] = useState([]);
  const [selectedVan, setSelectedVan] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    plate: "",
    model: "",
    year: "",
    seats: "",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);

  /* ──────────────────────────────────────────────────────────────── */
  /* Fetch                                                            */
  /* ──────────────────────────────────────────────────────────────── */
  const fetchVans = async () => {
    const { data, error } = await supabase.from("vans").select("*");
    if (!error) setVans(data);
  };
  useEffect(() => {
    fetchVans();
  }, []);

  /* ──────────────────────────────────────────────────────────────── */
  /* Helpers                                                          */
  /* ──────────────────────────────────────────────────────────────── */
  const resetForm = () => {
    setFormValues({
      name: "",
      plate: "",
      model: "",
      year: "",
      seats: "",
      image: "",
    });
    setImageFile(null);
    setSelectedVan(null);
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return formValues.image; // no change
    const fileName = `van-${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage
      .from("vans")
      .upload(fileName, imageFile, { upsert: false });
    if (error) throw error;
    return fileName; // path stored in DB
  };

  /* ──────────────────────────────────────────────────────────────── */
  /* Create / Update                                                  */
  /* ──────────────────────────────────────────────────────────────── */
  const handleSaveVan = async () => {
    try {
      const imagePath = await uploadImageIfNeeded();
      const payload = { ...formValues, image: imagePath };

      let result;
      if (selectedVan) {
        result = await supabase
          .from("vans")
          .update(payload)
          .eq("id", selectedVan.id);
      } else {
        result = await supabase.from("vans").insert([payload]);
      }

      if (result.error) throw result.error;
      message.success("Saved!");
      fetchVans();
      setIsModalVisible(false);
      resetForm();
    } catch (err) {
      console.error(err);
      message.error(err.message || "Upload failed");
    }
  };

  /* ──────────────────────────────────────────────────────────────── */
  /* Delete                                                           */
  /* ──────────────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this van?")) return;
    await supabase.from("vans").delete().eq("id", id);
    fetchVans();
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
        <Button type="primary" onClick={() => setIsModalVisible(true)}>
          + New Van
        </Button>
      </div>

      <div className="van-list">
        {vans.map((van) => (
          <Card title={van.name} className="list-vans-card" key={van.id}>
            <RemoteImage
              path={van.image}
              name={van.name}
              bucketName="vans"
              className="van-photo"
            />
            <div className="van-details">
              <div>
                <strong>Plate:</strong> {van.plate}
              </div>
              <div>
                <strong>Total of seats:</strong> {van.seats}
              </div>
              <div>
                <strong>Seats for kids:</strong> {van.seats - 2}
              </div>
              <div>
                <strong>Booster Seats:</strong> {van.boosterSeats}
              </div>
            </div>
            <div className="van-actions">
              <Button
                onClick={() => {
                  setSelectedVan(van);
                  setFormValues(van);
                  setIsModalVisible(true);
                }}
              >
                Edit
              </Button>
              <Button danger onClick={() => handleDelete(van.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* ──────── Modal ──────── */}
      <Modal
        title={selectedVan ? "Edit Van" : "Add New Van"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          resetForm();
        }}
        onOk={handleSaveVan}
        okText="Save"
      >
        {[
          { name: "name", label: "Name" },
          { name: "plate", label: "Plate" },
          { name: "model", label: "Model" },
          { name: "year", label: "Year", type: "number" },
          { name: "seats", label: "Seats", type: "number" },
          { name: "boosterSeats", label: "Booster Seats", type: "increment" },
        ].map((field) => (
          <div key={field.name} className="form-row">
            <label>{field.label}</label>
            {field.type === "increment" ? (
              <InputNumber
                min={0}
                max={
                  parseInt(formValues.seats || 0, 10) > 2
                    ? parseInt(formValues.seats || 0, 10) - 2
                    : 0
                }
                value={formValues[field.name] || 0}
                onChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [field.name]: value,
                  }))
                }
              />
            ) : (
              <input
                type={field.type || "text"}
                value={formValues[field.name]}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
              />
            )}
          </div>
        ))}

        <div className="form-row">
          <label>Photo</label>
          <Upload
            beforeUpload={(file) => {
              setImageFile(file);
              return false;
            }}
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Select Image</Button>
          </Upload>
          {formValues.image && !imageFile && (
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Current file: {formValues.image}
            </p>
          )}
          {imageFile && (
            <p style={{ fontSize: 12, marginTop: 4 }}>
              New file: {imageFile.name}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default Vans;
