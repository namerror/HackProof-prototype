import { Idl } from '@project-serum/anchor'

export const HACKPROOF_IDL: Idl = {
    version: '0.1.0',
    name: 'hackproof',
    instructions: [
        {
            name: 'initializeHackathon',
            accounts: [
                { name: 'hackathon', isMut: true, isSigner: false, pda: { seeds: [{ kind: 'const', type: 'string', value: 'hackathon' }] } },
                { name: 'votingTokenMint', isMut: true, isSigner: false, pda: { seeds: [{ kind: 'const', type: 'string', value: 'voting_token_mint' }] } },
                { name: 'payer', isMut: true, isSigner: true },
                { name: 'tokenProgram', isMut: false, isSigner: false },
                { name: 'systemProgram', isMut: false, isSigner: false },
                { name: 'rent', isMut: false, isSigner: false }
            ],
            args: [{ name: 'admin', type: 'publicKey' }]
        },
        {
            name: 'registerParticipant',
            accounts: [
                { name: 'participant', isMut: true, isSigner: false, pda: { seeds: [{ kind: 'const', type: 'string', value: 'participant' }, { kind: 'account', type: 'publicKey', path: 'authority' }] } },
                { name: 'hackathon', isMut: false, isSigner: false, pda: { seeds: [{ kind: 'const', type: 'string', value: 'hackathon' }] } },
                { name: 'metadata', isMut: true, isSigner: false },
                { name: 'masterEdition', isMut: true, isSigner: false },
                { name: 'nftMint', isMut: true, isSigner: true },
                { name: 'nftTokenAccount', isMut: true, isSigner: false },
                { name: 'votingTokenMint', isMut: true, isSigner: false, pda: { seeds: [{ kind: 'const', type: 'string', value: 'voting_token_mint' }] } },
                { name: 'votingTokenAccount', isMut: true, isSigner: false },
                { name: 'authority', isMut: true, isSigner: true },
                { name: 'rent', isMut: false, isSigner: false },
                { name: 'systemProgram', isMut: false, isSigner: false },
                { name: 'tokenProgram', isMut: false, isSigner: false },
                { name: 'associatedTokenProgram', isMut: false, isSigner: false },
                { name: 'tokenMetadataProgram', isMut: false, isSigner: false },
                { name: 'sysvarInstructions', isMut: false, isSigner: false }
            ],
            args: [
                { name: 'name', type: 'string' },
                { name: 'metadataUri', type: 'string' }
            ]
        },
        {
            name: 'createProject',
            accounts: [
                { name: 'project', isMut: true, isSigner: false },
                { name: 'creatorParticipant', isMut: true, isSigner: false },
                { name: 'hackathon', isMut: false, isSigner: false },
                { name: 'projectTokenAccount', isMut: true, isSigner: false },
                { name: 'votingTokenMint', isMut: false, isSigner: false },
                { name: 'creator', isMut: true, isSigner: true },
                { name: 'tokenProgram', isMut: false, isSigner: false },
                { name: 'associatedTokenProgram', isMut: false, isSigner: false },
                { name: 'systemProgram', isMut: false, isSigner: false }
            ],
            args: [
                { name: 'projectName', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'githubRepo', type: 'string' },
                { name: 'maxTeamSize', type: 'u8' }
            ]
        },
        {
            name: 'voteWithTokens',
            accounts: [
                { name: 'project', isMut: true, isSigner: false },
                { name: 'voterParticipant', isMut: true, isSigner: false },
                { name: 'hackathon', isMut: false, isSigner: false },
                { name: 'voterTokenAccount', isMut: true, isSigner: false },
                { name: 'projectTokenAccount', isMut: true, isSigner: false },
                { name: 'votingTokenMint', isMut: false, isSigner: false },
                { name: 'voter', isMut: false, isSigner: true },
                { name: 'tokenProgram', isMut: false, isSigner: false }
            ],
            args: [
                { name: 'tokenAmount', type: 'u64' }
            ]
        }
    ],
    accounts: [
        {
            name: 'Participant',
            type: {
                kind: 'struct',
                fields: [
                    { name: 'authority', type: 'publicKey' },
                    { name: 'name', type: 'string' },
                    { name: 'metadataUri', type: 'string' },
                    { name: 'registeredAt', type: 'i64' },
                    { name: 'nftMint', type: 'publicKey' },
                    { name: 'votingTokensAllocated', type: 'u64' },
                    { name: 'bump', type: 'u8' },
                    { name: 'project', type: { option: 'publicKey' } }
                ]
            }
        },
        {
            name: 'Project',
            type: {
                kind: 'struct',
                fields: [
                    { name: 'name', type: 'string' },
                    { name: 'description', type: 'string' },
                    { name: 'githubRepo', type: 'string' },
                    { name: 'creator', type: 'publicKey' },
                    { name: 'maxTeamSize', type: 'u8' },
                    { name: 'currentTeamSize', type: 'u8' },
                    { name: 'createdAt', type: 'i64' },
                    { name: 'status', type: { defined: 'ProjectStatus' } },
                    { name: 'submitted', type: 'bool' },
                    { name: 'submittedAt', type: { option: 'i64' } },
                    { name: 'bump', type: 'u8' },
                    { name: 'submissionUri', type: { option: 'string' } },
                    { name: 'totalVotesReceived', type: 'u64' }
                ]
            }
        },
        {
            name: 'Hackathon',
            type: {
                kind: 'struct',
                fields: [
                    { name: 'admin', type: 'publicKey' },
                    { name: 'votingEnabled', type: 'bool' },
                    { name: 'votingStart', type: { option: 'i64' } },
                    { name: 'votingEnd', type: { option: 'i64' } },
                    { name: 'votingTokenMint', type: 'publicKey' },
                    { name: 'bump', type: 'u8' }
                ]
            }
        }
    ],
    types: [
        {
            name: 'ProjectStatus',
            type: {
                kind: 'enum',
                variants: [
                    { name: 'Active' },
                    { name: 'Archived' }
                ]
            }
        }
    ],
    errors: [
        { code: 6000, name: 'InvalidTeamSize', msg: 'Invalid team size. Must be between 1 and 10.' },
        { code: 6001, name: 'AlreadyInProject', msg: 'Participant is already in a project.' },
        { code: 6002, name: 'ProjectNotActive', msg: 'Project is not active.' },
        { code: 6003, name: 'ProjectFull', msg: 'Project team is full.' },
        { code: 6004, name: 'NotInThisProject', msg: 'Participant is not in this project.' },
        { code: 6005, name: 'CreatorCannotLeave', msg: 'Project creator cannot leave their own project.' },
        { code: 6006, name: 'AlreadySubmitted', msg: 'Project has already been submitted.' },
        { code: 6007, name: 'Unauthorized', msg: 'Unauthorized action.' },
        { code: 6008, name: 'CannotVoteForOwnProject', msg: 'Cannot vote for your own project!' },
        { code: 6009, name: 'ProjectNotSubmitted', msg: 'Project has not been submitted yet.' },
        { code: 6010, name: 'VotingNotEnabled', msg: 'Voting is not currently enabled.' },
        { code: 6011, name: 'InvalidTokenAmount', msg: 'Invalid token amount. Must be greater than 0.' },
        { code: 6012, name: 'InsufficientTokens', msg: 'Insufficient voting tokens.' },
        { code: 6013, name: 'MathOverflow', msg: 'Mathematical operation overflowed.' }
    ]
}
