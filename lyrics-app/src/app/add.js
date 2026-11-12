// 【MVP①】歌詞の一節と曲名・アーティスト名を保存する画面
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import LyricForm from '../components/LyricForm';
import { useLyrics } from '../lib/LyricsContext';
import { colors } from '../lib/theme';

const EMPTY = { text: '', title: '', artist: '', memo: '', url: '' };

export default function AddScreen() {
  const { addLyric } = useLyrics();
  const [values, setValues] = useState(EMPTY);

  const canSave = values.text.trim().length > 0 && values.title.trim().length > 0;

  // 入力欄の値の一部だけを書き換える（例：{ title: '…' }）
  function onChange(patch) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!canSave) return;
    await addLyric(values);
    setValues(EMPTY);
    Alert.alert('保存しました', 'また、ふとした瞬間に届けます。');
    router.navigate('/'); // 一覧画面へ移動
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
          <Text style={styles.buttonText}>保存する</Text>
        </Pressable>
        {!canSave && (
          <View>
            <Text style={styles.hint}>* の項目を入力すると保存できます。</Text>
          </View>
        )}
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
});
