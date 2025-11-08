'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Project {
    id: string
    name: string
    description: string
    teamMembers: string[]
    githubLink?: string
    votes: number
    owner: string
    createdAt: number
}

interface ProjectsContextType {
    projects: Project[]
    addProject: (project: Omit<Project, 'id' | 'votes' | 'createdAt'>) => string
    voteOnProject: (projectId: string, votes: number) => void
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([])

    // Load projects from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('hackproof-projects')
        if (stored) {
            try {
                setProjects(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to load projects:', e)
            }
        }
    }, [])

    // Save projects to localStorage whenever they change
    useEffect(() => {
        if (projects.length > 0) {
            localStorage.setItem('hackproof-projects', JSON.stringify(projects))
        }
    }, [projects])

    const addProject = (projectData: Omit<Project, 'id' | 'votes' | 'createdAt'>): string => {
        const newProject: Project = {
            ...projectData,
            id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            votes: 0,
            createdAt: Date.now()
        }
        setProjects(prev => [...prev, newProject])
        return newProject.id
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
        <ProjectsContext.Provider value={{ projects, addProject, voteOnProject }}>
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

