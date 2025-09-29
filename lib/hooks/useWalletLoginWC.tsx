// lib/hooks/useWalletLoginWC.ts
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import SignClient from '@walletconnect/sign-client';
import { Buffer } from 'buffer';
import { supabase } from '@/lib/supabase';
import { siweGetNonce, siweVerify } from '@/lib/api/authWeb3';

let clientPromise: Promise<SignClient> | null = null;
async function getClient() {
  if (!clientPromise) {
    const projectId = process.env.EXPO_PUBLIC_WC_PROJECT_ID;
    if (!projectId) throw new Error('EXPO_PUBLIC_WC_PROJECT_ID is missing');
    clientPromise = SignClient.init({
      projectId,
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: {
        name: 'FocusAppPro',
        description: 'Login via Web3',
        url: 'https://focus.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
    });
  }
  return clientPromise;
}

async function openWallet(uri: string) {
  const e = encodeURIComponent(uri);
  const tries = [
    `metamask://wc?uri=${e}`,
    `rainbow://wc?uri=${e}`,
    `trust://wc?uri=${e}`,
    `crypto.com://wc?uri=${e}`,
    `wc:${uri}`,
    `https://link.walletconnect.com/?uri=${e}`,
  ];
  for (const url of tries) {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) { await Linking.openURL(url); return; }
    } catch {}
  }
  throw new Error('Не найден установленный кошелёк (MetaMask/Rainbow/Trust).');
}

function buildSiweMessage(params: {
  domain: string; address: string; uri: string; chainId: number; nonce: string; statement?: string;
}) {
  const { domain, address, statement = 'Sign in to FocusAppPro', uri, chainId, nonce } = params;
  const now = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    `${address}`,
    ``,
    `${statement}`,
    ``,
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now}`,
  ].join('\n');
}

export function useWalletLoginWC() {
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getClient();

      // 1) connect
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          eip155: {
            methods: ['personal_sign', 'eth_sign'],
            chains: ['eip155:1'],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });
      if (uri) await openWallet(uri);

      const session = await approval();
      const topic = session.topic;
      const accounts = session.namespaces.eip155?.accounts || [];
      const [, chainStr, address] = (accounts[0] || '').split(':');
      const chainId = Number(chainStr);
      if (!address) throw new Error('Кошелёк не вернул адрес');

      // 2) nonce + SIWE
      const { nonce, domain, uri: appUri } = await siweGetNonce(address);
      const message = buildSiweMessage({ domain, address, uri: appUri, chainId, nonce });

      // 3) подпись
      const hexMsg = '0x' + Buffer.from(message, 'utf8').toString('hex');
      const signature: string = await client.request({
        topic,
        chainId: `eip155:${chainId}`,
        request: { method: 'personal_sign', params: [hexMsg, address] },
      });

      // 4) верификация на сервере → одноразовый email_otp
      const { email, email_otp } = await siweVerify(message, signature);

      // 5) завершаем вход в Supabase
      const { data, error } = await supabase.auth.verifyOtp({ email, token: email_otp, type: 'magiclink' });
      if (error) throw error;

      return data.session;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, signIn };
}