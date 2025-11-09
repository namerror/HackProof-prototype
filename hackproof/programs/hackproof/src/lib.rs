use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::{
    instructions::{CreateV1CpiBuilder},
    types::{TokenStandard, PrintSupply},
};

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
        participant.mint = ctx.accounts.mint.key();
        participant.bump = ctx.bumps.participant;

        // Create NFT metadata using Metaplex Token Metadata
        CreateV1CpiBuilder::new(&ctx.accounts.token_metadata_program.to_account_info())
            .metadata(&ctx.accounts.metadata.to_account_info())
            .master_edition(Some(&ctx.accounts.master_edition.to_account_info()))
            .mint(&ctx.accounts.mint.to_account_info(), true)
            .authority(&ctx.accounts.authority.to_account_info())
            .payer(&ctx.accounts.authority.to_account_info())
            .update_authority(&ctx.accounts.authority.to_account_info(), true)
            .system_program(&ctx.accounts.system_program.to_account_info())
            .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
            .spl_token_program(Some(&ctx.accounts.token_program.to_account_info()))
            .name(format!("HackProof: {}", name))
            .symbol("HCKPRF".to_string())
            .uri(metadata_uri.clone())
            .seller_fee_basis_points(0)
            .token_standard(TokenStandard::NonFungible)
            .print_supply(PrintSupply::Zero)
            .invoke()?;

        // Mint 1 token to participant's token account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        mint_to(cpi_ctx, 1)?;

        msg!("Participant registered: {}", name);
        msg!("NFT minted with metadata URI: {}", metadata_uri);
        msg!("Mint address: {}", ctx.accounts.mint.key());
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterParticipant<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 256 + 200 + 8 + 32 + 1, 
        seeds = [b"participant", authority.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    /// CHECK: Validated by Metaplex program
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    
    /// CHECK: Validated by Metaplex program
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    
    /// CHECK: New Keypair - will be initialized by Metaplex
    #[account(mut)]
    pub mint: Signer<'info>,
    
    /// CHECK: Will be created by associated token program
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    
    /// CHECK: Sysvar Instructions
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,
}

#[account]
pub struct Participant {
    pub authority: Pubkey,      // Wallet that registered
    pub name: String,           // Participant name
    pub metadata_uri: String,   // IPFS URI for NFT metadata
    pub registered_at: i64,     // Registration timestamp
    pub mint: Pubkey,           // NFT mint address
    pub bump: u8,               // PDA bump
}