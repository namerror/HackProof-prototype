'use client'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { Rocket, Coins } from 'lucide-react'
import { getVotingTokenBalance } from '@/services/solana-integration'

export default function Navigation() {
    const { connected, publicKey } = useWallet()
    const { connection } = useConnection()
    const [mounted, setMounted] = useState(false)
    const [tokenBalance, setTokenBalance] = useState<number | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch voting token balance when wallet is connected
    useEffect(() => {
        if (!connected || !publicKey) {
            setTokenBalance(null)
            return
        }

        let cancelled = false
        async function fetchBalance() {
            if (publicKey) {
                try {
                    const balance = await getVotingTokenBalance(connection, publicKey)
                    if (!cancelled) setTokenBalance(balance)
                } catch (error) {
                    console.error('Error fetching token balance:', error)
                    if (!cancelled) setTokenBalance(0)
                }
            }
        }
        fetchBalance()
        
        // Refresh balance every 10 seconds
        const interval = setInterval(fetchBalance, 10000)
        
        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [connected, publicKey, connection])


    if (!mounted) {
        return (
            <nav className="w-full border-b border-[#00ff9f]/20 bg-[#1a1a1a]/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-8">
                            <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity font-mono text-[#00ff9f] flex items-center gap-2">
                                <Rocket className="w-5 h-5" />
                                HackProof
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="bg-[#1a1a1a] text-[#00ff9f]/50 rounded-lg px-4 py-2 font-semibold opacity-50 font-mono">
                                Loading...
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        )
    }

    return (
        <nav className="w-full border-b border-[#00ff9f]/20 bg-[#1a1a1a]/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-6 sm:gap-8">
                        <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity flex items-center gap-2 font-mono text-[#00ff9f]">
                            <Rocket className="w-5 h-5" />
                            HackProof
                        </Link>
                        {connected && (
                            <div className="hidden md:flex items-center gap-4 h-full">
                                <Link
                                    href="/projects"
                                    className="text-sm font-medium hover:text-[#00ff9f] transition-colors flex items-center h-full font-mono"
                                >
                                    Projects
                                </Link>
                                <Link
                                    href="/leaderboard"
                                    className="text-sm font-medium hover:text-[#00ff9f] transition-colors flex items-center h-full font-mono"
                                >
                                    Leaderboard
                                </Link>
                                <Link
                                    href="/submit"
                                    className="text-sm font-medium hover:text-[#00ff9f] transition-colors flex items-center h-full font-mono"
                                >
                                    Submit
                                </Link>
                            </div>
                        )}
                    </div>
                    {connected && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg">
                                <Coins className="w-4 h-4 text-[#00ff9f]" />
                                <span className="text-sm font-mono font-semibold text-[#00ff9f]">
                                    {tokenBalance !== null ? tokenBalance : '...'} $HCKPRF
                                </span>
                            </div>
                            <div className="text-xs text-[#00ff9f]/50 font-mono hidden sm:block">
                                Connected
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    )
}
