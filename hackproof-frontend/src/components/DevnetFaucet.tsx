'use client'
import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Droplet, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

const AIRDROP_AMOUNT = 0.5 * LAMPORTS_PER_SOL // 0.5 SOL
const RATE_LIMIT_MINUTES = 5
const MIN_BALANCE_THRESHOLD = 0.3 * LAMPORTS_PER_SOL // Show faucet if balance < 0.3 SOL

export default function DevnetFaucet() {
    const { publicKey, connected } = useWallet()
    const { connection } = useConnection()
    
    const [balance, setBalance] = useState<number | null>(null)
    const [isAirdropping, setIsAirdropping] = useState(false)
    const [lastAirdropTime, setLastAirdropTime] = useState<number | null>(null)
    const [airdropSuccess, setAirdropSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showFallback, setShowFallback] = useState(false)

    // Load last airdrop time from localStorage
    useEffect(() => {
        if (publicKey) {
            const storageKey = `hackproof-faucet-${publicKey.toString()}`
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                setLastAirdropTime(parseInt(stored))
            }
        }
    }, [publicKey])

    // Fetch balance
    useEffect(() => {
        if (connected && publicKey) {
            fetchBalance()
        }
    }, [connected, publicKey, connection])

    const fetchBalance = async () => {
        if (!publicKey) return
        
        try {
            const bal = await connection.getBalance(publicKey)
            setBalance(bal)
        } catch (error) {
            console.error('Error fetching balance:', error)
        }
    }

    const canRequestAirdrop = () => {
        if (!lastAirdropTime) return true
        
        const now = Date.now()
        const timeSinceLastAirdrop = now - lastAirdropTime
        const minutesSinceLastAirdrop = timeSinceLastAirdrop / (1000 * 60)
        
        return minutesSinceLastAirdrop >= RATE_LIMIT_MINUTES
    }

    const getTimeUntilNextAirdrop = () => {
        if (!lastAirdropTime) return null
        
        const now = Date.now()
        const timeSinceLastAirdrop = now - lastAirdropTime
        const minutesSinceLastAirdrop = timeSinceLastAirdrop / (1000 * 60)
        const minutesRemaining = Math.ceil(RATE_LIMIT_MINUTES - minutesSinceLastAirdrop)
        
        return minutesRemaining > 0 ? minutesRemaining : null
    }

    const handleAirdrop = async () => {
        if (!publicKey || !canRequestAirdrop()) return

        setIsAirdropping(true)
        setError(null)
        setAirdropSuccess(false)
        setShowFallback(false)

        try {
            console.log(`Requesting ${AIRDROP_AMOUNT / LAMPORTS_PER_SOL} SOL airdrop...`)
            
            // Request airdrop from devnet
            const signature = await connection.requestAirdrop(publicKey, AIRDROP_AMOUNT)
            
            console.log('Airdrop signature:', signature)
            console.log('Confirming transaction...')
            
            // Wait for confirmation
            const latestBlockhash = await connection.getLatestBlockhash()
            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            }, 'confirmed')

            // Update last airdrop time
            const now = Date.now()
            setLastAirdropTime(now)
            const storageKey = `hackproof-faucet-${publicKey.toString()}`
            localStorage.setItem(storageKey, now.toString())

            // Refresh balance
            await fetchBalance()

            setAirdropSuccess(true)
            console.log('Airdrop successful!')

            // Reset success message after 5 seconds
            setTimeout(() => setAirdropSuccess(false), 5000)
        } catch (error: any) {
            console.error('Airdrop failed:', error)
            
            let errorMessage = 'Failed to get SOL from devnet faucet.'
            
            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                errorMessage = 'Devnet faucet is rate limited. Please try the CLI method below.'
                setShowFallback(true)
            } else if (error.message?.includes('timeout')) {
                errorMessage = 'Airdrop request timed out. Please try again or use CLI method below.'
                setShowFallback(true)
            } else if (error.message?.includes('blockhash')) {
                errorMessage = 'Network issue. Please try again in a moment.'
            } else {
                errorMessage = `Airdrop failed: ${error.message || 'Unknown error'}`
                setShowFallback(true)
            }
            
            setError(errorMessage)
        } finally {
            setIsAirdropping(false)
        }
    }

    // Don't show if not connected
    if (!connected || !publicKey) {
        return null
    }

    // Don't show if balance is sufficient
    if (balance !== null && balance >= MIN_BALANCE_THRESHOLD) {
        return null
    }

    const minutesRemaining = getTimeUntilNextAirdrop()
    const canRequest = canRequestAirdrop()

    return (
        <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00ff9f]/20 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
                <Droplet className="w-5 h-5 text-[#00ff9f] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#00ff9f] mb-2 font-mono">
                        Need Devnet SOL?
                    </h3>
                    <p className="text-sm text-[#00ff9f]/80 mb-3 font-mono">
                        You need SOL to pay for transaction fees. Get 0.5 SOL from the devnet faucet.
                    </p>
                    
                    {balance !== null && (
                        <p className="text-xs text-[#00ff9f]/60 mb-3 font-mono">
                            Current balance: {(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
                        </p>
                    )}

                    {airdropSuccess && (
                        <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-3 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00ff9f]" />
                            <p className="text-sm text-[#00ff9f] font-mono">
                                Successfully received 0.5 SOL!
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 mb-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 font-mono">
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleAirdrop}
                        disabled={isAirdropping || !canRequest}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded-lg font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(0,255,159,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#00ff9f]/50 font-mono"
                    >
                        {isAirdropping ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Requesting SOL...</span>
                            </>
                        ) : !canRequest && minutesRemaining ? (
                            <span>Wait {minutesRemaining} min{minutesRemaining > 1 ? 's' : ''}</span>
                        ) : (
                            <>
                                <Droplet className="w-4 h-4" />
                                <span>Get 0.5 Devnet SOL</span>
                            </>
                        )}
                    </button>

                    {!canRequest && minutesRemaining && (
                        <p className="text-xs text-[#00ff9f]/60 mt-2 text-center font-mono">
                            Rate limit: You can request again in {minutesRemaining} minute{minutesRemaining > 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </div>

            {showFallback && (
                <div className="mt-4 pt-4 border-t border-[#00ff9f]/20">
                    <h4 className="text-sm font-semibold text-[#00ff9f] mb-2 font-mono">
                        Alternative: Use Solana CLI
                    </h4>
                    <p className="text-xs text-[#00ff9f]/70 mb-2 font-mono">
                        If the automated faucet fails, you can request SOL using the Solana CLI:
                    </p>
                    <div className="bg-[#0f0f0f] border border-[#00ff9f]/20 rounded-lg p-3 mb-2">
                        <code className="text-xs text-[#00ff9f] font-mono break-all">
                            solana airdrop 0.5 {publicKey.toString()} --url devnet
                        </code>
                    </div>
                    <a
                        href="https://faucet.solana.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#00ff9f] hover:text-[#00cc7f] transition-colors font-mono"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Or use the web faucet
                    </a>
                </div>
            )}
        </div>
    )
}