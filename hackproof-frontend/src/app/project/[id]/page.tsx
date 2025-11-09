'use client'
import { useParams, useRouter } from 'next/navigation'
import { useProjects, getProjectDisplayData } from '@/contexts/ProjectsContext'
import { useParticipant } from '@/contexts/ParticipantContext'
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Link2, XCircle } from 'lucide-react'

export default function ProjectPage() {
    const params = useParams()
    const router = useRouter()
    const { projects, voteOnProject } = useProjects()
    const { connected, publicKey } = useWallet()
    const { connection } = useConnection()
    const wallet = useAnchorWallet()
    const { isRegistered, participant } = useParticipant()
    const [voteAmount, setVoteAmount] = useState(1)
    const [isVoting, setIsVoting] = useState(false)
    const [votingTokens, setVotingTokens] = useState(100) // Mock: should fetch from wallet
    const [voteError, setVoteError] = useState<string | null>(null)

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
        setVoteError(null)
        
        // Validation checks
        if (!connected || !publicKey) {
            setVoteError('Please connect your wallet to vote')
            return
        }

        if (!isRegistered) {
            setVoteError('You must register as a participant before voting. Please register first.')
            return
        }

        if (!project) {
            setVoteError('Project not found')
            return
        }

        // CRITICAL: Prevent self-voting
        const voterAddress = publicKey.toString().toLowerCase()
        const projectOwner = project.owner.toLowerCase()
        if (voterAddress === projectOwner) {
            setVoteError('You cannot vote for your own project!')
            return
        }

        if (voteAmount < 1) {
            setVoteError('Vote amount must be at least 1 token')
            return
        }

        if (voteAmount > votingTokens) {
            setVoteError(`You only have ${votingTokens} voting tokens available`)
            return
        }

        if (votingTokens === 0) {
            setVoteError('You have no voting tokens remaining')
            return
        }

        setIsVoting(true)

        try {
            await voteOnProject(
                projectId,
                voteAmount,
                voterAddress,
                {
                    connection,
                    wallet,
                    publicKey: publicKey
                }
            )
            setVotingTokens(prev => prev - voteAmount)
            setVoteAmount(1)
            setVoteError(null)
            // Show success message
            alert(`Successfully voted ${voteAmount} token(s) for "${displayData?.name}"!`)
        } catch (error: any) {
            console.error('Error voting:', error)
            const errorMessage = error?.message || 'Failed to vote. Please try again.'
            setVoteError(errorMessage)
            // Don't show alert if we're showing error in UI
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

                            {!isRegistered && (
                                <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-[#00ff9f] flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-[#00ff9f] font-mono">
                                        You must register as a participant before voting. <Link href="/register" className="underline font-semibold hover:text-[#00cc7f]">Register here</Link>
                                    </p>
                                </div>
                            )}

                            {project && publicKey && project.owner.toLowerCase() === publicKey.toString().toLowerCase() && (
                                <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-4 flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-[#00ff9f] flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-[#00ff9f] font-mono">
                                        You cannot vote for your own project!
                                    </p>
                                </div>
                            )}

                            {voteError && (
                                <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-4">
                                    <p className="text-sm text-[#00ff9f] font-mono">{voteError}</p>
                                </div>
                            )}

                            <div className="bg-[#00ff9f]/10 border border-[#00ff9f]/30 rounded-lg p-4 mb-4">
                                <div className="text-sm text-[#00ff9f]/80 mb-1 font-mono">Your Voting Tokens</div>
                                <div className="text-2xl font-bold text-[#00ff9f] font-mono">{votingTokens} $HACK</div>
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
                                            setVoteError(null) // Clear error when user changes input
                                        }}
                                        className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        disabled={isVoting || votingTokens === 0 || !isRegistered || !!(project && publicKey && project.owner.toLowerCase() === publicKey.toString().toLowerCase())}
                                    />
                                </div>
                                <button
                                    onClick={handleVote}
                                    disabled={
                                        isVoting || 
                                        votingTokens === 0 || 
                                        voteAmount > votingTokens || 
                                        !isRegistered ||
                                        !!(project && publicKey && project.owner.toLowerCase() === publicKey.toString().toLowerCase())
                                    }
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

