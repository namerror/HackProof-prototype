import { NFTStorage, File } from 'nft.storage';

const NFT_STORAGE_TOKEN = process.env.NFT_STORAGE_TOKEN || '';

export class IPFSClient {
  private client: NFTStorage;

  constructor(token?: string) {
    this.client = new NFTStorage({ token: token || NFT_STORAGE_TOKEN });
  }

  async uploadMetadata(metadata: object): Promise<string> {
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const file = new File([blob], 'metadata.json', { type: 'application/json' });
    const cid = await this.client.storeBlob(file);
    return cid;
  }

  /**
   * Get the full IPFS metadata URI from a CID
   * @param cid - IPFS content identifier
   * @returns Full metadata URI (e.g., "https://<cid>.ipfs.nftstorage.link/metadata.json")
   */
  getMetadataUri(cid: string): string {
    return `https://${cid}.ipfs.nftstorage.link/metadata.json`;
  }

  async uploadImage(file: File | Blob, filename: string): Promise<string> {
    const nftFile = new File([file], filename, { type: file.type });
    const cid = await this.client.storeBlob(nftFile);
    return cid;
  }

  async getMetadata(cid: string): Promise<any> {
    const url = `https://${cid}.ipfs.nftstorage.link/metadata.json`;
    const response = await fetch(url);
    return response.json();
  }

  getImageUrl(cid: string): string {
    return `https://${cid}.ipfs.nftstorage.link`;
  }
}

