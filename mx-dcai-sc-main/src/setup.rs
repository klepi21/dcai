use constants::*;
use errors::*;
use multiversx_sc::imports::*;
use structs::*;

/// Smart Contract module that offers DCA setup capabilities.
///
/// It provides:
/// * an endpoint where the owner can setup the DCA strategy parameters
/// * endpoints where the admins can update the DCA strategy parameters
/// * a view to get the DCA setup parameters
#[multiversx_sc::module]
pub trait SetupModule: crate::admins::AdminsModule + crate::pause::PauseModule {
    // === Endpoints ===

    /// Initial setup endpoint for the DCA contract.
    ///
    /// Only the contract owner can call this endpoint.
    /// This must be called once to configure the DCA parameters before the contract can be used.
    ///
    /// ### Arguments
    /// * `dca_token` - The token to be accumulated through DCA (e.g., EGLD or an ESDT).
    /// * `strategy_token_ticker` - The ticker for the strategy NFT token (max 5 characters).
    /// * `strategy_token_display_name` - The display name for the strategy NFT token.
    /// * `min_amount_per_swap` - The minimum USDC amount allowed per DCA swap.
    /// * `profit_fee_percentage` - The fee percentage taken from profits on take profit operations.
    /// * `allowed_frequencies` - The allowed DCA frequencies (e.g., daily, weekly) with their durations in milliseconds.
    #[only_owner]
    #[payable]
    #[endpoint(setup)]
    fn setup(
        &self,
        dca_token: EgldOrEsdtTokenIdentifier,
        strategy_token_ticker: ManagedBuffer,
        strategy_token_display_name: ManagedBuffer,
        min_amount_per_swap: BigUint,
        profit_fee_percentage: u64,
        allowed_frequencies: MultiValueEncoded<DcaFrequencyInMillis<Self::Api>>,
    ) {
        self.require_not_setup_yet();

        self.event_dca_token_set(&dca_token);
        self.dca_token().set(dca_token.clone());

        self.event_min_amount_per_swap_set(&min_amount_per_swap);
        self.min_amount_per_swap().set(min_amount_per_swap.clone());

        self.event_allowed_frequencies_added(&allowed_frequencies);
        for freq in allowed_frequencies.clone().into_iter() {
            let (frequency, duration_in_millis) = freq.into_tuple();
            self.allowed_frequencies()
                .insert(frequency, duration_in_millis);
        }

        self.event_profit_fee_percentage_set(profit_fee_percentage);
        self.profit_fee_percentage().set(profit_fee_percentage);

        require!(
            strategy_token_ticker.len() <= 5,
            "Strategy token ticker too long"
        );

        self.strategy_token().issue_and_set_all_roles(
            EsdtTokenType::DynamicMeta,
            BigUint::from(TOKEN_ISSUANCE_COST),
            ManagedBuffer::new_from_bytes(b"DCAi").concat(strategy_token_display_name),
            ManagedBuffer::new_from_bytes(b"DCAI").concat(strategy_token_ticker),
            0,
            Option::Some(self.callbacks().strategy_token_issuance_callback(
                &self.blockchain().get_owner_address(),
                dca_token,
                min_amount_per_swap,
                profit_fee_percentage,
                allowed_frequencies,
            )),
        );
    }

    /// Sets the DCA token.
    ///
    /// Only admins can call this endpoint.
    ///
    /// ### Arguments
    /// * `dca_token` - The token to be accumulated through DCA.
    #[endpoint(setToken)]
    fn set_dca_token(&self, dca_token: EgldOrEsdtTokenIdentifier) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_dca_token_set(&dca_token);
        self.dca_token().set(dca_token);
    }

    /// Sets the minimum amount per swap.
    ///
    /// Only admins can call this endpoint.
    ///
    /// ### Arguments
    /// * `min_amount_per_swap` - The minimum USDC amount per DCA swap.
    #[endpoint(setMinAmountPerSwap)]
    fn set_min_amount_per_swap(&self, min_amount_per_swap: BigUint) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_min_amount_per_swap_set(&min_amount_per_swap);
        self.min_amount_per_swap().set(min_amount_per_swap);
    }

    /// Adds new allowed DCA frequencies.
    ///
    /// Only admins can call this endpoint.
    ///
    /// ### Arguments
    /// * `frequencies` - A list of frequency-duration pairs to add.
    #[endpoint(addAllowedFrequencies)]
    fn add_allowed_frequencies(
        &self,
        frequencies: MultiValueEncoded<DcaFrequencyInMillis<Self::Api>>,
    ) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_allowed_frequencies_added(&frequencies);
        for freq in frequencies.into_iter() {
            let (frequency, duration_in_millis) = freq.into_tuple();
            self.allowed_frequencies()
                .insert(frequency, duration_in_millis);
        }
    }

    /// Removes allowed DCA frequencies.
    ///
    /// Only admins can call this endpoint.
    ///
    /// ### Arguments
    /// * `frequencies` - A list of frequencies to remove.
    #[endpoint(removeAllowedFrequencies)]
    fn remove_allowed_frequencies(&self, frequencies: MultiValueEncoded<DcaFrequency<Self::Api>>) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_allowed_frequencies_removed(&frequencies);
        for frequency in frequencies.into_iter() {
            self.allowed_frequencies().remove(&frequency);
        }
    }

    /// Sets the profit fee percentage.
    ///
    /// Only admins can call this endpoint.
    ///
    /// ### Arguments
    /// * `profit_fee_percentage` - The fee percentage taken from profits.
    #[endpoint(setProfitFeePercentage)]
    fn set_profit_fee_percentage(&self, profit_fee_percentage: u64) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_profit_fee_percentage_set(profit_fee_percentage);
        self.profit_fee_percentage().set(profit_fee_percentage);
    }

    /// Sets a custom slippage percentage for swaps.
    ///
    /// Only admins can call this endpoint.
    /// If not set, the default slippage will be used.
    ///
    /// ### Arguments
    /// * `custom_slippage_percentage` - The custom slippage percentage.
    #[endpoint(setCustomSlippagePercentage)]
    fn set_custom_slippage_percentage(&self, custom_slippage_percentage: u64) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_custom_slippage_percentage_set(custom_slippage_percentage);
        self.custom_slippage_percentage()
            .set(custom_slippage_percentage);
    }

    // === Views ===

    /// View to get the DCA setup parameters.
    ///
    /// Returns a `DcaSetup` multi-value containing:
    /// 1. The DCA token identifier.
    /// 1. The minimum amount per swap.
    /// 1. The strategy token identifier.
    /// 1. The profit fee percentage.
    /// 1. The final slippage percentage to be used in swaps (either custom or default).
    /// 1. The allowed frequencies as a multi-value encoded of `DcaFrequencyInMillis` (frequency string and duration in millis).
    #[view(getSetup)]
    fn get_setup(&self) -> DcaSetup<Self::Api> {
        let mut allowed_frequencies_vec: MultiValueEncoded<DcaFrequencyInMillis<Self::Api>> =
            MultiValueEncoded::new();
        for (frequency, durtation_in_millis) in self.allowed_frequencies().iter() {
            allowed_frequencies_vec.push(MultiValue2::from((frequency, durtation_in_millis)));
        }

        DcaSetup::from((
            self.dca_token().get(),
            self.min_amount_per_swap().get(),
            self.strategy_token().get_token_id(),
            self.profit_fee_percentage().get(),
            self.get_final_slippage_percentage(),
            self.is_paused().get(),
            self.admins().iter().collect(),
            allowed_frequencies_vec,
        ))
    }

    // === Private ===

    /// Validates that the initial setup has not been performed yet.
    fn require_not_setup_yet(&self) {
        require!(
            self.dca_token().is_empty()
                && self.min_amount_per_swap().is_empty()
                && self.allowed_frequencies().is_empty()
                && self.strategy_token().is_empty(),
            ERROR_STRATEGY_ALREADY_SET
        );
    }

    /// Validates that the initial setup is complete.
    fn require_setup_is_complete(&self) {
        require!(
            !self.dca_token().is_empty()
                && !self.min_amount_per_swap().is_empty()
                && !self.allowed_frequencies().is_empty()
                && !self.strategy_token().is_empty(),
            ERROR_STRATEGY_NOT_SET
        );
    }

    /// Gets the duration in milliseconds for a frequency and validates it is allowed.
    fn get_frequency_duration_and_require_valid(
        &self,
        frequency: &DcaFrequency<Self::Api>,
    ) -> DurationInMillis {
        require!(
            self.allowed_frequencies().contains_key(frequency),
            ERROR_INVALID_FREQUENCY
        );

        self.allowed_frequencies().get(frequency).unwrap()
    }

    /// Validates that the amount per swap is at least the minimum allowed.
    fn require_valid_amount_per_swap(&self, amount_per_swap: &BigUint) {
        require!(
            amount_per_swap >= &self.min_amount_per_swap().get(),
            ERROR_INVALID_AMOUNT_PER_SWAP
        );
    }

    /// Returns the slippage percentage to use (custom if set, otherwise default).
    fn get_final_slippage_percentage(&self) -> u64 {
        if self.custom_slippage_percentage().is_empty() {
            DEFAULT_SLIPPAGE
        } else {
            self.custom_slippage_percentage().get()
        }
    }

    // === Storage ===

    #[storage_mapper("dca_token")]
    fn dca_token(&self) -> SingleValueMapper<EgldOrEsdtTokenIdentifier>;

    #[storage_mapper("min_amount_per_swap")]
    fn min_amount_per_swap(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("allowed_frequencies")]
    fn allowed_frequencies(&self) -> MapMapper<DcaFrequency<Self::Api>, DurationInMillis>;

    #[storage_mapper("strategy_token")]
    fn strategy_token(&self) -> NonFungibleTokenMapper;

    #[storage_mapper("profit_fee_percentage")]
    fn profit_fee_percentage(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("custom_slippage_percentage")]
    fn custom_slippage_percentage(&self) -> SingleValueMapper<u64>;

    // === Events ===

    #[event("dcaTokenSet")]
    fn event_dca_token_set(&self, #[indexed] dca_token: &EgldOrEsdtTokenIdentifier);

    #[event("minAmountPerSwapSet")]
    fn event_min_amount_per_swap_set(&self, #[indexed] min_amount_per_swap: &BigUint);

    #[event("allowedFrequenciesAdded")]
    fn event_allowed_frequencies_added(
        &self,
        #[indexed] allowed_frequencies: &MultiValueEncoded<DcaFrequencyInMillis<Self::Api>>,
    );

    #[event("allowedFrequenciesRemoved")]
    fn event_allowed_frequencies_removed(
        &self,
        #[indexed] allowed_frequencies: &MultiValueEncoded<DcaFrequency<Self::Api>>,
    );

    #[event("strategyTokenCreated")]
    fn event_strategy_token_created(&self, #[indexed] strategy_token: &TokenIdentifier);

    #[event("profitFeePercentageSet")]
    fn event_profit_fee_percentage_set(&self, #[indexed] profit_fee_percentage: u64);

    #[event("customSlippagePercentageSet")]
    fn event_custom_slippage_percentage_set(&self, #[indexed] custom_slippage_percentage: u64);

    // === Callbacks ===

    #[callback]
    fn strategy_token_issuance_callback(
        &self,
        caller: &ManagedAddress,
        dca_token: EgldOrEsdtTokenIdentifier,
        min_amount_per_swap: BigUint,
        profit_fee_percentage: u64,
        allowed_frequencies: MultiValueEncoded<DcaFrequencyInMillis<Self::Api>>,
        #[call_result] result: ManagedAsyncCallResult<TokenIdentifier>,
    ) {
        match result {
            ManagedAsyncCallResult::Ok(strategy_token_identifier) => {
                self.event_dca_token_set(&dca_token);
                self.dca_token().set(dca_token);

                self.event_min_amount_per_swap_set(&min_amount_per_swap);
                self.min_amount_per_swap().set(min_amount_per_swap);

                self.event_profit_fee_percentage_set(profit_fee_percentage);
                self.profit_fee_percentage().set(profit_fee_percentage);

                for freq in allowed_frequencies.clone().into_iter() {
                    let (frequency, duration_in_millis) = freq.into_tuple();
                    self.allowed_frequencies()
                        .insert(frequency.clone(), duration_in_millis);
                }
                self.event_allowed_frequencies_added(&allowed_frequencies);

                self.event_strategy_token_created(&strategy_token_identifier);
                self.strategy_token()
                    .set_token_id(strategy_token_identifier);
            }
            ManagedAsyncCallResult::Err(_) => {
                let amount = self.call_value().egld();
                self.tx().to(caller).egld(&amount.clone_value()).transfer();

                self.strategy_token().clear();
            }
        }
    }
}
