import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  studentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  editButton: {
    marginLeft: 10,
  },
  beltContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginVertical: 20,
  },
  belt: {
    width: 200,
    height: 60,
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "column",
  },
  beltTopBottom: {
    height: 20,
    flex: 1,
  },
  beltMiddle: {
    height: 20,
  },
  stripesContainer: {
    position: "absolute",
    right: 10,
    flexDirection: "row",
  },
  stripe: {
    width: 10,
    height: 60,
    backgroundColor: "black",
    marginLeft: 5,
  },
  stripesText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 30,
  },
  button: {
    backgroundColor: "#000080",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  beltButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
    flexWrap: "wrap",
  },
  beltButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  beltButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    width: "90%",
    borderRadius: 10,
    maxHeight: 400, // Limit height to show only 6 kids at a time
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginBottom: 20,
    borderRadius: 10,
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
  },
  studentList: {
    alignItems: "center",
  },
  studentItem: {
    flex: 1,
    margin: 10, // Adjust margins for spacing
    alignItems: "center",
  },
  studentImage: {
    width: 50,
    height: 50,
    borderRadius: 40,
    borderColor: "#000",
    borderWidth: 1,
  },
  studentName: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  closeButton: {
    marginTop: 5,
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default styles;
