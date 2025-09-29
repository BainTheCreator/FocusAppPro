// src/polyfills.ts
// Порядок важен!
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '@walletconnect/react-native-compat'; // WC совместимость (TextEncoder/Decoder и др.)
import { Buffer } from 'buffer';
import * as Random from 'expo-random';

// Buffer для либ, которые его ожидают
// @ts-ignore
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

// Надёжный crypto.getRandomValues через expo-random
(() => {
  const g: any = globalThis as any;
  if (!g.crypto) g.crypto = {};
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = (arr: Uint8Array) => {
      const bytes = Random.getRandomBytes(arr.length);
      arr.set(bytes);
      return arr;
    };
  }
})();

// Быстрый самотест — должен показать true
// eslint-disable-next-line no-console
console.log('[polyfills] crypto ok =', typeof globalThis.crypto?.getRandomValues === 'function');