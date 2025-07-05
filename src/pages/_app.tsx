// pages/_app.tsx
import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

import { config } from '../wagmi';
import { Provider } from '@/components/ui/provider';

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </Head>

      <WagmiProvider config={config}>
        <QueryClientProvider client={client}>
          <RainbowKitProvider
            locale="en-US"
            theme={darkTheme({
              accentColor: '#c11c84',
              accentColorForeground: 'white',
              borderRadius: 'small',
            })}
          >
            <Provider>
              <Component {...pageProps} />
            </Provider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}

export default MyApp;
