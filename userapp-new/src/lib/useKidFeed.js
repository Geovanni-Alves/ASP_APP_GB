// src/lib/useKidFeed.js
// The news of ONE child, newest first, in pages. The first page is read when the screen opens; the next pages
// when the person reaches the end of the list; and it looks again for new items now and then.
import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";
import { onFamilyPush } from "./pushEvents";

const PAGE = 30;

// Joins two lists of items without repeating any (by id), newest first
const mergeById = (a, b) => {
  const byId = new Map();
  [...a, ...b].forEach((item) => byId.set(item.id, item));
  return [...byId.values()].sort((x, y) => y.id - x.id);
};

export default function useKidFeed(kidId, { types, enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true); // only the FIRST load
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const busy = useRef(false);
  const started = useRef(false);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const fetchPage = useCallback(
    async (beforeId) => {
      const { data } = await api.get(`/parent/kids/${kidId}/feed`, {
        params: { limit: PAGE, beforeId, types },
      });
      return data;
    },
    [kidId, types],
  );

  // The first page (or a look for what is new). "silent": without the little spinner of the pull.
  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (busy.current) return;
      busy.current = true;
      if (!silent) setRefreshing(true);
      try {
        const data = await fetchPage(undefined);
        const first = !started.current;
        started.current = true;
        setItems((previous) => mergeById(previous, data));
        if (first) setHasMore(data.length === PAGE);
        setError(null);
      } catch (e) {
        console.log("Could not load the news:", e?.response?.data || e.message);
        setError(e);
      } finally {
        busy.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchPage],
  );

  // The next (older) page
  const loadMore = useCallback(async () => {
    const current = itemsRef.current;
    if (busy.current || !hasMore || current.length === 0) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const oldest = current[current.length - 1].id;
      const data = await fetchPage(oldest);
      setItems((previous) => mergeById(previous, data));
      setHasMore(data.length === PAGE);
    } catch (e) {
      console.log("Could not load more:", e?.response?.data || e.message);
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore]);

  // A push about a child arrived: the news are looked at again right now
  useEffect(
    () =>
      onFamilyPush(() => {
        if (started.current) refresh({ silent: true });
      }),
    [refresh],
  );

  // Starts when the screen (or the tab) is in front
  useEffect(() => {
    if (enabled && !started.current) refresh();
  }, [enabled, refresh]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  };
}
