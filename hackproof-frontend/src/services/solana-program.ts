import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { sha256 } from '@noble/hashes/sha256'

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
 * @param metadataUri - IPFS metadata URI (e.g., "https://<cid>.ipfs.nftstorage.link/metadata.json")
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
    // Get participant PDA
    const [participantPDA, bump] = getParticipantPDA(wallet.publicKey)

    // Create a dummy metadata account pubkey (the program expects it but doesn't use it currently)
    // The program has it as UncheckedAccount, so we can use any valid pubkey
    const metadataAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), participantPDA.toBuffer()],
      HACKPROOF_PROGRAM_ID
    )[0]

    // Build instruction data
    // Anchor instruction format: [discriminator: 8 bytes] [name_len: u32] [name: bytes] [uri_len: u32] [uri: bytes]
    const methodDiscriminator = getMethodDiscriminator('register_participant')
    const nameBytes = Buffer.from(name, 'utf-8')
    const uriBytes = Buffer.from(metadataUri, 'utf-8')
    
    const data = Buffer.alloc(8 + 4 + nameBytes.length + 4 + uriBytes.length)
    methodDiscriminator.copy(data, 0)
    data.writeUInt32LE(nameBytes.length, 8)
    nameBytes.copy(data, 12)
    data.writeUInt32LE(uriBytes.length, 12 + nameBytes.length)
    uriBytes.copy(data, 12 + nameBytes.length + 4)

    // Create instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: participantPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: HACKPROOF_PROGRAM_ID,
      data,
    })

    // Build transaction
    const transaction = new Transaction()
    transaction.add(instruction)
    transaction.feePayer = wallet.publicKey
    
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash

    // Sign and send transaction
    const signed = await wallet.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed')

    return signature
  } catch (error) {
    console.error('Error registering participant on Solana:', error)
    throw error
  }
}

