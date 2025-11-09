'use client'
import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Droplets } from 'lucide-react'

export default function DevnetFaucet() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [isRequesting, setIsRequesting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const requestAirdrop = async () => {
    if (!publicKey) {
      setMessage('Please connect your wallet first')
      return
    }

    setIsRequesting(true)
    setMessage(null)

    try {
      // Request 0.2 SOL from the devnet faucet
      const signature = await connection.requestAirdrop(
        publicKey,
        0.2 * LAMPORTS_PER_SOL
      )

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      setMessage('Success! 0.2 SOL airdropped to your wallet.')
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Airdrop error:', error)
      setMessage(error?.message || 'Failed to request airdrop. Please try again.')
      
      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsRequesting(false)
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Droplets className="w-5 h-5 text-[#00ff9f]" />
          <div>
            <div className="text-sm font-semibold text-[#00ff9f] font-mono">
              Need Devnet SOL?
            </div>
            <div className="text-xs text-[#00ff9f]/70 font-mono">
              Get 0.2 SOL for free to pay transaction fees
            </div>
          </div>
        </div>
        <button
          onClick={requestAirdrop}
          disabled={isRequesting}
          className="px-4 py-2 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded font-semibold hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#00ff9f]/50 font-mono text-sm"
        >
          {isRequesting ? 'Requesting...' : 'Request Airdrop'}
        </button>
      </div>
      {message && (
        <div className={`mt-3 text-sm font-mono ${
          message.includes('Success') ? 'text-[#00ff9f]' : 'text-red-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}

