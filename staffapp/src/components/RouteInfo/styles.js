import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 10,
    padding: 10,
    elevation: 5,
  },
  goBackButton: {
    backgroundColor: "red",
    width: 30, // Adjust the width and height as needed for your circle
    height: 30,
    borderRadius: 15, // Make the borderRadius half of the width/height to make it circular
    alignItems: "center",
    justifyContent: "center",
    left: 10,
    top: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  heading: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  infoColumn: {
    flex: 1,
    alignItems: "center",
    marginTop: 8,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 0,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  driverLabel: {
    fontWeight: "bold",
    marginRight: 5,
  },
  helperName: {
    fontSize: 12,
  },
  vehicleName: {
    fontSize: 13,
    fontWeight: "bold",
  },
  vehicleLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 5,
  },
  helperInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  helperLabel: {
    fontWeight: "bold",
    marginRight: 5,
  },
  driverName: {
    fontSize: 12,
  },
  driverAction: {
    paddingLeft: 5,
    fontSize: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 0,
  },
  addressText: {
    marginLeft: 20,
    fontSize: 12,
    marginBottom: 5,
  },
  kidName: {
    marginLeft: 20,
    fontSize: 16,
    color: "#007BFF", // Custom color for kid names
    marginBottom: 5,
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    //marginLeft: 0,
  },
  addressItem: {
    //marginBottom: 5,
    padding: 5,
  },
  addressItemText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  addressText: {
    fontSize: 13,
  },
  addressList: {
    marginTop: 10,
    //backgroundColor: "red",
    //borderRadius: 10,
    //zIndex: 2,
  },
  waypointInfo: {
    flexDirection: "row",

    padding: 5,
  },
  waypointName: { fontWeight: "bold" },
  waypointAddress: {
    fontSize: 13,
  },
});
