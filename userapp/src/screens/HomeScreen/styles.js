import { StyleSheet } from "react-native";
export default StyleSheet.create({
  container: {
    flex: 1,
  },
  swiper: {
    //height: "10%",
    marginTop: "12%",
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
    backgroundColor: "#ccc",
  },
  activeDot: {
    backgroundColor: "blue",
  },
  welcomeContainer: {
    //flex: 1,
    //flexGrow: 1,
    marginTop: 5,
    marginLeft: 6,
  },
  date: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  currentTime: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 5,
  },
  dateTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF7276",
    marginBottom: 20,
  },
  eventHeader: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  eventContainer: {
    borderRadius: 15,
    overflow: "hidden",
    width: "90%",
    marginLeft: "auto",
    marginRight: "auto",
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  eventImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  eventDetails: {
    padding: 15,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#333",
  },
  eventDate: {
    fontSize: 16,
    color: "#555",
  },
  kidsContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 8,
    //width: "100%",
    marginLeft: "1%",
    marginRight: "3%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  iconsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    marginEnd: 5,
  },
  kidItem: {
    //backgroundColor: "lightgray",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "blue",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginLeft: 2,
  },
  kidImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  kidImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
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
  kidName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  messageIcon: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCountContainer: {
    position: "absolute",
    top: -10,
    right: -12,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  unreadCountText: {
    color: "red",
    fontSize: 18,
    fontWeight: "bold",
    padding: 1,
  },
  rightActionContainer: {
    //backgroundColor: "red",
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    //margin: 3,
    height: "80%",
    borderRadius: 10,
  },
  absentButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  absentButton: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    //marginLeft: ,
    borderRadius: 10,
  },
  undoButton: {
    backgroundColor: "lightgray",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    //marginLeft: ,
    borderRadius: 10,
  },
  undoButtonText: {
    color: "black",
    fontWeight: "bold",
    textAlign: "center",
  },
});
