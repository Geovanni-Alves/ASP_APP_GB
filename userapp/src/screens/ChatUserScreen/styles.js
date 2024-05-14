import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  goBackIcon: {
    position: "absolute",
    alignItems: "center",
    top: 45,
    left: -15,
    zIndex: 1,
  },
  containerMenu: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FF7276",
    padding: 20,
    maxHeight: "25%",
    paddingTop: 40,
    //gap: "100%",
  },
  headerContainer: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FF7276",
    padding: 20,
    //paddingTop: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  kidNameText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    position: "absolute",
  },
  bubbleWrapperRight: {
    backgroundColor: "#2e64e5",
  },
  bubbleTextRight: {
    color: "#fff",
  },
  sendIcon: {
    marginBottom: 5,
    marginRight: 5,
  },
  scrollToBottomIcon: {
    fontSize: 22,
    color: "#333",
  },
});
