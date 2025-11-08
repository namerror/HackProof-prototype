'use client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useEffect, useState } from 'react';

// Type declaration for window.solana
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isSolflare?: boolean;
      publicKey?: any;
      connect?: () => Promise<any>;
      disconnect?: () => Promise<void>;
    };
  }
}

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [mounted, setMounted] = useState(false);

  const wallets = useMemo(() => {
    const adapters = [];

    // Only add adapters if we're in the browser
    if (typeof window !== 'undefined') {
      // Check if Phantom is installed
      if (window.solana && window.solana.isPhantom) {
        adapters.push(new PhantomWalletAdapter());
      } else {
        // Still add it, it will show install prompt
        adapters.push(new PhantomWalletAdapter());
      }

      // Add other wallets
      adapters.push(new SolflareWalletAdapter());
      adapters.push(new TorusWalletAdapter());
      adapters.push(new LedgerWalletAdapter());
    }

    return adapters;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}