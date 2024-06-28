import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  headerContainer: {
    // Uncomment if needed
    // flex: 1,
    // justifyContent: "center",
  },
  topContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  goBackIcon: {
    marginLeft: 10,
  },
  imageWrapper: {
    flexDirection: "row",
    alignItems: "center",
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
  kidPhoto: {
    width: 120,
    height: 120,
  },
  addPhotoIcon: {},
  detailItemContainer: {
    flexDirection: "row",
    //justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  detailTextInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  separator: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 5,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#D3D3D3",
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingContainer: {
    position: "absolute",
    right: 40,
    top: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    // Uncomment if needed
    // marginTop: 10,
    fontSize: 13,
    color: "#000",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    zIndex: 9999,
  },
});

export default styles;
