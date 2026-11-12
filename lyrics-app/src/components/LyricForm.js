// 保存画面と編集画面で共通の入力フォーム。
// 曲名・アーティスト名は、過去に保存した内容から候補を出します。
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ClearableInput from './ClearableInput';
import { useLyrics } from '../lib/LyricsContext';
import { artistCandidates, findArtistForTitle, titleCandidates } from '../lib/suggest';
import { colors, lyricFont } from '../lib/theme';

// 入力欄の下に出す、候補のボタン一覧
function Chips({ title, items, onPick }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.chipArea}>
      <Text style={styles.chipTitle}>{title}</Text>
      <View style={styles.chips}>
        {items.map((item) => (
          <Pressable key={item} onPress={() => onPick(item)} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function LyricForm({ values, onChange }) {
  const { lyrics } = useLyrics();
  // いまフォーカス（カーソルがある）している入力欄。候補を出すかどうかの判断に使う。
  const [focused, setFocused] = useState(null);

  // キーボードを閉じる前に候補をタップできるよう、少し待ってから隠す
  function handleBlur() {
    setTimeout(() => setFocused(null), 150);
  }

  // 曲名を入力したとき。同じ曲名が過去にあり、アーティスト名が空なら自動で入れる。
  function changeTitle(title) {
    const artist = findArtistForTitle(lyrics, title);
    if (artist && !values.artist.trim()) {
      onChange({ title, artist });
    } else {
      onChange({ title });
    }
  }

  // 候補の曲名をタップしたとき。過去のアーティスト名も一緒に入れる。
  function pickTitle(title) {
    const artist = findArtistForTitle(lyrics, title);
    onChange(artist ? { title, artist } : { title });
    setFocused(null);
  }

  function pickArtist(artist) {
    onChange({ artist });
    setFocused(null);
  }

  const titleItems = focused === 'title' ? titleCandidates(lyrics, values.title) : [];
  const artistItems = focused === 'artist' ? artistCandidates(lyrics, values.artist) : [];

  return (
    <>
      <Text style={styles.label}>刺さった一節 *</Text>
      <ClearableInput
        multiline
        style={styles.lyricInput}
        value={values.text}
        onChangeText={(text) => onChange({ text })}
        onFocus={() => setFocused('text')}
        onBlur={handleBlur}
        placeholder="Spotify や LINE MUSIC の歌詞をコピーして、ここに貼り付け"
        textAlignVertical="top"
      />
      <Text style={styles.hint}>心に残った部分だけを選んで保存するのがおすすめです。</Text>

      <Text style={styles.label}>曲名 *</Text>
      <ClearableInput
        value={values.title}
        onChangeText={changeTitle}
        onFocus={() => setFocused('title')}
        onBlur={handleBlur}
        placeholder="例：〇〇〇"
      />
      <Chips title="過去に保存した曲名（タップで入力）" items={titleItems} onPick={pickTitle} />

      <Text style={styles.label}>アーティスト名</Text>
      <ClearableInput
        value={values.artist}
        onChangeText={(artist) => onChange({ artist })}
        onFocus={() => setFocused('artist')}
        onBlur={handleBlur}
        placeholder="例：〇〇〇"
      />
      <Chips
        title="過去に保存したアーティスト名（タップで入力）"
        items={artistItems}
        onPick={pickArtist}
      />

      <Text style={styles.label}>メモ（なぜ刺さったか・そのときの気持ちなど）</Text>
      <ClearableInput
        multiline
        style={styles.memoInput}
        value={values.memo}
        onChangeText={(memo) => onChange({ memo })}
        onFocus={() => setFocused('memo')}
        onBlur={handleBlur}
        placeholder="任意"
        textAlignVertical="top"
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 18, marginBottom: 8 },
  lyricInput: { minHeight: 140, fontFamily: lyricFont, lineHeight: 26 },
  memoInput: { minHeight: 80 },
  hint: { fontSize: 12, color: colors.subText, marginTop: 6 },
  chipArea: { marginTop: 8 },
  chipTitle: { fontSize: 12, color: colors.subText, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  chipText: { fontSize: 13, color: colors.accent },
});
