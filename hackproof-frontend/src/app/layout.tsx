import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletContextProvider } from '@/contexts/WalletContext'
import { ProjectsProvider } from '@/contexts/ProjectsContext'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import Navigation from '@/components/Navigation'
import HackerBackground from '@/components/HackerBackground'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HackProof - Live Voting for Hackathons",
  description: "Participate in hackathons, mint your Participant NFT, and vote on projects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <HackerBackground />
        <WalletContextProvider>
          <ParticipantProvider>
            <ProjectsProvider>
              <Navigation />
              {children}
            </ProjectsProvider>
          </ParticipantProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
