import { View, Text, ScrollView } from "react-native";
import styles from "./styles";

// Read-only: the addresses of a child are created and changed in the dashboard (an address decides where
// the van goes, so it is checked there). The app only shows them.

// "123 Main St, Unit 4, Vancouver, BC, V5T 3E2"
const formatAddress = (address) =>
  [
    address.addressLine1,
    address.unitNumber ? `Unit ${address.unitNumber}` : null,
    address.city,
    address.province,
    address.zipCode,
  ]
    .filter((part) => part && String(part).trim() !== "")
    .join(", ");

const card = {
  borderWidth: 1,
  borderColor: "#dee2e6",
  borderRadius: 10,
  padding: 12,
  marginTop: 8,
  backgroundColor: "#ffffff",
};

const AddressCard = ({ address, current }) => (
  <View
    style={[
      card,
      current && { borderColor: "#198754", backgroundColor: "#f1faf4" },
    ]}
  >
    {!!address.houseName && (
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#212529" }}>
        {address.houseName}
      </Text>
    )}
    <Text style={{ fontSize: 14, color: "#212529", marginTop: 2 }}>
      {formatAddress(address)}
    </Text>
    {!!address.addressNotes && (
      <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 4 }}>
        {address.addressNotes}
      </Text>
    )}
    {current && (
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#198754",
          marginTop: 6,
        }}
      >
        ✔ Current drop-off address
      </Text>
    )}
  </View>
);

const AddressInfoScreen = ({ kid }) => {
  // An empty value counts as the Drop-Off service (the same rule as in the dashboard)
  const dropOffService = kid?.useDropOffService !== false;
  const addresses = kid?.addresses || [];
  const current = kid?.dropOffAddress || null;
  const others = addresses.filter((address) => address.id !== current?.id);

  return (
    <ScrollView style={styles.addressContainer}>
      <Text style={styles.detailLabel}>After class</Text>
      <Text style={styles.detailTextInput}>
        {dropOffService ? "Drop-off service" : "Parental pickup"}
      </Text>

      {!dropOffService && (
        <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 4 }}>
          A parent picks the child up at the ASP: the van does not take the
          child home.
        </Text>
      )}

      {/* The address the van goes to (Drop-off), or the address on file (Parental pickup) */}
      {current ? (
        <>
          <Text style={[styles.detailLabel, { marginTop: 16 }]}>
            {dropOffService ? "Current drop-off address" : "Address"}
          </Text>
          <AddressCard address={current} current={dropOffService} />
        </>
      ) : (
        <Text style={{ fontSize: 14, color: "#6c757d", marginTop: 16 }}>
          {dropOffService
            ? "No address yet. A manager adds it in the dashboard."
            : "No address on file."}
        </Text>
      )}

      {/* The other saved addresses (only the Drop-off service can have more than one) */}
      {dropOffService && others.length > 0 && (
        <>
          <Text style={[styles.detailLabel, { marginTop: 16 }]}>
            Other addresses
          </Text>
          {others.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </>
      )}

      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
        To add or change an address, use the dashboard.
      </Text>
    </ScrollView>
  );
};

export default AddressInfoScreen;
