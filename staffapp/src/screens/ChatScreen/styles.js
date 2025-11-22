import { StyleSheet } from "react-native";

export default StyleSheet.create({
  unreadCountContainer: {
    position: "absolute",
    top: 35,
    left: 40,
    backgroundColor: "red",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCountText: {
    color: "white",
    fontWeight: "bold",
  },
});
