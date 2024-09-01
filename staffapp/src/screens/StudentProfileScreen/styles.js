import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    padding: 5,
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
  detailItemContainer: {
    marginBottom: 12,
    // flexDirection: "row",
    // //justifyContent: "space-between",
    // alignItems: "center",
    // paddingVertical: 10,
    // paddingHorizontal: 20,
    // backgroundColor: "#FFF",
    // marginVertical: 5,
    // borderRadius: 8,
    // shadowColor: "#000",
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 2,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  detailTextInput: {
    fontSize: 16,
    color: "#555",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  separator: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 5,
  },
  addressContainer: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  dropOffAddressText: {
    fontSize: 16,
    flex: 1,
  },
  dropOffButton: {
    marginLeft: 10,
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    justifyContent: "center",
  },
  dropOffButtonText: {
    color: "#fff",
    fontSize: 16,
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
    flexDirection: "row",
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
    backgroundColor: "white",
    borderRadius: 15,
    padding: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 30,
    right: 20,
  },
  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
});

export default styles;
