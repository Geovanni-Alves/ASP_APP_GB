// src/components/FeedItem.js
// One item of the news of a child: what happened, when, who posted it, and its pictures or videos.
import React, { useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RemoteImage from "./RemoteImage";
import VideoThumb from "./VideoThumb";
import { timeOf } from "../lib/today";

const TYPES = {
  ATTENDANCE: { icon: "calendar-check", color: "#0a58ca" },
  PHOTO: { icon: "camera", color: "#5337E0" },
  VIDEO: { icon: "video", color: "#5337E0" },
  ACTIVITY: { icon: "run", color: "#198754" },
  PROMOTION: { icon: "bullhorn", color: "#b26a00" },
  INCIDENT: { icon: "alert-circle", color: "#b02a37" },
};

const headlineOf = (item) => {
  const count = item.media?.length || 0;
  switch (item.type) {
    case "ATTENDANCE":
      return item.notes || "Attendance";
    case "PHOTO":
      return count > 1 ? `${count} new photos` : "New photo";
    case "VIDEO":
      return count > 1 ? `${count} new videos` : "New video";
    case "ACTIVITY":
      return "Activity";
    case "PROMOTION":
      return "Promotion";
    case "INCIDENT":
      return "Incident report";
    default:
      return "Update";
  }
};

// The pictures of the item, side by side (swipe); a tap opens them in full screen
const MediaPager = ({ media, width, onOpen }) => {
  const [page, setPage] = useState(0);
  const height = Math.round(width * 0.75);

  return (
    <View style={{ marginTop: 10 }}>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m, i) => `${m.name}-${i}`}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onOpen(index)}
            style={{ width, height }}
          >
            {item.kind === "video" ? (
              <VideoThumb
                name={item.name}
                style={{ width, height, borderRadius: 10 }}
                iconSize={64}
              />
            ) : (
              <RemoteImage
                path={item.name}
                bucketName="feedPhotos"
                style={{ width, height, borderRadius: 10 }}
              />
            )}
          </TouchableOpacity>
        )}
      />
      {media.length > 1 && (
        <View style={local.counter}>
          <Text style={local.counterText}>
            {page + 1}/{media.length}
          </Text>
        </View>
      )}

      {/* The dots */}
      {media.length > 1 && (
        <View style={local.dots}>
          {media.map((m, i) => (
            <View
              key={`${m.name}-${i}`}
              style={[local.dot, i === page && local.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const FeedItem = ({ item, onOpenMedia }) => {
  const { width: screen } = useWindowDimensions();
  const type = TYPES[item.type] || { icon: "information", color: "#6c757d" };
  const incident = item.type === "INCIDENT";
  const mediaWidth = screen - 32 - 28; // the margins of the list and of the card
  const body = item.type === "ATTENDANCE" ? null : item.notes;

  return (
    <View style={[local.card, incident && local.incident]}>
      <View style={local.row}>
        <View style={[local.iconBox, { backgroundColor: `${type.color}1A` }]}>
          <MaterialCommunityIcons name={type.icon} size={22} color={type.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[local.headline, incident && { color: type.color }]}>
            {headlineOf(item)}
          </Text>
          <Text style={local.meta}>
            {timeOf(item.dateTime)}
            {item.by?.name ? ` · ${item.by.name}` : ""}
          </Text>
        </View>
      </View>

      {!!body && <Text style={local.body}>{body}</Text>}

      {item.media?.length > 0 && (
        <MediaPager
          media={item.media}
          width={mediaWidth}
          onOpen={(index) => onOpenMedia(item.media, index)}
        />
      )}
    </View>
  );
};

const local = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  incident: { borderWidth: 1.5, borderColor: "#f1aeb5" },
  row: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headline: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  meta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  body: { fontSize: 15, color: "#374151", marginTop: 10, lineHeight: 21 },
  dots: { flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ced4da" },
  dotActive: { backgroundColor: "#5337E0" },
  counter: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  counterText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});

export default FeedItem;
