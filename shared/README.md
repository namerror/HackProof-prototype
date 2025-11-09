# HackProof Shared Library

Shared TypeScript code for NFT metadata, IPFS storage, and image handling used by both the Solana program and Next.js frontend.

## Structure

```
shared/
├── src/
│   ├── storage/
│   │   ├── ipfs-client.ts      # IPFS upload/download functions
│   │   ├── metadata-templates.ts # NFT JSON template creators
│   │   └── image-assets.ts     # Image URL helpers
│   ├── types/
│   │   ├── nft-metadata.ts     # TypeScript interfaces for NFT metadata
│   │   └── storage.ts          # Storage-related types
│   └── index.ts                # Main exports
├── assets/
│   ├── images/                 # NFT image assets
│   └── templates/              # Base JSON template files
└── tests/
    └── storage.test.ts         # Test suite
```

## Setup

1. Install dependencies:
```bash
cd shared
npm install
```

2. Set up environment variable:
```bash
# Add to .env file in hackproof/ and shared/
PINATA_JWT=your_jwt_token_here

# Add to .env.local file in hackproof-frontend/
NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
```

Get your JWT token from: https://app.pinata.cloud/
- Go to Account Settings → API Keys
- Create New Key with `pinFileToIPFS` permission
- Copy the JWT token (starts with `eyJ...`)

## Usage

### In Frontend (Next.js)

```typescript
import { IPFSClient, createParticipantMetadata } from '@shared';

const client = new IPFSClient();
const metadata = createParticipantMetadata('John Doe', 'image-cid', {
  school: 'MIT',
  skills: ['React', 'Solana']
});
const cid = await client.uploadMetadata(metadata);
```

### In Solana Program Tests

```typescript
import { createProjectMetadata } from '@shared';

const metadata = createProjectMetadata(
  'My Project',
  'Description',
  'image-cid',
  ['Alice', 'Bob'],
  { githubRepo: 'https://github.com/...' }
);
```

## Key Functions

### IPFS Client
- `uploadMetadata(metadata)`: Upload JSON metadata to IPFS
- `uploadImage(file, filename)`: Upload image to IPFS
- `getMetadata(cid)`: Fetch metadata from IPFS
- `getImageUrl(cid)`: Get image URL from CID

### Metadata Templates
- `createParticipantMetadata(name, imageCid, options)`: Create participant NFT metadata
- `createProjectMetadata(name, description, imageCid, teamMembers, options)`: Create project NFT metadata
- `createAchievementMetadata(type, description, imageCid, awardedAt)`: Create achievement NFT metadata

## TypeScript Path Aliases

Both projects are configured to use `@shared/*` to import from this package:
- `hackproof/tsconfig.json`
- `hackproof-frontend/tsconfig.json`

