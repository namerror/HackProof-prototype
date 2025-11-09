'use client'
import { useProjects, getProjectDisplayData } from '@/contexts/ProjectsContext'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

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
                    <div className="flex gap-3">
                        <Link
                            href="/leaderboard"
                            className="px-6 py-3 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded font-semibold hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] border border-[#00ff9f]/50 hover:scale-105 flex items-center justify-center font-mono"
                        >
                            Leaderboard
                        </Link>
                        {connected && (
                            <Link
                                href="/submit"
                                className="px-8 py-4 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded font-semibold hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] border border-[#00ff9f]/50 hover:scale-105 font-mono flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Submit Project
                            </Link>
                        )}
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-16 bg-background/50 backdrop-blur-sm border border-foreground/10 rounded">
                        <div className="text-6xl mb-4">📭</div>
                        <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
                        <p className="text-foreground/70 mb-6">Be the first to submit a project!</p>
                        {connected ? (
                            <Link
                                href="/submit"
                                className="inline-block px-8 py-4 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded font-semibold hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] border border-[#00ff9f]/50 font-mono"
                            >
                                Submit Your Project
                            </Link>
                        ) : (
                            <p className="text-sm text-foreground/60">Connect your wallet to submit a project</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => {
                            const displayData = getProjectDisplayData(project)
                            return (
                                <Link
                                    key={project.id}
                                    href={`/project/${project.id}`}
                                    className="bg-background/80 backdrop-blur-sm border border-white/10 rounded p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group hover:border-cyan-400/30"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-bold mb-2 group-hover:text-cyan-400 transition-colors">
                                                {displayData.name}
                                            </h3>
                                            <p className="text-foreground/70 text-sm line-clamp-3">
                                                {displayData.description}
                                            </p>
                                        </div>

                                        {displayData.githubLink && (
                                            <a
                                                href={displayData.githubLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-cyan-400 hover:text-cyan-300 hover:underline text-sm flex items-center gap-1 font-mono"
                                            >
                                                🔗 GitHub
                                            </a>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                                            <div>
                                                <div className="text-2xl font-bold text-cyan-400 font-mono">{displayData.votes}</div>
                                                <div className="text-xs text-foreground/60">
                                                    {displayData.votes === 1 ? 'vote' : 'votes'}
                                                </div>
                                            </div>
                                            {displayData.teamMembers.length > 0 && (
                                                <div className="text-xs text-foreground/60">
                                                    {displayData.teamMembers.length} {displayData.teamMembers.length === 1 ? 'member' : 'members'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    )
}

