import { Idl } from '@project-serum/anchor'

export const HACKPROOF_IDL: Idl = {
    version: '0.1.0',
    name: 'hackproof',
    instructions: [
        {
            name: 'registerParticipant',
            accounts: [
                {
                    name: 'participant',
                    isMut: true,
                    isSigner: false,
                    pda: {
                        seeds: [
                            {
                                kind: 'const',
                                type: 'string',
                                value: 'participant'
                            },
                            {
                                kind: 'account',
                                type: 'publicKey',
                                path: 'authority'
                            }
                        ]
                    }
                },
                {
                    name: 'authority',
                    isMut: true,
                    isSigner: true
                },
                {
                    name: 'systemProgram',
                    isMut: false,
                    isSigner: false
                }
            ],
            args: [
                {
                    name: 'name',
                    type: 'string'
                },
                {
                    name: 'metadataUri',
                    type: 'string'
                }
            ]
        }
    ],
    accounts: [
        {
            name: 'Participant',
            type: {
                kind: 'struct',
                fields: [
                    {
                        name: 'authority',
                        type: 'publicKey'
                    },
                    {
                        name: 'name',
                        type: 'string'
                    },
                    {
                        name: 'metadataUri',
                        type: 'string'
                    },
                    {
                        name: 'registeredAt',
                        type: 'i64'
                    }
                ]
            }
        }
    ]
}