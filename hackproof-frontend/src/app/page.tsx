'use client'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Coins, Vote, Rocket, Trophy, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const { connected } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-[#00ff9f] font-mono">Loading...</div>
      </main>
    )
  }
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-4xl w-full space-y-8 sm:space-y-12">
        {/* Welcome Section */}
        <motion.div 
          className="text-center space-y-4 sm:space-y-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight font-mono">
            Welcome to HackProof!
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-[#00ff9f]/80 font-medium font-mono">
            Decentralized Live voting for hackathons
          </p>
        </motion.div>

        {/* Wallet Connection Flow */}
        <motion.div 
          className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00ff9f]/20 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2 font-mono text-[#00ff9f]">
                Connect Your Wallet
              </h2>
            </div>

            {/* Flow Steps */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-8 mb-6 sm:mb-8">
              {/* Step 1 */}
              <motion.div 
                className="flex flex-col items-center flex-1 max-w-[180px] sm:max-w-[200px]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#00ff9f]/20 flex items-center justify-center mb-3 border border-[#00ff9f]/30">
                  <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-[#00ff9f]" />
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium min-h-[2.5rem] flex items-center justify-center font-mono text-[#00ff9f]/90">Connect Wallet</p>
              </motion.div>

              <div className="hidden sm:block text-xl sm:text-2xl text-[#00ff9f]/30 font-mono">→</div>
              <div className="sm:hidden text-xl text-[#00ff9f]/30 font-mono">↓</div>

              {/* Step 2 */}
              <motion.div 
                className="flex flex-col items-center flex-1 max-w-[180px] sm:max-w-[200px]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 border ${connected ? 'bg-[#00ff9f]/20 border-[#00ff9f]/50' : 'bg-[#1a1a1a] border-[#00ff9f]/20'}`}>
                  <CheckCircle2 className={`w-6 h-6 sm:w-8 sm:h-8 ${connected ? 'text-[#00ff9f]' : 'text-[#00ff9f]/40'}`} />
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium min-h-[2.5rem] flex items-center justify-center font-mono text-[#00ff9f]/90">Get your Participant NFT</p>
              </motion.div>

              <div className="hidden sm:block text-xl sm:text-2xl text-[#00ff9f]/30 font-mono">→</div>
              <div className="sm:hidden text-xl text-[#00ff9f]/30 font-mono">↓</div>

              {/* Step 3 */}
              <motion.div 
                className="flex flex-col items-center flex-1 max-w-[180px] sm:max-w-[200px]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 border ${connected ? 'bg-[#00ff9f]/20 border-[#00ff9f]/50' : 'bg-[#1a1a1a] border-[#00ff9f]/20'}`}>
                  <Coins className={`w-6 h-6 sm:w-8 sm:h-8 ${connected ? 'text-[#00ff9f]' : 'text-[#00ff9f]/40'}`} />
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium min-h-[2.5rem] flex items-center justify-center font-mono text-[#00ff9f]/90">Receive 100 voting tokens</p>
              </motion.div>

              <div className="hidden sm:block text-xl sm:text-2xl text-[#00ff9f]/30 font-mono">→</div>
              <div className="sm:hidden text-xl text-[#00ff9f]/30 font-mono">↓</div>

              {/* Step 4 */}
              <motion.div 
                className="flex flex-col items-center flex-1 max-w-[180px] sm:max-w-[200px]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 border ${connected ? 'bg-[#00ff9f]/20 border-[#00ff9f]/50' : 'bg-[#1a1a1a] border-[#00ff9f]/20'}`}>
                  <Vote className={`w-6 h-6 sm:w-8 sm:h-8 ${connected ? 'text-[#00ff9f]' : 'text-[#00ff9f]/40'}`} />
                </div>
                <p className="text-xs sm:text-sm md:text-base text-center font-medium min-h-[2.5rem] flex items-center justify-center font-mono text-[#00ff9f]/90">Start voting immediately</p>
              </motion.div>
            </div>

            {/* Connect Wallet Button */}
            <div className="flex justify-center">
              <div onClick={(e) => {
                try {
                  // Button will handle the click
                } catch (error) {
                  console.error('Wallet connection error:', error);
                }
              }}>
                <WalletMultiButton />
              </div>
            </div>

            {/* Action Links - Shows when wallet is connected */}
            {connected && (
              <motion.div 
                className="text-center pt-4 space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/register"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded-xl font-semibold shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] transition-all hover:scale-105 active:scale-95 border border-[#00ff9f]/50 font-mono"
                  >
                    Register for Hackathon →
                  </Link>
                  <Link
                    href="/projects"
                    className="inline-block px-8 py-4 bg-[#1a1a1a]/50 backdrop-blur-sm text-[#00ff9f] rounded-xl font-semibold shadow-xl hover:shadow-[0_0_20px_rgba(0,255,159,0.3)] hover:bg-[#1a1a1a]/70 transition-all hover:scale-105 active:scale-95 border border-[#00ff9f]/20 font-mono"
                  >
                    View Projects
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-[#00ff9f]/20 to-[#00cc7f]/20 text-[#00ff9f] rounded-xl font-semibold shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.4)] transition-all hover:scale-105 active:scale-95 border border-[#00ff9f]/30 flex items-center justify-center gap-2 font-mono"
                  >
                    <Trophy className="w-5 h-5" />
                    Leaderboard
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  )
}
