'use client'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'

export default function RegisterPage() {
    const { connected } = useWallet()
    const [formData, setFormData] = useState({
        name: '',
        project: '',
        description: ''
    })
    const [isMinting, setIsMinting] = useState(false)
    const [mintSuccess, setMintSuccess] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleMintNFT = async () => {
        if (!connected) {
            alert('Please connect your wallet first')
            return
        }

        if (!formData.name || !formData.project || !formData.description) {
            alert('Please fill in all fields')
            return
        }

        setIsMinting(true)

        // TODO: Implement actual NFT minting logic here
        // For now, simulate the minting process
        try {
            await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
            setMintSuccess(true)
        } catch (error) {
            console.error('Error minting NFT:', error)
            alert('Failed to mint NFT. Please try again.')
        } finally {
            setIsMinting(false)
        }
    }

    if (!connected) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <h1 className="text-3xl font-bold">Wallet Not Connected</h1>
                    <p className="text-foreground/70">Please connect your wallet to register for the hackathon.</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        )
    }

    if (mintSuccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full bg-background/50 backdrop-blur-sm border border-foreground/10 rounded-2xl p-8 shadow-xl text-center space-y-6">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold">Success!</h1>
                    <p className="text-foreground/70">
                        Your Participant NFT has been minted successfully! You've received 100 voting tokens.
                    </p>
                    <div className="pt-4 space-y-3">
                        <Link
                            href="/"
                            className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Start Voting
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">
            <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Register for Hackathon</h1>
                    <p className="text-sm sm:text-base text-foreground/70">Fill in your details to mint your Participant NFT</p>
                </div>

                <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl">
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleMintNFT() }}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="project" className="block text-sm font-medium mb-2">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                id="project"
                                name="project"
                                value={formData.project}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter your project name"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-2">
                                Project Description *
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                rows={5}
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                placeholder="Brief description of your project..."
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                onClick={handleMintNFT}
                                disabled={isMinting || !formData.name || !formData.project || !formData.description}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                {isMinting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span>Minting NFT...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🎨</span>
                                        <span>Mint Participant NFT</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="text-center pt-4">
                            <Link
                                href="/"
                                className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    )
}

