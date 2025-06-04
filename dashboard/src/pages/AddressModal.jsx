import React, { useState, useEffect, useRef } from "react";
import { Modal, Input, Button } from "antd";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";

const AddressModal = ({ isVisible, onClose, onSave, addressToEdit }) => {
  const [addressData, setAddressData] = useState({
    houseName: "",
    addressLine1: "",
    addressNotes: "",
    unitNumber: "",
    city: "",
    province: "",
    zipCode: "",
    country: "",
    isDefault: false,
    lat: null,
    lng: null,
  });

  const autoCompleteRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      if (addressToEdit) {
        setAddressData(addressToEdit);
      } else {
        setAddressData({
          houseName: "",
          addressLine1: "",
          addressNotes: "",
          unitNumber: "",
          city: "",
          province: "",
          zipCode: "",
          country: "",
          isDefault: false,
          lat: null,
          lng: null,
        });

        // Reset Google input
        if (autoCompleteRef.current?.resetAutocompleteInput) {
          autoCompleteRef.current.resetAutocompleteInput();
        }
      }
    }
  }, [isVisible, addressToEdit]);

  const handleChange = (field, value) => {
    setAddressData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlaceSelect = (place) => {
    const addressComponents = place.address_components || [];
    const getComponent = (types) =>
      addressComponents.find((c) => types.some((t) => c.types.includes(t)))
        ?.long_name || "";

    const updated = {
      addressLine1: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      city: getComponent(["locality", "sublocality"]),
      province: getComponent(["administrative_area_level_1"]),
      zipCode: getComponent(["postal_code"]),
      country: getComponent(["country"]),
    };

    setAddressData((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const isFormComplete = [
    "addressLine1",
    "city",
    "province",
    "zipCode",
    "country",
  ].every((key) => addressData[key]?.trim());

  return (
    <Modal
      title={addressToEdit ? "Edit Address" : "Add Address"}
      open={isVisible}
      onCancel={onClose}
      onOk={() => onSave(addressData)}
      okText="Save"
      okButtonProps={{ disabled: !isFormComplete }}
    >
      <GoogleMapsAutocomplete
        onPlaceSelect={handlePlaceSelect}
        ref={autoCompleteRef}
      />

      <Input
        placeholder="House Name"
        value={addressData.houseName}
        onChange={(e) => handleChange("houseName", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Input
        placeholder="Address Line 1"
        value={addressData.addressLine1}
        onChange={(e) => handleChange("addressLine1", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Input
        placeholder="City"
        value={addressData.city}
        onChange={(e) => handleChange("city", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Input
        placeholder="Province"
        value={addressData.province}
        onChange={(e) => handleChange("province", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Input
        placeholder="Zip Code"
        value={addressData.zipCode}
        onChange={(e) => handleChange("zipCode", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Input
        placeholder="Country"
        value={addressData.country}
        onChange={(e) => handleChange("country", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Input.TextArea
        placeholder="Address Notes"
        value={addressData.addressNotes}
        onChange={(e) => handleChange("addressNotes", e.target.value)}
        style={{ marginTop: 8 }}
      />
    </Modal>
  );
};

export default AddressModal;
