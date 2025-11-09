'use client'
import { useState } from 'react'
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
// Removed IPFS dependencies - everything is on-chain now
import { useParticipant } from '@/contexts/ParticipantContext'
import { Program, AnchorProvider } from '@project-serum/anchor'
import { PublicKey, SystemProgram, Keypair, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { HACKPROOF_IDL } from '@/idl/hackproof'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import DevnetFaucet from '@/components/DevnetFaucet'
import { isHackathonInitialized, getVotingTokenBalance } from '@/services/solana-integration'

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
    const { isRegistered, participant, registerParticipant, loadParticipantData, cleanupParticipant } = useParticipant()
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        skills: ''
    })
    const [error, setError] = useState<string | null>(null)
    const [isMinting, setIsMinting] = useState(false)
    const [mintSuccess, setMintSuccess] = useState(false)
    // Removed metadataCid - we're using on-chain storage only
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const [txSignature, setTxSignature] = useState<string | null>(null)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Removed createMetadataJson - we're using on-chain storage only

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
            // Register participant on Solana blockchain (on-chain only, no IPFS)
            setUploadProgress('Checking wallet balance...')
            
            // Check SOL balance before attempting registration
            if (!wallet || !publicKey) {
                throw new Error('Wallet not connected')
            }
            
            const balance = await connection.getBalance(publicKey)
            const minRequiredSol = 0.1 // ~0.1 SOL should be enough for registration (rent + fees)
            const balanceInSol = balance / 1e9 // Convert lamports to SOL
            
            if (balanceInSol < minRequiredSol) {
                throw new Error(
                    `Insufficient SOL balance. You need at least ${minRequiredSol} SOL to register.\n\n` +
                    `Current balance: ${balanceInSol.toFixed(4)} SOL\n\n` +
                    `Please use the Devnet Faucet above to get free SOL, or request SOL from:\n` +
                    `https://faucet.solana.com/`
                )
            }
            
            setUploadProgress('Registering on Solana...')
            
            // Use empty string for metadata URI since we're storing everything on-chain
            const metadataUri = ''
            let signature: string | null = null
            try {

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


                // Pre-instructions: ensure ATAs exist so mint/transfer succeed inside program
                const preInstructions = [] as any[]
                // NFT ATA (always create; if exists, instruction will fail, so check first)
                const nftAtaInfo = await connection.getAccountInfo(nftTokenAccount)
                if (!nftAtaInfo) {
                    preInstructions.push(
                        createAssociatedTokenAccountInstruction(
                            publicKey, // payer
                            nftTokenAccount,
                            publicKey, // owner
                            nftMint.publicKey,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID
                        )
                    )
                }
                // Voting token ATA (create if missing to avoid relying on program's init_if_needed)
                const votingAtaInfo = await connection.getAccountInfo(votingTokenAccount)
                if (!votingAtaInfo) {
                    preInstructions.push(
                        createAssociatedTokenAccountInstruction(
                            publicKey,
                            votingTokenAccount,
                            publicKey,
                            votingTokenMintPda,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID
                        )
                    )
                }

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
                // Confirm transaction and then poll for token balance to reflect minting
                try {
                    await connection.confirmTransaction(signature, 'confirmed')
                } catch (e) {
                    console.warn('confirmTransaction warning:', e)
                }

                // Poll for voting token balance until non-zero (max ~15s)
                let attempts = 0
                let lastBalance = 0
                while (attempts < 10) {
                    const bal = await getVotingTokenBalance(connection, publicKey)
                    lastBalance = bal
                    if (bal > 0) break
                    await new Promise(res => setTimeout(res, 1500))
                    attempts++
                }
                if (lastBalance === 0) {
                    throw new Error('Registration transaction sent but voting tokens not detected yet. Please retry or check your SOL balance and try again.')
                }
            } catch (solanaError: any) {
                console.error('Solana registration failed:', solanaError)
                // Surface the error and stop; we shouldn't mark success without tokens
                const errorMessage = solanaError?.message || 'Unknown error'
                
                // Check for insufficient funds error
                if (errorMessage.includes('debit') && errorMessage.includes('no record of a prior credit') ||
                    errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient')) {
                    const balance = await connection.getBalance(publicKey).catch(() => 0)
                    const balanceInSol = balance / 1e9
                    throw new Error(
                        `Insufficient SOL balance to complete registration.\n\n` +
                        `Current balance: ${balanceInSol.toFixed(4)} SOL\n` +
                        `Required: ~0.1 SOL (for transaction fees and rent)\n\n` +
                        `Please use the Devnet Faucet above to get free SOL, or visit:\n` +
                        `https://faucet.solana.com/`
                    )
                }
                
                // Check for Phantom trust/security errors
                if (errorMessage.includes('trust') || errorMessage.includes('unsafe') || errorMessage.includes('not trusted') || 
                    errorMessage.includes('User rejected') || errorMessage.includes('4001') ||
                    solanaError?.code === 4001 || solanaError?.code === -32002) {
                    throw new Error(
                        `Phantom wallet blocked the transaction. Please:\n\n` +
                        `1. Make sure you're using HTTPS or localhost\n` +
                        `2. Click the Phantom extension icon\n` +
                        `3. Go to Settings > Trusted Apps\n` +
                        `4. Add this website to your trusted apps\n` +
                        `5. Try again\n\n` +
                        `Or approve the transaction when Phantom prompts you.`
                    )
                }
                
                throw new Error(`Solana registration failed: ${errorMessage}`)
            }
            
            // Register participant locally (for UI state)
            await registerParticipant('', formData.name) // Empty CID since we're on-chain only
            // Refresh participant state and token balance after registration
            await loadParticipantData()
            setUploadProgress('Complete!')
            setMintSuccess(true)
            
            console.log('Registration successful! Transaction:', signature)
            // Optional: Force page reload to refresh Navigation token balance
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        } catch (error: any) {
            console.error('Error in registration process:', error)
            const errorMessage = error?.message || 'Unknown error occurred'
            
            // Show user-friendly error with instructions for trust issues
            if (errorMessage.includes('Phantom wallet blocked') || errorMessage.includes('trust')) {
                setError(errorMessage)
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
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('This will remove your local registration and optionally unpin metadata from Pinata. Continue?')) return
                                                        try {
                                                            await cleanupParticipant({ unpin: true })
                                                            alert('Participant cleaned. Reloading to allow fresh registration.')
                                                            window.location.reload()
                                                        } catch (e:any) {
                                                            alert('Cleanup failed: ' + (e.message || String(e)))
                                                        }
                                                    }}
                                                    className="inline-block w-full px-6 py-3 bg-red-600/80 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                                >
                                                    Cleanup & Re-register
                                                </button>
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
                        Your Participant NFT has been registered on Solana! You've received 100 voting tokens.
                    </p>
                    {txSignature && (
                        <div className="text-sm text-foreground/60 pt-2 space-y-3">
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
                                <p className="whitespace-pre-line">{error}</p>
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

