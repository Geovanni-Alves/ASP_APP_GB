import { StyleSheet, Dimensions } from "react-native";
const { width, height } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    padding: 7,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  editButton: {
    padding: 5,
  },
  studentsContainer: {
    margin: 10,
    alignItems: "center",
    flexDirection: "row",
  },
  studentItem: {
    alignItems: "center",
    marginRight: 10,
  },
  studentImage: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginBottom: 5,
  },
  studentName: {
    fontSize: 10,
    textAlign: "center",
  },
  timeText: {
    fontSize: 16,
    marginBottom: 20,
  },
  noteContainer: {
    marginBottom: 10,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
  },
  mediaContainer: {
    marginBottom: 10,
  },
  trashIconContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#F5F5F5",
    marginLeft: 10,
    marginTop: 3,
    borderRadius: 20,
    padding: 5,
  },
  mediaLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  mediaImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    resizeMode: "contain",
  },
  cameraButton: {
    alignItems: "center",
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
  },
  closeModalButton: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
});
