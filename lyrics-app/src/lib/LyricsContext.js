// 「保存した歌詞」と「通知の設定」を、どの画面からでも使えるようにする仕組み。
// React の Context（コンテキスト）を使うと、画面をまたいでデータを共有できます。
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  cleanLyricFields,
  createLyric,
  defaultSettings,
  loadLyrics,
  loadSettings,
  saveLyrics,
  saveSettings,
} from './storage';
import { rescheduleNotifications } from './notifications';

const LyricsContext = createContext(null);

export function LyricsProvider({ children }) {
  const [lyrics, setLyricsState] = useState([]);
  const [settings, setSettingsState] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // ボタンを素早く連打しても最新の値で計算できるよう、ref（最新値の控え）も持っておく。
  const lyricsRef = useRef(lyrics);
  const settingsRef = useRef(settings);
  const setLyrics = (next) => {
    lyricsRef.current = next;
    setLyricsState(next);
  };
  const setSettings = (next) => {
    settingsRef.current = next;
    setSettingsState(next);
  };

  // アプリ起動時に、保存してあるデータを読み込む。
  useEffect(() => {
    (async () => {
      const [savedLyrics, savedSettings] = await Promise.all([loadLyrics(), loadSettings()]);
      setLyrics(savedLyrics);
      setSettings(savedSettings);
      setLoaded(true);
      // 起動のたびに通知の予約を作り直して、先30日分を保つ。
      rescheduleNotifications(savedLyrics, savedSettings).catch(console.warn);
    })();
  }, []);

  const addLyric = useCallback(async (input) => {
    const next = [createLyric(input), ...lyricsRef.current];
    setLyrics(next);
    await saveLyrics(next);
    rescheduleNotifications(next, settingsRef.current).catch(console.warn);
  }, []);

  // 保存済みの歌詞の内容を書き換える（作成日はそのまま、更新日を記録する）。
  const updateLyric = useCallback(async (id, input) => {
    const next = lyricsRef.current.map((l) =>
      l.id === id
        ? { ...l, ...cleanLyricFields(input), updatedAt: new Date().toISOString() }
        : l
    );
    setLyrics(next);
    await saveLyrics(next);
    rescheduleNotifications(next, settingsRef.current).catch(console.warn);
  }, []);

  const removeLyric = useCallback(async (id) => {
    const next = lyricsRef.current.filter((l) => l.id !== id);
    setLyrics(next);
    await saveLyrics(next);
    rescheduleNotifications(next, settingsRef.current).catch(console.warn);
  }, []);

  // 通知設定を更新する。予約の結果（notifications.js 参照）を返す。
  const updateSettings = useCallback(async (patch) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    await saveSettings(next);
    return rescheduleNotifications(lyricsRef.current, next);
  }, []);

  return (
    <LyricsContext.Provider
      value={{ lyrics, settings, loaded, addLyric, updateLyric, removeLyric, updateSettings }}
    >
      {children}
    </LyricsContext.Provider>
  );
}

export function useLyrics() {
  return useContext(LyricsContext);
}
