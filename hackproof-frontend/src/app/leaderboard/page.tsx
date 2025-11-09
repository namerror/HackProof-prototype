'use client'
import { useProjects, getProjectDisplayData } from '@/contexts/ProjectsContext'
import { useWallet } from '@solana/wallet-adapter-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LeaderboardPage() {
    const { projects } = useProjects()
    const { connected } = useWallet()
    const [topProjects, setTopProjects] = useState<typeof projects>([])

    useEffect(() => {
        // Sort projects by votes and get top 3
        const sorted = [...projects].sort((a, b) => b.votes - a.votes)
        setTopProjects(sorted.slice(0, 3))
    }, [projects])

    const getRankEmoji = (index: number) => {
        if (index === 0) return '🥇'
        if (index === 1) return '🥈'
        if (index === 2) return '🥉'
        return `#${index + 1}`
    }

    const getRankColor = (index: number) => {
        if (index === 0) return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50'
        if (index === 1) return 'from-gray-300/20 to-gray-400/20 border-gray-400/50'
        if (index === 2) return 'from-orange-600/20 to-orange-700/20 border-orange-600/50'
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/50'
    }

    return (
        <main className="min-h-screen px-4 py-8 sm:py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">🏆 Leaderboard</h1>
                    <p className="text-lg sm:text-xl text-foreground/70">Top 3 Projects by $HACK Votes</p>
                </div>

                {topProjects.length === 0 ? (
                    <div className="text-center py-16 bg-background/80 backdrop-blur-sm border border-white/10 rounded-xl">
                        <div className="text-6xl mb-4">📊</div>
                        <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
                        <p className="text-foreground/70 mb-6">Projects will appear here once they receive votes</p>
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
                    <div className="space-y-6">
                        {topProjects.map((project, index) => {
                            const displayData = getProjectDisplayData(project)
                            return (
                                <Link
                                    key={project.id}
                                    href={`/project/${project.id}`}
                                    className={`block bg-gradient-to-r ${getRankColor(index)} border-2 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-[0_0_40px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] group`}
                                >
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex items-start gap-6 flex-1">
                                            <div className="text-5xl sm:text-6xl font-bold min-w-[80px] text-center">
                                                {getRankEmoji(index)}
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 group-hover:text-green-400 transition-colors">
                                                    {displayData.name}
                                                </h2>
                                                <p className="text-base sm:text-lg text-foreground/80 mb-4 leading-relaxed">
                                                    {displayData.description}
                                                </p>

                                                {displayData.githubLink && (
                                                    <a
                                                        href={displayData.githubLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-green-400 hover:text-green-300 text-sm sm:text-base inline-flex items-center gap-2 mb-4"
                                                    >
                                                        🔗 GitHub
                                                    </a>
                                                )}

                                                {displayData.teamMembers.length > 0 && (
                                                    <div className="text-sm text-foreground/60">
                                                        <span className="font-medium">Team:</span> {displayData.teamMembers.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center min-w-[120px]">
                                            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-400 mb-1">
                                                {displayData.votes}
                                            </div>
                                            <div className="text-sm sm:text-base text-foreground/60 font-medium">
                                                $HACK {displayData.votes === 1 ? 'vote' : 'votes'}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}

                        {/* Show link to full gallery if there are more projects */}
                        {projects.length > 3 && (
                            <div className="text-center pt-6">
                                <Link
                                    href="/projects"
                                    className="inline-block px-8 py-4 bg-white/5 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/10 transition-all shadow-xl hover:shadow-2xl border border-white/10"
                                >
                                    View All Projects ({projects.length})
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation links */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                    <Link
                        href="/projects"
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-600 transition-all shadow-xl hover:shadow-2xl border border-blue-500/50 text-center"
                    >
                        View All Projects
                    </Link>
                    {connected && (
                        <Link
                            href="/submit"
                            className="px-8 py-4 bg-white/5 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/10 transition-all shadow-xl hover:shadow-2xl border border-white/10 text-center"
                        >
                            Submit Project
                        </Link>
                    )}
                </div>
            </div>
        </main>
    )
}

