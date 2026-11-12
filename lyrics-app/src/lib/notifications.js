// ランダム通知の処理。
//
// しくみ：iPhone のローカル通知（アプリが自分で予約する通知。サーバー不要）を使います。
// 「毎日21時」のような繰り返し通知だと毎回同じ文面になってしまうため、
// これから先の DAYS_AHEAD 日分を、1日ずつ別の歌詞を選んで予約しておきます。
// アプリを開くたびに予約を作り直すので、ときどき開いていれば通知が途切れません。
// （iOS では予約できる通知は最大64件までなので、30日分にしています）
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DAYS_AHEAD = 30;
// iOS が予約を許す上限は64件。少し余裕を見て60件までにする。
const MAX_SCHEDULED = 60;

// パソコンのブラウザ（Web版）で画面を確認するときは、通知の機能が無いので何もしない。
const isSupported = Platform.OS !== 'web';

// アプリを開いている最中に通知が来たときも、バナーを表示する設定。
export function setupNotificationHandler() {
  if (!isSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// 通知の許可をもらう。最初の1回だけ iPhone の確認ダイアログが出ます。
export async function requestPermission() {
  if (!isSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

function buildContent(lyric) {
  const song = [lyric.title, lyric.artist].filter(Boolean).join(' / ');
  return {
    title: song ? `♪ ${song}` : '♪ 刺さった歌詞',
    body: lyric.text,
    data: { lyricId: lyric.id },
  };
}

// 直前と同じ歌詞が続かないように、ランダムに並べる。
function pickRandomSequence(lyrics, count) {
  const result = [];
  let previous = null;
  for (let i = 0; i < count; i++) {
    const candidates =
      lyrics.length > 1 ? lyrics.filter((l) => l.id !== previous) : lyrics;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    result.push(chosen);
    previous = chosen.id;
  }
  return result;
}

// 予約をいったん全部消して、設定に合わせて作り直す。
// 結果は 'unsupported'（Web版） / 'off'（通知オフ） / 'empty'（歌詞が0件） / 'denied'（許可なし） / 'scheduled'（予約済み）。
// 続けて何度も呼ばれても処理が混ざらないよう、順番待ちにしています。
let queue = Promise.resolve();
export function rescheduleNotifications(lyrics, settings) {
  const run = queue.then(() => doReschedule(lyrics, settings));
  queue = run.catch(() => {});
  return run;
}

async function doReschedule(lyrics, settings) {
  if (!isSupported) return 'unsupported';
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.notificationsEnabled) return 'off';
  if (lyrics.length === 0) return 'empty';

  // オンになっている時刻（アラーム）だけを予約する。
  const alarms = settings.alarms.filter((a) => a.enabled);
  if (alarms.length === 0) return 'noalarm';

  const granted = await requestPermission();
  if (!granted) return 'denied';

  // 時刻が多いほど1つあたりの日数が減る（全体で MAX_SCHEDULED 件に収める）。
  const days = Math.min(DAYS_AHEAD, Math.floor(MAX_SCHEDULED / alarms.length));
  const sequence = pickRandomSequence(lyrics, days * alarms.length);
  const now = new Date();

  for (let a = 0; a < alarms.length; a++) {
    const alarm = alarms[a];
    const first = new Date();
    first.setHours(alarm.hour, alarm.minute, 0, 0);
    // 今日の時刻をもう過ぎていたら、明日から。
    if (first <= now) first.setDate(first.getDate() + 1);

    for (let d = 0; d < days; d++) {
      const date = new Date(first);
      date.setDate(first.getDate() + d);
      await Notifications.scheduleNotificationAsync({
        // 同じ日・同じ時刻の順番がずれないように、時刻ごとに別の歌詞を割り当てる
        content: buildContent(sequence[d * alarms.length + a]),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }
  return 'scheduled';
}

// 動作確認用：数秒後にランダムな歌詞を1件だけ通知する。
export async function sendTestNotification(lyrics, seconds = 5) {
  const granted = await requestPermission();
  if (!granted) return false;
  const [lyric] = pickRandomSequence(lyrics, 1);
  await Notifications.scheduleNotificationAsync({
    content: buildContent(lyric),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
  return true;
}
