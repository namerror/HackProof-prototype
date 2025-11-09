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
            true,
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
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        // Get voter's participant info for checking if they have a project
        const voterParticipant = await program.account.participant.fetch(voterParticipantPda)
        
        // Initialize remaining accounts array
        const remainingAccounts = []

        // If voter has a project, add it and its token account to remaining accounts
        if (voterParticipant.project) {
            // Add voter's project account
            remainingAccounts.push({
                pubkey: voterParticipant.project,
                isWritable: true,
                isSigner: false,
            })

            // Get and add voter's project token account
            const voterProjectTokenAccount = getAssociatedTokenAddressSync(
                votingTokenMintPda,
                voterParticipant.project,
                true,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )

            remainingAccounts.push({
                pubkey: voterProjectTokenAccount,
                isWritable: true,
                isSigner: false,
            })
        }

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
            .remainingAccounts(remainingAccounts)
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

/**
 * Fetch all projects from the Solana blockchain
 * Returns array of project data with PDAs and on-chain data
 */
export async function fetchAllProjects(
    connection: Connection,
    wallet?: any
): Promise<Array<{
    projectPda: string
    name: string
    description: string
    githubRepo: string
    creator: string
    totalVotesReceived: number
    submitted: boolean
    submissionUri?: string
    createdAt: number
}>> {
    try {
        // Create a minimal provider for read-only operations
        // Use a dummy keypair if no wallet provided
        const { Keypair } = await import('@solana/web3.js')
        const dummyWallet = wallet || {
            publicKey: Keypair.generate().publicKey,
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any[]) => txs,
        }
        
        const program = getProgram(connection, dummyWallet)
        
        // Fetch all Project accounts using Anchor's account methods
        const projectAccounts = await program.account.project.all()
        
        const projects = projectAccounts.map(({ account, publicKey }) => {
            try {
                return {
                    projectPda: publicKey.toString(),
                    name: account.name,
                    description: account.description,
                    githubRepo: account.githubRepo,
                    creator: account.creator.toString(),
                    totalVotesReceived: Number(account.totalVotesReceived),
                    submitted: account.submitted,
                    submissionUri: account.submissionUri || undefined,
                    createdAt: Number(account.createdAt),
                }
            } catch (error) {
                console.error('Error parsing project account:', error)
                return null
            }
        }).filter((p): p is NonNullable<typeof p> => p !== null)

        return projects
    } catch (error) {
        console.error('Error fetching all projects from Solana:', error)
        // Fallback: return empty array if blockchain fetch fails
        return []
    }
}

