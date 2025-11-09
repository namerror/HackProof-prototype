'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
// Removed IPFS dependencies - everything is on-chain now
import { PublicKey } from '@solana/web3.js'
import { createProjectOnChain, voteOnProjectOnChain, fetchAllProjects } from '@/services/solana-integration'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'

export interface Project {
    id: string
    metadataCid: string // IPFS CID for project metadata
    votes: number // Dynamic data stored locally (synced from Solana)
    owner: string
    createdAt: number
    projectPda?: string // Solana Program Derived Address for the project
    solanaTxSignature?: string // Transaction signature from Solana
    // Cached metadata (loaded from IPFS)
    cachedMetadata?: {
        name: string
        description: string
        teamMembers: string[]
        githubRepo?: string
        image: string
    }
}

interface ProjectsContextType {
    projects: Project[]
    addProject: (projectData: {
        name: string
        description: string
        teamMembers: string[]
        githubLink?: string
        owner: string
    }, solanaIntegration?: {
        connection: any
        wallet: any
        publicKey: any
    }) => Promise<string>
    voteOnProject: (projectId: string, votes: number, voterWalletAddress?: string, solanaIntegration?: {
        connection: any
        wallet: any
        publicKey: any
    }) => Promise<void>
    loadProjectMetadata: (projectId: string) => Promise<void>
    getUserProject: (walletAddress: string) => Project | undefined
    hasUserSubmittedProject: (walletAddress: string) => boolean
    isProjectNameTaken: (projectName: string) => boolean
    refreshProjects: () => Promise<void>
    publishProject?: (projectId: string) => Promise<string>
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([])
    const { connection } = useConnection()
    const wallet = useWallet()
    // Removed IPFS client - we're using on-chain storage only

    const loadProjectMetadata = useCallback(async (projectId: string) => {
        // Metadata is loaded from on-chain data, no IPFS needed
        // This function is kept for compatibility but does nothing
        console.log('loadProjectMetadata called for', projectId, '- metadata loaded from blockchain')
    }, [])

    // Fetch all projects from blockchain (on-chain data only)
    const loadAllProjects = useCallback(async () => {
        try {
            console.log('Fetching all projects from Solana blockchain...')
            const blockchainProjects = await fetchAllProjects(connection, wallet.wallet || undefined)
            
            if (blockchainProjects.length === 0) {
                console.log('No projects found on blockchain, checking localStorage...')
                // Fallback to localStorage if blockchain is empty
                const stored = localStorage.getItem('hackproof-project-cids')
                if (stored) {
                    try {
                        const projectCids: Project[] = JSON.parse(stored)
                        setProjects(projectCids)
                        projectCids.forEach(project => {
                            if (!project.cachedMetadata) {
                                loadProjectMetadata(project.id)
                            }
                        })
                    } catch (e) {
                        console.error('Failed to load projects from localStorage:', e)
                    }
                }
                return
            }

            console.log(`Found ${blockchainProjects.length} projects on blockchain`)
            
            // Convert blockchain projects to our Project format using on-chain data only
            const projectsWithMetadata: Project[] = blockchainProjects.map((bp) => {
                // Use on-chain data directly - no IPFS needed
                const cachedMetadata: Project['cachedMetadata'] = {
                    name: bp.name,
                    description: bp.description,
                    teamMembers: [], // Team members not stored on-chain in current version
                    githubRepo: bp.githubRepo,
                    image: '' // No image stored on-chain
                }
                
                return {
                    id: bp.projectPda, // Use PDA as ID
                    metadataCid: bp.projectPda, // Use PDA as metadata CID (on-chain identifier)
                    votes: bp.totalVotesReceived,
                    owner: bp.creator,
                    createdAt: bp.createdAt * 1000, // Convert to milliseconds
                    projectPda: bp.projectPda,
                    cachedMetadata
                }
            })
            
            setProjects(projectsWithMetadata)
            console.log(`Loaded ${projectsWithMetadata.length} projects with metadata`)
        } catch (error) {
            console.error('Error loading all projects:', error)
            // Fallback to localStorage on error
            const stored = localStorage.getItem('hackproof-project-cids')
            if (stored) {
                try {
                    const projectCids: Project[] = JSON.parse(stored)
                    setProjects(projectCids)
                    projectCids.forEach(project => {
                        if (!project.cachedMetadata) {
                            loadProjectMetadata(project.id)
                        }
                    })
                } catch (e) {
                    console.error('Failed to load projects from localStorage:', e)
                }
            }
        }
    }, [connection, wallet.wallet, loadProjectMetadata])

    // Load all projects on mount and when connection changes
    useEffect(() => {
        loadAllProjects()
    }, [loadAllProjects])

    // Save project CIDs to localStorage whenever they change
    useEffect(() => {
        if (projects.length > 0) {
            // Only store essential data (CIDs and votes), not full metadata
            const projectCids = projects.map(p => ({
                id: p.id,
                metadataCid: p.metadataCid,
                votes: p.votes,
                owner: p.owner,
                createdAt: p.createdAt,
                cachedMetadata: p.cachedMetadata // Cache for faster loading
            }))
            localStorage.setItem('hackproof-project-cids', JSON.stringify(projectCids))
        }
    }, [projects])

    const getUserProject = (walletAddress: string): Project | undefined => {
        return projects.find(p => p.owner.toLowerCase() === walletAddress.toLowerCase())
    }

    const hasUserSubmittedProject = (walletAddress: string): boolean => {
        return getUserProject(walletAddress) !== undefined
    }

    const isProjectNameTaken = (projectName: string): boolean => {
        const trimmedName = projectName.trim().toLowerCase()
        return projects.some(p => 
            p.cachedMetadata?.name?.toLowerCase() === trimmedName
        )
    }

    const addProject = async (
        projectData: {
            name: string
            description: string
            teamMembers: string[]
            githubLink?: string
            owner: string
        },
        solanaIntegration?: {
            connection: any
            wallet: any
            publicKey: any
        }
    ): Promise<string> => {
        // CRITICAL: Check if user already has a project
        const existingProject = getUserProject(projectData.owner)
        if (existingProject) {
            throw new Error('You have already submitted a project. Each wallet can only submit one project.')
        }

        // CRITICAL: Check if project name is already taken (case-insensitive)
        const trimmedName = projectData.name.trim()
        const duplicateProject = projects.find(p => 
            p.cachedMetadata?.name?.toLowerCase() === trimmedName.toLowerCase()
        )
        if (duplicateProject) {
            throw new Error(`A project with the name "${trimmedName}" already exists. Please choose a different name.`)
        }

        try {
            // CRITICAL: Project creation must happen on-chain - no IPFS fallback
            if (!solanaIntegration?.connection || !solanaIntegration?.wallet || !solanaIntegration?.publicKey) {
                throw new Error('Wallet not connected. Please connect your wallet to create a project.')
            }

            // Step 1: Create project on Solana blockchain (REQUIRED)
            const publicKey = new PublicKey(solanaIntegration.publicKey)
            const [projectPdaPubkey] = PublicKey.findProgramAddressSync(
                [Buffer.from("project"), publicKey.toBuffer(), Buffer.from(projectData.name)],
                HACKPROOF_PROGRAM_ID
            )
            
            const txSignature = await createProjectOnChain(
                solanaIntegration.connection,
                solanaIntegration.wallet,
                projectData.name,
                projectData.description,
                projectData.githubLink || '',
                projectData.teamMembers.length || 1,
                publicKey
            )
            
            const projectPda = projectPdaPubkey.toString()

            // Step 2: Create project object with on-chain data
            const newProject: Project = {
                id: projectPda,
                metadataCid: projectPda, // Use PDA as metadata identifier (on-chain)
                votes: 0,
                owner: projectData.owner,
                createdAt: Date.now(),
                projectPda,
                solanaTxSignature: txSignature,
                cachedMetadata: {
                    name: projectData.name,
                    description: projectData.description,
                    teamMembers: projectData.teamMembers,
                    githubRepo: projectData.githubLink,
                    image: '' // No image stored on-chain
                }
            }

            setProjects(prev => {
                // Check if project already exists (from blockchain fetch)
                const existing = prev.find(p => p.projectPda === projectPda)
                if (existing) {
                    // Update existing project with new metadata
                    return prev.map(p => p.projectPda === projectPda ? newProject : p)
                }
                return [...prev, newProject]
            })
            
            // Reload all projects from blockchain to ensure everyone sees it
            // Note: loadAllProjects will be called automatically on next render
            
            return newProject.id
        } catch (error: any) {
            console.error('Failed to create project on-chain:', error)
            const errorMessage = error?.message || 'Unknown error'
            throw new Error(`Failed to create project on-chain: ${errorMessage}`)
        }
    }

    // Publish a local-only project to the Solana program (create on-chain project)
    const publishProject = async (projectId: string): Promise<string> => {
        const project = projects.find(p => p.id === projectId)
        if (!project) throw new Error('Project not found')

        if (!project.cachedMetadata) throw new Error('Project metadata missing')

        // Ensure wallet connected and is owner
        const ownerPubkey = wallet.publicKey?.toString()
        if (!wallet || !ownerPubkey) throw new Error('Wallet not connected')
        if (ownerPubkey.toLowerCase() !== project.owner.toLowerCase()) throw new Error('Only the project owner can publish this project on-chain')

        try {
            const publicKey = new PublicKey(project.owner)

            const maxTeamSize = (project.cachedMetadata.teamMembers && project.cachedMetadata.teamMembers.length) || 1

            const txSignature = await createProjectOnChain(
                connection,
                wallet,
                project.cachedMetadata.name,
                project.cachedMetadata.description,
                project.cachedMetadata.githubRepo || '',
                maxTeamSize,
                publicKey
            )

            // Derive PDA for project
            const [projectPdaPubkey] = PublicKey.findProgramAddressSync(
                [Buffer.from('project'), publicKey.toBuffer(), Buffer.from(project.cachedMetadata.name)],
                HACKPROOF_PROGRAM_ID
            )

            // Update local state to mark project as on-chain
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, projectPda: projectPdaPubkey.toString(), solanaTxSignature: txSignature } : p))

            return txSignature
        } catch (error: any) {
            console.error('Failed to publish project on-chain:', error)
            throw error
        }
    }

    const voteOnProject = async (
        projectId: string,
        votes: number,
        voterWalletAddress?: string,
        solanaIntegration?: {
            connection: any
            wallet: any
            publicKey: any
        }
    ): Promise<void> => {
        const project = projects.find(p => p.id === projectId)
        if (!project) {
            throw new Error('Project not found')
        }
        
        // CRITICAL: Prevent self-voting
        if (voterWalletAddress && project.owner.toLowerCase() === voterWalletAddress.toLowerCase()) {
            throw new Error('Cannot vote for your own project!')
        }

        // If Solana integration is provided and project has a PDA, vote on-chain
        if (solanaIntegration?.connection && solanaIntegration?.wallet && solanaIntegration?.publicKey && project.projectPda) {
            try {
                const projectPdaPubkey = new PublicKey(project.projectPda)
                await voteOnProjectOnChain(
                    solanaIntegration.connection,
                    solanaIntegration.wallet,
                    projectPdaPubkey,
                    votes
                )
                // Update local state after successful on-chain vote
                setProjects(prev =>
                    prev.map(p =>
                        p.id === projectId
                            ? { ...p, votes: p.votes + votes }
                            : p
                    )
                )
            } catch (solanaError: any) {
                console.error('Solana voting failed:', solanaError)
                throw new Error(`Voting failed: ${solanaError?.message || 'Unknown error'}`)
            }
        } else {
            // Fallback to local-only voting (for testing or if Solana not initialized)
            setProjects(prev =>
                prev.map(p =>
                    p.id === projectId
                        ? { ...p, votes: p.votes + votes }
                        : p
                )
            )
        }
    }

    return (
        <ProjectsContext.Provider value={{ projects, addProject, voteOnProject, loadProjectMetadata, getUserProject, hasUserSubmittedProject, isProjectNameTaken, refreshProjects: loadAllProjects, publishProject }}>
            {children}
        </ProjectsContext.Provider>
    )
}

export function useProjects() {
    const context = useContext(ProjectsContext)
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectsProvider')
    }
    return context
}

// Helper function to get project display data
export function getProjectDisplayData(project: Project) {
    return {
        id: project.id,
        name: project.cachedMetadata?.name || 'Loading...',
        description: project.cachedMetadata?.description || '',
        teamMembers: project.cachedMetadata?.teamMembers || [],
        githubLink: project.cachedMetadata?.githubRepo,
        image: project.cachedMetadata?.image,
        votes: project.votes,
        owner: project.owner,
        createdAt: project.createdAt,
        metadataCid: project.metadataCid
    }
}

