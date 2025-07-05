import { getDefaultConfig, Chain } from '@rainbow-me/rainbowkit';

const monad = {
    id: 10_143,
    name: 'Monad Testnet',
    iconUrl: 'https://i.ibb.co/pvpzrxpy/monad1710498467135.png',
    iconBackground: '#fff',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://testnet-rpc.monad.xyz'] },
    },
    blockExplorers: {
      default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
    },
    testnet: true,
  } as const satisfies Chain;

export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    monad,
  ],
  ssr: true,
});
