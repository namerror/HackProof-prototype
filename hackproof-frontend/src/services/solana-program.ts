import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, Keypair, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { Program, AnchorProvider } from '@project-serum/anchor'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { sha256 } from '@noble/hashes/sha256'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { HACKPROOF_IDL } from '@/idl/hackproof'

// Metaplex Token Metadata Program (mainnet / devnet universal ID)
export const METAPLEX_TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Get the participant PDA (Program Derived Address)
 */
export function getParticipantPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), authority.toBuffer()],
    HACKPROOF_PROGRAM_ID
  )
}

/**
 * Calculate Anchor method discriminator
 * Anchor uses: sha256("global:<method_name>")[0..8]
 */
function getMethodDiscriminator(methodName: string): Buffer {
  const preimage = `global:${methodName}`
  const hash = sha256(utf8ToBytes(preimage))
  return Buffer.from(hash.slice(0, 8))
}

// Helper to convert string to bytes
function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

/**
 * Register a participant on Solana blockchain
 * @param connection - Solana connection
 * @param wallet - Wallet adapter state
 * @param name - Participant name
 * @param metadataUri - IPFS metadata URI (e.g., "https://gateway.pinata.cloud/ipfs/<cid>/metadata.json")
 * @returns Transaction signature
 */
export async function registerParticipantOnChain(
  connection: Connection,
  wallet: WalletContextState,
  name: string,
  metadataUri: string
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected or does not support signing')
  }

  try {
    // Anchor program/provider
    const provider = new AnchorProvider(connection, wallet as any, {})
    const program = new Program(HACKPROOF_IDL, HACKPROOF_PROGRAM_ID, provider)

    // Derive required PDAs
    const [participantPDA] = getParticipantPDA(wallet.publicKey)
    const [hackathonPda] = PublicKey.findProgramAddressSync([
      Buffer.from('hackathon')
    ], HACKPROOF_PROGRAM_ID)
    const [votingTokenMintPda] = PublicKey.findProgramAddressSync([
      Buffer.from('voting_token_mint')
    ], HACKPROOF_PROGRAM_ID)

    // Generate mint for participant NFT
  const nftMintKeypair = Keypair.generate()

    // Metaplex metadata + master edition PDAs (must be derived with Metaplex program ID)
    const metadataPda = PublicKey.findProgramAddressSync([
      Buffer.from('metadata'),
      METAPLEX_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      nftMintKeypair.publicKey.toBuffer()
    ], METAPLEX_TOKEN_METADATA_PROGRAM_ID)[0]

    const masterEditionPda = PublicKey.findProgramAddressSync([
      Buffer.from('metadata'),
      METAPLEX_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      nftMintKeypair.publicKey.toBuffer(),
      Buffer.from('edition')
    ], METAPLEX_TOKEN_METADATA_PROGRAM_ID)[0]

    // Associated token accounts
    const nftTokenAccount = getAssociatedTokenAddressSync(
      nftMintKeypair.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    const votingTokenAccount = getAssociatedTokenAddressSync(
      votingTokenMintPda,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    // Pre-instruction: ensure NFT ATA exists (the on-chain program does not create it)
    const preInstructions: TransactionInstruction[] = []
    preInstructions.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, // payer
        nftTokenAccount,
        wallet.publicKey, // owner (authority)
        nftMintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )

    // Execute Anchor method with signers
    const signature = await program.methods
      .registerParticipant(name, metadataUri)
      .accounts({
        participant: participantPDA,
        hackathon: hackathonPda,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        nftMint: nftMintKeypair.publicKey,
        nftTokenAccount,
        votingTokenMint: votingTokenMintPda,
        votingTokenAccount,
        authority: wallet.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY
      })
      .preInstructions(preInstructions)
      .signers([nftMintKeypair])
      .rpc()

    return signature
  } catch (error) {
    console.error('Error registering participant on Solana via Anchor:', error)
    throw error
  }
}

