import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  schoolName: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 25,
    color: "#FFFFFF",
  },
  studentsList: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  studentContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginHorizontal: 10,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 5,
  },
  studentName: {
    fontSize: 14,
    textAlign: "center",
    color: "black",
  },
  buttonContainer: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  touchableOpacityStyle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF7276",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  checkHeader: {
    width: "100%",
    height: "12%",
    backgroundColor: "#FF7276",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  filterContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterInput: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: "#333333",
  },
});
