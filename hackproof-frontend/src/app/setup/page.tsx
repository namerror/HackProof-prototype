'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { CheckCircle2, XCircle, Loader2, Info } from 'lucide-react'
import { HACKPROOF_PROGRAM_ID } from '@/contexts/WalletContext'
import { isHackathonInitialized, getVotingTokenBalance, initializeHackathonOnChain } from '@/services/solana-integration'

type Status = 'unknown' | 'ok' | 'fail'

export default function SetupCheckPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { connected, publicKey } = wallet

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [hackathonStatus, setHackathonStatus] = useState<Status>('unknown')
  const [votingMintStatus, setVotingMintStatus] = useState<Status>('unknown')
  const [initLoading, setInitLoading] = useState(false)
  const [initSig, setInitSig] = useState<string | null>(null)
  const [votingBalance, setVotingBalance] = useState<number | null>(null)

  const [hackathonPda, votingMintPda] = useMemo(() => {
    const [hackathon] = PublicKey.findProgramAddressSync([Buffer.from('hackathon')], HACKPROOF_PROGRAM_ID)
    const [votingMint] = PublicKey.findProgramAddressSync([Buffer.from('voting_token_mint')], HACKPROOF_PROGRAM_ID)
    return [hackathon, votingMint]
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        // 1) Hackathon PDA exists?
        const initialized = await isHackathonInitialized(connection)
        if (!cancelled) setHackathonStatus(initialized ? 'ok' : 'fail')

        // 2) Voting mint PDA exists?
        const mintInfo = await connection.getAccountInfo(votingMintPda)
        if (!cancelled) setVotingMintStatus(mintInfo ? 'ok' : 'fail')

        // 3) Wallet voting token balance
        if (publicKey) {
          const bal = await getVotingTokenBalance(connection, publicKey)
          if (!cancelled) setVotingBalance(bal)
        } else {
          if (!cancelled) setVotingBalance(null)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [connection, publicKey, votingMintPda])

  const StatusRow = ({ label, status, detail }: { label: string; status: Status; detail?: string }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-foreground/10">
      {status === 'ok' ? (
        <CheckCircle2 className="w-5 h-5 text-[#00ff9f] mt-0.5" />
      ) : status === 'fail' ? (
        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
      ) : (
        <Loader2 className="w-5 h-5 text-foreground/60 animate-spin mt-0.5" />
      )}
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {detail && (
          <div className="text-sm text-foreground/60 break-all mt-1">{detail}</div>
        )}
      </div>
    </div>
  )

  const ActionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="p-4 rounded-lg bg-white/5 border border-foreground/10">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-foreground/60" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="text-sm text-foreground/70 space-y-2">{children}</div>
    </div>
  )

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Setup Check</h1>
          <p className="text-foreground/70 mt-1">Verify on-chain prerequisites before registering or voting</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <StatusRow label="Hackathon PDA exists" status={hackathonStatus} detail={hackathonPda.toBase58()} />
          <StatusRow label="Voting Token Mint PDA exists" status={votingMintStatus} detail={votingMintPda.toBase58()} />
          <div className="flex items-start gap-3 p-3 rounded-lg border border-foreground/10">
            {loading ? (
              <Loader2 className="w-5 h-5 text-foreground/60 animate-spin mt-0.5" />
            ) : (votingBalance ?? 0) > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-[#00ff9f] mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium">Wallet voting token balance</div>
              <div className="text-sm text-foreground/60 mt-1">
                {connected ? (
                  <span>{votingBalance ?? 0} $HCKPRF</span>
                ) : (
                  <span>Connect your wallet to check</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {hackathonStatus === 'fail' && (
            <ActionCard title="Hackathon not initialized">
              <p>The admin needs to initialize the hackathon on-chain. Without it, registration and voting will fail.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Run the InitializeHackathon instruction with the admin wallet</li>
                <li>Ensure the program ID matches: <code className="text-xs">{HACKPROOF_PROGRAM_ID.toBase58()}</code></li>
                <li>Verify the PDA after: <code className="text-xs break-all">{hackathonPda.toBase58()}</code></li>
              </ul>
              {connected && publicKey && (
                <button
                  disabled={initLoading}
                  onClick={async () => {
                    setInitLoading(true)
                    setError(null)
                    try {
                      const sig = await initializeHackathonOnChain(connection, wallet, publicKey)
                      setInitSig(sig)
                      // Re-run status checks
                      const initialized = await isHackathonInitialized(connection)
                      setHackathonStatus(initialized ? 'ok' : 'fail')
                    } catch (e:any) {
                      setError(e.message || String(e))
                    } finally {
                      setInitLoading(false)
                    }
                  }}
                  className="mt-3 px-3 py-2 text-xs rounded bg-[#00ff9f] text-black disabled:opacity-50"
                >
                  {initLoading ? 'Initializing...' : 'Initialize Hackathon'}
                </button>
              )}
              {initSig && (
                <div className="mt-2 text-xs break-all">Tx: {initSig}</div>
              )}
            </ActionCard>
          )}

          {votingMintStatus === 'fail' && (
            <ActionCard title="Voting token mint missing">
              <p>The voting token mint PDA was not found. It should be created by InitializeHackathon.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Re-run InitializeHackathon to create the mint with authority = hackathon PDA</li>
                <li>Expected mint PDA: <code className="text-xs break-all">{votingMintPda.toBase58()}</code></li>
              </ul>
            </ActionCard>
          )}

          {connected && (votingBalance ?? 0) === 0 && hackathonStatus === 'ok' && votingMintStatus === 'ok' && (
            <ActionCard title="No voting tokens detected">
              <p>Register as a participant to receive your initial voting tokens.</p>
              <Link href="/register" className="inline-block mt-2 text-blue-400 hover:text-blue-300 underline">Go to registration →</Link>
            </ActionCard>
          )}

          {!connected && (
            <ActionCard title="Wallet not connected">
              <p>Please connect your wallet to check your voting token balance and proceed.</p>
              <Link href="/" className="inline-block mt-2 text-blue-400 hover:text-blue-300 underline">Open wallet modal →</Link>
            </ActionCard>
          )}
        </div>
      </div>
    </main>
  )
}
