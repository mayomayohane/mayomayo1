// 【MVP③】保存した歌詞をランダムに通知する機能の設定画面
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLyrics } from '../lib/LyricsContext';
import { MAX_ALARMS } from '../lib/storage';
import { sendTestNotification } from '../lib/notifications';
import { MUSIC_APPS } from '../lib/musicLinks';
import { colors } from '../lib/theme';

const pad = (n) => String(n).padStart(2, '0');
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function Stepper({ label, value, onMinus, onPlus }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepButton} onPress={onMinus} hitSlop={8}>
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>
        {pad(value)}
        <Text style={styles.stepUnit}> {label}</Text>
      </Text>
      <Pressable style={styles.stepButton} onPress={onPlus} hitSlop={8}>
        <Text style={styles.stepButtonText}>＋</Text>
      </Pressable>
    </View>
  );
}

// 時刻を分単位で動かす。45分 +15分 → 次の時の00分、00分 −15分 → 前の時の45分のように繰り上がり・繰り下がりする。
function shiftTime(alarm, minutesDelta) {
  const total = (alarm.hour * 60 + alarm.minute + minutesDelta + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

// 届く時刻（アラーム）1件分の表示と操作
function AlarmRow({ alarm, disabled, onChange, onRemove }) {
  // 時は1時間ずつ、分は15分ずつ変える（分は時をまたいで自動で進む）
  const changeHour = (d) => onChange({ hour: (alarm.hour + d + 24) % 24 });
  const changeMinute = (d) => onChange(shiftTime(alarm, d));

  return (
    <View style={[styles.alarm, !alarm.enabled && styles.alarmOff]}>
      <View style={styles.alarmTop}>
        <Text style={styles.alarmTime}>
          {pad(alarm.hour)}:{pad(alarm.minute)}
        </Text>
        <Switch
          value={alarm.enabled}
          onValueChange={(v) => onChange({ enabled: v })}
          disabled={disabled}
          trackColor={{ true: colors.accent }}
        />
      </View>
      <View style={styles.steppers}>
        <Stepper
          label="時"
          value={alarm.hour}
          onMinus={() => changeHour(-1)}
          onPlus={() => changeHour(1)}
        />
        <Stepper
          label="分"
          value={alarm.minute}
          onMinus={() => changeMinute(-15)}
          onPlus={() => changeMinute(15)}
        />
      </View>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
        <Text style={styles.removeText}>この時刻を削除</Text>
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const { lyrics, settings, updateSettings } = useLyrics();
  const [busy, setBusy] = useState(false);

  async function apply(patch) {
    setBusy(true);
    try {
      const result = await updateSettings(patch);
      if (result === 'unsupported') {
        Alert.alert('Web版では通知を試せません', '通知は iPhone の Expo Go で確認してください。');
      } else if (result === 'noalarm') {
        Alert.alert('届く時刻がありません', '時刻を1つ以上オンにすると通知が届きます。');
      } else if (result === 'denied') {
        Alert.alert(
          '通知が許可されていません',
          'iPhone の「設定」アプリから、このアプリの通知を許可してください。',
          [
            { text: '閉じる', style: 'cancel' },
            { text: '設定を開く', onPress: () => Linking.openSettings() },
          ]
        );
        await updateSettings({ ...patch, notificationsEnabled: false });
      }
    } finally {
      setBusy(false);
    }
  }

  function updateAlarm(id, patch) {
    apply({ alarms: settings.alarms.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  }

  function addAlarm() {
    if (settings.alarms.length >= MAX_ALARMS) {
      Alert.alert('これ以上追加できません', `時刻は最大${MAX_ALARMS}件までです。`);
      return;
    }
    apply({ alarms: [...settings.alarms, { id: newId(), hour: 21, minute: 0, enabled: true }] });
  }

  function removeAlarm(id) {
    apply({ alarms: settings.alarms.filter((a) => a.id !== id) });
  }

  async function handleTest() {
    if (lyrics.length === 0) {
      Alert.alert('歌詞がまだありません', '先に「保存」タブから歌詞を保存してください。');
      return;
    }
    const ok = await sendTestNotification(lyrics, 5);
    if (ok) {
      Alert.alert(
        '5秒後に届きます',
        'ホーム画面に戻るかロックすると、通知が表示されるのを確認できます。'
      );
    } else {
      Alert.alert('通知が許可されていません', 'iPhone の「設定」から許可してください。');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>毎日ランダムに届ける</Text>
            <Text style={styles.rowSub}>保存した歌詞から1つを選んで通知します</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(v) => apply({ notificationsEnabled: v })}
            disabled={busy}
            trackColor={{ true: colors.accent }}
          />
        </View>

        {settings.notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <Text style={styles.rowTitle}>届く時刻</Text>
            <Text style={styles.rowSub}>
              時刻は好きなだけ追加できます（最大{MAX_ALARMS}件）。時刻が増えるほど、先の予約日数は短くなります。
            </Text>

            {settings.alarms.map((alarm) => (
              <AlarmRow
                key={alarm.id}
                alarm={alarm}
                disabled={busy}
                onChange={(patch) => updateAlarm(alarm.id, patch)}
                onRemove={() => removeAlarm(alarm.id)}
              />
            ))}

            <Pressable style={styles.addButton} onPress={addAlarm} disabled={busy}>
              <Text style={styles.addButtonText}>＋ 時刻を追加</Text>
            </Pressable>

            {lyrics.length === 0 && (
              <Text style={styles.warn}>
                歌詞が0件のため、まだ通知は届きません。歌詞を保存すると自動で予約されます。
              </Text>
            )}
          </>
        )}
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.rowTitle}>使っている音楽アプリ</Text>
        <Text style={styles.rowSub}>
          通知や一覧をタップしたとき、選んだアプリで曲を検索します（曲のURLが入っている歌詞は、そのURLを開きます）。
        </Text>
        <View style={styles.chips}>
          {[{ key: null, label: '未選択' }, ...MUSIC_APPS].map((app) => {
            const selected = settings.musicApp === app.key;
            return (
              <Pressable
                key={app.key ?? 'none'}
                onPress={() => apply({ musicApp: app.key })}
                disabled={busy}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {app.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable style={styles.testButton} onPress={handleTest}>
        <Text style={styles.testButtonText}>テスト通知を送る（5秒後）</Text>
      </Pressable>

      <Text style={styles.note}>
        ※ 通知は、アプリを開いた日から先の日数分まで予約されます（時刻の数によって変わります）。ときどきアプリを開くと、予約が自動で延長されます。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.subText, marginTop: 4, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  alarm: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  alarmOff: { opacity: 0.5 },
  alarmTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alarmTime: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  steppers: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { color: colors.accent, fontSize: 18, fontWeight: '600' },
  stepValue: { fontSize: 18, color: colors.text, minWidth: 52, textAlign: 'center' },
  stepUnit: { fontSize: 12, color: colors.subText },
  removeButton: { alignSelf: 'flex-end', marginTop: 10 },
  removeText: { fontSize: 12, color: colors.danger },
  addButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  warn: { marginTop: 14, fontSize: 12, color: colors.danger, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipText: { fontSize: 13, color: colors.subText, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  testButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testButtonText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  note: { marginTop: 16, fontSize: 12, lineHeight: 19, color: colors.subText },
});
