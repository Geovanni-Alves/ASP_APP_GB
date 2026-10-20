import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
    paddingHorizontal: 10,
    paddingTop: 6,
  },

  // ---------------------------------------------------------------- search
  searchInput: {
    height: 42,
    backgroundColor: "#ffffff",
    borderColor: "#dee2e6",
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 14,
    marginTop: 10,
    marginBottom: 4,
  },

  // ---------------------------------------------------------------- today in one look
  banner: {
    backgroundColor: "#e6f4ea",
    borderRadius: 14,
    padding: 12,
    marginTop: -15,
  },
  bannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14532d",
  },
  bannerDay: {
    fontSize: 13,
    fontWeight: "600",
    color: "#14532d",
  },
  bannerText: {
    fontSize: 14,
    color: "#14532d",
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#e9ecef",
  },
  chipSelected: {
    backgroundColor: "#212529",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  // ---------------------------------------------------------------- the card of a student
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderLeftWidth: 5,
    borderLeftColor: "#dee2e6", // the colour of the state of the day (set on each card)
    padding: 12,
    marginVertical: 5,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#212529",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoButton: {
    paddingLeft: 8,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  // ---------------------------------------------------------------- the buttons of a card
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionHere: {
    borderColor: "#198754",
    backgroundColor: "#e6f4ea",
  },
  actionHereText: {
    color: "#198754",
  },
  actionHereLight: {
    borderColor: "#ced4da",
  },
  actionHereLightText: {
    color: "#6c757d",
  },
  actionOut: {
    borderColor: "#495057",
  },
  actionOutText: {
    color: "#495057",
  },
  actionFix: {
    borderColor: "#ced4da",
  },
  actionFixText: {
    color: "#6c757d",
  },
  actionUndo: {
    borderColor: "#b45309",
    backgroundColor: "#fef3c7",
  },
  actionUndoText: {
    color: "#b45309",
  },
});
