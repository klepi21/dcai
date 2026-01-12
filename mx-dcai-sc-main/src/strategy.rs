use constants::*;
use errors::*;
use multiversx_sc::imports::*;
use structs::*;

/// Smart Contract module that offers DCA strategy management capabilities.
///
/// It provides:
/// * an endpoint where users can create a DCA strategy by minting a strategy token NFT
/// * an endpoint where users can modify their existing DCA strategy
/// * an endpoint where users can delete their DCA strategy and withdraw remaining balances
/// * an endpoint where users can deposit USDC into their DCA strategy
/// * an endpoint where users can withdraw USDC or DCA tokens from their DCA strategy
/// * views to get strategy token attributes and account strategies
#[multiversx_sc::module]
pub trait StrategyModule:
    crate::pause::PauseModule
    + crate::setup::SetupModule
    + crate::admins::AdminsModule
    + crate::xexchange::wrapper_module::WrapperModule
    + crate::xexchange::pair_module::XExchangePairModule
    + crate::xexchange::router_module::XExchangeRouterModule
{
    // === Endpoints ===

    // #[only_owner]
    // #[payable]
    // #[endpoint(burn)]
    // fn burn(&self, nonce: u64) {
    //     self.strategy_token().nft_burn(nonce, &BigUint::from(2u8));
    // }

    // #[only_owner]
    // #[endpoint(withdrawBalance)]
    // fn withdraw_balance(&self, token: EgldOrEsdtTokenIdentifier, amount: BigUint) {
    //     self.tx()
    //         .to(&self.blockchain().get_owner_address())
    //         .egld_or_single_esdt(&token, 0, &amount)
    //         .transfer();
    // }

    /// Endpoint to create a new DCA strategy.
    ///
    /// ### Arguments
    /// * `amount_per_swap` - The amount of USDC to be swapped in each DCA operation.
    /// * `frequency` - The frequency at which DCA operations are executed (e.g., daily, weekly).
    /// * `take_profit_percentage` - The percentage at which to take profit from DCA operations.
    #[payable]
    #[endpoint(createStrategy)]
    fn create_strategy(
        &self,
        amount_per_swap: BigUint,
        frequency: DcaFrequency<Self::Api>,
        take_profit_percentage: Percentage,
    ) {
        self.require_setup_is_complete();
        self.require_not_paused();

        self.require_valid_amount_per_swap(&amount_per_swap);
        let frequency_in_millis = self.get_frequency_duration_and_require_valid(&frequency);

        let created_nft = self.strategy_token().nft_create(
            BigUint::from(2u8),
            &self.attributes_to_buffer(
                amount_per_swap.clone(),
                frequency.clone(),
                frequency_in_millis,
                take_profit_percentage,
                BigUint::from(0u8),
                BigUint::from(0u8),
                0u64,
                ManagedVec::new(),
                ManagedVec::new(),
            ),
        );

        let caller = self.blockchain().get_caller();
        self.tx()
            .to(&caller)
            .single_esdt(
                &created_nft.token_identifier,
                created_nft.token_nonce,
                &BigUint::from(1u8),
            )
            .transfer();

        self.event_strategy_created(
            &caller,
            &created_nft.token_nonce,
            &amount_per_swap,
            &frequency,
            &take_profit_percentage,
        );
    }

    /// Endpoint to modify an existing DCA strategy.
    /// The endpoint is payable and requires the transfer of the strategy token NFT to identify the strategy.
    ///
    /// ### Arguments
    /// * `amount_per_swap` - The new amount of USDC to be swapped in each DCA operation.
    /// * `frequency` - The new frequency at which DCA operations are executed (e.g., daily, weekly).
    /// * `take_profit_percentage` - The new percentage at which to take profit from DCA operations.
    #[payable]
    #[endpoint(modifyStrategy)]
    fn modify_strategy(
        &self,
        amount_per_swap: BigUint,
        frequency: DcaFrequency<Self::Api>,
        take_profit_percentage: Percentage,
    ) {
        self.require_setup_is_complete();
        self.require_not_paused();

        self.require_valid_amount_per_swap(&amount_per_swap);
        let frequency_in_millis = self.get_frequency_duration_and_require_valid(&frequency);

        let strategy_payment = self.call_value().single_esdt();
        self.require_valid_strategy_payment(&strategy_payment);

        let mut attributes = self.get_strategy_token_attributes(strategy_payment.token_nonce);
        attributes.amount_per_swap = amount_per_swap.clone();
        attributes.dca_frequency = frequency.clone();
        attributes.frequency_in_millis = frequency_in_millis;
        attributes.take_profit_percentage = take_profit_percentage;

        let updated_attributes_buffer = self.attributes_to_buffer(
            attributes.amount_per_swap,
            attributes.dca_frequency,
            attributes.frequency_in_millis,
            attributes.take_profit_percentage,
            attributes.usdc_balance,
            attributes.dca_token_balance,
            attributes.last_executed_ts_millis,
            attributes.buys,
            attributes.sells,
        );

        self.strategy_token()
            .nft_update_attributes(strategy_payment.token_nonce, &updated_attributes_buffer);

        let caller = self.blockchain().get_caller();
        self.tx()
            .to(&caller)
            .payment(strategy_payment.clone())
            .transfer();

        self.event_strategy_modified(
            &caller,
            &strategy_payment.token_nonce,
            &amount_per_swap,
            &frequency,
            &take_profit_percentage,
        );
    }

    /// Endpoint to delete a DCA strategy.
    /// The endpoint is payable and requires the transfer of the strategy token NFT to identify the strategy.
    #[payable]
    #[endpoint(deleteStrategy)]
    fn delete_strategy(&self) {
        self.require_setup_is_complete();
        self.require_not_paused();

        let strategy_payment = self.call_value().single_esdt();
        self.require_valid_strategy_payment(&strategy_payment);

        let attributes = self.get_strategy_token_attributes(strategy_payment.token_nonce);

        let caller = self.blockchain().get_caller();
        if attributes.usdc_balance > 0 {
            self.tx()
                .to(&caller)
                .single_esdt(&self.get_usdc_identifier(), 0, &attributes.usdc_balance)
                .transfer();
        }
        if attributes.dca_token_balance > 0 {
            self.tx()
                .to(&caller)
                .egld_or_single_esdt(&self.dca_token().get(), 0, &attributes.dca_token_balance)
                .transfer();
        }
        self.strategy_token()
            .nft_burn(strategy_payment.token_nonce, &BigUint::from(2u8));

        self.event_strategy_deleted(
            &caller,
            &strategy_payment.token_nonce,
            &attributes.usdc_balance,
            &attributes.dca_token_balance,
        );
    }

    /// Endpoint to deposit USDC into a strategy.
    /// The endpoint is payable and requires the transfer of the strategy token NFT to identify the strategy.
    #[payable]
    #[endpoint(deposit)]
    fn deposit(&self) {
        self.require_setup_is_complete();
        self.require_not_paused();

        let [payment_a, payment_b] = self.call_value().multi_esdt();
        let (usdc_payment, strategy_payment) =
            if payment_a.token_identifier == self.get_usdc_identifier() {
                (payment_a, payment_b)
            } else {
                (payment_b, payment_a)
            };

        self.require_valid_strategy_payment(&strategy_payment);
        self.require_valid_usdc_payment(&usdc_payment);

        let mut attributes = self.get_strategy_token_attributes(strategy_payment.token_nonce);
        attributes.usdc_balance += &usdc_payment.amount;
        let updated_attributes_buffer = self.attributes_to_buffer(
            attributes.amount_per_swap,
            attributes.dca_frequency,
            attributes.frequency_in_millis,
            attributes.take_profit_percentage,
            attributes.usdc_balance,
            attributes.dca_token_balance,
            attributes.last_executed_ts_millis,
            attributes.buys,
            attributes.sells,
        );

        self.strategy_token()
            .nft_update_attributes(strategy_payment.token_nonce, &updated_attributes_buffer);

        let caller = self.blockchain().get_caller();
        self.tx()
            .to(&caller)
            .payment(strategy_payment.clone())
            .transfer();

        self.event_deposit_made(&caller, &strategy_payment.token_nonce, &usdc_payment.amount);
    }

    /// Endpoint to withdraw USDC or DCA tokens from a strategy.
    /// The endpoint is payable and requires the transfer of the strategy token NFT to identify the strategy.
    ///
    /// ### Arguments
    /// * `amount` - The amount to withdraw.
    /// * `token_withdrawn` - An enum indicating whether to withdraw USDC or DCA tokens (1 for USDC, 2 for DCA token).
    #[payable]
    #[endpoint(withdraw)]
    fn withdraw(&self, amount: BigUint, token_withdrawn: TokenWithdrawn) {
        self.require_setup_is_complete();
        self.require_not_paused();

        let strategy_payment = self.call_value().single_esdt();
        self.require_valid_strategy_payment(&strategy_payment);

        let mut attributes = self.get_strategy_token_attributes(strategy_payment.token_nonce);
        let token_withdrawn = match token_withdrawn {
            TokenWithdrawn::Usdc => {
                require!(
                    attributes.usdc_balance >= amount && amount > 0,
                    ERROR_INVALID_USDC_AMOUNT
                );
                attributes.usdc_balance -= &amount;
                EgldOrEsdtTokenIdentifier::esdt(self.get_usdc_identifier())
            }
            TokenWithdrawn::DcaToken => {
                require!(
                    attributes.dca_token_balance >= amount && amount > 0,
                    ERROR_INVALID_DCA_TOKEN_AMOUNT
                );
                attributes.dca_token_balance -= &amount;
                self.dca_token().get()
            }
        };

        let updated_attributes_buffer = self.attributes_to_buffer(
            attributes.amount_per_swap,
            attributes.dca_frequency,
            attributes.frequency_in_millis,
            attributes.take_profit_percentage,
            attributes.usdc_balance,
            attributes.dca_token_balance,
            attributes.last_executed_ts_millis,
            attributes.buys,
            attributes.sells,
        );

        self.strategy_token()
            .nft_update_attributes(strategy_payment.token_nonce, &updated_attributes_buffer);

        let caller = self.blockchain().get_caller();
        self.tx()
            .to(&caller)
            .egld_or_single_esdt(&token_withdrawn, 0, &amount)
            .transfer();
        self.tx()
            .to(&caller)
            .payment(strategy_payment.clone())
            .transfer();

        self.event_withdrawal_made(
            &caller,
            &strategy_payment.token_nonce,
            &token_withdrawn,
            &amount,
        );
    }

    // === Views ===

    /// View to get the strategy token attributes for a given nonce
    ///
    /// ### Arguments
    /// * `nonce` - The nonce of the strategy token NFT
    ///
    /// ### Returns
    /// A `StrategyTokenAttributesAsType` containing the attributes of the strategy token:
    /// - `nonce`: The nonce of the strategy token NFT.
    /// - `amount_per_swap`: The amount of USDC to be swapped in each DCA operation.
    /// - `dca_frequency`: The frequency at which DCA operations are executed (e.g., daily, weekly).
    /// - `frequency_in_millis`: The frequency in milliseconds for precise timing.
    /// - `take_profit_percentage`: The percentage at which to take profit from DCA operations.
    /// - `usdc_balance`: The current USDC balance allocated for DCA operations.
    /// - `dca_token_balance`: The current balance of the token being acquired through DCA.
    /// - `last_executed_ts_millis`: The timestamp in milliseconds of the last executed DCA operation.
    /// - `take_profit_condition_met`: A boolean indicating whether the take profit condition is currently met (if applicable).
    /// - `buys`: A list of executed buy operations, each represented by a `Swap` struct (including usdc amount, dca token amount, and timestamp).
    /// - `sells`: A list of executed sell operations, each represented by a `Swap` struct (including usdc amount, dca token amount, and timestamp).
    #[view(getStrategyTokenAttributes)]
    fn get_strategy_token_attributes_view(
        &self,
        nonce: u64,
    ) -> StrategyTokenAttributesAsType<Self::Api> {
        let attributes = self.get_strategy_token_attributes(nonce);

        let take_profit_condition_met = if attributes.take_profit_percentage > 0 {
            let dca_token_as_esdt = self.get_dca_token_as_esdt();
            let dca_token_usdc_equivalent = self
                .get_dca_token_usdc_equivalent(&dca_token_as_esdt, &attributes.dca_token_balance);

            self.is_in_profit(
                &dca_token_usdc_equivalent,
                attributes.take_profit_percentage,
                &attributes.buys,
                &attributes.sells,
            )
        } else {
            false
        };

        StrategyTokenAttributesAsType::from((
            nonce,
            attributes.amount_per_swap,
            attributes.dca_frequency,
            attributes.frequency_in_millis,
            attributes.take_profit_percentage,
            attributes.usdc_balance,
            attributes.dca_token_balance,
            attributes.last_executed_ts_millis,
            take_profit_condition_met,
            attributes.buys,
            attributes.sells,
        ))
    }

    /// View to get all strategies held by the smart contract.
    ///
    /// It iterates through all minted strategy token NFTs and collects the attributes of those
    /// that have a balance greater than zero.
    ///
    /// ### Returns
    /// A `MultiValueEncoded` containing `StrategyTokenAttributesAsType` for each strategy.
    ///
    /// Each `StrategyTokenAttributesAsType` includes:
    /// - `nonce`: The nonce of the strategy token NFT.
    /// - `amount_per_swap`: The amount of USDC to be swapped in each DCA operation.
    /// - `dca_frequency`: The frequency at which DCA operations are executed.
    /// - `frequency_in_millis`: The frequency in milliseconds for precise timing.
    /// - `take_profit_percentage`: The percentage at which to take profit from DCA operations.
    /// - `usdc_balance`: The current USDC balance allocated for DCA operations.
    /// - `dca_token_balance`: The current balance of the token being acquired through DCA.
    /// - `last_executed_ts_millis`: The timestamp in milliseconds of the last executed buy or take profit operation.
    /// - `take_profit_condition_met`: A boolean indicating whether the take profit condition is currently met (if applicable).
    /// - `buys`: A list of executed buy operations, each represented by a `Swap` struct.
    /// - `sells`: A list of executed sell operations, each represented by a `Swap` struct.
    #[view(getAllStrategies)]
    fn get_all_strategies(&self) -> MultiValueEncoded<StrategyTokenAttributesAsType<Self::Api>> {
        let mut account_strategies: MultiValueEncoded<StrategyTokenAttributesAsType<Self::Api>> =
            MultiValueEncoded::new();

        let sc = self.blockchain().get_sc_address();
        let strategy_token = self.strategy_token().get_token_id();
        let current_nonce = self
            .blockchain()
            .get_current_esdt_nft_nonce(&sc, &strategy_token);

        for nonce in 1..=current_nonce {
            let token_balance = self
                .blockchain()
                .get_esdt_balance(&sc, &strategy_token, nonce);

            if token_balance > BigUint::zero() {
                account_strategies.push(self.get_strategy_token_attributes_view(nonce));
            }
        }

        account_strategies
    }

    /// View to get all strategy nonces held by the smart contract.
    ///
    /// It iterates through all minted strategy token NFTs and collects the nonces of those
    /// that have a balance greater than zero.
    ///
    /// ### Returns
    /// A `MultiValueEncoded` containing the nonces of each strategy.
    #[view(getAllStrategiesOnlyNonces)]
    fn get_all_strategies_only_nonces(&self) -> MultiValueEncoded<Nonce> {
        let mut account_strategies: MultiValueEncoded<Nonce> = MultiValueEncoded::new();

        let sc = self.blockchain().get_sc_address();
        let strategy_token = self.strategy_token().get_token_id();
        let current_nonce = self
            .blockchain()
            .get_current_esdt_nft_nonce(&sc, &strategy_token);

        for nonce in 1..=current_nonce {
            let token_balance = self
                .blockchain()
                .get_esdt_balance(&sc, &strategy_token, nonce);

            if token_balance > BigUint::zero() {
                account_strategies.push(nonce);
            }
        }

        account_strategies
    }

    // === Private ===

    fn get_dca_token_as_esdt(&self) -> TokenIdentifier {
        if self.dca_token().get().is_egld() {
            self.get_wegld_identifier()
        } else {
            self.dca_token().get().unwrap_esdt()
        }
    }

    fn get_strategy_token_attributes(&self, nonce: u64) -> StrategyTokenAttributes<Self::Api> {
        if self.strategy_token().get_balance(nonce) >= BigUint::from(1u8) {
            self.strategy_token().get_token_attributes(nonce)
        } else {
            StrategyTokenAttributes::default()
        }
    }

    fn attributes_to_buffer(
        &self,
        amount_per_swap: Amount<Self::Api>,
        dca_frequency: DcaFrequency<Self::Api>,
        frequency_in_millis: DurationInMillis,
        take_profit_percentage: Percentage,
        usdc_balance: Amount<Self::Api>,
        dca_token_balance: Amount<Self::Api>,
        last_executed_ts_millis: TimestampInMillis,
        buys: ManagedVec<Swap<Self::Api>>,
        sells: ManagedVec<Swap<Self::Api>>,
    ) -> ManagedBuffer {
        let strategy_token_attributes = StrategyTokenAttributes::new(
            amount_per_swap,
            dca_frequency,
            frequency_in_millis,
            take_profit_percentage,
            usdc_balance,
            dca_token_balance,
            last_executed_ts_millis,
            buys,
            sells,
        );

        let mut attributes = ManagedBuffer::new();
        let _ = strategy_token_attributes.top_encode(&mut attributes);
        attributes
    }

    fn require_valid_strategy_payment(&self, payment: &EsdtTokenPayment) {
        require!(
            payment.token_identifier == self.strategy_token().get_token_id(),
            ERROR_INVALID_STRATEGY_TOKEN
        );

        let token_balance = self.blockchain().get_esdt_balance(
            &self.blockchain().get_sc_address(),
            &payment.token_identifier,
            payment.token_nonce,
        );

        require!(
            payment.amount == BigUint::from(1u8) && token_balance == BigUint::from(2u8),
            ERROR_INSUFFICIENT_STRATEGY_TOKEN_BALANCE
        );
    }

    fn require_valid_usdc_payment(&self, payment: &EsdtTokenPayment) {
        require!(
            payment.token_identifier == self.get_usdc_identifier(),
            ERROR_INVALID_USDC_TOKEN
        );
        require!(payment.amount > BigUint::zero(), ERROR_INVALID_USDC_AMOUNT);
    }

    fn get_dca_token_usdc_equivalent(
        &self,
        dca_token_as_esdt: &TokenIdentifier,
        dca_token_amount: &BigUint,
    ) -> BigUint {
        if dca_token_amount == &BigUint::zero() {
            return BigUint::zero();
        }

        let swap_contracts =
            self.get_swap_contracts(dca_token_as_esdt.clone(), self.get_usdc_identifier());

        if swap_contracts.is_empty() {
            return BigUint::zero();
        }

        let mut equivalent = dca_token_amount.clone();
        for contract_data in swap_contracts.into_iter() {
            equivalent = self.get_amount_out(
                contract_data.address.clone(),
                contract_data.first_token_id,
                equivalent,
            );
        }

        equivalent
    }

    fn is_in_profit(
        &self,
        dca_token_usdc_equivalent: &BigUint,
        take_profit_percentage: u64,
        buys: &ManagedVec<Swap<Self::Api>>,
        sells: &ManagedVec<Swap<Self::Api>>,
    ) -> bool {
        let last_sell_ts_millis = sells
            .iter()
            .next_back()
            .unwrap_or(Swap::default().as_ref())
            .timestamp_millis;

        let total_buys_after_last_sell = buys
            .iter()
            .filter(|swap| swap.timestamp_millis > last_sell_ts_millis)
            .fold(BigUint::zero(), |acc, swap| acc + &swap.usdc_amount);

        if total_buys_after_last_sell == BigUint::zero() {
            return false;
        }

        let target_amount = total_buys_after_last_sell
            .mul(BigUint::from(MAX_PERCENTAGE + take_profit_percentage))
            .div(BigUint::from(MAX_PERCENTAGE));

        dca_token_usdc_equivalent >= &target_amount
    }

    // === Events ===

    #[event("strategyCreated")]
    fn event_strategy_created(
        &self,
        #[indexed] creator: &ManagedAddress,
        #[indexed] nonce: &u64,
        #[indexed] amount_per_swap: &BigUint,
        #[indexed] frequency: &DcaFrequency<Self::Api>,
        #[indexed] take_profit_percentage: &Percentage,
    );

    #[event("strategyModified")]
    fn event_strategy_modified(
        &self,
        #[indexed] modifier: &ManagedAddress,
        #[indexed] nonce: &u64,
        #[indexed] amount_per_swap: &BigUint,
        #[indexed] frequency: &DcaFrequency<Self::Api>,
        #[indexed] take_profit_percentage: &Percentage,
    );

    #[event("strategyDeleted")]
    fn event_strategy_deleted(
        &self,
        #[indexed] deleter: &ManagedAddress,
        #[indexed] nonce: &u64,
        #[indexed] usdc_amount: &BigUint,
        #[indexed] token_amount: &BigUint,
    );

    #[event("depositMade")]
    fn event_deposit_made(
        &self,
        #[indexed] depositor: &ManagedAddress,
        #[indexed] nonce: &u64,
        #[indexed] usdc_amount: &BigUint,
    );

    #[event("withdrawalMade")]
    fn event_withdrawal_made(
        &self,
        #[indexed] withdrawer: &ManagedAddress,
        #[indexed] nonce: &u64,
        #[indexed] token: &EgldOrEsdtTokenIdentifier,
        #[indexed] amount: &BigUint,
    );
}
