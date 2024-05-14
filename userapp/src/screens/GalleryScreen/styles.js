// GalleryStyles.js

import { StyleSheet } from "react-native";

const primaryColor = "#FF7276";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  containerMenu: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FF7276",
    padding: 20,
    maxHeight: "25%",
    paddingTop: 40,
  },
  profileContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  profileImage: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 5,
    borderColor: "white",
    backgroundColor: "white",
  },
  profileInfoContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  profileName: {
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 10,
  },
  actionButton: {
    marginRight: 15,
  },
  reportButton: {
    color: "red",
  },
  picturesHeader: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    marginLeft: 20,
    textAlign: "center",
  },
  pictureContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  pictureImage: {
    width: 350,
    height: 350,
    borderRadius: 10,
  },
  pictureDate: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
