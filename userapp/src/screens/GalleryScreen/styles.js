import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const imageSize = (width - 20) / 3; // 3 columns, with 10px margin on each side

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  goBackIcon: {
    marginLeft: 10,
  },
  imageContainer: {
    //flex: 1,
    margin: 2,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 0,
  },
  listContent: {
    paddingHorizontal: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 25,
    right: 10,
    zIndex: 9999, // Ensure the close button is on top
  },
  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
  emptyText: {
    fontSize: 18,
    color: "#757575",
  },
});
