'use client'
import { useState } from 'react'
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useProjects } from '@/contexts/ProjectsContext'
import { useParticipant } from '@/contexts/ParticipantContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Rocket, Loader2, XCircle } from 'lucide-react'

export default function SubmitProjectPage() {
    const { connected, publicKey } = useWallet()
    const { connection } = useConnection()
    const wallet = useAnchorWallet()
    const { isRegistered } = useParticipant()
    const { addProject, getUserProject, hasUserSubmittedProject, isProjectNameTaken } = useProjects()
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        teamMembers: '',
        githubLink: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [nameError, setNameError] = useState<string | null>(null)

    // Check if user already has a project
    const existingProject = publicKey ? getUserProject(publicKey.toString()) : undefined
    const hasExistingProject = publicKey ? hasUserSubmittedProject(publicKey.toString()) : false
    const isNameTaken = formData.name.trim() ? isProjectNameTaken(formData.name) : false

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        
        // Clear name error when user types
        if (name === 'name') {
            setNameError(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        if (!connected || !publicKey) {
            setSubmitError('Please connect your wallet first')
            return
        }

        if (!isRegistered) {
            setSubmitError('You must register as a participant before submitting a project. Please register first.')
            return
        }

        // CRITICAL: Prevent multiple project submissions
        if (hasExistingProject) {
            setSubmitError('You have already submitted a project. Each wallet can only submit one project.')
            return
        }

        if (!formData.name.trim()) {
            setSubmitError('Project name is required')
            return
        }

        // CRITICAL: Check if project name is already taken
        if (isProjectNameTaken(formData.name.trim())) {
            setSubmitError(`A project with the name "${formData.name.trim()}" already exists. Please choose a different name.`)
            setNameError(`A project with this name already exists. Please choose a different name.`)
            return
        }

        if (!formData.description.trim()) {
            setSubmitError('Project description is required')
            return
        }

        if (formData.name.length > 100) {
            setSubmitError('Project name must be 100 characters or less')
            return
        }

        if (formData.description.length > 1000) {
            setSubmitError('Project description must be 1000 characters or less')
            return
        }

        setIsSubmitting(true)

        try {
            const teamMembersList = formData.teamMembers
                .split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0)

            // Ensure at least one team member (the submitter)
            if (teamMembersList.length === 0) {
                teamMembersList.push(publicKey.toString().slice(0, 8) + '...')
            }

            // addProject creates project on Solana blockchain (on-chain only)
            const id = await addProject({
                name: formData.name.trim(),
                description: formData.description.trim(),
                teamMembers: teamMembersList,
                githubLink: formData.githubLink.trim() || undefined,
                owner: publicKey.toString()
            }, {
                connection,
                wallet,
                publicKey: publicKey
            })

            setProjectId(id)
            setSubmitSuccess(true)

            // Redirect to gallery after 2 seconds
            setTimeout(() => {
                router.push('/projects')
            }, 2000)
        } catch (error) {
            console.error('Error submitting project:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to submit project on-chain. Please check your wallet connection and try again.'
            setSubmitError(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!connected) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <h1 className="text-3xl font-bold">Wallet Not Connected</h1>
                    <p className="text-foreground/70">Please connect your wallet to submit a project.</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Go to Home
                    </Link>
                </div>
            </main>
        )
    }

    if (submitSuccess) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-8 shadow-xl text-center space-y-6">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold">Project Submitted!</h1>
                    <p className="text-foreground/70">
                        Your project has been submitted successfully! Redirecting to gallery...
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">
            <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Submit Your Project</h1>
                    <p className="text-sm sm:text-base text-foreground/70">Share your hackathon project with the community</p>
                </div>

                <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl">
                    {!isRegistered && connected && (
                        <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-[#00ff9f] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-[#00ff9f] font-mono">
                                You must register as a participant before submitting a project. <Link href="/register" className="underline font-semibold hover:text-[#00cc7f]">Register here</Link>
                            </p>
                        </div>
                    )}

                    {hasExistingProject && existingProject && (
                        <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-6 mb-6">
                            <div className="flex items-start gap-3 mb-2">
                                <XCircle className="w-5 h-5 text-[#00ff9f] flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-[#00ff9f] font-semibold font-mono">
                                    You have already submitted a project!
                                </p>
                            </div>
                            <p className="text-sm text-[#00ff9f]/80 mb-3 font-mono ml-8">
                                Each wallet can only submit one project. You cannot submit another project.
                            </p>
                            <Link
                                href={`/project/${existingProject.id}`}
                                className="inline-block text-sm text-[#00ff9f] underline font-semibold hover:text-[#00cc7f] font-mono ml-8"
                            >
                                View your existing project: {existingProject.cachedMetadata?.name || 'Your Project'} →
                            </Link>
                        </div>
                    )}

                    {submitError && (
                        <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-600">{submitError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-2">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className={`w-full px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                                    nameError || isNameTaken
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-foreground/20 focus:ring-blue-500'
                                }`}
                                placeholder="Enter your project name"
                            />
                            {nameError && (
                                <p className="mt-1 text-sm text-red-600">{nameError}</p>
                            )}
                            {isNameTaken && !nameError && (
                                <p className="mt-1 text-sm text-[#00ff9f] flex items-center gap-2 font-mono">
                                    <AlertTriangle className="w-4 h-4" />
                                    A project with this name already exists. Please choose a different name.
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-2">
                                Project Description *
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                rows={5}
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                placeholder="Describe your project, what problem it solves, and how it works..."
                            />
                        </div>

                        <div>
                            <label htmlFor="teamMembers" className="block text-sm font-medium mb-2">
                                Team Members (comma-separated)
                            </label>
                            <input
                                type="text"
                                id="teamMembers"
                                name="teamMembers"
                                value={formData.teamMembers}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Alice, Bob, Charlie"
                            />
                        </div>

                        <div>
                            <label htmlFor="githubLink" className="block text-sm font-medium mb-2">
                                GitHub Link (optional)
                            </label>
                            <input
                                type="url"
                                id="githubLink"
                                name="githubLink"
                                value={formData.githubLink}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="https://github.com/username/project"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.name || !formData.description || hasExistingProject || isNameTaken}
                                className="w-full px-8 py-4 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded-xl font-semibold shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl flex items-center justify-center gap-2 border border-[#00ff9f]/50 font-mono"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-5 h-5" />
                                        <span>Submit Project</span>
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

