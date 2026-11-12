// 文字入力欄の右端に「全消去」ボタンを付けた部品。
// 文字が入っているときだけボタンが出ます。
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../lib/theme';

export default function ClearableInput({ value, onChangeText, multiline, style, ...rest }) {
  const showClear = value.length > 0;

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholderTextColor={colors.subText}
        style={[styles.input, showClear && styles.inputWithClear, style]}
        {...rest}
      />
      {showClear && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityLabel="全て消す"
          style={[styles.clear, multiline ? styles.clearTop : styles.clearCenter]}
        >
          <Text style={styles.clearText}>全消去</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  // 右端のボタンと文字が重ならないように、右側に余白を空ける
  inputWithClear: { paddingRight: 76 },
  clear: {
    position: 'absolute',
    right: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearCenter: { top: 0, bottom: 0, justifyContent: 'center' },
  clearTop: { top: 10 },
  clearText: { fontSize: 12, color: colors.subText, fontWeight: '600' },
});
