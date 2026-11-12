// アプリ全体で使う色と文字の設定をまとめた場所。
// 色を変えたくなったら、ここを書き換えるだけで全画面に反映されます。
import { Platform } from 'react-native';

export const colors = {
  background: '#F7F3EC', // 画面の背景（生成り色）
  card: '#FFFFFF', // カードの背景
  text: '#2A2420', // 基本の文字色
  subText: '#8A7F75', // 補足の文字色
  accent: '#B4533A', // ボタンなどの強調色（夕焼けのような赤茶）
  border: '#E6DED3', // 枠線
  danger: '#C0392B', // 削除など注意が必要な操作
};

// 歌詞は明朝体で表示すると、歌詞カードのような雰囲気になります。
export const lyricFont = Platform.select({
  ios: 'Hiragino Mincho ProN',
  android: 'serif',
  default: 'serif',
});
