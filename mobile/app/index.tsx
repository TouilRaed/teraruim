import { Redirect } from "expo-router";

export default function Index() {
  // _layout handles auth redirect, but provide a default route
  return <Redirect href="/(tabs)/dashboard" />;
}
