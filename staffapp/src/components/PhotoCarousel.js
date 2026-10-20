// src/components/PhotoCarousel.js
// Several photos of ONE feed item, stacked: swipe sideways, with "1/5" and dots.
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import RemoteImage from "./RemoteImage";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function PhotoCarousel({
  photos,
  bucketName = "feedPhotos",
  height = 300,
  onPress, // (photo, index) => void : a tap on a photo
}) {
  const [measured, setMeasured] = useState(0); // the width this item has on the screen
  const [index, setIndex] = useState(0); // the photo that is showing

  // A photo is never wider than the screen: even if the width was measured wrong, the item
  // cannot grow and push the rest of the feed away
  const width = Math.min(measured, SCREEN_WIDTH);

  return (
    <View
      style={local.root}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (Math.abs(next - measured) > 1) setMeasured(next);
      }}
    >
      {width > 0 && (
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width, height }} // fixed size: the list never stretches by itself
          keyExtractor={(name) => name}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item, index: position }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ width, height }}
              onPress={() => onPress && onPress(item, position)}
            >
              <RemoteImage
                path={item}
                bucketName={bucketName}
                style={{ width, height }}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Which photo it is: 1/5 */}
      <View style={local.counter}>
        <Text style={local.counterText}>
          {index + 1}/{photos.length}
        </Text>
      </View>

      {/* The dots */}
      <View style={local.dots}>
        {photos.map((name, position) => (
          <View
            key={name}
            style={[local.dot, position === index && local.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  // The width comes from the PARENT (100%), never from what is inside: that is what keeps the item
  // from growing with the number of photos
  root: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
  },
  counter: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  counterText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ced4da",
  },
  dotActive: {
    backgroundColor: "#212529",
  },
});
