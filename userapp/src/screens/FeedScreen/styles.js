import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
  },
  headerContainer: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FF7276",
    padding: 20,
    //paddingTop: 10,
  },
  containerMenu: {
    flexDirection: "row",
    alignItems: "center",
  },
  goBackIcon: {
    marginRight: 10,
    top: 15,
    left: -15,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  kidNameText: {
    color: "#ffff",
    fontSize: 17,
    fontWeight: "bold",
    position: "absolute",
  },
  kidDetailsContainer: {
    alignItems: "center",
    //marginVertical: 20,
    padding: 12,
    //borderRadius: 10,
    overflow: "hidden", // Ensure children don't overflow outside the container
  },
  KidImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  profileButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  profileButtonText: {
    color: "white",
    fontWeight: "bold",
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
  fullImage: {
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
});

export default styles;
