use anchor_lang::prelude::*;

declare_id!("41MbmvmGCzNeJbJyMQry5uD4eVagxKccMgNA533rKWqs");

#[program]
pub mod hackproof {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
