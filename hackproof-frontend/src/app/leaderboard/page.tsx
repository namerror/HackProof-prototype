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

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="w-12 h-12 text-[#00ff9f]" />
        if (index === 1) return <Medal className="w-12 h-12 text-[#00ff9f]/80" />
        if (index === 2) return <Award className="w-12 h-12 text-[#00ff9f]/60" />
        return <span className="text-4xl font-bold text-[#00ff9f] font-mono">#{index + 1}</span>
    }

    const getRankColor = (index: number) => {
        if (index === 0) return 'from-[#00ff9f]/20 to-[#00cc7f]/20 border-[#00ff9f]/50'
        if (index === 1) return 'from-[#00ff9f]/15 to-[#00ff9f]/10 border-[#00ff9f]/40'
        if (index === 2) return 'from-[#00ff9f]/10 to-[#00ff9f]/5 border-[#00ff9f]/30'
        return 'from-[#00ff9f]/10 to-[#00cc7f]/10 border-[#00ff9f]/30'
    }

    return (
        <main className="min-h-screen px-4 py-8 sm:py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 font-mono text-[#00ff9f] flex items-center justify-center gap-3">
                        <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
                        Leaderboard
                    </h1>
                    <p className="text-lg sm:text-xl text-[#00ff9f]/80 font-mono">Top 3 Projects by $HACK Votes</p>
                </div>

                {topProjects.length === 0 ? (
                    <div className="text-center py-16 bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00ff9f]/20 rounded-xl">
                        <div className="mb-4 flex justify-center">
                            <BarChart3 className="w-16 h-16 text-[#00ff9f]/60" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 font-mono text-[#00ff9f]">No Projects Yet</h2>
                        <p className="text-[#00ff9f]/70 mb-6 font-mono">Projects will appear here once they receive votes</p>
                        {connected ? (
                            <Link
                                href="/submit"
                                className="inline-block px-8 py-4 bg-gradient-to-r from-[#00ff9f] to-[#00cc7f] text-[#0f0f0f] rounded-xl font-semibold hover:from-[#00cc7f] hover:to-[#00ff9f] transition-all shadow-xl hover:shadow-[0_0_30px_rgba(0,255,159,0.5)] border border-[#00ff9f]/50 font-mono"
                            >
                                Submit Your Project
                            </Link>
                        ) : (
                            <p className="text-sm text-[#00ff9f]/60 font-mono">Connect your wallet to submit a project</p>
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
                                            <div className="min-w-[80px] text-center flex items-center justify-center">
                                                {getRankIcon(index)}
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 group-hover:text-[#00ff9f] transition-colors font-mono text-[#00ff9f]">
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
                                                        className="text-[#00ff9f] hover:text-[#00cc7f] text-sm sm:text-base inline-flex items-center gap-2 mb-4 font-mono"
                                                    >
                                                        <Link2 className="w-4 h-4" />
                                                        GitHub
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
                                            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#00ff9f] mb-1 font-mono">
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

