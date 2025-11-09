# Environment Setup

## Pinata IPFS Storage

To use IPFS storage, you need to set up your Pinata JWT token.

### Steps:

1. Create a free account at [Pinata](https://app.pinata.cloud/)
2. Go to your account settings → API Keys
3. Create a new API Key with the following permissions:
   - `pinFileToIPFS` (required)
   - `pinJSONToIPFS` (optional, but recommended)
4. Copy your **JWT Token** (not the API Key or Secret)
5. Create a `.env.local` file in the `hackproof-frontend` directory
6. Add the following line:

```
NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
```

### Example:

```bash
# In hackproof-frontend directory
echo "NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." > .env.local
```

**Important:** 
- The variable must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Restart your dev server after creating/updating `.env.local`
- Use the **JWT Token**, not the API Key or Secret Key

### Getting Your Pinata JWT Token:

1. Log in to [Pinata Cloud](https://app.pinata.cloud/)
2. Navigate to **Account Settings** → **API Keys**
3. Click **New Key**
4. Give it a name (e.g., "HackProof")
5. Select permissions: `pinFileToIPFS` and `pinJSONToIPFS`
6. Click **Create**
7. Copy the **JWT** token (starts with `eyJ...`)
8. Paste it into your `.env.local` file
