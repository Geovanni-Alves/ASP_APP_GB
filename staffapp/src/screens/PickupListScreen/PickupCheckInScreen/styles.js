import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  header: {
    margin: 10,
  },
  headerText: {
    fontSize: 16,
    textAlign: "center",
  },

  stopCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,

    minHeight: 130,
  },
  absentBtn: {
    backgroundColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
    width: 110,
    height: "100%",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  stopCardAbsent: {
    backgroundColor: "#fde8e8",
    borderColor: "#dc3545",
    borderWidth: 2,
  },
  absentBanner: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ff7675",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  absentBannerText: {
    color: "#fff",
    fontWeight: "700",
  },
  absentBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  stopCardChecked: {
    backgroundColor: "#e8fbe8",
    borderLeftWidth: 6,
    borderLeftColor: "#28a745",
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 14,
    backgroundColor: "#f0f0f0",
  },

  infoContainer: {
    flex: 1,
  },

  kidName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },

  infoLine: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },

  gradeBadge: {
    backgroundColor: "#eef3ff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 8,
  },

  gradeBadgeText: {
    color: "#3b5bcc",
    fontWeight: "600",
    fontSize: 13,
  },

  actionButtons: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },

  actionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 90,
  },

  actionGreen: {
    backgroundColor: "#28a745",
  },

  actionRed: {
    backgroundColor: "#dc3545",
  },

  actionBlue: {
    backgroundColor: "#007bff",
  },

  btnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  checkedIconContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#28a745",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  checkedIcon: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },
  pickupDoneHeader: {
    backgroundColor: "#e6f4ea",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  pickupDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e7e34",
  },
  pickupDoneSubtext: {
    fontSize: 13,
    color: "#155724",
    marginTop: 4,
  },
});
