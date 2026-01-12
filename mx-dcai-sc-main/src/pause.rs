use errors::{ERROR_NOT_PAUSED, ERROR_PAUSED};
use multiversx_sc::imports::*;

/// Smart Contract module that offers pausability.
///
/// It provides:
/// * two endpoints where an admin can pause/unpause the contract
/// * a view to check if the contract is paused
/// * two methods to require the contract to be paused/not paused
#[multiversx_sc::module]
pub trait PauseModule: crate::admins::AdminsModule {
    // === Endpoints ===

    /// Pauses the contract.
    ///
    /// Only admins can call this endpoint.
    /// The contract must not already be paused.
    #[endpoint(pause)]
    fn pause(&self) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.require_not_paused();

        self.is_paused().set(true);
        self.event_paused();
    }

    /// Unpauses the contract.
    ///
    /// Only admins can call this endpoint.
    /// The contract must be paused.
    #[endpoint(unpause)]
    fn unpause(&self) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.require_paused();

        self.is_paused().set(false);
        self.event_unpaused();
    }

    // === Private ===

    /// Requires the contract to be paused, otherwise fails.
    fn require_paused(&self) {
        require!(self.is_paused().get(), ERROR_NOT_PAUSED);
    }

    /// Requires the contract to not be paused, otherwise fails.
    fn require_not_paused(&self) {
        require!(!self.is_paused().get(), ERROR_PAUSED);
    }

    // === Storage ===

    /// Storage mapper for the paused state.
    #[view(isPaused)]
    #[storage_mapper("is_paused")]
    fn is_paused(&self) -> SingleValueMapper<bool>;

    // === Events ===

    #[event("paused")]
    fn event_paused(&self);

    #[event("unpaused")]
    fn event_unpaused(&self);
}
