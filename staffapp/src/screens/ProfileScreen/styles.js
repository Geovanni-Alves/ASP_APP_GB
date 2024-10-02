import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    margin: 10,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  textAvatar: {
    //flex: 1,
    padding: 10,
    alignItems: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "500",
  },
  email: {
    fontSize: 12,
    color: "blue",
  },
  input: {
    marginLeft: 10,
    marginTop: 5,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
  },
  autoComplete: {
    // Add your GooglePlacesAutocomplete styles here
    container: {
      margin: 10,
      flex: 1,
    },
    textInput: {
      fontSize: 16,
    },
  },
  autoCompleteTextInputContainer: {
    flex: 1,
    paddingBottom: 20, // Adjust as needed
  },
  autoCompleteTextInput: {
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  autoCompleteListView: {
    maxHeight: 200, // Adjust as needed to fit the screen
  },
  phoneInputContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  phoneInputField: {
    //flex: 1,
    //backgroundColor: "red",
    //paddingVertical: 8,
  },
  okButton: {
    backgroundColor: "green",
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  okButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "blue",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    margin: 10,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "gray",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  signOutButton: {
    backgroundColor: "red",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    margin: 10,
    alignItems: "center",
  },
  userPhoto: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#ccc",
  },
  signOutButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  imageWrapper: {
    //flexDirection: "row",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 3,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  cameraIcon: {
    position: "absolute",
    bottom: -12,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 2,
  },
  inputContainer: {
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: "#333",
    paddingLeft: 11,
    marginBottom: 2,
  },
  imageContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 60,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FF7276",
    backgroundColor: "#FFF",
  },
  closeModalButton: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
  },
  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
});

export default styles;
