import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    padding: 5,
  },
  headerContainer: {
    padding: 15,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
  },
  headerText: {
    marginTop: 23,
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  categoryText: {
    fontSize: 16,
    color: "#007BFF",
  },
  imageWrapper: {
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
    resizeMode: "contain",
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalButton: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "gray",
    borderRadius: 30,
    padding: 7,
  },
  goBackIcon: {
    paddingLeft: 14,
  },
  cameraIcon: {
    position: "absolute",
    bottom: -12,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 2,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ccc",
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ddd",
  },
  tabContainer: {
    flex: 1,
    paddingLeft: 20,
    padding: 5,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
  },
  detailItemContainer: {
    //marginBottom: 10,
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
    padding: 2,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 50,
    //marginBottom: 20,
  },
});

export default styles;
