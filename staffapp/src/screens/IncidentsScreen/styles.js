import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    padding: 7,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    width: 45,
    height: 45,
    borderRadius: 25,
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
    marginBottom: 20,
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
    height: 100,
    textAlignVertical: "top",
  },
  mediaContainer: {
    marginBottom: 20,
  },
  mediaLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  mediaImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
  },
  cameraButton: {
    alignItems: "center",
    marginBottom: 20,
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
});
