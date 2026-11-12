// 保存済みの歌詞を後から編集する画面。一覧のカードの「編集」から開きます。
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import LyricForm from '../components/LyricForm';
import { useLyrics } from '../lib/LyricsContext';
import { colors } from '../lib/theme';

export default function EditScreen() {
  const { id } = useLocalSearchParams();
  const { lyrics, loaded } = useLyrics();

  // 読み込みが終わるまでは何も出さない（起動直後は一覧が空のため）
  if (!loaded) return null;

  const lyric = lyrics.find((l) => l.id === id);
  if (!lyric) {
    return (
      <Text style={styles.notFound}>この歌詞は見つかりませんでした。</Text>
    );
  }

  // id が変わったとき（別の歌詞を編集するとき）に入力欄を作り直すため key を付ける
  return <EditForm key={lyric.id} lyric={lyric} />;
}

function EditForm({ lyric }) {
  const { updateLyric } = useLyrics();
  // 入力欄の初期値は、保存されている内容
  const [values, setValues] = useState({
    text: lyric.text,
    title: lyric.title,
    artist: lyric.artist,
    memo: lyric.memo,
    url: lyric.url ?? '', // 以前に保存した歌詞にはURLがないので空にする
  });

  const canSave = values.text.trim().length > 0 && values.title.trim().length > 0;

  function onChange(patch) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!canSave) return;
    await updateLyric(lyric.id, values);
    router.back(); // 一覧画面へ戻る
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <LyricForm values={values} onChange={onChange} />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canSave && styles.buttonDisabled,
            pressed && canSave && { opacity: 0.8 },
          ]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.buttonText}>変更を保存</Text>
        </Pressable>
        {!canSave && <Text style={styles.hint}>* の項目を入力すると保存できます。</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  notFound: { padding: 24, color: colors.subText, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.subText, marginTop: 6 },
  button: {
    marginTop: 28,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#D9CFC4' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
