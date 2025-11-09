import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@project-serum/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token'
import { HACKPROOF_IDL } from '@/idl/hackproof'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'

/**
 * Get the Anchor program instance
 */
export function getProgram(connection: Connection, wallet: any): Program {
    const provider = new AnchorProvider(connection, wallet, {})
    return new Program(HACKPROOF_IDL, HACKPROOF_PROGRAM_ID, provider)
}

/**
 * Check if hackathon is initialized
 */
export async function isHackathonInitialized(connection: Connection): Promise<boolean> {
    try {
        const [hackathonPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("hackathon")],
            HACKPROOF_PROGRAM_ID
        )
        const accountInfo = await connection.getAccountInfo(hackathonPda)
        return accountInfo !== null
    } catch (error) {
        console.error('Error checking hackathon initialization:', error)
        return false
    }
}

/**
 * Create a project on Solana blockchain
 */
export async function createProjectOnChain(
    connection: Connection,
    wallet: any,
    projectName: string,
    description: string,
    githubRepo: string,
    maxTeamSize: number,
    creatorPublicKey: PublicKey
): Promise<string> {
    if (!wallet || !creatorPublicKey) {
        throw new Error('Wallet not connected')
    }

    try {
        const program = getProgram(connection, wallet)

        // Derive PDAs
        const [hackathonPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("hackathon")],
            HACKPROOF_PROGRAM_ID
        )

        const [participantPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("participant"), creatorPublicKey.toBuffer()],
            HACKPROOF_PROGRAM_ID
        )

        const [projectPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("project"), creatorPublicKey.toBuffer(), Buffer.from(projectName)],
            HACKPROOF_PROGRAM_ID
        )

        const [votingTokenMintPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("voting_token_mint")],
            HACKPROOF_PROGRAM_ID
        )

        const projectTokenAccount = getAssociatedTokenAddressSync(
            votingTokenMintPda,
            projectPda,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        // Call the Solana program
        const signature = await program.methods
            .createProject(projectName, description, githubRepo, maxTeamSize)
            .accounts({
                project: projectPda,
                creatorParticipant: participantPda,
                hackathon: hackathonPda,
                projectTokenAccount: projectTokenAccount,
                votingTokenMint: votingTokenMintPda,
                creator: creatorPublicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc()

        return signature
    } catch (error: any) {
        console.error('Error creating project on Solana:', error)
        throw error
    }
}

/**
 * Vote on a project using Solana program
 */
export async function voteOnProjectOnChain(
    connection: Connection,
    wallet: any,
    projectPda: PublicKey,
    tokenAmount: number
): Promise<string> {
    if (!wallet || !projectPda) {
        throw new Error('Wallet or project not found')
    }

    try {
        const program = getProgram(connection, wallet)
        const voterPublicKey = wallet.publicKey

        // Derive PDAs
        const [hackathonPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("hackathon")],
            HACKPROOF_PROGRAM_ID
        )

        const [voterParticipantPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("participant"), voterPublicKey.toBuffer()],
            HACKPROOF_PROGRAM_ID
        )

        const [votingTokenMintPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("voting_token_mint")],
            HACKPROOF_PROGRAM_ID
        )

        const voterTokenAccount = getAssociatedTokenAddressSync(
            votingTokenMintPda,
            voterPublicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        const projectTokenAccount = getAssociatedTokenAddressSync(
            votingTokenMintPda,
            projectPda,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        // Call the Solana program
        const signature = await program.methods
            .voteWithTokens(new BN(tokenAmount))
            .accounts({
                project: projectPda,
                voterParticipant: voterParticipantPda,
                hackathon: hackathonPda,
                voterTokenAccount: voterTokenAccount,
                projectTokenAccount: projectTokenAccount,
                votingTokenMint: votingTokenMintPda,
                voter: voterPublicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc()

        return signature
    } catch (error: any) {
        console.error('Error voting on Solana:', error)
        throw error
    }
}

/**
 * Get voting token balance for a user
 */
export async function getVotingTokenBalance(
    connection: Connection,
    userPublicKey: PublicKey
): Promise<number> {
    try {
        const [votingTokenMintPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("voting_token_mint")],
            HACKPROOF_PROGRAM_ID
        )

        const userTokenAccount = getAssociatedTokenAddressSync(
            votingTokenMintPda,
            userPublicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        try {
            const tokenAccount = await getAccount(connection, userTokenAccount)
            return Number(tokenAccount.amount)
        } catch (error) {
            // Token account doesn't exist yet, return 0
            return 0
        }
    } catch (error) {
        console.error('Error getting voting token balance:', error)
        return 0
    }
}

