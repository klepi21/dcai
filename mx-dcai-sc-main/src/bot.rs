use constants::MAX_PERCENTAGE;
use errors::ERROR_NOT_BOT;
use multiversx_sc::imports::*;
use structs::{StrategyTokenAttributes, Swap};

// pub type TestOutupt<M> = MultiValue4<BigUint<M>, BigUint<M>, bool, u64>;
/// Smart Contract module that offers bot management capabilities.
///
/// It provides:
/// * an endpoint where the owner can set the bot address
/// * a view to check if an address is the bot
/// * a method to require an address to be the bot
#[multiversx_sc::module]
pub trait BotModule:
    crate::pause::PauseModule
    + crate::setup::SetupModule
    + crate::admins::AdminsModule
    + crate::xexchange::wrapper_module::WrapperModule
    + crate::xexchange::pair_module::XExchangePairModule
    + crate::xexchange::router_module::XExchangeRouterModule
    + crate::strategy::StrategyModule
{
    // === Endpoints ===

    /// Sets the bot address that is authorized to execute DCA operations.
    ///
    /// Only admins can call this endpoint.
    ///
    /// ### Arguments
    /// * `address` - The address to set as the bot.
    #[endpoint(setBotAddress)]
    fn set_bot_address(&self, address: ManagedAddress) {
        self.require_is_admin(&self.blockchain().get_caller());
        self.event_bot_address_set(&address);
        self.bot_address().set(address);
    }

    /// Endpoint executed by the bot to perform buy operations for multiple DCA strategies.
    ///
    /// Parameters:
    /// - `nonces`: A list of nonces representing the DCA strategies to execute.
    ///
    /// The bot checks each strategy to see if it is eligible for execution based on the USDC balance,
    /// the last executed timestamp, and the defined frequency. If eligible, it aggregates the total amount to swap,
    /// performs the swap, and updates each strategy's attributes accordingly.
    ///
    /// It will skip strategies that do not meet the criteria and will return any
    /// dust amount to the caller. It will fail only if no strategies at all are eligible for execution.
    #[endpoint(buy)]
    fn buy(&self, nonces: MultiValueEncoded<u64>) {
        let caller = self.blockchain().get_caller();
        self.require_is_bot(&caller);

        let ts_millis = self
            .blockchain()
            .get_block_timestamp_millis()
            .as_u64_millis();

        let mut amount_to_swap: BigUint = BigUint::zero();
        let mut all_nonces: ManagedVec<u64> = ManagedVec::new();
        let mut all_attributes: ManagedVec<StrategyTokenAttributes<Self::Api>> = ManagedVec::new();
        for nonce in nonces.into_iter() {
            let attributes = self.get_strategy_token_attributes(nonce);

            if attributes.usdc_balance >= attributes.amount_per_swap
                && ts_millis >= attributes.last_executed_ts_millis + attributes.frequency_in_millis
                && &attributes.amount_per_swap * attributes.frequency_in_millis > 0
            {
                amount_to_swap += &attributes.amount_per_swap;
                all_attributes.push(attributes);
                all_nonces.push(nonce);
            }
        }

        require!(!all_nonces.is_empty(), "No valid strategies to execute");

        let token_out = self.get_dca_token_as_esdt();
        let amount_returned = self.execute_swap(
            self.get_usdc_identifier(),
            amount_to_swap.clone(),
            token_out.clone(),
            self.get_final_slippage_percentage(),
        );

        let dca_token = self.dca_token().get();
        if token_out == self.get_wegld_identifier() && dca_token.is_egld() {
            self.unwrap_egld(&amount_returned);
        }

        let mut total_exact_amount_received = BigUint::zero();

        for (nonce, mut attributes) in all_nonces.into_iter().zip(all_attributes.into_iter()) {
            let proportion = attributes
                .amount_per_swap
                .clone()
                .mul(MAX_PERCENTAGE)
                .div(&amount_to_swap);

            let amount_received = amount_returned.clone().mul(&proportion).div(MAX_PERCENTAGE);
            total_exact_amount_received += &amount_received;

            attributes.usdc_balance -= &attributes.amount_per_swap;
            attributes.dca_token_balance += &amount_received;
            attributes.last_executed_ts_millis = ts_millis;
            attributes.buys.push(Swap {
                usdc_amount: attributes.amount_per_swap.clone(),
                dca_token_amount: amount_received.clone(),
                timestamp_millis: ts_millis,
            });
            let updated_attributes_buffer = self.attributes_to_buffer(
                attributes.amount_per_swap.clone(),
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
                .nft_update_attributes(nonce, &updated_attributes_buffer);

            self.event_buy_executed(nonce, &attributes.amount_per_swap, &amount_received);
        }

        if amount_returned > total_exact_amount_received {
            let dust_amount = amount_returned - total_exact_amount_received;
            self.tx()
                .to(&caller)
                .egld_or_single_esdt(&dca_token, 0, &dust_amount)
                .transfer();
        }
    }

    /// Endpoint executed by the bot to perform take profit operations for multiple DCA strategies.
    ///
    /// Parameters:
    /// - `nonces`: A list of nonces representing the DCA strategies to evaluate for take profit.
    ///
    /// The bot checks each strategy to see if the take profit condition is met based on the
    /// DCA token balance and the defined take profit percentage. If the condition is met,
    /// it aggregates the total amount to swap, performs the swap, deducts any applicable profit
    /// fees, and updates each strategy's attributes accordingly.
    ///
    /// It will skip strategies that do not meet the take profit condition and will return any
    /// dust amount to the caller. It will fail only if no strategies at all are eligible for take profit.
    #[endpoint(takeProfit)]
    fn take_profit(&self, nonces: MultiValueEncoded<u64>) {
        let caller = self.blockchain().get_caller();
        self.require_is_bot(&caller);

        let ts_millis = self
            .blockchain()
            .get_block_timestamp_millis()
            .as_u64_millis();

        let dca_token_as_esdt = self.get_dca_token_as_esdt();

        let mut amount_to_swap: BigUint = BigUint::zero();
        let mut all_nonces: ManagedVec<u64> = ManagedVec::new();
        let mut all_attributes: ManagedVec<StrategyTokenAttributes<Self::Api>> = ManagedVec::new();
        for nonce in nonces.into_iter() {
            let attributes = self.get_strategy_token_attributes(nonce);
            let dca_token_usdc_equivalent = self
                .get_dca_token_usdc_equivalent(&dca_token_as_esdt, &attributes.dca_token_balance);

            if attributes.dca_token_balance > 0
                && &attributes.amount_per_swap * attributes.frequency_in_millis > 0
                && self.is_in_profit(
                    &dca_token_usdc_equivalent,
                    attributes.take_profit_percentage,
                    &attributes.buys,
                    &attributes.sells,
                )
            {
                amount_to_swap += &attributes.dca_token_balance;
                all_attributes.push(attributes);
                all_nonces.push(nonce);
            }
        }

        require!(!all_nonces.is_empty(), "No valid strategies to execute");

        if dca_token_as_esdt == self.get_wegld_identifier() && self.dca_token().get().is_egld() {
            self.wrap_egld(&amount_to_swap);
        }

        let amount_returned = self.execute_swap(
            dca_token_as_esdt.clone(),
            amount_to_swap.clone(),
            self.get_usdc_identifier(),
            self.get_final_slippage_percentage(),
        );

        let profit_fee_percentage = self.profit_fee_percentage().get();
        let mut total_fee = BigUint::zero();
        let mut total_exact_amount_received = BigUint::zero();

        for (nonce, mut attributes) in all_nonces.into_iter().zip(all_attributes.into_iter()) {
            let proportion = attributes
                .dca_token_balance
                .clone()
                .mul(MAX_PERCENTAGE)
                .div(&amount_to_swap);

            let mut amount_received = amount_returned
                .clone()
                .mul(&proportion)
                .div(&BigUint::from(MAX_PERCENTAGE));
            total_exact_amount_received += &amount_received;

            let fee = self
                .calculate_profit(&amount_received, &attributes.buys, &attributes.sells)
                .mul(profit_fee_percentage)
                .div(BigUint::from(MAX_PERCENTAGE));

            amount_received -= &fee;
            total_fee += fee;
            total_exact_amount_received += &amount_received;

            attributes.usdc_balance += &amount_received;
            attributes.last_executed_ts_millis = ts_millis;
            attributes.sells.push(Swap {
                usdc_amount: amount_received.clone(),
                dca_token_amount: attributes.dca_token_balance.clone(),
                timestamp_millis: ts_millis,
            });
            attributes.dca_token_balance = BigUint::zero();

            let updated_attributes_buffer = self.attributes_to_buffer(
                attributes.amount_per_swap.clone(),
                attributes.dca_frequency,
                attributes.frequency_in_millis,
                attributes.take_profit_percentage,
                attributes.usdc_balance,
                attributes.dca_token_balance.clone(),
                attributes.last_executed_ts_millis,
                attributes.buys,
                attributes.sells,
            );

            self.strategy_token()
                .nft_update_attributes(nonce, &updated_attributes_buffer);

            self.event_sell_executed(nonce, &attributes.dca_token_balance, &amount_received);
        }

        if total_fee > 0 {
            self.tx()
                .to(&caller)
                .single_esdt(&self.get_usdc_identifier(), 0, &total_fee)
                .transfer();
        };

        if amount_returned > total_exact_amount_received {
            let dust_amount = amount_returned - total_exact_amount_received;
            self.tx()
                .to(&caller)
                .single_esdt(&self.get_usdc_identifier(), 0, &dust_amount)
                .transfer();
        }
    }

    // === Views ===

    /// Returns true if the given address can execute bot operations.
    ///
    /// This includes the bot address and any admin addresses (as a fallback mechanism).
    #[view(isBot)]
    fn is_bot(&self, address: &ManagedAddress) -> bool {
        &self.bot_address().get() == address || self.admins().contains(address)
    }

    // #[view(getStrategyTokenTakeProfitInfo)]
    // fn get_strategy_token_take_profit_info(&self, nonce: u64) -> TestOutupt<Self::Api> {
    //     let attributes = self.get_strategy_token_attributes(nonce);
    //     let dca_token_as_esdt = self.get_dca_token_as_esdt();
    //     let dca_token_equivalent =
    //         self.get_dca_token_usdc_equivalent(&dca_token_as_esdt, &attributes.dca_token_balance);

    //     let is_met = self.is_take_profit_condition_met(
    //         &dca_token_equivalent,
    //         attributes.take_profit_percentage,
    //         &attributes.buys,
    //         &attributes.sells,
    //     );

    //     TestOutupt::from((
    //         attributes.dca_token_balance,
    //         dca_token_equivalent,
    //         is_met,
    //         attributes.take_profit_percentage,
    //     ))
    // }

    // === Private ===

    /// Calculates the profit from a take profit operation.
    ///
    /// The profit is calculated as the difference between the amount received
    /// and the total buys made since the last sell operation.
    ///
    /// ### Arguments
    /// * `amount_received` - The amount received from the sell.
    /// * `buys` - The list of buy operations.
    /// * `sells` - The list of sell operations.
    ///
    /// ### Returns
    /// The calculated profit amount.
    fn calculate_profit(
        &self,
        amount_received: &BigUint,
        buys: &ManagedVec<Swap<Self::Api>>,
        sells: &ManagedVec<Swap<Self::Api>>,
    ) -> BigUint {
        let last_sell_ts_millis = sells
            .iter()
            .next_back()
            .unwrap_or(Swap::default().as_ref())
            .timestamp_millis;

        let total_buys_after_last_sell = buys
            .iter()
            .filter(|swap| swap.timestamp_millis > last_sell_ts_millis)
            .fold(BigUint::zero(), |acc, swap| acc + &swap.usdc_amount);

        if amount_received > &total_buys_after_last_sell {
            amount_received - &total_buys_after_last_sell
        } else {
            BigUint::zero()
        }
    }

    /// Requires the given address to be the bot or an admin, otherwise fails.
    fn require_is_bot(&self, address: &ManagedAddress) {
        require!(&self.is_bot(address), ERROR_NOT_BOT);
    }

    // === Storage ===

    /// Storage mapper for the bot address.
    #[view(getBotAddress)]
    #[storage_mapper("bot_address")]
    fn bot_address(&self) -> SingleValueMapper<ManagedAddress>;

    // === Events ===

    #[event("botAddressSet")]
    fn event_bot_address_set(&self, #[indexed] bot: &ManagedAddress);

    #[event("buyExecuted")]
    fn event_buy_executed(
        &self,
        #[indexed] nonce: u64,
        #[indexed] usdc_amount: &BigUint,
        #[indexed] dca_token_amount: &BigUint,
    );

    #[event("sellExecuted")]
    fn event_sell_executed(
        &self,
        #[indexed] nonce: u64,
        #[indexed] dca_token_amount: &BigUint,
        #[indexed] usdc_amount: &BigUint,
    );
}
