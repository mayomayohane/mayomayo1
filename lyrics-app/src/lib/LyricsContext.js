// 「保存した歌詞」「アルバム」「通知の設定」を、どの画面からでも使えるようにする仕組み。
// React の Context（コンテキスト）を使うと、画面をまたいでデータを共有できます。
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  cleanLyricFields,
  createLyric,
  defaultSettings,
  loadAlbums,
  loadLyrics,
  loadSettings,
  newId,
  saveAlbums,
  saveLyrics,
  saveSettings,
} from './storage';
import { rescheduleNotifications } from './notifications';
import { openLyricLink } from './musicLinks';

const LyricsContext = createContext(null);

// 最後に開いた通知の番号。同じ通知で曲が何度も開かないように覚えておく。
const LAST_OPENED_KEY = 'lastOpenedNotification:v1';

export function LyricsProvider({ children }) {
  const [lyrics, setLyricsState] = useState([]);
  const [albums, setAlbumsState] = useState([]);
  const [settings, setSettingsState] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // ボタンを素早く連打しても最新の値で計算できるよう、ref（最新値の控え）も持っておく。
  const lyricsRef = useRef(lyrics);
  const albumsRef = useRef(albums);
  const settingsRef = useRef(settings);
  const setLyrics = (next) => {
    lyricsRef.current = next;
    setLyricsState(next);
  };
  const setAlbums = (next) => {
    albumsRef.current = next;
    setAlbumsState(next);
  };
  const setSettings = (next) => {
    settingsRef.current = next;
    setSettingsState(next);
  };

  // 通知をタップしたとき、対応する歌詞の曲（URLか検索画面）を開く。
  const openFromResponse = useCallback(async (response) => {
    if (!response) return;
    const id = response.notification.request.identifier;
    const last = await AsyncStorage.getItem(LAST_OPENED_KEY).catch(() => null);
    if (last === id) return;
    await AsyncStorage.setItem(LAST_OPENED_KEY, id).catch(() => {});

    const { lyricId } = response.notification.request.content.data ?? {};
    const lyric = lyricsRef.current.find((l) => l.id === lyricId);
    if (!lyric) return;
    await openLyricLink(lyric, settingsRef.current.musicApp).catch((e) => console.warn(e));
  }, []);

  // アプリ起動時に、保存してあるデータを読み込む。
  useEffect(() => {
    (async () => {
      const [savedLyrics, savedAlbums, savedSettings] = await Promise.all([
        loadLyrics(),
        loadAlbums(),
        loadSettings(),
      ]);
      setLyrics(savedLyrics);
      setAlbums(savedAlbums);
      setSettings(savedSettings);
      setLoaded(true);
      // 起動のたびに通知の予約を作り直して、先30日分を保つ。
      rescheduleNotifications(savedLyrics, savedSettings).catch(console.warn);

      // 通知をタップしてアプリを開いた場合は、その曲を開く。
      if (Platform.OS !== 'web') {
        const response = await Notifications.getLastNotificationResponseAsync().catch(() => null);
        openFromResponse(response);
      }
    })();
  }, [openFromResponse]);

  // アプリを開いている最中に通知をタップした場合も、同じ処理をする。
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => sub.remove();
  }, [openFromResponse]);

  // 歌詞が変わったら、通知の予約も作り直す（届ける候補が変わるため）。
  const commitLyrics = useCallback(async (next) => {
    setLyrics(next);
    await saveLyrics(next);
    rescheduleNotifications(next, settingsRef.current).catch(console.warn);
  }, []);

  const addLyric = useCallback(
    async (input) => {
      await commitLyrics([createLyric(input), ...lyricsRef.current]);
    },
    [commitLyrics]
  );

  // 保存済みの歌詞の内容を書き換える（作成日・アルバムはそのまま、更新日を記録する）。
  const updateLyric = useCallback(
    async (id, input) => {
      await commitLyrics(
        lyricsRef.current.map((l) =>
          l.id === id
            ? { ...l, ...cleanLyricFields(input), updatedAt: new Date().toISOString() }
            : l
        )
      );
    },
    [commitLyrics]
  );

  const removeLyric = useCallback(
    async (id) => {
      await commitLyrics(lyricsRef.current.filter((l) => l.id !== id));
    },
    [commitLyrics]
  );

  // アルバムを作る。
  const addAlbum = useCallback(async (name) => {
    const album = { id: newId(), name: name.trim(), createdAt: new Date().toISOString() };
    const next = [...albumsRef.current, album];
    setAlbums(next);
    await saveAlbums(next);
    return album;
  }, []);

  // アルバムを削除する。歌詞からは外れるが、歌詞自体は消えない。
  // そのアルバムから届ける設定の時刻は、「全部の歌詞から」に戻す。
  const deleteAlbum = useCallback(async (albumId) => {
    const nextAlbums = albumsRef.current.filter((a) => a.id !== albumId);
    setAlbums(nextAlbums);
    await saveAlbums(nextAlbums);

    const nextLyrics = lyricsRef.current.map((l) =>
      (l.albumIds ?? []).includes(albumId)
        ? { ...l, albumIds: l.albumIds.filter((x) => x !== albumId) }
        : l
    );
    await commitLyrics(nextLyrics);

    const nextSettings = {
      ...settingsRef.current,
      alarms: settingsRef.current.alarms.map((a) =>
        a.pool?.type === 'album' && a.pool.albumId === albumId ? { ...a, pool: { type: 'all' } } : a
      ),
    };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    rescheduleNotifications(nextLyrics, nextSettings).catch(console.warn);
  }, [commitLyrics]);

  // 指定したアルバムに入る歌詞を、まとめて決める（選ばれたものは入り、外れたものは出る）。
  const setAlbumLyrics = useCallback(
    async (albumId, lyricIds) => {
      const wanted = new Set(lyricIds);
      await commitLyrics(
        lyricsRef.current.map((l) => {
          const has = (l.albumIds ?? []).includes(albumId);
          const want = wanted.has(l.id);
          if (has === want) return l;
          const albumIds = want
            ? [...(l.albumIds ?? []), albumId]
            : l.albumIds.filter((x) => x !== albumId);
          return { ...l, albumIds };
        })
      );
    },
    [commitLyrics]
  );

  // アーティスト名ごとに、アルバムを自動で作る（同じ名前のアルバムがあれば、そこに入れる）。
  // 作ったアルバムの数を返す。
  const createArtistAlbums = useCallback(async () => {
    const artists = [
      ...new Set(lyricsRef.current.map((l) => (l.artist ?? '').trim()).filter(Boolean)),
    ];
    let nextAlbums = [...albumsRef.current];
    let nextLyrics = lyricsRef.current;
    let created = 0;

    for (const artist of artists) {
      let album = nextAlbums.find((a) => a.name === artist);
      if (!album) {
        album = { id: newId(), name: artist, createdAt: new Date().toISOString() };
        nextAlbums = [...nextAlbums, album];
        created += 1;
      }
      nextLyrics = nextLyrics.map((l) =>
        (l.artist ?? '').trim() === artist && !(l.albumIds ?? []).includes(album.id)
          ? { ...l, albumIds: [...(l.albumIds ?? []), album.id] }
          : l
      );
    }

    setAlbums(nextAlbums);
    await saveAlbums(nextAlbums);
    await commitLyrics(nextLyrics);
    return created;
  }, [commitLyrics]);

  // 通知設定を更新する。予約の結果（notifications.js 参照）を返す。
  const updateSettings = useCallback(async (patch) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    await saveSettings(next);
    return rescheduleNotifications(lyricsRef.current, next);
  }, []);

  return (
    <LyricsContext.Provider
      value={{
        lyrics,
        albums,
        settings,
        loaded,
        addLyric,
        updateLyric,
        removeLyric,
        addAlbum,
        deleteAlbum,
        setAlbumLyrics,
        createArtistAlbums,
        updateSettings,
      }}
    >
      {children}
    </LyricsContext.Provider>
  );
}

export function useLyrics() {
  return useContext(LyricsContext);
}
