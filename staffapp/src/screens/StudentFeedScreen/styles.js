import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
  },
  headerContainer: {
    alignItems: "center",
    padding: 5,
    overflow: "hidden",
  },
  KidImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40c7",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40c7",
    padding: 10,
    borderRadius: 5,
  },
  profileButtonText: {
    color: "white",
    margin: 2,
    fontWeight: "bold",
    textAlign: "center",
  },
  galleryButtonText: {
    color: "white",
    fontWeight: "bold",
    margin: 2,
    textAlign: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#757575",
    marginTop: 5,
  },
  feedItemContainer: {
    padding: 10,
    backgroundColor: "#f7f7f0",
    marginVertical: 2,
    borderRadius: 20,
    //flexDirection: "row",
    alignItems: "center",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconContainer: {
    marginRight: 10,
  },
  icon: {
    width: 30,
    height: 30,
  },
  textContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: "#212121",
  },
  image: {
    width: width - 20,
    height: 300,
    borderRadius: 10,
    alignSelf: "center",
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
  videoContainer: {
    position: "relative", // Ensure the container is relative to position the icon
    width: width - 20,
    height: 300,
    alignSelf: "center",
  },
  video: {
    width: width - 20,
    height: 300,
    borderRadius: 10,
    alignSelf: "center",
  },
  playIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 3,
  },
  touchableOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2, // Ensure the TouchableOpacity is above the video
  },
  fullImage: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
  fullVideo: {
    width: width - 20,
    height: height - 20,
    resizeMode: "contain",
  },
  separator: {
    height: 3,
    backgroundColor: "lightgrey",
  },
  contentContainer: {
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  actionButton: {
    alignItems: "center",
  },
  actionButtonText: {
    marginTop: 4,
    fontSize: 12,
  },
});

export default styles;
