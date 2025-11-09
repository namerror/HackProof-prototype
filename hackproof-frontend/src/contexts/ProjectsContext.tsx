'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { IPFSClient, createProjectMetadata, ProjectMetadata } from '@shared'

export interface Project {
    id: string
    metadataCid: string // IPFS CID for project metadata
    votes: number // Dynamic data stored locally (will move to Solana later)
    owner: string
    createdAt: number
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
    }) => Promise<string>
    voteOnProject: (projectId: string, votes: number) => void
    loadProjectMetadata: (projectId: string) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([])
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

    // Load project CIDs from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('hackproof-project-cids')
        if (stored) {
            try {
                const projectCids: Project[] = JSON.parse(stored)
                setProjects(projectCids)
                // Load metadata for each project
                projectCids.forEach(project => {
                    if (!project.cachedMetadata) {
                        loadProjectMetadata(project.id)
                    }
                })
            } catch (e) {
                console.error('Failed to load projects:', e)
            }
        }
    }, [loadProjectMetadata])

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

    const addProject = async (projectData: {
        name: string
        description: string
        teamMembers: string[]
        githubLink?: string
        owner: string
    }): Promise<string> => {
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

            // Step 4: Create project with IPFS CID
            const newProject: Project = {
                id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                metadataCid,
                votes: 0,
                owner: projectData.owner,
                createdAt: Date.now(),
                cachedMetadata: {
                    name: projectData.name,
                    description: projectData.description,
                    teamMembers: projectData.teamMembers,
                    githubRepo: projectData.githubLink,
                    image: `https://gateway.pinata.cloud/ipfs/${imageCid}`
                }
            }

            setProjects(prev => [...prev, newProject])
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

    const voteOnProject = (projectId: string, votes: number) => {
        setProjects(prev =>
            prev.map(project =>
                project.id === projectId
                    ? { ...project, votes: project.votes + votes }
                    : project
            )
        )
    }

    return (
        <ProjectsContext.Provider value={{ projects, addProject, voteOnProject, loadProjectMetadata }}>
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

