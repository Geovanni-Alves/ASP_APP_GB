import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  minimizedHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f5f5f5",
    //backgroundColor: "yellow",
  },
  headerText: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
  },
  minimizedHeaderText: {
    fontSize: 14,
    marginLeft: 10,
    fontWeight: "bold",
  },

  fullHeaderContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    //backgroundColor: "#f5f5f5",
    //backgroundColor: "red",
  },
  separator: {
    height: 3,
    backgroundColor: "#ddd", // Light gray color for separator
    marginVertical: 2, // Space around separator
  },

  categoryText: {
    fontSize: 16,
    color: "#007BFF",
  },
  imageWrapper: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    //overflow: "hidden",
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
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 2,
  },
  editText: {
    top: -7,
    right: -2,
    fontSize: 12,
    color: "blue",
  },
  cameraContainer: {
    position: "absolute",
    bottom: -20, // Adjust this based on your UI
    right: -10,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flex: 1,
    padding: 20,
    //backgroundColor: "purple",
  },
  input: {
    fontSize: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginVertical: 10,
  },

  addressContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9f9f9", // Updated for clarity
    //backgroundColor: "red",
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
  dropOffButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 50,
  },
  dropOffButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default styles;
