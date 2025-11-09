// Pinata IPFS Client
// Uses Pinata API for IPFS storage

// Get token from environment - works in both Node.js and browser (Next.js)
function getPinataToken(): string {
  // In browser/Next.js client-side, use NEXT_PUBLIC_ prefix
  if (typeof window !== 'undefined') {
    const token = (process.env.NEXT_PUBLIC_PINATA_JWT || '') as string;
    if (!token || token.trim().length === 0) {
      console.warn('NEXT_PUBLIC_PINATA_JWT not found or is empty. Make sure it\'s set in .env.local with a value and the dev server has been restarted.');
    }
    return token;
  }
  // In Node.js/server-side
  const token = (process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT || '') as string;
  if (!token || token.trim().length === 0) {
    console.warn('PINATA_JWT or NEXT_PUBLIC_PINATA_JWT not found or is empty in environment.');
  }
  return token;
}

export class IPFSClient {
  private token: string | null = null;
  private gatewayUrl: string = 'https://gateway.pinata.cloud';

  constructor(token?: string) {
    const envToken = getPinataToken();
    this.token = token || envToken || null;
  }

  private async uploadToPinata(file: File | Blob, filename: string): Promise<string> {
    if (!this.token || this.token.trim().length === 0) {
      throw new Error('PINATA_JWT is required. Please set NEXT_PUBLIC_PINATA_JWT in your .env.local file with your actual JWT token.\n\nExample: NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\nGet your token from: https://app.pinata.cloud/ → Account Settings → API Keys');
    }

    const trimmedToken = this.token.trim();
    if (trimmedToken.length < 10) {
      throw new Error('Invalid Pinata JWT Token: Token appears to be too short. Please check your token at https://app.pinata.cloud/');
    }

    try {
      // Create FormData for Pinata API
      const formData = new FormData();
      formData.append('file', file, filename);

      // Pinata metadata
      const metadata = JSON.stringify({
        name: filename,
      });
      formData.append('pinataMetadata', metadata);

      // Pinata options
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
      });
      formData.append('pinataOptions', pinataOptions);

      // Upload to Pinata
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${trimmedToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.details || errorData.error?.reason || `HTTP ${response.status}`;
        
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid Pinata JWT Token (${response.status}). Please verify your token at https://app.pinata.cloud/ and update .env.local`);
        }
        throw new Error(`Pinata upload failed: ${errorMessage}`);
      }

      const data = await response.json();
      return data.IpfsHash; // Pinata returns IpfsHash as the CID
    } catch (error: any) {
      console.error('Pinata upload error:', error);
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
        throw new Error('Network error: Failed to connect to Pinata. Please check your internet connection and try again.');
      }
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
        throw new Error('Invalid Pinata JWT Token. Please verify your token at https://app.pinata.cloud/ and update .env.local');
      }
      throw error;
    }
  }

  async uploadMetadata(metadata: object): Promise<string> {
    try {
      const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const file = new File([blob], 'metadata.json', { type: 'application/json' });
      const cid = await this.uploadToPinata(file, 'metadata.json');
      return cid;
    } catch (error: any) {
      console.error('IPFS uploadMetadata error:', error);
      throw error;
    }
  }

  /**
   * Get the full IPFS metadata URI from a CID
   * @param cid - IPFS content identifier
   * @returns Full metadata URI using Pinata gateway
   */
  getMetadataUri(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  async uploadImage(file: File | Blob, filename: string): Promise<string> {
    try {
      const nftFile = new File([file], filename, { type: file.type });
      const cid = await this.uploadToPinata(nftFile, filename);
      return cid;
    } catch (error: any) {
      console.error('IPFS uploadImage error:', error);
      throw error;
    }
  }

  async getMetadata(cid: string): Promise<any> {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  getImageUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
}
