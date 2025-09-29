import { Platform } from 'react-native';

// Эти полифилы нужны только на нативных платформах
export function setupWalletConnectCompat() {
  if (Platform.OS === 'web') return;
  // динамические require, чтобы не исполнялись на web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-get-random-values');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@walletconnect/react-native-compat');
}