// 保存済みの歌詞を編集するフォーム。一覧画面の中に表示します。
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import LyricForm from './LyricForm';
import { useLyrics } from '../lib/LyricsContext';
import { colors } from '../lib/theme';

// lyric：編集する歌詞、onDone：保存またはキャンセルしたとき（一覧に戻る）に呼ばれる
export default function EditForm({ lyric, onDone }) {
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
    onDone();
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
        <Pressable onPress={onDone} style={styles.cancelButton}>
          <Text style={styles.cancelText}>変更せずに一覧へ戻る</Text>
        </Pressable>
        {!canSave && <Text style={styles.hint}>* の項目を入力すると保存できます。</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
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
  cancelButton: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: colors.subText, fontSize: 14 },
});
