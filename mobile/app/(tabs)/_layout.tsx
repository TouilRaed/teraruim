import { Tabs } from "expo-router";
import { Text } from "react-native";
import { COLORS } from "@/lib/constants";

function Icon({ char, color }: { char: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{char}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Tableau", tabBarIcon: ({ color }) => <Icon char="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Commandes", tabBarIcon: ({ color }) => <Icon char="🛒" color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: "Produits", tabBarIcon: ({ color }) => <Icon char="📦" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Réglages", tabBarIcon: ({ color }) => <Icon char="⚙️" color={color} /> }}
      />
    </Tabs>
  );
}
