import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  containerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },

  routeContainer: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    marginBottom: 16,
    elevation: 2,
  },
  routeTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  containerTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  vanWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    elevation: 1,
  },
  vanImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
  },
  vanInfo: {
    flex: 1,
    justifyContent: "center",
  },
  vanTitle: {
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  userName: {
    fontSize: 14,
  },
});

export default styles;
