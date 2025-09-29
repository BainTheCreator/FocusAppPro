// lib/hooks/useWalletLoginWC.tsx

import React, { useCallback } from 'react';
import { Linking, Platform, Alert } from 'react-native';
import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { getWalletNonce, verifyWalletAndLogin } from '@/lib/api/walletAuth';

const WC_PROJECT_ID =
  process.env.EXPO_PUBLIC_WC_PROJECT_ID ||
  'b4f1e28bcc6f48280272eeb1a1e7e18b'; // <-- подставь свой или прокини через .env / app.json extra

let client: SignClient | null = null;

async function waitRelayerConnected(sc: any, timeoutMs = 7000) {
  // ждём, пока WS к релею реально откроется, иначе бывают publish/tag undefined
  if (sc?.core?.relayer?.connected) return;
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      try {
        sc.core.relayer.events.off('connect', done);
        sc.core.relayer.events.off('error', onErr);
      } catch {}
      resolve();
    };
    const onErr = (e: any) => {
      try {
        sc.core.relayer.events.off('connect', done);
        sc.core.relayer.events.off('error', onErr);
      } catch {}
      reject(new Error('Relay error: ' + (e?.message || e)));
    };
    try {
      sc.core.relayer.events.on('connect', done);
      sc.core.relayer.events.on('error', onErr);
    } catch {
      resolve(); // в старых версиях events может не быть — идём дальше
    }
    setTimeout(done, timeoutMs);
  });
}

async function ensureClient() {
  if (!WC_PROJECT_ID) throw new Error('WalletConnect Project ID пуст');
  if (client) return client;
  console.log('[WC] init, projectId =', WC_PROJECT_ID);
  client = await SignClient.init({
    projectId: WC_PROJECT_ID,
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'FocusAppPro',
      description: 'Login with wallet',
      url: 'https://focusapp.pro',
      icons: ['https://avatars.githubusercontent.com/u/37784886?s=200&v=4'],
    },
  });
  await waitRelayerConnected(client);
  return client;
}

async function openWalletDeepLink(uri: string) {
  const e = encodeURIComponent(uri);
  const native = [
    `metamask://wc?uri=${e}`,
    `trust://wc?uri=${e}`,
    `rainbow://wc?uri=${e}`,
    `zerion://wc?uri=${e}`,
    `argent://wc?uri=${e}`,
    `okx://wc?uri=${e}`,
    `imtokenv2://wc?uri=${e}`,
    `walletconnect://wc?uri=${e}`,
    `wc:${uri}`,
  ];
  for (const url of native) {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return true;
      }
    } catch {}
  }
  const universal = [
    `https://metamask.app.link/wc?uri=${e}`,
    `https://link.trustwallet.com/wc?uri=${e}`,
    `https://rnbwapp.com/wc?uri=${e}`,
    `https://app.zerion.io/wc?uri=${e}`,
    `https://www.okx.com/wallet/wc?uri=${e}`,
  ];
  for (const url of universal) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {}
  }
  return false;
}

// безопасно получить pairings при разных версиях SDK
function getAllPairings(sc: any) {
  return (
    sc?.pairing?.getAll?.() ||
    sc?.core?.pairing?.pairings?.getAll?.() ||
    []
  );
}

function getAddressAndChain(session: SessionTypes.Struct) {
  const ns = session.namespaces?.eip155;
  const acc = ns?.accounts?.[0]; // 'eip155:1:0x...'
  if (!acc) throw new Error('Не получили аккаунт из сессии');
  const [, chain, address] = acc.split(':');
  return { address: address.toLowerCase(), chainId: Number(chain) || 1 };
}

async function signWithSession(sc: any, session: SessionTypes.Struct) {
  const { address, chainId } = getAddressAndChain(session);

  const nonce = await getWalletNonce();
  const domain = 'focusapp.pro';
  const appUri = Platform.select({
    web: typeof window !== 'undefined' ? window.location.origin : 'https://focusapp.pro',
    default: 'goalsapp://auth/callback',
  }) as string;

  const msg = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to FocusAppPro

URI: ${appUri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

  // иногда релэй ещё не успел — повторим после ожидания
  try {
    await waitRelayerConnected(sc, 5000);
    const sig: string = await sc.request({
      topic: session.topic,
      chainId: `eip155:${chainId}`,
      request: { method: 'personal_sign', params: [msg, address] },
    });
    await verifyWalletAndLogin({ address, message: msg, signature: sig });
    console.log('[WC] login done');
  } catch (e: any) {
    console.warn('[WC] sign error', e?.message || e);
    await waitRelayerConnected(sc, 5000);
    const sig: string = await sc.request({
      topic: session.topic,
      chainId: `eip155:${chainId}`,
      request: { method: 'personal_sign', params: [msg, address] },
    });
    await verifyWalletAndLogin({ address, message: msg, signature: sig });
  }
}

export function useWalletLoginWC() {
  const signIn = useCallback(async () => {
    const sc = await ensureClient();

    // 0) reuse active session
    const sessions = sc.session.getAll().filter((s: any) => s.namespaces?.eip155?.accounts?.length);
    if (sessions.length) {
      console.log('[WC] reuse existing session');
      await signWithSession(sc, sessions[0]);
      return;
    }

    // 1) если есть активный pairing — переиспользуем
    const pairings = getAllPairings(sc).filter((p: any) => p.active);
    if (pairings.length > 0) {
      console.log('[WC] connect with existing pairing');
      const { approval } = await sc.connect({
        pairingTopic: pairings[0].topic,
        optionalNamespaces: {
          eip155: {
            methods: ['personal_sign', 'eth_signTypedData', 'eth_sendTransaction'],
            chains: ['eip155:1'],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });
      if (Platform.OS !== 'web') {
        Alert.alert('Ожидание подтверждения', 'Откройте приложение кошелька и подтвердите подключение.');
      }
      const session = await approval();
      await signWithSession(sc, session);
      return;
    }

    // 2) нет pairing — создаём новый, получаем wc:uri явно и открываем кошелёк
    console.log('[WC] create new pairing');
    const { uri, topic } = await (sc as any).core.pairing.create();
    console.log('[WC] pairing uri:', uri);

    if (Platform.OS !== 'web') {
      const opened = await openWalletDeepLink(uri);
      if (!opened) {
        Alert.alert(
          'Кошелёк не найден',
          'Установите MetaMask/Trust/Rainbow или откройте кошелёк вручную, затем вернитесь в приложение.'
        );
      }
    } else {
      console.log('[WC] scan QR (uri in console):', uri);
      Alert.alert('WalletConnect', 'Откройте кошелёк и отсканируйте QR (URI в консоли).');
    }

    const { approval } = await sc.connect({
      pairingTopic: topic,
      optionalNamespaces: {
        eip155: {
          methods: ['personal_sign', 'eth_signTypedData', 'eth_sendTransaction'],
          chains: ['eip155:1'],
          events: ['accountsChanged', 'chainChanged'],
        },
      },
    });

    let session: SessionTypes.Struct;
    try {
      session = await approval();
    } catch (e: any) {
      console.warn('[WC] approval error', e?.message || e);
      if ((e?.message || '').toLowerCase().includes('expired')) {
        Alert.alert('Время вышло', 'Запрос истёк. Откройте кошелёк и попробуйте ещё раз.');
      } else {
        Alert.alert('Ошибка подключения', String(e?.message || e));
      }
      throw e;
    }
    await signWithSession(sc, session);
  }, []);

  return { signIn };
}