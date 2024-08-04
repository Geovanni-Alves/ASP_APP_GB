import { StyleSheet } from "react-native";

export default StyleSheet.create({
  mapContainer: {
    //paddingTop: 120,
    backgroundColor: "lightblue",
    flex: 1,
  },
  handleIndicator: {
    backgroundColor: "grey",
    width: 100,
  },
  handleIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 50,
  },
  routeDetailsText: {
    fontSize: 20,
    letterSpacing: 1,
  },
  deliveryDetailsContainer: {
    paddingHorizontal: 20,
  },
  restaurantName: {
    fontSize: 25,
    letterSpacing: 1,
    paddingVertical: 20,
  },
  addressContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  addressText: {
    fontSize: 20,
    color: "grey",
    fontWeight: "500",
    letterSpacing: 0.5,
    marginLeft: 15,
    textAlign: "center",
  },
  orderDetailsContainer: {
    borderTopWidth: 1,
    borderColor: "lightgrey",
    paddingTop: 20,
  },
  orderItemText: {
    fontSize: 18,
    color: "grey",
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  buttonContainer: {
    backgroundColor: "#3fc060",
    marginTop: "auto",
    marginVertical: 30,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  buttonDrive: {
    flex: 1,
    padding: 50,
    flexDirection: "row",
    position: "absolute",
    marginTop: 20,
    // bottom:10,
    alignSelf: "center",
    justifyContent: "space-between",
    backgroundColor: "red",
    borderWidth: 0.5,
    borderRadius: 100,
  },
  buttonDriveContainer: {
    alignItems: "center",
    marginTop: 1,
  },
  buttonText: {
    color: "white",
    paddingVertical: 15,
    fontSize: 25,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "gray",
    //position: 'absolute',
  },
  closeButton: {
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "red",
    padding: 10,
    borderRadius: 30, // Adjust the border radius as needed
  },
  closeButtonText: {
    color: "white", // Text color
    fontSize: 16,
    fontWeight: "bold",
  },
  callParentButton: {
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "#3fc060",
    padding: 30,
    borderRadius: 30, // Adjust the border radius as needed
  },
  callParentButtonText: {
    color: "white", // Text color
    fontSize: 25,
    fontWeight: "bold",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  continueButton: {
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "green",
    padding: 10,
    borderRadius: 30, // Adjust the border radius as needed
  },
  continueButtonText: {
    color: "white",
  },
  image: {
    width: 180,
    height: 200,
    flex: 1,
    resizeMode: "cover",
    borderRadius: 2,
    marginRight: 16,
  },
  zoomButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    //backgroundColor: "#FF7276",
    backgroundColor: "blue",
    borderRadius: 50,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContainer: {
    //flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    // width: '50%',
    padding: 10,
    borderColor: "gray", // Add border color
    borderWidth: 1, // Add border width
    marginBottom: 20, // Add margin to separate items
    borderRadius: 50,
  },
  itemText: {
    fontSize: 15,
  },
});
