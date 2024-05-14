import { StyleSheet } from "react-native";

export default StyleSheet.create({
  unreadCountContainer: {
    position: "absolute",
    top: -10,
    right: -10,
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
