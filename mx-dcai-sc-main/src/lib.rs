#![no_std]

//! # DCAi Smart Contract
//!
//! This is a Dollar Cost Averaging (DCA) smart contract for the MultiversX blockchain.
//!
//! ## Features
//! * Create and manage DCA strategies
//! * Automated periodic token purchases
//! * Take profit functionality
//! * Admin and bot management
//! * Integration with xExchange DEX

use core::str;

use multiversx_sc::imports::*;

mod admins;
mod bot;
mod pause;
mod setup;
mod strategy;
mod xexchange;

/// DCAi Smart Contract
///
/// The main smart contract trait that combines all modules for DCA functionality.
/// It provides endpoints for creating, modifying, and managing DCA strategies,
/// as well as admin, bot, and pause functionality.
#[multiversx_sc::contract]
pub trait Dcai:
    admins::AdminsModule
    + pause::PauseModule
    + xexchange::pair_module::XExchangePairModule
    + xexchange::router_module::XExchangeRouterModule
    + xexchange::wrapper_module::WrapperModule
    + bot::BotModule
    + setup::SetupModule
    + strategy::StrategyModule
{
    /// Initializes the smart contract.
    ///
    /// Adds the caller (deployer) as an admin.
    #[init]
    fn init(&self) {
        self.admins().insert(self.blockchain().get_caller());
    }

    /// Upgrade handler for the smart contract.
    ///
    /// Called when the contract is upgraded.
    #[upgrade]
    fn upgrade(&self) {}
}
