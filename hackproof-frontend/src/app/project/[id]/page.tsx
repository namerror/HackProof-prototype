'use client'
import { useParams, useRouter } from 'next/navigation'
import { useProjects, getProjectDisplayData } from '@/contexts/ProjectsContext'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

export default function ProjectPage() {
    const params = useParams()
    const router = useRouter()
    const { projects, voteOnProject } = useProjects()
    const { connected, publicKey } = useWallet()
    const [voteAmount, setVoteAmount] = useState(1)
    const [isVoting, setIsVoting] = useState(false)
    const [votingTokens, setVotingTokens] = useState(100) // Mock: should fetch from wallet

    const projectId = params.id as string
    const project = projects.find(p => p.id === projectId)
    const displayData = project ? getProjectDisplayData(project) : null

    useEffect(() => {
        // Check if project exists
        if (projects.length > 0 && !project) {
            router.push('/projects')
        }
    }, [project, projects, router])

    const handleVote = async () => {
        if (!connected) {
            alert('Please connect your wallet to vote')
            return
        }

        if (voteAmount < 1 || voteAmount > votingTokens) {
            alert(`Please enter a valid amount (1-${votingTokens} tokens)`)
            return
        }

        setIsVoting(true)

        try {
            voteOnProject(projectId, voteAmount)
            setVotingTokens(prev => prev - voteAmount)
            setVoteAmount(1)
            alert(`Successfully voted ${voteAmount} token(s)!`)
        } catch (error) {
            console.error('Error voting:', error)
            alert('Failed to vote. Please try again.')
        } finally {
            setIsVoting(false)
        }
    }

    if (!project) {
        return (
            <main className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="text-4xl mb-4">🔍</div>
                    <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
                    <Link
                        href="/projects"
                        className="text-blue-600 hover:underline"
                    >
                        Back to Gallery
                    </Link>
                </div>
            </main>
        )
    }

    const projectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/project/${project.id}`
        : ''

    return (
        <main className="min-h-screen px-4 py-8 sm:py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Back Button */}
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
                >
                    ← Back to Gallery
                </Link>

                {/* Project Info */}
                <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl">
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{displayData?.name || 'Loading...'}</h1>
                            <p className="text-lg text-foreground/70 leading-relaxed">{displayData?.description || 'Loading project details...'}</p>
                        </div>

                        {displayData?.githubLink && (
                            <div>
                                <a
                                    href={displayData.githubLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-lg flex items-center gap-2"
                                >
                                    🔗 View on GitHub
                                </a>
                            </div>
                        )}

                        {displayData && displayData.teamMembers.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-foreground/60 mb-2">Team Members</h3>
                                <p className="text-base">{displayData.teamMembers.join(', ')}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-4 border-t border-foreground/10">
                            <div>
                                <div className="text-3xl font-bold text-blue-600">{displayData?.votes || 0}</div>
                                <div className="text-sm text-foreground/60">
                                    {(displayData?.votes || 0) === 1 ? 'vote' : 'votes'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Voting Section */}
                {connected ? (
                    <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Vote for this Project</h2>
                                <p className="text-foreground/70">Use your voting tokens to support this project</p>
                            </div>

                            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mb-4">
                                <div className="text-sm text-foreground/70 mb-1">Your Voting Tokens</div>
                                <div className="text-2xl font-bold text-blue-600">{votingTokens} $HACK</div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                <div className="flex-1">
                                    <label htmlFor="voteAmount" className="block text-sm font-medium mb-2">
                                        Amount to Vote
                                    </label>
                                    <input
                                        type="number"
                                        id="voteAmount"
                                        min="1"
                                        max={votingTokens}
                                        value={voteAmount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1
                                            setVoteAmount(Math.min(Math.max(1, val), votingTokens))
                                        }}
                                        className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        disabled={isVoting || votingTokens === 0}
                                    />
                                </div>
                                <button
                                    onClick={handleVote}
                                    disabled={isVoting || votingTokens === 0 || voteAmount > votingTokens}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl border border-blue-500/50 hover:scale-105 disabled:hover:scale-100"
                                >
                                    {isVoting ? 'Voting...' : 'Vote'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-background/50 backdrop-blur-sm border border-foreground/10 rounded-xl p-6 text-center">
                        <p className="text-foreground/70 mb-4">Connect your wallet to vote on this project</p>
                        <Link
                            href="/"
                            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-600 transition-all shadow-xl hover:shadow-2xl border border-blue-500/50"
                        >
                            Connect Wallet
                        </Link>
                    </div>
                )}

                {/* QR Code Section */}
                <div className="bg-background/80 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
                    <div className="flex flex-col items-center space-y-4">
                        <h2 className="text-2xl font-bold">Share this Project</h2>
                        <p className="text-foreground/70 text-center">
                            Scan the QR code to view and vote on this project
                        </p>
                        {projectUrl && (
                            <div className="bg-white p-4 rounded-lg">
                                <QRCodeSVG
                                    value={projectUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                        )}
                        <p className="text-sm text-foreground/60 text-center max-w-md">
                            Share this QR code at the demo fair so others can easily find and vote for your project!
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}

