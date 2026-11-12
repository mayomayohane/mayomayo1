// 【MVP②】保存した歌詞を一覧で見返す画面
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLyrics } from '../lib/LyricsContext';
import { openLyricLink } from '../lib/musicLinks';
import { colors, lyricFont } from '../lib/theme';

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function LyricCard({ lyric, highlighted, onPress, onEdit, onLongPress }) {
  const song = [lyric.title, lyric.artist].filter(Boolean).join(' / ');
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, highlighted && styles.cardHighlighted]}
    >
      <Text style={styles.lyricText}>{lyric.text}</Text>
      <Text style={styles.song}>— {song}</Text>
      {lyric.memo ? <Text style={styles.memo}>{lyric.memo}</Text> : null}
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formatDate(lyric.createdAt)}</Text>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.editButton}>
          <Text style={styles.editText}>編集</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function ListScreen() {
  const { lyrics, loaded, settings, removeLyric } = useLyrics();
  const [shuffledId, setShuffledId] = useState(null);

  // カードをタップ：曲のURL、なければ設定の音楽アプリで検索して開く
  async function playLyric(lyric) {
    try {
      const opened = await openLyricLink(lyric, settings.musicApp);
      if (!opened) {
        Alert.alert(
          '開く先がありません',
          '曲のURLを編集画面で貼るか、通知の設定で使っている音楽アプリを選んでください。'
        );
      }
    } catch {
      Alert.alert('開けませんでした', 'リンクが正しいか確認してください。');
    }
  }

  function confirmDelete(lyric) {
    Alert.alert('この歌詞を削除しますか？', lyric.text.slice(0, 40), [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => removeLyric(lyric.id) },
    ]);
  }

  if (!loaded) return null;

  if (lyrics.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>まだ歌詞がありません</Text>
        <Text style={styles.emptyText}>
          心に刺さった一節を見つけたら、{'\n'}「保存」タブから残しておきましょう。
        </Text>
        <Pressable style={styles.emptyButton} onPress={() => router.navigate('/add')}>
          <Text style={styles.emptyButtonText}>最初の歌詞を保存する</Text>
        </Pressable>
      </View>
    );
  }

  // 「ランダムに1つ」を押すと、選ばれた歌詞をいちばん上に表示する。
  const shuffled = lyrics.find((l) => l.id === shuffledId);
  const data = shuffled ? [shuffled, ...lyrics.filter((l) => l.id !== shuffledId)] : lyrics;

  function pickRandom() {
    const candidates = lyrics.length > 1 ? lyrics.filter((l) => l.id !== shuffledId) : lyrics;
    setShuffledId(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.count}>{lyrics.length} 件の歌詞</Text>
          <Pressable onPress={pickRandom} style={styles.shuffleButton}>
            <Text style={styles.shuffleText}>ランダムに1つ</Text>
          </Pressable>
        </View>
      }
      ListFooterComponent={
        <Text style={styles.footer}>タップで曲を開く・長押しで削除できます</Text>
      }
      renderItem={({ item }) => (
        <LyricCard
          lyric={item}
          highlighted={item.id === shuffledId}
          onPress={() => playLyric(item)}
          onEdit={() => router.push({ pathname: '/edit', params: { id: item.id } })}
          onLongPress={() => confirmDelete(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  count: { color: colors.subText, fontSize: 13 },
  shuffleButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  shuffleText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlighted: { borderColor: colors.accent, borderWidth: 2 },
  lyricText: { fontFamily: lyricFont, fontSize: 18, lineHeight: 32, color: colors.text },
  song: { marginTop: 14, fontSize: 13, color: colors.subText, textAlign: 'right' },
  memo: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: { fontSize: 11, color: colors.subText },
  editButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  footer: { textAlign: 'center', color: colors.subText, fontSize: 12, marginTop: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 10 },
  emptyText: { fontSize: 14, lineHeight: 22, color: colors.subText, textAlign: 'center' },
  emptyButton: {
    marginTop: 24,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
