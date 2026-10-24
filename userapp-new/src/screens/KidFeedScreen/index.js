// src/screens/KidFeedScreen/index.js
// The news of one child ("Updates") and all its pictures and videos ("Gallery").
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SegmentedButtons } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import useKidFeed from "../../lib/useKidFeed";
import useProgramInfo from "../../lib/useProgramInfo";
import FeedItem from "../../components/FeedItem";
import MediaViewer from "../../components/MediaViewer";
import RemoteImage from "../../components/RemoteImage";
import VideoThumb from "../../components/VideoThumb";
import { useKidsContext } from "../../contexts/KidsContext";
import { useMessagesContext } from "../../contexts/MessagesContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomLoading from "../../components/CustomLoading";
import { dayKey, dayLabel } from "../../lib/today";

const GALLERY_TYPES = "PHOTO,VIDEO";
const LOOK_AGAIN_MS = 30000;

const KidFeedScreen = ({ route, navigation }) => {
  const { kidId } = route.params;
  const { width } = useWindowDimensions();

  // The name of the child is the title (also when this screen was opened by tapping a push)
  const { kids } = useKidsContext();
  const name = route.params?.name || kids.find((kid) => kid.id === kidId)?.name;
  const { unread } = useMessagesContext();
  const waiting = unread[kidId] || 0;
  useLayoutEffect(() => {
    navigation.setOptions({
      ...(name ? { title: name } : {}),
      // Write to the team about this child
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Chat", { kidId, name })}
          hitSlop={8}
          accessibilityLabel="Messages"
        >
          <MaterialCommunityIcons name="message-text-outline" size={26} color="#5337E0" />
          {waiting > 0 && (
            <View style={local.badge}>
              <Text style={local.badgeText}>{waiting > 9 ? "9+" : waiting}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, name, kidId, waiting]);

  // How many days the pictures and videos stay on the server (the API says it)
  const { mediaRetentionDays: retentionDays } = useProgramInfo();

  const [tab, setTab] = useState("updates");
  const [viewer, setViewer] = useState({ visible: false, media: [], index: 0 });

  const updates = useKidFeed(kidId, { enabled: true });
  const gallery = useKidFeed(kidId, {
    types: GALLERY_TYPES,
    enabled: tab === "gallery",
  });

  // While this screen is in front it looks for new items by itself
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        updates.refresh({ silent: true });
        if (tab === "gallery") gallery.refresh({ silent: true });
      }, LOOK_AGAIN_MS);
      return () => clearInterval(timer);
    }, [updates.refresh, gallery.refresh, tab]),
  );

  const openViewer = (media, index) =>
    setViewer({ visible: true, media, index });
  const closeViewer = () => setViewer((v) => ({ ...v, visible: false }));

  // The gallery: every picture and video of those items, one after the other
  const tiles = useMemo(
    () =>
      gallery.items.flatMap((item) =>
        (item.media || []).map((m) => ({ ...m, key: `${item.id}-${m.name}` })),
      ),
    [gallery.items],
  );

  const tileSize = Math.floor((width - 32 - 8) / 3);

  const renderUpdate = ({ item, index }) => {
    const previous = updates.items[index - 1];
    const showDay = index === 0 || dayKey(previous.dateTime) !== dayKey(item.dateTime);
    return (
      <View>
        {showDay && <Text style={local.day}>{dayLabel(item.dateTime)}</Text>}
        <FeedItem item={item} onOpenMedia={openViewer} retentionDays={retentionDays} />
      </View>
    );
  };

  const footer = (list) =>
    list.loadingMore ? (
      <ActivityIndicator style={{ marginVertical: 16 }} color="#5337E0" />
    ) : null;

  const empty = (list, text) => (
    <View style={local.center}>
      <Text style={local.emptyTitle}>
        {list.error ? "Could not load" : "Nothing here yet"}
      </Text>
      <Text style={local.emptyText}>
        {list.error ? "Check your connection and pull down to try again." : text}
      </Text>
    </View>
  );

  const current = tab === "updates" ? updates : gallery;

  return (
    <View style={local.screen}>
      <View style={local.tabs}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: "updates", label: "Updates" },
            { value: "gallery", label: "Gallery" },
          ]}
        />
      </View>

      {current.loading ? (
        <View style={local.center}>
          <CustomLoading imageSize={50} showContainer={false} />
        </View>
      ) : tab === "updates" ? (
        <FlatList
          data={updates.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUpdate}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          onEndReached={updates.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={footer(updates)}
          ListEmptyComponent={empty(updates, `${name || "Your child"} has no updates yet.`)}
          refreshControl={
            <RefreshControl refreshing={updates.refreshing} onRefresh={updates.refresh} />
          }
        />
      ) : (
        <FlatList
          key="gallery"
          data={tiles}
          numColumns={3}
          keyExtractor={(tile) => tile.key}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          columnWrapperStyle={{ gap: 4, marginBottom: 4 }}
          onEndReached={gallery.loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={local.keepHint}>
              Pictures and videos stay here for {retentionDays} days. Open one and
              tap the download button to keep it on your phone.
            </Text>
          }
          ListFooterComponent={footer(gallery)}
          ListEmptyComponent={empty(gallery, "No pictures or videos yet.")}
          refreshControl={
            <RefreshControl refreshing={gallery.refreshing} onRefresh={gallery.refresh} />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openViewer(tiles, index)}
              style={{ width: tileSize, height: tileSize }}
            >
              {item.kind === "video" ? (
                <VideoThumb
                  name={item.name}
                  style={{ width: tileSize, height: tileSize, borderRadius: 6 }}
                  iconSize={34}
                />
              ) : (
                <RemoteImage
                  path={item.name}
                  bucketName="feedPhotos"
                  style={{ width: tileSize, height: tileSize, borderRadius: 6 }}
                />
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <MediaViewer
        visible={viewer.visible}
        media={viewer.media}
        startIndex={viewer.index}
        onClose={closeViewer}
      />
    </View>
  );
};

const local = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  tabs: { paddingHorizontal: 16, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  day: {
    alignSelf: "center",
    fontSize: 12,
    color: "#6c757d",
    backgroundColor: "#e9ecef",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 8,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc3545",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  keepHint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1f2937" },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 6 },
});

export default KidFeedScreen;
