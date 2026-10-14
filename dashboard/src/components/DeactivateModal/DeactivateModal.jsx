import React, { useEffect, useState } from "react";
import { Modal, Select, Input } from "antd";

// Asks WHY something is being deactivated (a staff member, a van...).
// "reasons" is one of the lists in lib/inactiveReasons.js. "Other" needs a description.
//   <DeactivateModal open title intro reasons onConfirm={({ reason, note }) => ...} onCancel />
const DeactivateModal = ({
  open,
  title,
  intro,
  reasons,
  confirmLoading = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState(undefined);
  const [note, setNote] = useState("");

  // Start empty every time the dialog opens
  useEffect(() => {
    if (open) {
      setReason(undefined);
      setNote("");
    }
  }, [open]);

  const needsNote = reason === "Other";
  const canConfirm = !!reason && (!needsNote || note.trim().length > 0);

  return (
    <Modal
      open={open}
      title={title}
      okText="Deactivate"
      okType="danger"
      cancelText="Cancel"
      onCancel={onCancel}
      onOk={() => onConfirm({ reason, note: note.trim() })}
      okButtonProps={{ disabled: !canConfirm }}
      confirmLoading={confirmLoading}
      maskClosable={false}
    >
      {intro && <div style={{ marginBottom: 16 }}>{intro}</div>}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Reason
        </label>
        <Select
          style={{ width: "100%" }}
          placeholder="Select a reason"
          value={reason}
          onChange={setReason}
          options={reasons.map((item) => ({ value: item, label: item }))}
        />
      </div>

      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {needsNote ? "Describe the reason" : "Note (optional)"}
        </label>
        <Input.TextArea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default DeactivateModal;
