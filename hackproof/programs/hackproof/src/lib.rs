use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount, Mint},
    metadata::Metadata,
};
// use mpl_token_metadata::types::DataV2;
declare_id!("41MbmvmGCzNeJbJyMQry5uD4eVagxKccMgNA533rKWqs");

#[program]
pub mod hackproof {
    use super::*;

    pub fn register_participant(
        ctx: Context<RegisterParticipant>,
        name: String,
        metadata_uri: String, // IPFS URI from storage team
    ) -> Result<()> {
        // Store participant data
        let participant = &mut ctx.accounts.participant;
        participant.name = name.clone();
        participant.authority = ctx.accounts.authority.key();
        participant.metadata_uri = metadata_uri.clone();
        participant.registered_at = Clock::get()?.unix_timestamp;
        
        // Create metadata for the NFT
        /*let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.authority.to_account_info(),
                update_authority: ctx.accounts.authority.to_account_info(),
                payer: ctx.accounts.authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        // CHANGED: Use DataV2 struct for metadata
        let data_v2 = anchor_spl::metadata::DataV2 {
            name: "HackProof Participant".to_string(),
            symbol: "HPP".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0, // No fees
            creators: None,
            collection: None,
            uses: None,
        };

        // Create the NFT metadata on-chain
        // CHANGED: Correct V3 function call with DataV2
        anchor_spl::metadata::create_metadata_accounts_v3(
            cpi_context,
            data_v2,
            true,  // Is mutable
            true,  // Update authority is signer
            None,  // Collection details
        )?; */

        // msg!("Participant NFT minted for: {}", name);
        msg!("Participant registered: {}", name);
        msg!("Metadata URI: {}", metadata_uri);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterParticipant<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 256 + 200 + 8, 
        seeds = [b"participant", authority.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /*
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub mint: Account<'info, Mint>, */
    
    /*
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, TokenAccount>, */
    
    /// Metadata account - validated in CPI
    /// CHECK: This is the metadata account for the NFT, validated in the CPI call
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    
    // Programs
    /*
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
    */
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Participant {
    pub authority: Pubkey,      // Wallet that registered
    pub name: String,           // Participant name
    pub metadata_uri: String,   // IPFS URI for NFT metadata
    pub registered_at: i64,     // Registration timestamp
}

