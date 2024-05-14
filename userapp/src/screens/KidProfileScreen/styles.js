import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    //flex: 1,
    backgroundColor: "#fff",
    height: "100%",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF7276",
    padding: 16,
  },
  safeAreaContainer: {
    backgroundColor: "#FF7276",
    //flex: 1,
  },
  topContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  goBackIcon: {
    position: "absolute",
    //marginRight: 2,
    //top: 10,
    // right: 12,
    top: 28,
    left: -15,
    zIndex: 1,
  },
  kidNameText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    //top: 10,
    zIndex: 1,
    position: "absolute",
  },
  containerMenu: {
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FF7276",
    //padding: 5,
    maxHeight: "25%",
    paddingTop: 43,
    //gap: "100%",
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  kidPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  initials: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#888888",
  },
  detailItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  detailTextInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 5,
    paddingHorizontal: 10,
  },

  placeholderText: {
    color: "black",
    fontSize: 20,
  },
  separator: {
    height: 1,
    backgroundColor: "#cccccc",
    marginVertical: 10,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#D3D3D3",
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 20,
  },
});

export default styles;
