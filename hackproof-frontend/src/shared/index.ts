import axios from 'axios';

export interface ParticipantMetadata {
    name: string;
    description: string;
    image: string;
    external_url: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
    properties: {
        skills: string[];
    };
}

export class IPFSClient {
    private pinataJwt: string;
    private gateway: string;

    constructor() {
        this.pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT || '';
        this.gateway = 'https://gateway.pinata.cloud/ipfs';
    }

    async uploadImage(imageBlob: Blob, filename: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', imageBlob, filename);

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers: {
                'Authorization': `Bearer ${this.pinataJwt}`,
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.IpfsHash;
    }

    async uploadMetadata(metadata: ParticipantMetadata): Promise<string> {
        const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
            headers: {
                'Authorization': `Bearer ${this.pinataJwt}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.IpfsHash;
    }

    getMetadataUri(cid: string): string {
        return `${this.gateway}/${cid}`;
    }
}

export function createParticipantMetadata(
    name: string,
    imageCid: string,
    properties: { skills: string[] }
): ParticipantMetadata {
    return {
        name: `HackProof Participant: ${name}`,
        description: `Participant NFT for ${name} in HackProof Hackathon. Skills: ${properties.skills.join(', ')}`,
        image: `https://gateway.pinata.cloud/ipfs/${imageCid}`,
        external_url: 'https://hackproof.vercel.app',
        attributes: [
            {
                trait_type: 'Type',
                value: 'Participant',
            },
            {
                trait_type: 'Registration Date',
                value: new Date().toISOString().split('T')[0],
            },
            {
                trait_type: 'Skills Count',
                value: properties.skills.length,
            },
        ],
        properties,
    };
}