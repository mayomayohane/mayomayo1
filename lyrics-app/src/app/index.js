// 【MVP②】保存した歌詞を一覧で見返す画面（アルバムで分けて見ることもできる）
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import EditForm from '../components/EditForm';
import LyricPicker from '../components/LyricPicker';
import { useLyrics } from '../lib/LyricsContext';
import { openLyricLink } from '../lib/musicLinks';
import { colors, lyricFont } from '../lib/theme';

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// 編集ボタンは、タップで開く部分（Pressable）の外に置く。
// 中に入れると、カード全体のタップが先に反応して編集が開かなくなるため。
function LyricCard({ lyric, highlighted, onPress, onEdit, onLongPress }) {
  const song = [lyric.title, lyric.artist].filter(Boolean).join(' / ');
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <Pressable onPress={onPress} onLongPress={onLongPress}>
        <Text style={styles.lyricText}>{lyric.text}</Text>
        <Text style={styles.song}>— {song}</Text>
        {lyric.memo ? <Text style={styles.memo}>{lyric.memo}</Text> : null}
      </Pressable>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formatDate(lyric.createdAt)}</Text>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.editButton}>
          <Text style={styles.editText}>編集</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ListScreen() {
  const {
    lyrics,
    albums,
    loaded,
    settings,
    removeLyric,
    addAlbum,
    deleteAlbum,
    setAlbumLyrics,
    createArtistAlbums,
  } = useLyrics();
  const [shuffledId, setShuffledId] = useState(null);
  // 編集中の歌詞のid。ここに値があるときは、一覧の代わりに編集フォームを表示する。
  const [editingId, setEditingId] = useState(null);
  // 選んでいるアルバム（null なら「すべて」）
  const [albumId, setAlbumId] = useState(null);
  // アルバムに歌詞を入れる画面を開いているか
  const [pickingLyrics, setPickingLyrics] = useState(false);
  // 新しいアルバムの名前を入力中か
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

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

  async function submitNewAlbum() {
    const name = newAlbumName.trim();
    if (!name) return;
    const album = await addAlbum(name);
    setNewAlbumName('');
    setCreatingAlbum(false);
    setAlbumId(album.id);
  }

  function confirmDeleteAlbum(album) {
    Alert.alert(
      `アルバム「${album.name}」を削除しますか？`,
      '歌詞は消えず、アルバムから外れるだけです。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await deleteAlbum(album.id);
            setAlbumId(null);
          },
        },
      ]
    );
  }

  function confirmCreateArtistAlbums() {
    Alert.alert(
      'アーティスト名ごとにアルバムを作りますか？',
      '同じ名前のアルバムがあれば、そこに歌詞が入ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '作成',
          onPress: async () => {
            const created = await createArtistAlbums();
            Alert.alert(
              '作成しました',
              created > 0 ? `${created}件のアルバムを新しく作りました。` : '新しく作るアルバムはありませんでした。'
            );
          },
        },
      ]
    );
  }

  if (!loaded) return null;

  // 編集中：一覧の代わりに、その歌詞の編集フォームを表示する
  const editing = editingId ? lyrics.find((l) => l.id === editingId) : null;
  if (editing) {
    return <EditForm key={editing.id} lyric={editing} onDone={() => setEditingId(null)} />;
  }

  const currentAlbum = albums.find((a) => a.id === albumId) ?? null;

  // アルバムの歌詞を入れる・外す画面
  if (pickingLyrics && currentAlbum) {
    return (
      <LyricPicker
        title={`「${currentAlbum.name}」に入れる歌詞`}
        lyrics={lyrics}
        initialIds={lyrics
          .filter((l) => (l.albumIds ?? []).includes(currentAlbum.id))
          .map((l) => l.id)}
        doneLabel="決定"
        onCancel={() => setPickingLyrics(false)}
        onDone={async (ids) => {
          await setAlbumLyrics(currentAlbum.id, ids);
          setPickingLyrics(false);
        }}
      />
    );
  }

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

  // 表示する歌詞：選んでいるアルバムの歌詞だけ（「すべて」なら全部）
  const visible = currentAlbum
    ? lyrics.filter((l) => (l.albumIds ?? []).includes(currentAlbum.id))
    : lyrics;

  // 「ランダムに1つ」を押すと、選ばれた歌詞をいちばん上に表示する。
  const shuffled = visible.find((l) => l.id === shuffledId);
  const data = shuffled ? [shuffled, ...visible.filter((l) => l.id !== shuffledId)] : visible;

  function pickRandom() {
    if (visible.length === 0) return;
    const candidates = visible.length > 1 ? visible.filter((l) => l.id !== shuffledId) : visible;
    setShuffledId(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  const header = (
    <View>
      <View style={styles.header}>
        <Text style={styles.count}>
          {visible.length} 件の歌詞{currentAlbum ? `（${currentAlbum.name}）` : ''}
        </Text>
        <Pressable onPress={pickRandom} style={styles.shuffleButton}>
          <Text style={styles.shuffleText}>ランダムに1つ</Text>
        </Pressable>
      </View>

      {/* アルバムの一覧（横にスクロール） */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.albumBar}>
        <AlbumChip label="すべて" selected={!currentAlbum} onPress={() => setAlbumId(null)} />
        {albums.map((a) => (
          <AlbumChip
            key={a.id}
            label={`${a.name}（${lyrics.filter((l) => (l.albumIds ?? []).includes(a.id)).length}）`}
            selected={currentAlbum?.id === a.id}
            onPress={() => setAlbumId(a.id)}
          />
        ))}
        <AlbumChip
          label="＋ 新しいアルバム"
          selected={creatingAlbum}
          accent
          onPress={() => setCreatingAlbum((v) => !v)}
        />
      </ScrollView>

      {creatingAlbum && (
        <View style={styles.newAlbumRow}>
          <TextInput
            value={newAlbumName}
            onChangeText={setNewAlbumName}
            placeholder="アルバム名（例：好きな曲、元気が出る）"
            placeholderTextColor={colors.subText}
            style={styles.newAlbumInput}
            onSubmitEditing={submitNewAlbum}
            returnKeyType="done"
          />
          <Pressable
            onPress={submitNewAlbum}
            disabled={!newAlbumName.trim()}
            style={[styles.newAlbumButton, !newAlbumName.trim() && styles.buttonDisabled]}
          >
            <Text style={styles.newAlbumButtonText}>作成</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.albumActions}>
        {currentAlbum ? (
          <>
            <Pressable onPress={() => setPickingLyrics(true)} style={styles.actionButton}>
              <Text style={styles.actionText}>歌詞を追加・外す</Text>
            </Pressable>
            <Pressable onPress={() => confirmDeleteAlbum(currentAlbum)} style={styles.actionButton}>
              <Text style={[styles.actionText, { color: colors.danger }]}>アルバムを削除</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={confirmCreateArtistAlbums} style={styles.actionButton}>
            <Text style={styles.actionText}>アーティスト名ごとにアルバムを作る</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListEmptyComponent={
        currentAlbum ? (
          <Text style={styles.footer}>
            このアルバムにはまだ歌詞がありません。「歌詞を追加・外す」から入れられます。
          </Text>
        ) : null
      }
      ListFooterComponent={
        <Text style={styles.footer}>タップで曲を開く・長押しで削除できます</Text>
      }
      renderItem={({ item }) => (
        <LyricCard
          lyric={item}
          highlighted={item.id === shuffledId}
          onPress={() => playLyric(item)}
          onEdit={() => setEditingId(item.id)}
          onLongPress={() => confirmDelete(item)}
        />
      )}
    />
  );
}

// アルバムを選ぶボタン（横に並ぶ）
function AlbumChip({ label, selected, accent, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.albumChip,
        selected && styles.albumChipSelected,
        accent && !selected && styles.albumChipAccent,
      ]}
    >
      <Text
        style={[
          styles.albumChipText,
          selected && styles.albumChipTextSelected,
          accent && !selected && { color: colors.accent },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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
  albumBar: { marginBottom: 8 },
  albumChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  albumChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  albumChipAccent: { borderColor: colors.accent, borderStyle: 'dashed' },
  albumChipText: { fontSize: 13, color: colors.subText, fontWeight: '600' },
  albumChipTextSelected: { color: '#fff' },
  newAlbumRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  newAlbumInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  newAlbumButton: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  newAlbumButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { backgroundColor: '#D9CFC4' },
  albumActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  actionText: { fontSize: 12, color: colors.text, fontWeight: '600' },
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
  footer: { textAlign: 'center', color: colors.subText, fontSize: 12, marginTop: 8, lineHeight: 18 },
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
