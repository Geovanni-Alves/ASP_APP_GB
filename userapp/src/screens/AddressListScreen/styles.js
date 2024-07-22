import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
  },
  addressItem: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 3,
    borderWidth: 2,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  addressSubtitle: {
    fontSize: 14,
    color: "#555",
  },
  goBackIcon: {
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  saveButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginVertical: 10,
  },
  addButtonText: {
    fontSize: 18,
    color: "#fff",
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    marginVertical: 10,
  },
  defaultButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  defaultButtonText: {
    fontSize: 16,
    color: "#fff",
  },
  defaultIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 20,
    color: "gold",
  },
  defaultAddressItem: {
    borderColor: "gold",
  },
  defaultButtonActive: {
    backgroundColor: "#2196F3",
  },
  defaultButtonInactive: {
    backgroundColor: "gray",
  },
  currentButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  currentButtonActive: {
    backgroundColor: "#4CAF50",
  },
  currentButtonInactive: {
    backgroundColor: "gray",
  },
  currentButtonText: {
    fontSize: 16,
    color: "#fff",
  },
});

export default styles;
