// 【MVP③】保存した歌詞をランダムに通知する機能の設定画面
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLyrics } from '../lib/LyricsContext';
import { sendTestNotification } from '../lib/notifications';
import { colors } from '../lib/theme';

const pad = (n) => String(n).padStart(2, '0');

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

export default function SettingsScreen() {
  const { lyrics, settings, updateSettings } = useLyrics();
  const [busy, setBusy] = useState(false);

  async function apply(patch) {
    setBusy(true);
    try {
      const result = await updateSettings(patch);
      if (result === 'unsupported') {
        Alert.alert('Web版では通知を試せません', '通知は iPhone の Expo Go で確認してください。');
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

  // 時刻は15分刻みで変更（0〜23時 / 0,15,30,45分）
  const changeHour = (d) => apply({ hour: (settings.hour + d + 24) % 24 });
  const changeMinute = (d) => apply({ minute: (settings.minute + d + 60) % 60 });

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
            <Text style={styles.time}>
              {pad(settings.hour)}:{pad(settings.minute)}
            </Text>
            <View style={styles.steppers}>
              <Stepper
                label="時"
                value={settings.hour}
                onMinus={() => changeHour(-1)}
                onPlus={() => changeHour(1)}
              />
              <Stepper
                label="分"
                value={settings.minute}
                onMinus={() => changeMinute(-15)}
                onPlus={() => changeMinute(15)}
              />
            </View>
            {lyrics.length === 0 && (
              <Text style={styles.warn}>
                歌詞が0件のため、まだ通知は届きません。歌詞を保存すると自動で予約されます。
              </Text>
            )}
          </>
        )}
      </View>

      <Pressable style={styles.testButton} onPress={handleTest}>
        <Text style={styles.testButtonText}>テスト通知を送る（5秒後）</Text>
      </Pressable>

      <Text style={styles.note}>
        ※ 通知は、アプリを開いた日から30日先まで予約されます。ときどきアプリを開くと、予約が自動で延長されます。
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
  rowSub: { fontSize: 12, color: colors.subText, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  time: {
    fontSize: 44,
    fontWeight: '300',
    color: colors.text,
    textAlign: 'center',
    marginVertical: 8,
    fontVariant: ['tabular-nums'],
  },
  steppers: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
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
  warn: { marginTop: 14, fontSize: 12, color: colors.danger, lineHeight: 18 },
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
