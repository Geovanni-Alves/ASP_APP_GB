import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  activityIcons: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "space-between",
  },
  iconContainer: {
    flex: 1,
    alignItems: "center",
  },
  textIcon: {
    margin: 5,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  cameraIcon: {
    backgroundColor: "#c7c9c9",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  trophyIcon: {
    backgroundColor: "#FFD700",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  videoIcon: {
    backgroundColor: "#007BFF",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  patchIcon: {
    backgroundColor: "#FF6961",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: 200,
    marginTop: 20,
  },
  tagText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "bold",
  },
  kidTag: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    marginVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kidTagSelected: {
    backgroundColor: "#4F8EF7",
  },
  kidTagName: {
    fontSize: 16,
  },
});

export default styles;
