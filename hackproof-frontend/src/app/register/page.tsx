'use client'
import { useState } from 'react'
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { IPFSClient, createParticipantMetadata } from '@shared'
import { useParticipant } from '@/contexts/ParticipantContext'
import { Program, AnchorProvider } from '@project-serum/anchor'
import { PublicKey, SystemProgram, Keypair, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { HACKPROOF_IDL } from '@/idl/hackproof'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import DevnetFaucet from '@/components/DevnetFaucet'
import { isHackathonInitialized } from '@/services/solana-integration'

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Metaplex PDA derivation helpers
function findMetadataPda(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    )[0]
}

function findMasterEditionPda(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
            Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
    )[0]
}

export default function RegisterPage() {
    const { connected, publicKey } = useWallet()
    const { connection } = useConnection()
    const wallet = useAnchorWallet()
    const { isRegistered, participant, registerParticipant } = useParticipant()
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        skills: ''
    })
    const [error, setError] = useState<string | null>(null)
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

    const createMetadataJson = () => {
        return JSON.stringify({
            name: formData.name,
            bio: formData.bio,
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            created_at: new Date().toISOString()
        })
    }

    const handleMintNFT = async () => {
        if (!connected || !publicKey || !wallet) {
            setError('Please connect your wallet first')
            return
        }

        if (isRegistered) {
            alert('You are already registered! Your wallet is already associated with a participant NFT.')
            return
        }

        if (!formData.name || !formData.bio) {
            setError('Please fill in all required fields')
            return
        }

        setIsMinting(true)
        setError(null)

        try {
            const client = new IPFSClient()
            
            // Step 1: Upload participant badge image to IPFS
            setUploadProgress('Uploading participant badge image...')
            
            // Create a simple badge image using canvas (no external fetch needed)
            let badgeBlob: Blob
            try {
                // Try to use the actual badge image if available
                const badgeImagePath = '/participant-badge.png'
                const badgeResponse = await fetch(badgeImagePath)
                if (badgeResponse.ok) {
                    badgeBlob = await badgeResponse.blob()
                } else {
                    throw new Error('Badge image not found')
                }
            } catch (error) {
                // Fallback: Create a simple colored image using canvas
                console.log('Creating fallback badge image...')
                const canvas = document.createElement('canvas')
                canvas.width = 512
                canvas.height = 512
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    // Draw background
                    ctx.fillStyle = '#4F46E5'
                    ctx.fillRect(0, 0, 512, 512)
                    // Draw text
                    ctx.fillStyle = '#FFFFFF'
                    ctx.font = 'bold 48px Arial'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('HackProof', 256, 200)
                    ctx.font = '32px Arial'
                    ctx.fillText('Participant', 256, 280)
                }
                badgeBlob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((blob) => {
                        resolve(blob || new Blob())
                    }, 'image/png')
                })
            }
            const badgeCid = await client.uploadImage(badgeBlob, 'participant-badge.png')
            
            setUploadProgress('Creating metadata...')
            
            // Step 2: Create participant metadata
            const metadata = createParticipantMetadata(formData.name, badgeCid, {
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
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
                if (!wallet || !publicKey) {
                    throw new Error('Wallet not connected')
                }

                // Ensure hackathon is initialized on-chain before proceeding
                const initialized = await isHackathonInitialized(connection)
                if (!initialized) {
                    throw new Error('Hackathon is not initialized on-chain. Please ask the admin to initialize the hackathon first.')
                }

                // Create Anchor provider and program
                const provider = new AnchorProvider(connection, wallet, {})
                const program = new Program(HACKPROOF_IDL, HACKPROOF_PROGRAM_ID, provider)

                // Derive PDAs
                const [participantPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("participant"), publicKey.toBuffer()],
                    HACKPROOF_PROGRAM_ID
                )

                const [hackathonPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("hackathon")],
                    HACKPROOF_PROGRAM_ID
                )

                const [votingTokenMintPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("voting_token_mint")],
                    HACKPROOF_PROGRAM_ID
                )

                // Generate NFT mint keypair
                const nftMint = Keypair.generate()

                // Derive Metaplex metadata and master edition addresses
                const metadataAddress = findMetadataPda(nftMint.publicKey)
                const masterEditionAddress = findMasterEditionPda(nftMint.publicKey)

                // Derive NFT token account (ATA)
                const nftTokenAccount = getAssociatedTokenAddressSync(
                    nftMint.publicKey,
                    publicKey,
                    false,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )

                // Derive voting token account (ATA)
                const votingTokenAccount = getAssociatedTokenAddressSync(
                    votingTokenMintPda,
                    publicKey,
                    false,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )


                // Pre-instruction: create ATA for the NFT so mint_to succeeds inside program
                const preInstructions = [
                    createAssociatedTokenAccountInstruction(
                        publicKey, // payer
                        nftTokenAccount,
                        publicKey, // owner
                        nftMint.publicKey,
                        TOKEN_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                ]

                signature = await program.methods
                  .registerParticipant(formData.name, metadataUri)
                  .accounts({
                      participant: participantPda,
                      hackathon: hackathonPda,
                      metadata: metadataAddress,
                      masterEdition: masterEditionAddress,
                      nftMint: nftMint.publicKey,
                      nftTokenAccount: nftTokenAccount,
                      votingTokenMint: votingTokenMintPda,
                      votingTokenAccount: votingTokenAccount,
                      authority: publicKey,
                      rent: SYSVAR_RENT_PUBKEY,
                      systemProgram: SystemProgram.programId,
                      tokenProgram: TOKEN_PROGRAM_ID,
                      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
                  })
                  .preInstructions(preInstructions)
                  .signers([nftMint])
                  .rpc()

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
        } catch (error: any) {
            console.error('Error in registration process:', error)
            const errorMessage = error?.message || 'Unknown error occurred'
            
            // More specific error handling
            if (errorMessage.includes('PINATA_JWT') || errorMessage.includes('NEXT_PUBLIC_PINATA_JWT')) {
                alert('Pinata JWT Token not found. Please set NEXT_PUBLIC_PINATA_JWT in your .env.local file.\n\nCreate hackproof-frontend/.env.local with:\nNEXT_PUBLIC_PINATA_JWT=your_jwt_token_here\n\nThen restart your dev server.')
            } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
                alert(`Network error: ${errorMessage}\n\nPossible causes:\n- Check your internet connection\n- Pinata API might be temporarily down\n- Firewall or network restrictions\n\nPlease try again in a moment.`)
            } else if (errorMessage.includes('Invalid Pinata') || errorMessage.includes('401') || errorMessage.includes('403')) {
                alert('Invalid Pinata JWT Token. Please verify your token at https://app.pinata.cloud/ and update .env.local')
            } else if (errorMessage.includes('IPFS') || errorMessage.includes('upload')) {
                alert(`Failed to upload to IPFS: ${errorMessage}\n\nPlease check your PINATA_JWT and try again.`)
            } else {
                alert(`Registration failed: ${errorMessage}\n\nCheck the browser console for more details.`)
            }
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
                    <div className="mb-4 flex justify-center">
                        <CheckCircle2 className="w-16 h-16 text-[#00ff9f]" />
                    </div>
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
                                href={`https://gateway.pinata.cloud/ipfs/${participant.metadataCid}`}
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
                                    href={`https://gateway.pinata.cloud/ipfs/${metadataCid}`}
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
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Register as Participant</h1>
                    <p className="text-sm sm:text-base text-foreground/70">Fill in your details to mint your Participant NFT and receive voting tokens</p>
                </div>

                <DevnetFaucet />

                <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl">
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                            <label htmlFor="bio" className="block text-sm font-medium mb-2">
                                Bio *
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                required
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <div>
                            <label htmlFor="skills" className="block text-sm font-medium mb-2">
                                Skills (optional)
                            </label>
                            <input
                                type="text"
                                id="skills"
                                name="skills"
                                value={formData.skills}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., JavaScript, Python, Solidity (comma-separated)"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600">
                                <p>{error}</p>
                            </div>
                        )}
                        
                        <div className="pt-4">
                            <button
                                type="submit"
                                onClick={handleMintNFT}
                                disabled={isMinting || !formData.name || !formData.bio}
                                className="w-full px-8 py-4 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded-xl font-semibold shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl flex items-center justify-center gap-2 border border-[#00ff9f]/50 font-mono"
                            >
                                {isMinting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>{uploadProgress || 'Minting NFT...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
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

