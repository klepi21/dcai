use multiversx_sc::imports::*;

use constants::WRAPPER_SC_ADDRESS;

use super::{pair_module, wrapper_proxy};

/// Smart Contract module for EGLD/WEGLD wrapping and unwrapping.
///
/// This module provides:
/// * A view to get the wrapper contract address
/// * Methods to wrap EGLD into WEGLD
/// * Methods to unwrap WEGLD back into EGLD
///
/// This is necessary because xExchange DEX operates with WEGLD (wrapped EGLD)
/// instead of native EGLD for technical reasons.
#[multiversx_sc::module]
pub trait WrapperModule: pair_module::XExchangePairModule {
    // === Views ===

    /// Returns the EGLD/WEGLD wrapper smart contract address.
    #[view(getWrapperScAddress)]
    fn get_wrapper_sc_address(&self) -> ManagedAddress {
        ManagedAddress::new_from_bytes(&WRAPPER_SC_ADDRESS)
    }

    // === Private ===

    /// Wraps EGLD into WEGLD by calling the wrapper contract.
    ///
    /// ### Arguments
    /// * `amount` - The amount of EGLD to wrap.
    fn wrap_egld(&self, amount: &BigUint) {
        self.tx()
            .to(&self.get_wrapper_sc_address())
            .typed(wrapper_proxy::EgldEsdtSwapProxy)
            .wrap_egld()
            .egld(amount)
            .sync_call()
    }

    /// Unwraps WEGLD back into EGLD by calling the wrapper contract.
    ///
    /// ### Arguments
    /// * `amount` - The amount of WEGLD to unwrap.
    fn unwrap_egld(&self, amount: &BigUint) {
        self.tx()
            .to(&self.get_wrapper_sc_address())
            .typed(wrapper_proxy::EgldEsdtSwapProxy)
            .unwrap_egld()
            .single_esdt(&self.get_wegld_identifier(), 0u64, amount)
            .sync_call();
    }
}
