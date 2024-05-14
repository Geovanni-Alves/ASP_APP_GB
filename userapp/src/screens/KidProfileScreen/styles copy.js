import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  topContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
  },
  kidPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  initials: {
    fontSize: 48,
    color: "#555",
  },
  detailItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailLabel: {
    flex: 1,
    marginRight: 10,
    fontWeight: "bold",
  },
  detailText: {
    flex: 2,
  },
  separator: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 5,
  },
});

export default styles;
