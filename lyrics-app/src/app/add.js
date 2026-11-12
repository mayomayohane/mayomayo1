// 【MVP①】歌詞の一節と曲名・アーティスト名を保存する画面
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useLyrics } from '../lib/LyricsContext';
import { colors, lyricFont } from '../lib/theme';

export default function AddScreen() {
  const { addLyric } = useLyrics();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [memo, setMemo] = useState('');

  const canSave = text.trim().length > 0 && title.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    await addLyric({ text, title, artist, memo });
    setText('');
    setTitle('');
    setArtist('');
    setMemo('');
    Alert.alert('保存しました', 'また、ふとした瞬間に届けます。');
    router.navigate('/'); // 一覧画面へ移動
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>刺さった一節 *</Text>
        <TextInput
          style={[styles.input, styles.lyricInput]}
          value={text}
          onChangeText={setText}
          placeholder="Spotify や LINE MUSIC の歌詞をコピーして、ここに貼り付け"
          placeholderTextColor={colors.subText}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          心に残った部分だけを選んで保存するのがおすすめです。
        </Text>

        <Text style={styles.label}>曲名 *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="例：〇〇〇"
          placeholderTextColor={colors.subText}
        />

        <Text style={styles.label}>アーティスト名</Text>
        <TextInput
          style={styles.input}
          value={artist}
          onChangeText={setArtist}
          placeholder="例：〇〇〇"
          placeholderTextColor={colors.subText}
        />

        <Text style={styles.label}>メモ（なぜ刺さったか・そのときの気持ちなど）</Text>
        <TextInput
          style={[styles.input, styles.memoInput]}
          value={memo}
          onChangeText={setMemo}
          placeholder="任意"
          placeholderTextColor={colors.subText}
          multiline
          textAlignVertical="top"
        />

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
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 18, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  lyricInput: { minHeight: 140, fontFamily: lyricFont, lineHeight: 26 },
  memoInput: { minHeight: 80 },
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
