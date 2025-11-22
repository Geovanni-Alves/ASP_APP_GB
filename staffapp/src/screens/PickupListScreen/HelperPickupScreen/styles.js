import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  stopCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  infoContainer: {
    flex: 1,
  },
  kidName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  schoolName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10, // funciona no RN >=0.71, senão usar marginRight
  },
  actionBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
