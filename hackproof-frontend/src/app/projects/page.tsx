'use client'
import { useProjects } from '@/contexts/ProjectsContext'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'

export default function ProjectsGalleryPage() {
    const { projects } = useProjects()
    const { connected } = useWallet()

    return (
        <main className="min-h-screen px-4 py-8 sm:py-12">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-2">Project Gallery</h1>
                        <p className="text-foreground/70">Browse all submitted hackathon projects</p>
                    </div>
                    {connected && (
                        <Link
                            href="/submit"
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-600 transition-all shadow-xl hover:shadow-2xl border border-blue-500/50 hover:scale-105"
                        >
                            + Submit Project
                        </Link>
                    )}
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-16 bg-background/50 backdrop-blur-sm border border-foreground/10 rounded-xl">
                        <div className="text-6xl mb-4">📭</div>
                        <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
                        <p className="text-foreground/70 mb-6">Be the first to submit a project!</p>
                        {connected ? (
                            <Link
                                href="/submit"
                                className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-600 transition-all shadow-xl hover:shadow-2xl border border-blue-500/50"
                            >
                                Submit Your Project
                            </Link>
                        ) : (
                            <p className="text-sm text-foreground/60">Connect your wallet to submit a project</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/project/${project.id}`}
                                className="bg-background/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group hover:border-blue-500/30"
                            >
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-foreground/70 text-sm line-clamp-3">
                                            {project.description}
                                        </p>
                                    </div>

                                    {project.githubLink && (
                                        <a
                                            href={project.githubLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                        >
                                            🔗 GitHub
                                        </a>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                                        <div>
                                            <div className="text-2xl font-bold text-blue-600">{project.votes}</div>
                                            <div className="text-xs text-foreground/60">
                                                {project.votes === 1 ? 'vote' : 'votes'}
                                            </div>
                                        </div>
                                        {project.teamMembers.length > 0 && (
                                            <div className="text-xs text-foreground/60">
                                                {project.teamMembers.length} {project.teamMembers.length === 1 ? 'member' : 'members'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}

