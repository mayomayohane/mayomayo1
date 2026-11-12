// 保存した歌詞の中から、複数まとめて選ぶための画面部品。
// アルバムに入れるとき・アラームで届ける歌詞を選ぶときに使います。
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

// title：画面の見出し、lyrics：選べる歌詞の一覧、initialIds：最初から選んでおく歌詞の番号
// onDone(ids)：決定したとき、onCancel：戻るとき
export default function LyricPicker({ title, lyrics, initialIds, doneLabel = '決定', onDone, onCancel }) {
  const [selected, setSelected] = useState(() => new Set(initialIds));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancel}>戻る</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={() => onDone([...selected])} hitSlop={8}>
          <Text style={styles.done}>
            {doneLabel}（{selected.size}件）
          </Text>
        </Pressable>
      </View>

      {lyrics.length === 0 ? (
        <Text style={styles.empty}>まだ歌詞がありません。先に「保存」タブから歌詞を保存してください。</Text>
      ) : (
        <FlatList
          data={lyrics}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const on = selected.has(item.id);
            return (
              <Pressable onPress={() => toggle(item.id)} style={[styles.row, on && styles.rowOn]}>
                <Text style={[styles.check, on && styles.checkOn]}>{on ? '☑' : '☐'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {[item.title, item.artist].filter(Boolean).join(' / ') || '（曲名なし）'}
                  </Text>
                  <Text style={styles.rowText} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: { color: colors.subText, fontSize: 14 },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.text },
  done: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  empty: { padding: 24, color: colors.subText, textAlign: 'center', lineHeight: 20 },
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  rowOn: { borderColor: colors.accent, borderWidth: 2 },
  check: { fontSize: 20, color: colors.subText },
  checkOn: { color: colors.accent },
  rowTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  rowText: { fontSize: 13, color: colors.subText, marginTop: 4, lineHeight: 18 },
});
