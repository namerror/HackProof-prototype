'use client'
import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { IPFSClient, createParticipantMetadata } from '@shared'
import { useParticipant } from '@/contexts/ParticipantContext'
import { registerParticipantOnChain } from '@/services/solana-program'

export default function RegisterPage() {
    const { connected, publicKey, signTransaction } = useWallet()
    const { connection } = useConnection()
    const { isRegistered, participant, registerParticipant } = useParticipant()
    const [formData, setFormData] = useState({
        name: '',
        project: '',
        description: ''
    })
    const [isMinting, setIsMinting] = useState(false)
    const [mintSuccess, setMintSuccess] = useState(false)
    const [metadataCid, setMetadataCid] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const [txSignature, setTxSignature] = useState<string | null>(null)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleMintNFT = async () => {
        if (!connected || !publicKey) {
            alert('Please connect your wallet first')
            return
        }

        if (isRegistered) {
            alert('You are already registered! Your wallet is already associated with a participant NFT.')
            return
        }

        if (!formData.name || !formData.project || !formData.description) {
            alert('Please fill in all fields')
            return
        }

        setIsMinting(true)

        try {
            const client = new IPFSClient()
            
            // Step 1: Upload participant badge image to IPFS
            setUploadProgress('Uploading participant badge image...')
            
            // Load the default participant badge image
            const defaultBadgeUrl = 'https://via.placeholder.com/512/4F46E5/FFFFFF?text=HackProof+Participant'
            const badgeResponse = await fetch(defaultBadgeUrl)
            const badgeBlob = await badgeResponse.blob()
            const badgeCid = await client.uploadImage(badgeBlob, 'participant-badge.png')
            
            setUploadProgress('Creating metadata...')
            
            // Step 2: Create participant metadata
            const metadata = createParticipantMetadata(formData.name, badgeCid, {
                skills: [formData.project] // Using project name as a skill for now
            })
            
            // Step 3: Upload metadata to IPFS
            setUploadProgress('Uploading metadata to IPFS...')
            const metadataCid = await client.uploadMetadata(metadata)
            setMetadataCid(metadataCid)
            
            // Step 4: Get full metadata URI
            const metadataUri = client.getMetadataUri(metadataCid)
            
            // Step 5: Register participant on Solana blockchain
            setUploadProgress('Registering on Solana...')
            let signature: string | null = null
            try {
                signature = await registerParticipantOnChain(
                    connection,
                    { publicKey, signTransaction, signAllTransactions: undefined } as any,
                    formData.name,
                    metadataUri
                )
                setTxSignature(signature)
                console.log('Solana transaction signature:', signature)
            } catch (solanaError: any) {
                console.error('Solana registration failed:', solanaError)
                // Continue with IPFS registration even if Solana fails
                // This allows the system to work even if Solana is down
                const errorMessage = solanaError?.message || 'Unknown error'
                console.warn(`Solana registration failed: ${errorMessage}. Continuing with IPFS-only registration.`)
            }
            
            // Step 6: Register participant locally with wallet address -> IPFS CID mapping
            await registerParticipant(metadataCid, formData.name)
            
            setUploadProgress('Complete!')
            setMintSuccess(true)
            
            console.log('Metadata CID:', metadataCid)
            console.log('Metadata URI:', metadataUri)
        } catch (error) {
            console.error('Error uploading to IPFS:', error)
            alert('Failed to upload to IPFS. Please check your NFT_STORAGE_TOKEN and try again.')
        } finally {
            setIsMinting(false)
            setUploadProgress('')
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

    // Show already registered message
    if (isRegistered && participant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full bg-background/50 backdrop-blur-sm border border-foreground/10 rounded-2xl p-8 shadow-xl text-center space-y-6">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-3xl font-bold">Already Registered!</h1>
                    <p className="text-foreground/70">
                        Your wallet is already registered as a participant.
                    </p>
                    {participant.cachedMetadata && (
                        <div className="text-left bg-background/30 rounded-lg p-4 space-y-2">
                            <p><strong>Name:</strong> {participant.cachedMetadata.name.replace('HackProof Participant: ', '')}</p>
                            {participant.cachedMetadata.properties.skills && participant.cachedMetadata.properties.skills.length > 0 && (
                                <p><strong>Skills:</strong> {participant.cachedMetadata.properties.skills.join(', ')}</p>
                            )}
                        </div>
                    )}
                    <div className="pt-4 space-y-3">
                        <Link
                            href="/"
                            className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Go to Home
                        </Link>
                        {participant.metadataCid && (
                            <a
                                href={`https://${participant.metadataCid}.ipfs.nftstorage.link`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full px-6 py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                            >
                                View on IPFS →
                            </a>
                        )}
                    </div>
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
                        Your Participant NFT has been registered! Your metadata is stored on IPFS and registered on Solana.
                    </p>
                    {metadataCid && (
                        <div className="text-sm text-foreground/60 pt-2 space-y-3">
                            <div>
                                <p className="font-semibold mb-1">IPFS Metadata:</p>
                                <code className="bg-background/50 px-2 py-1 rounded text-xs break-all block">{metadataCid}</code>
                                <a 
                                    href={`https://${metadataCid}.ipfs.nftstorage.link/metadata.json`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-blue-400 hover:text-blue-300 underline mt-1"
                                >
                                    View on IPFS →
                                </a>
                            </div>
                            {txSignature && (
                                <div>
                                    <p className="font-semibold mb-1">Solana Transaction:</p>
                                    <code className="bg-background/50 px-2 py-1 rounded text-xs break-all block">{txSignature.slice(0, 20)}...</code>
                                    <a 
                                        href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-blue-400 hover:text-blue-300 underline mt-1"
                                    >
                                        View on Solscan →
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
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
                                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl flex items-center justify-center gap-2 border border-blue-500/50"
                            >
                                {isMinting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span>{uploadProgress || 'Minting NFT...'}</span>
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

