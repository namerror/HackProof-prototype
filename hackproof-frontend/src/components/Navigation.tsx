'use client'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'

export default function Navigation() {
    const { connected } = useWallet()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])


    if (!mounted) {
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
                            <button className="bg-gray-400 text-white rounded-lg px-4 py-2 font-semibold opacity-50">
                                Loading...
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        )
    }

    return (
        <nav className="w-full border-b border-foreground/10 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-6 sm:gap-8">
                        <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                            🚀 HackProof
                        </Link>
                        {connected && (
                            <div className="hidden md:flex items-center gap-4">
                                <Link
                                    href="/projects"
                                    className="text-sm font-medium hover:text-green-400 transition-colors"
                                >
                                    Projects
                                </Link>
                                <Link
                                    href="/leaderboard"
                                    className="text-sm font-medium hover:text-green-400 transition-colors"
                                >
                                    Leaderboard
                                </Link>
                                <Link
                                    href="/submit"
                                    className="text-sm font-medium hover:text-green-400 transition-colors"
                                >
                                    Submit
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <WalletMultiButton className="!bg-blue-600 !text-white !rounded-lg !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all" />
                    </div>
                </div>
            </div>
        </nav>
    )
}

