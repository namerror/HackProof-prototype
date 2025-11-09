// Ambient declarations for environments where TypeScript compile context lacks DOM/Node libs
// These are defensive and allow the shared package to compile when consumed in differing build targets.
// They do not provide runtime polyfills.
declare const window: any;
declare const process: any;
declare const console: any;
declare const FormData: any;
declare const File: any;
declare const Blob: any;
declare function fetch(input: any, init?: any): Promise<any>;
// Pinata IPFS Client
// Uses Pinata API for IPFS storage

// Get token from environment - works in both Node.js and browser (Next.js)
function getPinataToken(): string {
  console.log('NEXT_PUBLIC_PINATA_JWT:', process.env.NEXT_PUBLIC_PINATA_JWT)
  const anyProc: any = typeof process !== 'undefined' ? process : {}
  // Browser path (Next.js client side)
  if (typeof window !== 'undefined') {
    const token = (anyProc?.env?.NEXT_PUBLIC_PINATA_JWT || '') as string
    if (!token || token.trim().length === 0) {
      if (typeof console !== 'undefined') {
        console.warn('NEXT_PUBLIC_PINATA_JWT not found or empty. Set it in hackproof-frontend/.env.local and restart dev server.')
      }
    }
    return token
  }
  // Server / build path
  const token = (anyProc?.env?.PINATA_JWT || anyProc?.env?.NEXT_PUBLIC_PINATA_JWT || '') as string
  if (!token || token.trim().length === 0) {
    if (typeof console !== 'undefined') {
      console.warn('PINATA_JWT or NEXT_PUBLIC_PINATA_JWT not found or empty.')
    }
  }
  return token
}

export class IPFSClient {
  private token: string | null = null;
  private gatewayUrl: string = 'https://gateway.pinata.cloud';

  constructor(token?: string) {
    const envToken = getPinataToken();
    this.token = token || envToken || null;
  }

  /**
   * Unpin a CID from Pinata. This removes Pinata's pin, which may lead to content becoming inaccessible via their gateway.
   * Note: Content on IPFS is immutable and may still exist if other nodes pin it.
   */
  async unpin(cid: string): Promise<void> {
    if (!cid) return
    const token = this.token?.trim()
    if (!token) {
      throw new Error('PINATA_JWT is required to unpin. Set NEXT_PUBLIC_PINATA_JWT in .env.local and restart the dev server.')
    }
    try {
      const resp = await fetch(`https://api.pinata.cloud/pinning/unpin/${encodeURIComponent(cid)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!resp.ok) {
        // 404 means not found/not pinned — treat as already cleaned
        if (resp.status === 404) return
        const text = await resp.text().catch(() => '')
        throw new Error(`Pinata unpin failed (${resp.status}): ${text || resp.statusText}`)
      }
    } catch (e) {
      console.error('Pinata unpin error:', e)
      throw e
    }
  }

  private async uploadToPinata(file: any, filename: string): Promise<string> {
    if (!this.token || this.token.trim().length === 0) {
      throw new Error('PINATA_JWT required. Set NEXT_PUBLIC_PINATA_JWT in .env.local (frontend) or PINATA_JWT (server).')
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
  if (typeof console !== 'undefined') console.error('Pinata upload error:', error);
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
  if (typeof console !== 'undefined') console.error('IPFS uploadMetadata error:', error);
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

  async uploadImage(file: any, filename: string): Promise<string> {
    try {
      const nftFile = new File([file], filename, { type: file.type });
      const cid = await this.uploadToPinata(nftFile, filename);
      return cid;
    } catch (error: any) {
  if (typeof console !== 'undefined') console.error('IPFS uploadImage error:', error);
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
