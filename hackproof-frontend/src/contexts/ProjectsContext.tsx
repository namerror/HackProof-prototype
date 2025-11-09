'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { IPFSClient, createProjectMetadata, ProjectMetadata } from '@shared'
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
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([])
    const { connection } = useConnection()
    const wallet = useWallet()
    // Lazy-initialize IPFS client - only create when needed
    const getClient = useCallback(() => new IPFSClient(), [])

    const loadProjectMetadata = useCallback(async (projectId: string) => {
        // Use functional update to get current projects state
        setProjects(prev => {
            const project = prev.find(p => p.id === projectId)
            if (!project || project.cachedMetadata) return prev

            // Load metadata asynchronously
            const client = getClient()
            client.getMetadata(project.metadataCid)
                .then((metadata: ProjectMetadata) => {
                    setProjects(current =>
                        current.map(p =>
                            p.id === projectId
                                ? {
                                    ...p,
                                    cachedMetadata: {
                                        name: metadata.name.replace('HackProof Project: ', ''),
                                        description: metadata.description,
                                        teamMembers: metadata.properties.teamMembers,
                                        githubRepo: metadata.properties.githubRepo,
                                        image: metadata.image
                                    }
                                }
                                : p
                        )
                    )
                })
                .catch(error => {
                    console.error('Failed to load project metadata from IPFS:', error)
                })

            return prev
        })
    }, [])

    // Fetch all projects from blockchain and load metadata from IPFS
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
            const client = getClient()
            
            // Convert blockchain projects to our Project format
            const projectsWithMetadata: Project[] = await Promise.all(
                blockchainProjects.map(async (bp) => {
                    // Extract IPFS CID from submissionUri
                    // submissionUri format: https://gateway.pinata.cloud/ipfs/{cid}
                    let metadataCid = ''
                    if (bp.submissionUri) {
                        const match = bp.submissionUri.match(/ipfs\/([a-zA-Z0-9]+)/)
                        if (match) {
                            metadataCid = match[1]
                        }
                    }
                    
                    // Try to find metadata CID in localStorage (for projects created but not yet submitted)
                    // Check if we have this project in localStorage with metadata
                    let cachedMetadata: Project['cachedMetadata'] | undefined
                    const stored = localStorage.getItem('hackproof-project-cids')
                    if (stored) {
                        try {
                            const localProjects: Project[] = JSON.parse(stored)
                            const localProject = localProjects.find(p => p.projectPda === bp.projectPda || p.owner === bp.creator)
                            if (localProject && localProject.cachedMetadata) {
                                cachedMetadata = localProject.cachedMetadata
                                metadataCid = localProject.metadataCid
                            }
                        } catch (e) {
                            // Ignore localStorage parse errors
                        }
                    }
                    
                    // If we have a metadata CID, try to load from IPFS
                    if (metadataCid && !cachedMetadata) {
                        try {
                            const metadata = await client.getMetadata(metadataCid) as ProjectMetadata
                            cachedMetadata = {
                                name: metadata.name.replace('HackProof Project: ', ''),
                                description: metadata.description,
                                teamMembers: metadata.properties.teamMembers || [],
                                githubRepo: metadata.properties.githubRepo || bp.githubRepo,
                                image: metadata.image
                            }
                        } catch (error) {
                            console.error(`Failed to load metadata for project ${bp.name}:`, error)
                        }
                    }
                    
                    // Use on-chain data as fallback if no metadata loaded
                    if (!cachedMetadata) {
                        cachedMetadata = {
                            name: bp.name,
                            description: bp.description,
                            teamMembers: [],
                            githubRepo: bp.githubRepo,
                            image: '' // No image from on-chain data
                        }
                    }
                    
                    return {
                        id: bp.projectPda, // Use PDA as ID
                        metadataCid: metadataCid || bp.projectPda, // Use PDA if no CID
                        votes: bp.totalVotesReceived,
                        owner: bp.creator,
                        createdAt: bp.createdAt * 1000, // Convert to milliseconds
                        projectPda: bp.projectPda,
                        cachedMetadata
                    }
                })
            )
            
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
    }, [connection, wallet.wallet, getClient, loadProjectMetadata])

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
            const client = getClient()
            // Step 1: Upload project placeholder image to IPFS
            let imageBlob: Blob
            try {
                // Try to use the actual project placeholder image if available
                const projectImagePath = '/project-placeholder.png'
                const imageResponse = await fetch(projectImagePath)
                if (imageResponse.ok) {
                    imageBlob = await imageResponse.blob()
                } else {
                    throw new Error('Project image not found')
                }
            } catch (error) {
                // Fallback: Create a simple colored image using canvas
                console.log('Creating fallback project image...')
                const canvas = document.createElement('canvas')
                canvas.width = 512
                canvas.height = 512
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    // Draw background
                    ctx.fillStyle = '#10B981'
                    ctx.fillRect(0, 0, 512, 512)
                    // Draw text
                    ctx.fillStyle = '#FFFFFF'
                    ctx.font = 'bold 48px Arial'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('HackProof', 256, 200)
                    ctx.font = '32px Arial'
                    ctx.fillText('Project', 256, 280)
                }
                imageBlob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((blob) => {
                        resolve(blob || new Blob())
                    }, 'image/png')
                })
            }
            const imageCid = await client.uploadImage(imageBlob, 'project-image.png')

            // Step 2: Create project metadata
            const metadata = createProjectMetadata(
                projectData.name,
                projectData.description,
                imageCid,
                projectData.teamMembers,
                { githubRepo: projectData.githubLink }
            )

            // Step 3: Upload metadata to IPFS
            const metadataCid = await client.uploadMetadata(metadata)

            // Step 4: Create project on Solana blockchain (if integration provided)
            let projectPda: string | undefined
            let solanaTxSignature: string | undefined
            
            if (solanaIntegration?.connection && solanaIntegration?.wallet && solanaIntegration?.publicKey) {
                try {
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
                    
                    projectPda = projectPdaPubkey.toString()
                    solanaTxSignature = txSignature
                } catch (solanaError: any) {
                    console.error('Solana project creation failed:', solanaError)
                    // Continue with IPFS-only project creation if Solana fails
                    // This allows the app to work even if Solana is not initialized
                }
            }

            // Step 5: Create project with IPFS CID and Solana data
            const newProject: Project = {
                id: projectPda || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                metadataCid,
                votes: 0,
                owner: projectData.owner,
                createdAt: Date.now(),
                projectPda,
                solanaTxSignature,
                cachedMetadata: {
                    name: projectData.name,
                    description: projectData.description,
                    teamMembers: projectData.teamMembers,
                    githubRepo: projectData.githubLink,
                    image: `https://gateway.pinata.cloud/ipfs/${imageCid}`
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
            console.error('Failed to upload project to IPFS:', error)
            const errorMessage = error?.message || 'Unknown error'
            
            // Provide more specific error messages
            if (errorMessage.includes('PINATA_JWT') || errorMessage.includes('NEXT_PUBLIC_PINATA_JWT')) {
                throw new Error('Pinata JWT Token not found. Please set NEXT_PUBLIC_PINATA_JWT in your .env.local file and restart the dev server.')
            } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
                throw new Error('Invalid Pinata JWT Token. Please check your NEXT_PUBLIC_PINATA_JWT in .env.local')
            } else {
                throw new Error(`Failed to upload project: ${errorMessage}`)
            }
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
        <ProjectsContext.Provider value={{ projects, addProject, voteOnProject, loadProjectMetadata, getUserProject, hasUserSubmittedProject, isProjectNameTaken, refreshProjects: loadAllProjects }}>
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

