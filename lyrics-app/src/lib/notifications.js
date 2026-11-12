// ランダム通知の処理。
//
// しくみ：iPhone のローカル通知（アプリが自分で予約する通知。サーバー不要）を使います。
// 届く時刻ごとに、選んだ曜日の日付を先30日分まで探して、1回ずつ予約します。
// 届ける歌詞は「全部から」「アルバムから」「選んだ歌詞から」のどれかで決めます。
// アプリを開くたびに予約を作り直すので、ときどき開いていれば通知が途切れません。
// （iOS では予約できる通知は最大64件までなので、60件以内に収めます）
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DAYS_AHEAD = 30;
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

// 時刻ごとに、届ける歌詞の候補を絞り込む。
function poolLyrics(lyrics, alarm) {
  const pool = alarm.pool ?? { type: 'all' };
  if (pool.type === 'album') {
    return lyrics.filter((l) => (l.albumIds ?? []).includes(pool.albumId));
  }
  if (pool.type === 'lyrics') {
    const ids = new Set(pool.lyricIds ?? []);
    return lyrics.filter((l) => ids.has(l.id));
  }
  return lyrics;
}

// 候補の中からランダムに1つ選ぶ。直前と同じ歌詞が続かないようにする。
function pickOne(pool, avoidId) {
  const candidates = pool.length > 1 ? pool.filter((l) => l.id !== avoidId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 時刻の設定で、先 DAYS_AHEAD 日のうち、選んだ曜日に当たる日時の一覧を作る。
function occurrences(alarm, now) {
  const result = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);
    date.setHours(alarm.hour, alarm.minute, 0, 0);
    if (date <= now) continue; // もう過ぎた時刻は予約しない
    if (!alarm.days.includes(date.getDay())) continue; // 選んでいない曜日は飛ばす
    result.push(date);
  }
  return result;
}

// 直前に届けた歌詞を覚えておく（同じ時刻で同じ歌詞が続かないように）。
// 予約の結果は 'unsupported'（Web版） / 'off'（通知オフ） / 'empty'（歌詞が0件） /
// 'noalarm'（オンの時刻がない） / 'emptypool'（届ける歌詞の候補が0件） / 'denied'（許可なし） / 'scheduled'（予約済み）。
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

  // オンになっていて、曜日が1つ以上ある時刻だけを対象にする。
  const alarms = settings.alarms.filter((a) => a.enabled && a.days.length > 0);
  if (alarms.length === 0) return 'noalarm';

  // 時刻ごとに、届ける歌詞の候補を決める。候補が0件の時刻は予約しない。
  const plans = alarms
    .map((alarm) => ({ alarm, pool: poolLyrics(lyrics, alarm) }))
    .filter((p) => p.pool.length > 0);
  if (plans.length === 0) return 'emptypool';

  const granted = await requestPermission();
  if (!granted) return 'denied';

  const now = new Date();
  const slots = [];
  for (const { alarm, pool } of plans) {
    for (const date of occurrences(alarm, now)) {
      slots.push({ date, pool, key: alarm.id });
    }
  }
  // 近い日時から順に、上限まで予約する。
  slots.sort((a, b) => a - b);

  const previous = {};
  for (const slot of slots.slice(0, MAX_SCHEDULED)) {
    const lyric = pickOne(slot.pool, previous[slot.key]);
    previous[slot.key] = lyric.id;
    await Notifications.scheduleNotificationAsync({
      content: buildContent(lyric),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.date },
    });
  }
  return 'scheduled';
}

// 動作確認用：数秒後にランダムな歌詞を1件だけ通知する。
export async function sendTestNotification(lyrics, seconds = 5) {
  const granted = await requestPermission();
  if (!granted) return false;
  const lyric = pickOne(lyrics, null);
  await Notifications.scheduleNotificationAsync({
    content: buildContent(lyric),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
  return true;
}
