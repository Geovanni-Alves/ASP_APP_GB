import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  listContent: {
    justifyContent: "space-between",
  },
  searchBox: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  selectButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  selectButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  studentContainer: {
    padding: 8,
    margin: 5,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  imageContainer: {
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#c7c7c1",
  },
  selectedImageContainer: {
    borderWidth: 3,
    borderColor: "#18a32b",
    borderRadius: 50,
  },
  studentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  studentName: {
    fontSize: 14,
    textAlign: "center",
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#ccc", // Gray color when the button is disabled
  },

  nextButtonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
  },
});
