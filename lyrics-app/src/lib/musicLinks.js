// 音楽アプリの曲ページ・検索ページを開くための処理。
// 歌詞の文章は使わず、曲名とアーティスト名だけを検索に使います。
import { Linking } from 'react-native';

export const MUSIC_APPS = [
  {
    key: 'spotify',
    label: 'Spotify',
    search: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  },
  {
    key: 'apple',
    label: 'Apple Music',
    search: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
  },
  {
    key: 'youtube',
    label: 'YouTube Music',
    search: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
  },
];

// 「open.spotify.com/...」のように https:// を省いて貼られても開けるようにする。
export function normalizeUrl(input) {
  const t = input.trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

// 歌詞を開くときのURLを決める。
// 1. その歌詞に曲のURLがあれば、それを使う
// 2. なければ、設定で選んだ音楽アプリで曲名とアーティスト名を検索する
// 3. どちらもなければ null（開けない）
export function getOpenUrl(lyric, musicApp) {
  if (lyric.url && lyric.url.trim()) return normalizeUrl(lyric.url);
  const app = MUSIC_APPS.find((a) => a.key === musicApp);
  if (!app) return null;
  const query = [lyric.title, lyric.artist].filter(Boolean).join(' ');
  return app.search(query);
}

// 開けたら true、開けるURLがなければ false を返す。
export async function openLyricLink(lyric, musicApp) {
  const url = getOpenUrl(lyric, musicApp);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
