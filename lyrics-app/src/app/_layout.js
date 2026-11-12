// アプリ全体の「枠」。画面下のタブ（一覧・保存・通知）をここで決めています。
// Expo Router では、src/app フォルダの中のファイル1つが、そのまま1画面になります。
//   index.js    → 一覧画面
//   add.js      → 保存画面
//   settings.js → 通知の設定画面
import { Tabs } from 'expo-router/tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LyricsProvider } from '../lib/LyricsContext';
import { setupNotificationHandler } from '../lib/notifications';
import { colors } from '../lib/theme';

setupNotificationHandler();

// タブのアイコン。名前の一覧は https://icons.expo.fyi で探せます。
function TabIcon({ name, color, size }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function RootLayout() {
  return (
    <LyricsProvider>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.subText,
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '刺さった歌詞',
            tabBarLabel: '一覧',
            tabBarIcon: (p) => <TabIcon name="musical-notes-outline" {...p} />,
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '歌詞を保存',
            tabBarLabel: '保存',
            tabBarIcon: (p) => <TabIcon name="add-circle-outline" {...p} />,
          }}
        />
        {/* 編集画面はタブには出さず、一覧の「編集」ボタンから開く */}
        <Tabs.Screen
          name="edit"
          options={{ title: '歌詞を編集', href: null }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: '通知',
            tabBarLabel: '通知',
            tabBarIcon: (p) => <TabIcon name="notifications-outline" {...p} />,
          }}
        />
      </Tabs>
    </LyricsProvider>
  );
}
