// 端末の中にデータを保存・読み込みする処理。
// AsyncStorage は「アプリ専用の小さな保存箱」のようなもので、
// アプリを閉じてもデータが残ります（外部のサーバーには送られません）。
import AsyncStorage from '@react-native-async-storage/async-storage';

const LYRICS_KEY = 'lyrics:v1';
const SETTINGS_KEY = 'settings:v1';

export const defaultSettings = {
  notificationsEnabled: false,
  hour: 21, // 通知する時刻（時）
  minute: 0, // 通知する時刻（分）
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
  return json ? { ...defaultSettings, ...JSON.parse(json) } : defaultSettings;
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// 保存する歌詞ひとつ分のデータを作る。
export function createLyric({ text, title, artist, memo }) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    title: title.trim(),
    artist: artist.trim(),
    memo: memo.trim(),
    createdAt: new Date().toISOString(),
  };
}
