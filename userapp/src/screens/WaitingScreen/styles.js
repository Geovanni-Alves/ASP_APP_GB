import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  waveImage: {
    position: "absolute",
  },
  centeredTextWrapper: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: -40,
    position: "relative",
  },
  centeredText: {
    textAlign: "center",
    zIndex: 1,
  },
  userText: {
    fontSize: 20,
    marginBottom: 20,
  },
  parallelogramContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  parallelogram1: {
    backgroundColor: "rgb(2, 119, 247)",
    transform: [{ skewY: "7deg" }],
    width: "100%",
    height: 100,
    marginTop: -160,
  },
  parallelogram2: {
    width: "100%",
    height: 120,
    marginTop: -125,
  },
  callBtn: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "rgb(2, 119, 247)",
  },
  logoutButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: "center",
  },
  modalView: {
    margin: 60,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    top: 250,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 1,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 10,
    width: 100,
    alignItems: "center",
  },
  buttonClose: {
    backgroundColor: "green",
  },
  buttonConfirm: {
    backgroundColor: "red",
  },
  confirmLogoutText: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});
