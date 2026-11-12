// 端末の中にデータを保存・読み込みする処理。
// AsyncStorage は「アプリ専用の小さな保存箱」のようなもので、
// アプリを閉じてもデータが残ります（外部のサーバーには送られません）。
import AsyncStorage from '@react-native-async-storage/async-storage';

const LYRICS_KEY = 'lyrics:v1';
const SETTINGS_KEY = 'settings:v1';

// 届く時刻（アラーム）は複数登録できます。上限は20件です。
export const MAX_ALARMS = 20;

export const defaultSettings = {
  notificationsEnabled: false,
  musicApp: null, // 使っている音楽アプリ（'spotify' | 'apple' | 'youtube' | null）
  alarms: [{ id: 'default', hour: 21, minute: 0, enabled: true }],
};

export async function loadLyrics() {
  const json = await AsyncStorage.getItem(LYRICS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveLyrics(lyrics) {
  await AsyncStorage.setItem(LYRICS_KEY, JSON.stringify(lyrics));
}

export async function loadSettings() {
  const json = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!json) return defaultSettings;
  const saved = JSON.parse(json);
  // 以前のバージョン（時刻が1つだけの設定）から引き継ぐ
  if (!saved.alarms && typeof saved.hour === 'number') {
    saved.alarms = [{ id: 'default', hour: saved.hour, minute: saved.minute ?? 0, enabled: true }];
  }
  return { ...defaultSettings, ...saved };
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
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ...cleanLyricFields(input),
    createdAt: new Date().toISOString(),
  };
}
