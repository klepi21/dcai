use multiversx_sc::imports::*;

use constants::{USDC_IDENTIFIER, WEGLD_IDENTIFIER};

use super::pair_proxy;

/// Smart Contract module for interacting with xExchange pair contracts.
///
/// This module provides:
/// * Views for getting USDC and WEGLD token identifiers
/// * Methods to query swap amounts from pair contracts
/// * Methods to get token equivalents based on pool reserves
#[multiversx_sc::module]
pub trait XExchangePairModule {
    // === Views ===

    /// Returns the USDC token identifier.
    #[view(getUsdcIdentifier)]
    fn get_usdc_identifier(&self) -> TokenIdentifier {
        TokenIdentifier::from_esdt_bytes(USDC_IDENTIFIER)
    }

    /// Returns the WEGLD (Wrapped EGLD) token identifier.
    #[view(getWegldIdentifier)]
    fn get_wegld_identifier(&self) -> TokenIdentifier {
        TokenIdentifier::from_esdt_bytes(WEGLD_IDENTIFIER)
    }

    // === Private ===

    /// Returns the EGLD token identifier.
    fn get_egld_identifier(&self) -> EgldOrEsdtTokenIdentifier {
        EgldOrEsdtTokenIdentifier::egld()
    }

    /// Queries a pair contract to get the expected output amount for a swap.
    ///
    /// ### Arguments
    /// * `contract_address` - The address of the pair contract.
    /// * `token_in` - The token being swapped in.
    /// * `amount_in` - The amount of the input token.
    ///
    /// ### Returns
    /// The expected output amount from the swap.
    fn get_amount_out(
        &self,
        contract_address: ManagedAddress,
        token_in: TokenIdentifier,
        amount_in: BigUint,
    ) -> BigUint {
        self.tx()
            .to(&contract_address)
            .typed(pair_proxy::PairProxy)
            .get_amount_out_view(token_in, amount_in)
            .returns(ReturnsResult)
            .sync_call_readonly()
    }

    /// Queries a pair contract to get the equivalent amount based on pool reserves.
    ///
    /// ### Arguments
    /// * `contract_address` - The address of the pair contract.
    /// * `token_in` - The token to get the equivalent for.
    /// * `amount_in` - The amount of the input token.
    ///
    /// ### Returns
    /// The equivalent amount in the other token of the pair.
    fn get_equivalent(
        &self,
        contract_address: ManagedAddress,
        token_in: TokenIdentifier,
        amount_in: BigUint,
    ) -> BigUint {
        self.tx()
            .to(&contract_address)
            .typed(pair_proxy::PairProxy)
            .get_equivalent(token_in, amount_in)
            .returns(ReturnsResult)
            .sync_call_readonly()
    }
}
