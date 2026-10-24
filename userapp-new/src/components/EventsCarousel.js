// src/components/EventsCarousel.js
// "Upcoming events": cards that slide sideways (and move by themselves every few seconds). A tap opens the link
// of the event (the site of the program: more information, or to buy), when it has one.
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const COLORS = ["#5337E0", "#0d6efd", "#198754", "#d6336c"];
const GAP = 12;
const AUTO_MS = 6000;

// "2026-11-06" -> { month: "NOV", day: "6", full: "Friday, Nov 6" }
const partsOf = (value) => {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return {
    month: date.toLocaleDateString([], { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
    full: date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }),
  };
};

const EventsCarousel = ({ events }) => {
  const { width } = useWindowDimensions();
  const cardWidth = width - 32;
  const step = cardWidth + GAP;
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const listRef = useRef(null);

  // It moves by itself to the next card
  useEffect(() => {
    if (!events || events.length < 2) return undefined;
    const timer = setInterval(() => {
      const next = (pageRef.current + 1) % events.length;
      listRef.current?.scrollToOffset({ offset: next * step, animated: true });
      pageRef.current = next;
      setPage(next);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [events, step]);

  if (!events || events.length === 0) return null;

  const open = async (link) => {
    if (!link) return;
    try {
      await Linking.openURL(link);
    } catch (error) {
      Alert.alert("Could not open the link", "Please try again in a moment.");
    }
  };

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.title}>Upcoming events</Text>

      <FlatList
        ref={listRef}
        data={events}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        keyExtractor={(event) => String(event.id)}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / step);
          pageRef.current = index;
          setPage(index);
        }}
        renderItem={({ item, index }) => {
          const parts = partsOf(item.date);
          return (
            <TouchableOpacity
              activeOpacity={item.link ? 0.85 : 1}
              onPress={() => open(item.link)}
              style={[
                styles.card,
                { width: cardWidth, backgroundColor: COLORS[index % COLORS.length] },
              ]}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeMonth}>{parts.month}</Text>
                <Text style={styles.badgeDay}>{parts.day}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.date}>{parts.full}</Text>
                {!!item.link && (
                  <View style={styles.more}>
                    <Text style={styles.moreText}>More information</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#ffffff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {events.length > 1 && (
        <View style={styles.dots}>
          {events.map((event, i) => (
            <View key={String(event.id)} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
  },
  badge: {
    width: 56,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    marginRight: 14,
  },
  badgeMonth: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  badgeDay: { color: "#ffffff", fontSize: 24, fontWeight: "800", marginTop: 2 },
  name: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  date: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  more: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  moreText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ced4da" },
  dotActive: { backgroundColor: "#5337E0" },
});

export default EventsCarousel;
