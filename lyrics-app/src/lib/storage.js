// 端末の中にデータを保存・読み込みする処理。
// AsyncStorage は「アプリ専用の小さな保存箱」のようなもので、
// アプリを閉じてもデータが残ります（外部のサーバーには送られません）。
import AsyncStorage from '@react-native-async-storage/async-storage';

const LYRICS_KEY = 'lyrics:v1';
const SETTINGS_KEY = 'settings:v1';
const ALBUMS_KEY = 'albums:v1';

// 届く時刻（アラーム）は複数登録できます。上限は20件です。
export const MAX_ALARMS = 20;
// 曜日の番号：0=日曜 … 6=土曜
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const defaultSettings = {
  notificationsEnabled: false,
  musicApp: null, // 使っている音楽アプリ（'spotify' | 'apple' | 'youtube' | 'line' | 'amazon' | null）
  alarms: [
    {
      id: 'default',
      hour: 21, // 通知する時刻（時）
      minute: 0, // 通知する時刻（分）
      enabled: true,
      days: ALL_DAYS, // 届く曜日
      // 届ける歌詞の選び方：{ type: 'all' } | { type: 'album', albumId } | { type: 'lyrics', lyricIds }
      pool: { type: 'all' },
    },
  ],
};

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// 時刻の設定を、新しい形に揃える（古い保存データにも対応する）。
export function normalizeAlarm(a) {
  return {
    id: a.id,
    hour: a.hour,
    minute: a.minute,
    enabled: a.enabled ?? true,
    days: Array.isArray(a.days) && a.days.length > 0 ? a.days : ALL_DAYS,
    pool: a.pool ?? { type: 'all' },
  };
}

export async function loadLyrics() {
  const json = await AsyncStorage.getItem(LYRICS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveLyrics(lyrics) {
  await AsyncStorage.setItem(LYRICS_KEY, JSON.stringify(lyrics));
}

export async function loadAlbums() {
  const json = await AsyncStorage.getItem(ALBUMS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveAlbums(albums) {
  await AsyncStorage.setItem(ALBUMS_KEY, JSON.stringify(albums));
}

export async function loadSettings() {
  const json = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!json) return defaultSettings;
  const saved = JSON.parse(json);
  let alarms = saved.alarms;
  // 以前のバージョン（時刻が1つだけの設定）から引き継ぐ
  if (!alarms && typeof saved.hour === 'number') {
    alarms = [{ id: 'default', hour: saved.hour, minute: saved.minute ?? 0, enabled: true }];
  }
  return {
    ...defaultSettings,
    ...saved,
    alarms: (alarms ?? defaultSettings.alarms).map(normalizeAlarm),
  };
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// 入力欄の値を整える（前後の空白を取る）。保存と編集で同じ処理を使う。
export function cleanLyricFields({ text, title, artist, memo, url }) {
  return {
    text: text.trim(),
    title: title.trim(),
    artist: artist.trim(),
    memo: memo.trim(),
    url: (url ?? '').trim(),
  };
}

// 保存する歌詞ひとつ分のデータを作る。
export function createLyric(input) {
  return {
    id: newId(),
    ...cleanLyricFields(input),
    albumIds: [], // 入っているアルバムの番号の一覧
    createdAt: new Date().toISOString(),
  };
}
