'use client'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useProjects } from '@/contexts/ProjectsContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SubmitProjectPage() {
    const { connected, publicKey } = useWallet()
    const { addProject } = useProjects()
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!connected || !publicKey) {
            alert('Please connect your wallet first')
            return
        }

        if (!formData.name || !formData.description) {
            alert('Please fill in project name and description')
            return
        }

        setIsSubmitting(true)

        try {
            const teamMembersList = formData.teamMembers
                .split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0)

            const id = addProject({
                name: formData.name,
                description: formData.description,
                teamMembers: teamMembersList,
                githubLink: formData.githubLink || undefined,
                owner: publicKey.toString()
            })

            setProjectId(id)
            setSubmitSuccess(true)

            // Redirect to gallery after 2 seconds
            setTimeout(() => {
                router.push('/projects')
            }, 2000)
        } catch (error) {
            console.error('Error submitting project:', error)
            alert('Failed to submit project. Please try again.')
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
                                className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter your project name"
                            />
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
                                disabled={isSubmitting || !formData.name || !formData.description}
                                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl flex items-center justify-center gap-2 border border-blue-500/50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
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

