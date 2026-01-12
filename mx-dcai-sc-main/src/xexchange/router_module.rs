use super::router_proxy::{self, PairContractMetadata};
use constants::{MAX_PERCENTAGE, SWAP_TOKENS_FIXED_INPUT_FUNC_NAME, XEXCHANGE_ROUTER_SC_ADDRESS};
use multiversx_sc::imports::*;

/// Type alias for swap operation parameters.
///
/// Contains:
/// 1. Pair contract address
/// 2. Function name to call (e.g., "swapTokensFixedInput")
/// 3. Output token identifier
/// 4. Minimum amount out (with slippage applied)
pub type SwapOperationType<M> =
    MultiValue4<ManagedAddress<M>, ManagedBuffer<M>, TokenIdentifier<M>, BigUint<M>>;

/// Smart Contract module for interacting with the xExchange router.
///
/// This module provides:
/// * Views to get the router contract address
/// * Methods to find optimal swap paths between tokens
/// * Methods to execute multi-hop swaps through the router
/// * Support for direct swaps and multi-pair routing (via WEGLD or USDC)
#[multiversx_sc::module]
pub trait XExchangeRouterModule: crate::xexchange::pair_module::XExchangePairModule {
    // === Views ===

    /// Returns the xExchange router smart contract address.
    #[view(getXexchangeRouterScAddress)]
    fn get_xexchange_router_sc_address(&self) -> ManagedAddress {
        ManagedAddress::new_from_bytes(&XEXCHANGE_ROUTER_SC_ADDRESS)
    }

    // === Private ===

    /// Gets the balance of a token held by this smart contract.
    fn get_token_balance(&self, token: TokenIdentifier) -> BigUint {
        self.blockchain()
            .get_sc_balance(EgldOrEsdtTokenIdentifier::esdt(token), 0u64)
    }

    /// Gets the balance of a token held by a specific address.
    fn get_token_balance_in_address(
        &self,
        address: &ManagedAddress,
        token: &TokenIdentifier,
    ) -> BigUint {
        self.blockchain().get_esdt_balance(address, token, 0u64)
    }

    /// Checks if a pair contract has liquidity for both tokens.
    fn get_contract_has_balance(
        &self,
        address: &ManagedAddress,
        token_a: &TokenIdentifier,
        token_b: &TokenIdentifier,
    ) -> bool {
        self.get_token_balance_in_address(address, token_a) > 0
            && self.get_token_balance_in_address(address, token_b) > 0
    }

    /// Queries the router to get the pair contract address for two tokens.
    fn get_pair(
        &self,
        first_token_id: TokenIdentifier,
        second_token_id: TokenIdentifier,
        router_address: ManagedAddress,
    ) -> ManagedAddress {
        self.tx()
            .to(&router_address)
            .typed(router_proxy::RouterProxy)
            .get_pair(first_token_id, second_token_id)
            .returns(ReturnsResult)
            .sync_call_readonly()
    }

    /// Finds the optimal swap path between two tokens.
    ///
    /// The function tries to find a direct pair first, then falls back to
    /// multi-hop routes through WEGLD or USDC if needed.
    ///
    /// ### Arguments
    /// * `token_in` - The token to swap from.
    /// * `token_out` - The token to swap to.
    ///
    /// ### Returns
    /// A list of pair contracts to use for the swap path.
    fn get_swap_contracts(
        &self,
        token_in: TokenIdentifier,
        token_out: TokenIdentifier,
    ) -> MultiValueEncoded<PairContractMetadata<Self::Api>> {
        let mut needed_contracts: MultiValueEncoded<PairContractMetadata<Self::Api>> =
            MultiValueEncoded::new();

        let router_address = self.get_xexchange_router_sc_address();

        // Token to token
        let token_in_token_out_contract =
            self.get_pair(token_in.clone(), token_out.clone(), router_address.clone());

        if !token_in_token_out_contract.is_zero()
            && self.get_contract_has_balance(&token_in_token_out_contract, &token_in, &token_out)
        {
            needed_contracts.push(PairContractMetadata {
                first_token_id: token_in,
                second_token_id: token_out,
                address: token_in_token_out_contract,
            });
            return needed_contracts;
        }

        // Token to wegld to token
        let wegld = self.get_wegld_identifier();
        let usdc = self.get_usdc_identifier();

        let token_in_wegld_contract =
            self.get_pair(token_in.clone(), wegld.clone(), router_address.clone());
        let wegld_to_token_out_contract =
            self.get_pair(wegld.clone(), token_out.clone(), router_address.clone());

        if !token_in_wegld_contract.is_zero()
            && !wegld_to_token_out_contract.is_zero()
            && self.get_contract_has_balance(&token_in_wegld_contract, &token_in, &wegld)
            && self.get_contract_has_balance(&wegld_to_token_out_contract, &wegld, &token_out)
        {
            needed_contracts.push(PairContractMetadata {
                first_token_id: token_in,
                second_token_id: wegld.clone(),
                address: token_in_wegld_contract,
            });
            needed_contracts.push(PairContractMetadata {
                first_token_id: wegld.clone(),
                second_token_id: token_out,
                address: wegld_to_token_out_contract,
            });
            return needed_contracts;
        }

        // Token to usdc to token
        let token_in_usdc_contract =
            self.get_pair(token_in.clone(), usdc.clone(), router_address.clone());
        let usdc_to_token_out_contract =
            self.get_pair(usdc.clone(), token_out.clone(), router_address.clone());

        if !token_in_usdc_contract.is_zero()
            && !usdc_to_token_out_contract.is_zero()
            && self.get_contract_has_balance(&token_in_usdc_contract, &token_in, &usdc)
            && self.get_contract_has_balance(&usdc_to_token_out_contract, &usdc, &token_out)
        {
            needed_contracts.push(PairContractMetadata {
                first_token_id: token_in,
                second_token_id: usdc.clone(),
                address: token_in_usdc_contract,
            });
            needed_contracts.push(PairContractMetadata {
                first_token_id: usdc.clone(),
                second_token_id: token_out,
                address: usdc_to_token_out_contract,
            });
            return needed_contracts;
        }

        let wegld_usdc_contract =
            self.get_pair(wegld.clone(), usdc.clone(), router_address.clone());
        if !self.get_contract_has_balance(&wegld_usdc_contract, &wegld, &usdc) {
            return needed_contracts;
        }

        // Token to wegld to usdc to token
        if !token_in_wegld_contract.is_zero()
            && !wegld_usdc_contract.is_zero()
            && !usdc_to_token_out_contract.is_zero()
            && self.get_contract_has_balance(&token_in_wegld_contract, &token_in, &wegld)
            && self.get_contract_has_balance(&usdc_to_token_out_contract, &usdc, &token_out)
        {
            needed_contracts.push(PairContractMetadata {
                first_token_id: token_in,
                second_token_id: wegld.clone(),
                address: token_in_wegld_contract,
            });
            needed_contracts.push(PairContractMetadata {
                first_token_id: wegld.clone(),
                second_token_id: usdc.clone(),
                address: wegld_usdc_contract,
            });
            needed_contracts.push(PairContractMetadata {
                first_token_id: usdc.clone(),
                second_token_id: token_out,
                address: usdc_to_token_out_contract,
            });
            return needed_contracts;
        }

        // Token to usdc to wegld to token
        if !token_in_usdc_contract.is_zero()
            && !wegld_usdc_contract.is_zero()
            && !usdc_to_token_out_contract.is_zero()
            && self.get_contract_has_balance(&token_in_usdc_contract, &token_in, &usdc)
            && self.get_contract_has_balance(&usdc_to_token_out_contract, &usdc, &token_out)
        {
            needed_contracts.push(PairContractMetadata {
                first_token_id: token_in,
                second_token_id: usdc.clone(),
                address: token_in_usdc_contract,
            });
            needed_contracts.push(PairContractMetadata {
                first_token_id: usdc.clone(),
                second_token_id: wegld.clone(),
                address: wegld_usdc_contract,
            });
            needed_contracts.push(PairContractMetadata {
                first_token_id: wegld.clone(),
                second_token_id: token_out,
                address: usdc_to_token_out_contract,
            });
            return needed_contracts;
        }

        return needed_contracts;
    }

    /// Builds the swap operations for a multi-pair swap.
    ///
    /// ### Arguments
    /// * `amount_in` - The initial input amount.
    /// * `slippage` - The slippage percentage to apply.
    /// * `swap_contracts` - The list of pair contracts to use.
    ///
    /// ### Returns
    /// A list of swap operations to execute on the router.
    fn get_swap_operations(
        &self,
        amount_in: BigUint,
        slippage: u64,
        swap_contracts: MultiValueEncoded<PairContractMetadata<Self::Api>>,
    ) -> MultiValueEncoded<SwapOperationType<Self::Api>> {
        let mut swap_operations: MultiValueEncoded<SwapOperationType<Self::Api>> =
            MultiValueEncoded::new();

        let mut amount_in = amount_in;
        let mut amount_out;
        for pair_contract in swap_contracts.into_iter() {
            amount_out = self.get_amount_out(
                pair_contract.clone().address,
                pair_contract.clone().first_token_id,
                amount_in.clone(),
            );

            swap_operations.push(SwapOperationType::from((
                pair_contract.clone().address,
                ManagedBuffer::new_from_bytes(SWAP_TOKENS_FIXED_INPUT_FUNC_NAME),
                pair_contract.clone().second_token_id,
                amount_out.clone() * BigUint::from(MAX_PERCENTAGE - slippage)
                    / BigUint::from(MAX_PERCENTAGE),
            )));

            amount_in = amount_out;
        }

        swap_operations
    }

    /// Executes a multi-pair swap through the xExchange router.
    ///
    /// ### Arguments
    /// * `token_in` - The input token identifier.
    /// * `amount_in` - The amount of input tokens.
    /// * `swap_operations` - The list of swap operations to execute.
    ///
    /// ### Returns
    /// A vector of ESDT token payments received from the swap.
    fn multi_pair_swap(
        &self,
        token_in: TokenIdentifier,
        amount_in: BigUint,
        swap_operations: MultiValueEncoded<SwapOperationType<Self::Api>>,
    ) -> ManagedVec<EsdtTokenPayment> {
        self.tx()
            .to(&self.get_xexchange_router_sc_address())
            .typed(router_proxy::RouterProxy)
            .multi_pair_swap(swap_operations)
            .single_esdt(&token_in, 0u64, &amount_in)
            .returns(ReturnsResult)
            .sync_call()
    }

    /// Executes a token swap with automatic path finding.
    ///
    /// ### Arguments
    /// * `token_in` - The input token identifier.
    /// * `amount_in` - The amount of input tokens.
    /// * `token_out` - The desired output token identifier.
    /// * `slippage` - The slippage percentage to apply.
    ///
    /// ### Returns
    /// The amount of output tokens received.
    fn execute_swap(
        &self,
        token_in: TokenIdentifier,
        amount_in: BigUint,
        token_out: TokenIdentifier,
        slippage: u64,
    ) -> BigUint {
        let swap_contracts = self.get_swap_contracts(token_in.clone(), token_out.clone());

        self.require_has_contracts(&swap_contracts.to_vec());

        let swap_operations = self.get_swap_operations(amount_in.clone(), slippage, swap_contracts);

        let payments =
            self.multi_pair_swap(token_in.clone(), amount_in.clone(), swap_operations.clone());

        payments.into_iter().next_back().unwrap().into_tuple().2
    }

    /// Validates that at least one pair contract is available for the swap.
    fn require_has_contracts(&self, pair_contracts: &ManagedVec<PairContractMetadata<Self::Api>>) {
        require!(
            !pair_contracts.is_empty(),
            "At least one pair contract is required for a swap operation."
        );
    }
}
