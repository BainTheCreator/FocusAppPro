// auth/testOpenTelegramPage.ts
import * as Linking from 'expo-linking';
import { FUNCTIONS_BASE } from '../lib/supabase';
import { Platform } from 'react-native';

export async function testOpenTelegramPage() {
  const url = `${FUNCTIONS_BASE}/telegram-web?redirect_uri=goalsapp%3A%2F%2Ftg-auth`;
  console.log('Platform:', Platform.OS, 'open URL:', url);
  await Linking.openURL(url); // должен открыться Chrome/Safari с нормальной страницей, не текстом
}