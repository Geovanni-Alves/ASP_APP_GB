import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 12,
    textAlign: "center",
  },

  // -----------------------
  // Route leg card
  // -----------------------
  legCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },

  // Current leg highlight
  legCurrent: {
    backgroundColor: "#e6f4ea",
    borderColor: "#198754",
  },

  // Completed leg
  legCompleted: {
    backgroundColor: "#f1f3f5",
    borderColor: "#ced4da",
  },

  // -----------------------
  // Card content
  // -----------------------
  legTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },

  arrivedBtn: {
    marginTop: 10,
    backgroundColor: "#198754", // green
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  arrivedText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  legAddress: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 8,
  },

  legStatus: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "#e9ecef",
    color: "#495057",
    marginBottom: 10,
  },

  // -----------------------
  // Navigate button
  // -----------------------
  navigateBtn: {
    backgroundColor: "#0d6efd",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  navigateText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
