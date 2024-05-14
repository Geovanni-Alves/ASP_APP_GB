import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    //flex: 1,
    backgroundColor: "#fff",
    height: "100%",
  },
  safeAreaContainer: {
    backgroundColor: "#FF7276",
    //flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF7276",
    padding: 16,
  },
  containerMenu: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FF7276",
    //padding: 5,
    maxHeight: "25%",
    paddingTop: 43,
    //gap: "100%",
  },
  goBackIcon: {
    position: "absolute",
    //marginRight: 2,
    //top: 10,
    // right: 12,
    top: 28,
    left: -15,
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  kidNameText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    //top: 10,
    zIndex: 1,
    position: "absolute",
  },
  kidDetailsContainer: {
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#2287f4",
    padding: 20,
  },
  KidImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "lightgray",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  placeholderText: {
    color: "white",
  },
  feedItemContainer: {
    marginBottom: 10,
  },
  dateContainer: {
    backgroundColor: "gray",
    padding: 3,
    alignSelf: "stretch",
    borderRadius: 5,
    marginBottom: 10,
  },
  dateText: {
    color: "white",
    fontWeight: "bold",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 10,
  },
  icon: {
    marginRight: 10,
  },
  itemText: {
    flex: 1,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: "cover",
  },
  profileButton: {
    marginLeft: 20,
    padding: 10,
    backgroundColor: "#FF7276",
    borderRadius: 5,
  },
  profileButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
