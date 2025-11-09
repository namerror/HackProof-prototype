'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { IPFSClient, ParticipantMetadata } from '@shared'

export interface ParticipantData {
    walletAddress: string
    metadataCid: string
    name: string
    // Cached metadata from IPFS
    cachedMetadata?: ParticipantMetadata
}

interface ParticipantContextType {
    participant: ParticipantData | null
    isRegistered: boolean
    isLoading: boolean
    registerParticipant: (metadataCid: string, name: string) => Promise<void>
    loadParticipantData: () => Promise<void>
    cleanupParticipant: (options?: { unpin?: boolean }) => Promise<void>
}

const ParticipantContext = createContext<ParticipantContextType | undefined>(undefined)

// Storage key for participant registrations (wallet -> metadata mapping)
const PARTICIPANTS_STORAGE_KEY = 'hackproof-participants'

export function ParticipantProvider({ children }: { children: ReactNode }) {
    const { publicKey, connected } = useWallet()
    
    const [participant, setParticipant] = useState<ParticipantData | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const loadParticipantData = useCallback(async () => {
        if (!publicKey) return

        setIsLoading(true)
        const walletAddress = publicKey.toString()
        const client = new IPFSClient()

        try {
            // Check if wallet is registered
            const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY)
            if (stored) {
                const participants: Record<string, { metadataCid: string; name: string }> = JSON.parse(stored)
                const participantData = participants[walletAddress]

                if (participantData) {
                    // Load metadata from IPFS
                    try {
                        const metadata = await client.getMetadata(participantData.metadataCid) as ParticipantMetadata
                        setParticipant({
                            walletAddress,
                            metadataCid: participantData.metadataCid,
                            name: participantData.name,
                            cachedMetadata: metadata
                        })
                    } catch (error: any) {
                        console.error('Failed to load participant metadata from IPFS:', error)
                        // Still set participant data even if IPFS load fails
                        // This handles both IPFS errors and missing token errors
                        setParticipant({
                            walletAddress,
                            metadataCid: participantData.metadataCid,
                            name: participantData.name
                        })
                    }
                } else {
                    setParticipant(null)
                }
            } else {
                setParticipant(null)
            }
        } catch (error) {
            console.error('Failed to load participant data:', error)
            setParticipant(null)
        } finally {
            setIsLoading(false)
        }
    }, [publicKey])

    // Load participant data when wallet connects
    useEffect(() => {
        if (connected && publicKey) {
            loadParticipantData()
        } else {
            // Clear participant data when wallet disconnects
            setParticipant(null)
        }
    }, [connected, publicKey, loadParticipantData])

    const registerParticipant = async (metadataCid: string, name: string) => {
        if (!publicKey) {
            throw new Error('Wallet not connected')
        }

        const walletAddress = publicKey.toString()
        const client = new IPFSClient()

        // Load existing participants
        const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY)
        const participants: Record<string, { metadataCid: string; name: string }> = stored ? JSON.parse(stored) : {}

        // Add new participant
        participants[walletAddress] = { metadataCid, name }

        // Save to localStorage
        localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants))

        // Load metadata from IPFS
        try {
            const metadata = await client.getMetadata(metadataCid) as ParticipantMetadata
            setParticipant({
                walletAddress,
                metadataCid,
                name,
                cachedMetadata: metadata
            })
        } catch (error: any) {
            console.error('Failed to load participant metadata from IPFS:', error)
            // Still set participant data even if IPFS load fails
            setParticipant({
                walletAddress,
                metadataCid,
                name
            })
        }
    }

    const cleanupParticipant = async (options?: { unpin?: boolean }) => {
        if (!publicKey) {
            throw new Error('Wallet not connected')
        }
        const walletAddress = publicKey.toString()
        const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY)
        const participants: Record<string, { metadataCid: string; name: string }> = stored ? JSON.parse(stored) : {}

        const entry = participants[walletAddress]
        if (!entry) {
            // Nothing to clean
            setParticipant(null)
            return
        }

        try {
            if (options?.unpin) {
                const client = new IPFSClient()
                // Unpin metadata
                try { await client.unpin(entry.metadataCid) } catch (e) { console.warn('Unpin metadata failed:', e) }
                // Try to fetch metadata to find image CID and unpin it too
                try {
                    const meta = await client.getMetadata(entry.metadataCid) as ParticipantMetadata
                    const image = (meta as any)?.image as string | undefined
                    const cid = image && image.includes('/ipfs/') ? image.split('/ipfs/')[1]?.split('/')[0] : undefined
                    if (cid) {
                        try { await client.unpin(cid) } catch (e) { console.warn('Unpin image failed:', e) }
                    }
                } catch (e) {
                    console.warn('Fetch metadata for image CID failed:', e)
                }
            }
        } finally {
            // Remove local mapping
            delete participants[walletAddress]
            if (Object.keys(participants).length === 0) {
                localStorage.removeItem(PARTICIPANTS_STORAGE_KEY)
            } else {
                localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants))
            }
            setParticipant(null)
        }
    }

    const isRegistered = participant !== null

    return (
        <ParticipantContext.Provider value={{
            participant,
            isRegistered,
            isLoading,
            registerParticipant,
            loadParticipantData,
            cleanupParticipant
        }}>
            {children}
        </ParticipantContext.Provider>
    )
}

export function useParticipant() {
    const context = useContext(ParticipantContext)
    if (context === undefined) {
        throw new Error('useParticipant must be used within a ParticipantProvider')
    }
    return context
}

