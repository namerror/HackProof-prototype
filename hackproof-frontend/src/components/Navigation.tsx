'use client'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Navigation() {
    const { connected } = useWallet()

    return (
        <nav className="w-full border-b border-foreground/10 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                            🚀 HackProof
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <WalletMultiButton className="!bg-blue-600 !text-white !rounded-lg !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all" />
                    </div>
                </div>
            </div>
        </nav>
    )
}

