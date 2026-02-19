
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { colors } from "@/styles/commonStyles";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: colors.primary,
      background: colors.backgroundDark,
      card: colors.cardDark,
      text: colors.textDark,
      border: colors.borderDark,
      notification: colors.error,
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="verify-otp" 
                  options={{ 
                    headerShown: true,
                    title: 'Verify Email',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen name="create-profile" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="personal-details" 
                  options={{ 
                    headerShown: true,
                    title: 'Personal Details',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="edit-password" 
                  options={{ 
                    headerShown: true,
                    title: 'Edit Password',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="favourites" 
                  options={{ 
                    headerShown: true,
                    title: 'Favourites',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="notifications" 
                  options={{ 
                    headerShown: true,
                    title: 'Notifications',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="faqs" 
                  options={{ 
                    headerShown: true,
                    title: 'FAQs',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="data-privacy" 
                  options={{ 
                    headerShown: true,
                    title: 'Data & Privacy',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="post-community-topic" 
                  options={{ 
                    headerShown: true,
                    title: 'Discussion',
                    headerBackTitle: 'Cancel'
                  }} 
                />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="sublet/[id]" 
                  options={{ 
                    headerShown: true,
                    title: 'Sublet Details',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="travel/[id]" 
                  options={{ 
                    headerShown: true,
                    title: 'Travel Details',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="carry/[id]" 
                  options={{ 
                    headerShown: true,
                    title: 'Community discussion',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="chat/[id]" 
                  options={{ 
                    headerShown: true,
                    title: 'Chat',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="post-sublet" 
                  options={{ 
                    headerShown: true,
                    title: 'Sublet',
                    headerBackTitle: 'Cancel'
                  }} 
                />
                <Stack.Screen 
                  name="post-travel" 
                  options={{ 
                    headerShown: true,
                    title: 'Travel',
                    headerBackTitle: 'Cancel'
                  }} 
                />
                <Stack.Screen 
                  name="post-carry" 
                  options={{ 
                    headerShown: true,
                    title: 'Ally',
                    headerBackTitle: 'Cancel'
                  }} 
                />
                <Stack.Screen 
                  name="sublet-filters" 
                  options={{ 
                    headerShown: true,
                    title: 'Sublet Filters',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="travel-filters" 
                  options={{ 
                    headerShown: true,
                    title: 'Travel Filters',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="carry-filters" 
                  options={{ 
                    headerShown: true,
                    title: 'Carry Filters',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="my-posts" 
                  options={{ 
                    headerShown: true,
                    title: 'My Posts',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen 
                  name="settings" 
                  options={{ 
                    headerShown: true,
                    title: 'Settings',
                    headerBackTitle: 'Back'
                  }} 
                />
                <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
              </Stack>
              <SystemBars style="auto" />
            </GestureHandlerRootView>
          </WidgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
