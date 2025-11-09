use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{spl_token, mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::{
    instructions::{CreateV1CpiBuilder},
    types::{TokenStandard, PrintSupply},
};

declare_id!("41MbmvmGCzNeJbJyMQry5uD4eVagxKccMgNA533rKWqs");

const INITIAL_VOTING_TOKENS: u64 = 100; // Each participant gets 100 voting tokens

#[program]
pub mod hackproof {
    use super::*;

    // ========== INITIALIZATION ==========
    
    pub fn initialize_hackathon(
        ctx: Context<InitializeHackathon>,
        admin: Pubkey,
    ) -> Result<()> {
        let hackathon = &mut ctx.accounts.hackathon;
        
        hackathon.admin = admin;
        hackathon.voting_enabled = false;
        hackathon.voting_start = None;
        hackathon.voting_end = None;
        hackathon.voting_token_mint = ctx.accounts.voting_token_mint.key();
        hackathon.bump = ctx.bumps.hackathon;

        msg!("Hackathon initialized!");
        msg!("Voting token mint: {}", ctx.accounts.voting_token_mint.key());
        Ok(())
    }

    // ========== PARTICIPANT FUNCTIONS ==========

    pub fn register_participant(
        ctx: Context<RegisterParticipant>,
        name: String,
        metadata_uri: String,
    ) -> Result<()> {
        let participant = &mut ctx.accounts.participant;
        participant.name = name.clone();
        participant.authority = ctx.accounts.authority.key();
        participant.metadata_uri = metadata_uri.clone();
        participant.registered_at = Clock::get()?.unix_timestamp;
        participant.nft_mint = ctx.accounts.nft_mint.key();
        participant.voting_tokens_allocated = 0;
        participant.bump = ctx.bumps.participant;
        participant.project = None;

        // Create NFT using Metaplex Token Metadata V1
        CreateV1CpiBuilder::new(&ctx.accounts.token_metadata_program.to_account_info())
            .metadata(&ctx.accounts.metadata.to_account_info())
            .master_edition(Some(&ctx.accounts.master_edition.to_account_info()))
            .mint(&ctx.accounts.nft_mint.to_account_info(), true)
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

        // Mint NFT to participant
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    to: ctx.accounts.nft_token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                }
            ),
            1
        )?;

        // Mint voting tokens to participant (INITIAL_VOTING_TOKENS)
        let hackathon_seeds: &[&[u8]] = &[
            b"hackathon",
            &[ctx.accounts.hackathon.bump],
        ];
        let signer_seeds = &[&hackathon_seeds[..]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.voting_token_mint.to_account_info(),
                    to: ctx.accounts.voting_token_account.to_account_info(),
                    authority: ctx.accounts.hackathon.to_account_info(),
                },
                signer_seeds
            ),
            INITIAL_VOTING_TOKENS
        )?;

        msg!("Participant registered: {}", name);
        msg!("Received {} voting tokens", INITIAL_VOTING_TOKENS);
        Ok(())
    }

    // ========== PROJECT FUNCTIONS ==========
    
    pub fn create_project(
        ctx: Context<CreateProject>,
        project_name: String,
        description: String,
        github_repo: String,
        max_team_size: u8,
    ) -> Result<()> {
        require!(max_team_size > 0 && max_team_size <= 10, ErrorCode::InvalidTeamSize);
        
        let project = &mut ctx.accounts.project;
        project.name = project_name.clone();
        project.description = description;
        project.github_repo = github_repo;
        project.creator = ctx.accounts.creator.key();
        project.max_team_size = max_team_size;
        project.current_team_size = 1;
        project.created_at = Clock::get()?.unix_timestamp;
        project.status = ProjectStatus::Active;
        project.submitted = false;
        project.total_votes_received = 0;
        project.bump = ctx.bumps.project;

        // Add creator as first team member
        let participant = &mut ctx.accounts.creator_participant;
        participant.project = Some(ctx.accounts.project.key());

        msg!("Project created: {}", project_name);
        Ok(())
    }

    pub fn join_project(ctx: Context<JoinProject>) -> Result<()> {
        let project = &mut ctx.accounts.project;
        let participant = &mut ctx.accounts.participant;

        require!(participant.project.is_none(), ErrorCode::AlreadyInProject);
        require!(project.status == ProjectStatus::Active, ErrorCode::ProjectNotActive);
        require!(project.current_team_size < project.max_team_size, ErrorCode::ProjectFull);

        participant.project = Some(project.key());
        project.current_team_size += 1;

        msg!("Participant {} joined project {}", participant.name, project.name);
        Ok(())
    }

    pub fn leave_project(ctx: Context<LeaveProject>) -> Result<()> {
        let project = &mut ctx.accounts.project;
        let participant = &mut ctx.accounts.participant;

        require!(participant.project == Some(project.key()), ErrorCode::NotInThisProject);
        require!(participant.authority != project.creator, ErrorCode::CreatorCannotLeave);

        participant.project = None;
        project.current_team_size -= 1;

        msg!("Participant {} left project {}", participant.name, project.name);
        Ok(())
    }

    pub fn submit_project(
        ctx: Context<SubmitProject>,
        submission_uri: String,
    ) -> Result<()> {
        let project = &mut ctx.accounts.project;

        require!(!project.submitted, ErrorCode::AlreadySubmitted);
        require!(project.status == ProjectStatus::Active, ErrorCode::ProjectNotActive);

        project.submission_uri = Some(submission_uri.clone());
        project.submitted = true;
        project.submitted_at = Some(Clock::get()?.unix_timestamp);

        msg!("Project {} submitted!", project.name);
        Ok(())
    }

    pub fn update_project(
        ctx: Context<UpdateProject>,
        new_description: Option<String>,
        new_github_repo: Option<String>,
    ) -> Result<()> {
        let project = &mut ctx.accounts.project;

        if let Some(desc) = new_description {
            project.description = desc;
        }
        if let Some(repo) = new_github_repo {
            project.github_repo = repo;
        }

        msg!("Project {} updated", project.name);
        Ok(())
    }

    // ========== TOKEN-BASED VOTING FUNCTIONS ==========

    pub fn vote_with_tokens<'info>(
        ctx: Context<'_, '_, 'info, 'info, VoteWithTokens<'info>>,
        token_amount: u64,
    ) -> Result<()> {
        require!(token_amount > 0, ErrorCode::InvalidTokenAmount);
        
        let voter_participant = &mut ctx.accounts.voter_participant;
        let project = &mut ctx.accounts.project;

        // CRITICAL: Prevent self-voting
        require!(
            voter_participant.project != Some(project.key()),
            ErrorCode::CannotVoteForOwnProject
        );

        // Ensure project is submitted
        require!(project.submitted, ErrorCode::ProjectNotSubmitted);

        // Check voter has enough tokens
        let voter_balance = ctx.accounts.voter_token_account.amount;
        require!(voter_balance >= token_amount, ErrorCode::InsufficientTokens);

        // Transfer voting tokens from voter to project's token account
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.voter_token_account.to_account_info(),
                    to: ctx.accounts.project_token_account.to_account_info(),
                    authority: ctx.accounts.voter.to_account_info(),
                }
            ),
            token_amount
        )?;

        // Update project vote count
        project.total_votes_received = project.total_votes_received
            .checked_add(token_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // Track voter's allocation
        voter_participant.voting_tokens_allocated = voter_participant.voting_tokens_allocated
            .checked_add(token_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // 🎁 BONUS FEATURE: If voter has a project, give their project 5% bonus
        if let Some(voter_project_key) = voter_participant.project {
            // Check if voter's project exists and get its token account
            if let Some(voter_project_account) = &ctx.remaining_accounts.get(0) {
                // Verify this is the voter's project
                let voter_project: Account<Project> = Account::try_from(voter_project_account)?;
                
                if voter_project.key() == voter_project_key {
                    // Calculate 5% bonus
                    let bonus_amount = token_amount
                        .checked_mul(5)
                        .and_then(|v| v.checked_div(100))
                        .ok_or(ErrorCode::MathOverflow)?;
                    
                    if bonus_amount > 0 {
                        // Get voter's project token account (must be in remaining_accounts[1])
                        if let Some(voter_project_token_account_info) = ctx.remaining_accounts.get(1) {
                            // CORRECTED PDA SIGNER LOGIC
                            let hackathon_seeds: &[&[u8]] = &[
                                b"hackathon",
                                &[ctx.accounts.hackathon.bump],
                            ];
                            let signer_seeds = &[&hackathon_seeds[..]];

                            mint_to(
                                CpiContext::new_with_signer(
                                    ctx.accounts.token_program.to_account_info(),
                                    MintTo {
                                        mint: ctx.accounts.voting_token_mint.to_account_info(),
                                        to: voter_project_token_account_info.to_account_info(),
                                        authority: ctx.accounts.hackathon.to_account_info(),
                                    },
                                    signer_seeds
                                ),
                                bonus_amount
                            )?;
                            
                            msg!("🎁 Bonus: Voter's project '{}' received {} $HCKPRF (5% of vote)", 
                                voter_project.name, bonus_amount);
                        }
                    }
                }
            }
        }

        msg!("Voted {} $HCKPRF for project: {}", token_amount, project.name);
        msg!("Project total votes: {} $HCKPRF", project.total_votes_received);
        Ok(())
    }

    // ========== ADMIN FUNCTIONS ==========
    
    pub fn enable_voting_phase(ctx: Context<EnableVotingPhase>) -> Result<()> {
        let hackathon = &mut ctx.accounts.hackathon;
        
        hackathon.voting_enabled = true;
        hackathon.voting_start = Some(Clock::get()?.unix_timestamp);

        msg!("Voting phase enabled!");
        Ok(())
    }

    pub fn disable_voting_phase(ctx: Context<DisableVotingPhase>) -> Result<()> {
        let hackathon = &mut ctx.accounts.hackathon;
        
        hackathon.voting_enabled = false;
        hackathon.voting_end = Some(Clock::get()?.unix_timestamp);

        msg!("Voting phase ended!");
        Ok(())
    }
}

// ========== ACCOUNT CONTEXTS ==========

#[derive(Accounts)]
pub struct InitializeHackathon<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1 + 9 + 9 + 32 + 1,
        seeds = [b"hackathon"],
        bump
    )]
    pub hackathon: Account<'info, Hackathon>,
    
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = hackathon,
        seeds = [b"voting_token_mint"],
        bump
    )]
    pub voting_token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterParticipant<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 256 + 200 + 8 + 32 + 8 + 1 + 33,
        seeds = [b"participant", authority.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(
        seeds = [b"hackathon"],
        bump = hackathon.bump,
    )]
    pub hackathon: Account<'info, Hackathon>,
    
    /// CHECK: Validated by Metaplex program
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    
    /// CHECK: Validated by Metaplex program
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    
    /// CHECK: New Keypair for NFT
    #[account(mut)]
    pub nft_mint: Signer<'info>,
    
    /// CHECK: Will be created by associated token program
    #[account(mut)]
    pub nft_token_account: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"voting_token_mint"],
        bump,
    )]
    pub voting_token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = voting_token_mint,
        associated_token::authority = authority,
    )]
    pub voting_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,

    #[account(address = spl_token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = anchor_spl::associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    
    /// CHECK: Sysvar Instructions
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(project_name: String)]
pub struct CreateProject<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 256 + 500 + 200 + 32 + 1 + 1 + 8 + 1 + 1 + 8 + 1 + 201 + 8,
        seeds = [b"project", creator.key().as_ref(), project_name.as_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"participant", creator.key().as_ref()],
        bump = creator_participant.bump,
        constraint = creator_participant.authority == creator.key() @ ErrorCode::Unauthorized
    )]
    pub creator_participant: Account<'info, Participant>,
    
    #[account(
        seeds = [b"hackathon"],
        bump = hackathon.bump,
    )]
    pub hackathon: Account<'info, Hackathon>,
    
    #[account(
        init,
        payer = creator,
        associated_token::mint = voting_token_mint,
        associated_token::authority = project,
    )]
    pub project_token_account: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"voting_token_mint"],
        bump,
    )]
    pub voting_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinProject<'info> {
    #[account(mut)]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"participant", member.key().as_ref()],
        bump = participant.bump,
        constraint = participant.authority == member.key() @ ErrorCode::Unauthorized
    )]
    pub participant: Account<'info, Participant>,

    pub member: Signer<'info>,
}

#[derive(Accounts)]
pub struct LeaveProject<'info> {
    #[account(mut)]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"participant", member.key().as_ref()],
        bump = participant.bump,
        constraint = participant.authority == member.key() @ ErrorCode::Unauthorized
    )]
    pub participant: Account<'info, Participant>,

    pub member: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitProject<'info> {
    #[account(
        mut,
        has_one = creator @ ErrorCode::Unauthorized
    )]
    pub project: Account<'info, Project>,

    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateProject<'info> {
    #[account(
        mut,
        has_one = creator @ ErrorCode::Unauthorized
    )]
    pub project: Account<'info, Project>,

    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct VoteWithTokens<'info> {
    #[account(mut)]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"participant", voter.key().as_ref()],
        bump = voter_participant.bump,
        constraint = voter_participant.authority == voter.key() @ ErrorCode::Unauthorized
    )]
    pub voter_participant: Account<'info, Participant>,

    #[account(
        constraint = hackathon.voting_enabled @ ErrorCode::VotingNotEnabled
    )]
    pub hackathon: Account<'info, Hackathon>,
    
    #[account(
        mut,
        associated_token::mint = voting_token_mint,
        associated_token::authority = voter,
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = voting_token_mint,
        associated_token::authority = project,
    )]
    pub project_token_account: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"voting_token_mint"],
        bump,
    )]
    pub voting_token_mint: Account<'info, Mint>,

    pub voter: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EnableVotingPhase<'info> {
    #[account(
        mut,
        seeds = [b"hackathon"],
        bump = hackathon.bump,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub hackathon: Account<'info, Hackathon>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct DisableVotingPhase<'info> {
    #[account(
        mut,
        seeds = [b"hackathon"],
        bump = hackathon.bump,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub hackathon: Account<'info, Hackathon>,
    
    pub admin: Signer<'info>,
}

// ========== DATA STRUCTURES ==========

#[account]
pub struct Participant {
    pub authority: Pubkey,
    pub name: String,
    pub metadata_uri: String,
    pub registered_at: i64,
    pub nft_mint: Pubkey,
    pub voting_tokens_allocated: u64,
    pub bump: u8,
    pub project: Option<Pubkey>,
}

#[account]
pub struct Project {
    pub name: String,
    pub description: String,
    pub github_repo: String,
    pub creator: Pubkey,
    pub max_team_size: u8,
    pub current_team_size: u8,
    pub created_at: i64,
    pub status: ProjectStatus,
    pub submitted: bool,
    pub submitted_at: Option<i64>,
    pub bump: u8,
    pub submission_uri: Option<String>,
    pub total_votes_received: u64,
}

#[account]
pub struct Hackathon {
    pub admin: Pubkey,
    pub voting_enabled: bool,
    pub voting_start: Option<i64>,
    pub voting_end: Option<i64>,
    pub voting_token_mint: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProjectStatus {
    Active,
    Archived,
}

// ========== ERROR CODES ==========

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid team size. Must be between 1 and 10.")]
    InvalidTeamSize,
    #[msg("Participant is already in a project.")]
    AlreadyInProject,
    #[msg("Project is not active.")]
    ProjectNotActive,
    #[msg("Project team is full.")]
    ProjectFull,
    #[msg("Participant is not in this project.")]
    NotInThisProject,
    #[msg("Project creator cannot leave their own project.")]
    CreatorCannotLeave,
    #[msg("Project has already been submitted.")]
    AlreadySubmitted,
    #[msg("Unauthorized action.")]
    Unauthorized,
    #[msg("Cannot vote for your own project!")]
    CannotVoteForOwnProject,
    #[msg("Project has not been submitted yet.")]
    ProjectNotSubmitted,
    #[msg("Voting is not currently enabled.")]
    VotingNotEnabled,
    #[msg("Invalid token amount. Must be greater than 0.")]
    InvalidTokenAmount,
    #[msg("Insufficient voting tokens.")]
    InsufficientTokens,
    #[msg("Mathematical operation overflowed.")]
    MathOverflow,
}
