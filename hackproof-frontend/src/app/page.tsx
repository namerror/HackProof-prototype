'use client'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const { connected } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </main>
    )
  }
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-4xl w-full space-y-8 sm:space-y-12">
        {/* Welcome Section - Todo: 🚀 Welcome to HackProof! 📊 Live voting for hackathons */}
        <div className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            🚀 Welcome to HackProof!
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-foreground/70">
            📊 Decentralized Live voting for hackathons
          </p>
        </div>

        {/* Wallet Connection Flow - Todo: 🔗 Connect Your Wallet ↓ ✅ Get your Participant NFT ✅ Receive 100 voting tokens ✅ Start voting immediately */}
        <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl">
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2">
                🔗 Connect Your Wallet
              </h2>
            </div>

            {/* Flow Steps - Mobile friendly with arrows */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-8 mb-6 sm:mb-8">
              <div className="flex flex-col items-center space-y-2 flex-1 max-w-[180px] sm:max-w-[200px]">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-xl sm:text-2xl">
                  🔗
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium">Connect Wallet</p>
              </div>

              <div className="hidden sm:block text-xl sm:text-2xl text-foreground/30">↓</div>
              <div className="sm:hidden text-xl text-foreground/30">↓</div>

              <div className="flex flex-col items-center space-y-2 flex-1 max-w-[180px] sm:max-w-[200px]">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl ${connected ? 'bg-green-500/20' : 'bg-foreground/10'}`}>
                  ✅
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium">Get your Participant NFT</p>
              </div>

              <div className="hidden sm:block text-xl sm:text-2xl text-foreground/30">↓</div>
              <div className="sm:hidden text-xl text-foreground/30">↓</div>

              <div className="flex flex-col items-center space-y-2 flex-1 max-w-[180px] sm:max-w-[200px]">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl ${connected ? 'bg-green-500/20' : 'bg-foreground/10'}`}>
                  ✅
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium">Receive 100 voting tokens</p>
              </div>

              <div className="hidden sm:block text-xl sm:text-2xl text-foreground/30">↓</div>
              <div className="sm:hidden text-xl text-foreground/30">↓</div>

              <div className="flex flex-col items-center space-y-2 flex-1 max-w-[180px] sm:max-w-[200px]">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl ${connected ? 'bg-green-500/20' : 'bg-foreground/10'}`}>
                  ✅
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium">Start voting immediately</p>
              </div>
            </div>

            {/* Connect Wallet Button - Todo: [ Connect Wallet Button ] already included but needs polish */}
            <div className="flex justify-center">
              <div onClick={(e) => {
                // Prevent errors from bubbling up
                try {
                  // Button will handle the click
                } catch (error) {
                  console.error('Wallet connection error:', error);
                }
              }}>
                <WalletMultiButton />
              </div>
            </div>

            {/* Registration Link - Shows when wallet is connected */}
            {connected && (
              <div className="text-center pt-4">
                <Link
                  href="/register"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
                >
                  Register for Hackathon →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
