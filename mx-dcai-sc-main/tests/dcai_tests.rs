//! Basic tests for DCAi Smart Contract
//!
//! Tests the main endpoints in the bot and strategy modules

use multiversx_sc_scenario::imports::*;
use structs::TokenWithdrawn;

#[allow(dead_code)]
#[allow(clippy::all)]
mod dcai_proxy {
    pub use multiversx_sc::proxy_imports::*;
    
    pub struct DcaiProxy;

    impl<Env, From, To, Gas> TxProxyTrait<Env, From, To, Gas> for DcaiProxy
    where
        Env: TxEnv,
        From: TxFrom<Env>,
        To: TxTo<Env>,
        Gas: TxGas<Env>,
    {
        type TxProxyMethods = DcaiProxyMethods<Env, From, To, Gas>;

        fn proxy_methods(self, tx: Tx<Env, From, To, (), Gas, (), ()>) -> Self::TxProxyMethods {
            DcaiProxyMethods { wrapped_tx: tx }
        }
    }

    pub struct DcaiProxyMethods<Env, From, To, Gas>
    where
        Env: TxEnv,
        From: TxFrom<Env>,
        To: TxTo<Env>,
        Gas: TxGas<Env>,
    {
        wrapped_tx: Tx<Env, From, To, (), Gas, (), ()>,
    }

    #[rustfmt::skip]
    impl<Env, From, Gas> DcaiProxyMethods<Env, From, (), Gas>
    where
        Env: TxEnv,
        Env::Api: VMApi,
        From: TxFrom<Env>,
        Gas: TxGas<Env>,
    {
        pub fn init(self) -> TxTypedDeploy<Env, From, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_deploy().original_result()
        }
    }

    #[rustfmt::skip]
    impl<Env, From, To, Gas> DcaiProxyMethods<Env, From, To, Gas>
    where
        Env: TxEnv,
        Env::Api: VMApi,
        From: TxFrom<Env>,
        To: TxTo<Env>,
        Gas: TxGas<Env>,
    {
        pub fn pause(self) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("pause").original_result()
        }

        pub fn unpause(self) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("unpause").original_result()
        }

        pub fn is_paused(self) -> TxTypedCall<Env, From, To, NotPayable, Gas, bool> {
            self.wrapped_tx.payment(NotPayable).raw_call("isPaused").original_result()
        }

        pub fn set_bot_address<Arg0: ProxyArg<ManagedAddress<Env::Api>>>(
            self, address: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("setBotAddress").argument(&address).original_result()
        }

        pub fn bot_address(self) -> TxTypedCall<Env, From, To, NotPayable, Gas, ManagedAddress<Env::Api>> {
            self.wrapped_tx.payment(NotPayable).raw_call("getBotAddress").original_result()
        }

        pub fn is_bot<Arg0: ProxyArg<ManagedAddress<Env::Api>>>(
            self, address: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, bool> {
            self.wrapped_tx.payment(NotPayable).raw_call("isBot").argument(&address).original_result()
        }

        pub fn buy<Arg0: ProxyArg<MultiValueEncoded<Env::Api, u64>>>(
            self, nonces: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("buy").argument(&nonces).original_result()
        }

        pub fn take_profit<Arg0: ProxyArg<MultiValueEncoded<Env::Api, u64>>>(
            self, nonces: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("takeProfit").argument(&nonces).original_result()
        }

        pub fn set_dca_token<Arg0: ProxyArg<EgldOrEsdtTokenIdentifier<Env::Api>>>(
            self, dca_token: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("setToken").argument(&dca_token).original_result()
        }

        pub fn set_min_amount_per_swap<Arg0: ProxyArg<BigUint<Env::Api>>>(
            self, min_amount_per_swap: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("setMinAmountPerSwap").argument(&min_amount_per_swap).original_result()
        }

        pub fn set_profit_fee_percentage<Arg0: ProxyArg<u64>>(
            self, profit_fee_percentage: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("setProfitFeePercentage").argument(&profit_fee_percentage).original_result()
        }

        pub fn set_custom_slippage_percentage<Arg0: ProxyArg<u64>>(
            self, custom_slippage_percentage: Arg0
        ) -> TxTypedCall<Env, From, To, NotPayable, Gas, ()> {
            self.wrapped_tx.payment(NotPayable).raw_call("setCustomSlippagePercentage").argument(&custom_slippage_percentage).original_result()
        }

        pub fn create_strategy<Arg0: ProxyArg<BigUint<Env::Api>>, Arg1: ProxyArg<ManagedBuffer<Env::Api>>, Arg2: ProxyArg<u64>>(
            self, amount_per_swap: Arg0, frequency: Arg1, take_profit_percentage: Arg2
        ) -> TxTypedCall<Env, From, To, (), Gas, ()> {
            self.wrapped_tx.raw_call("createStrategy").argument(&amount_per_swap).argument(&frequency).argument(&take_profit_percentage).original_result()
        }

        pub fn modify_strategy<Arg0: ProxyArg<BigUint<Env::Api>>, Arg1: ProxyArg<ManagedBuffer<Env::Api>>, Arg2: ProxyArg<u64>>(
            self, amount_per_swap: Arg0, frequency: Arg1, take_profit_percentage: Arg2
        ) -> TxTypedCall<Env, From, To, (), Gas, ()> {
            self.wrapped_tx.raw_call("modifyStrategy").argument(&amount_per_swap).argument(&frequency).argument(&take_profit_percentage).original_result()
        }

        pub fn delete_strategy(self) -> TxTypedCall<Env, From, To, (), Gas, ()> {
            self.wrapped_tx.raw_call("deleteStrategy").original_result()
        }

        pub fn deposit(self) -> TxTypedCall<Env, From, To, (), Gas, ()> {
            self.wrapped_tx.raw_call("deposit").original_result()
        }

        pub fn withdraw<Arg0: ProxyArg<BigUint<Env::Api>>, Arg1: ProxyArg<structs::TokenWithdrawn>>(
            self, amount: Arg0, token_withdrawn: Arg1
        ) -> TxTypedCall<Env, From, To, (), Gas, ()> {
            self.wrapped_tx.raw_call("withdraw").argument(&amount).argument(&token_withdrawn).original_result()
        }

        pub fn get_all_strategies(self) -> TxTypedCall<Env, From, To, NotPayable, Gas, MultiValueEncoded<Env::Api, MultiValue11<u64, BigUint<Env::Api>, ManagedBuffer<Env::Api>, u64, u64, BigUint<Env::Api>, BigUint<Env::Api>, u64, bool, ManagedVec<Env::Api, structs::Swap<Env::Api>>, ManagedVec<Env::Api, structs::Swap<Env::Api>>>>> {
            self.wrapped_tx.payment(NotPayable).raw_call("getAllStrategies").original_result()
        }

        pub fn get_all_strategies_only_nonces(self) -> TxTypedCall<Env, From, To, NotPayable, Gas, MultiValueEncoded<Env::Api, u64>> {
            self.wrapped_tx.payment(NotPayable).raw_call("getAllStrategiesOnlyNonces").original_result()
        }
    }
}

const DCAI_PATH: MxscPath = MxscPath::new("output/lib.mxsc.json");

const OWNER: TestAddress = TestAddress::new("owner");
const ADMIN: TestAddress = TestAddress::new("admin");
const BOT: TestAddress = TestAddress::new("bot");
const USER: TestAddress = TestAddress::new("user");
const DCAI_SC: TestSCAddress = TestSCAddress::new("dcai");

const USDC_ID: TestTokenIdentifier = TestTokenIdentifier::new("USDC-350c4e");
const WEGLD_ID: TestTokenIdentifier = TestTokenIdentifier::new("WEGLD-a28c59");

fn world() -> ScenarioWorld {
    let mut blockchain = ScenarioWorld::new();
    blockchain.register_contract(DCAI_PATH, lib::ContractBuilder);
    blockchain
}

fn setup() -> ScenarioWorld {
    let mut world = world();
    
    world.current_block().block_timestamp_seconds(1_000_000_000);

    world.account(OWNER).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(ADMIN).nonce(1).balance(10_000_000_000_000_000_000u128);
    world.account(BOT).nonce(1).balance(10_000_000_000_000_000_000u128);
    world.account(USER).nonce(1).balance(10_000_000_000_000_000_000u128)
        .esdt_balance(USDC_ID, 10_000_000_000u64);

    // Deploy contract
    world.tx()
        .from(OWNER)
        .typed(dcai_proxy::DcaiProxy)
        .init()
        .code(DCAI_PATH)
        .new_address(DCAI_SC)
        .run();

    world
}

// ============================================
// Bot Module Tests
// ============================================

#[test]
fn test_set_bot_address() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .run();

    world.query()
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .bot_address()
        .returns(ExpectValue(BOT.to_address()))
        .run();
}

#[test]
fn test_is_bot_returns_true_for_bot() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .run();

    world.query()
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .is_bot(BOT)
        .returns(ExpectValue(true))
        .run();
}

#[test]
fn test_is_bot_returns_true_for_admin() {
    let mut world = setup();

    // Set bot address first to initialize the storage
    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .run();

    // Owner is admin by default, so should be recognized as bot too
    world.query()
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .is_bot(OWNER)
        .returns(ExpectValue(true))
        .run();
}

#[test]
fn test_is_bot_returns_false_for_user() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .run();

    world.query()
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .is_bot(USER)
        .returns(ExpectValue(false))
        .run();
}

#[test]
fn test_set_bot_address_non_admin_fails() {
    let mut world = setup();

    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .with_result(ExpectError(4, "Only admin allowed"))
        .run();
}

#[test]
fn test_buy_non_bot_fails() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .run();

    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .buy(MultiValueVec::from(vec![1u64]))
        .with_result(ExpectError(4, "Only bot allowed"))
        .run();
}

#[test]
fn test_take_profit_non_bot_fails() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_bot_address(BOT)
        .run();

    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .take_profit(MultiValueVec::from(vec![1u64]))
        .with_result(ExpectError(4, "Only bot allowed"))
        .run();
}

// ============================================
// Strategy Module Tests
// ============================================

#[test]
fn test_create_strategy_requires_setup() {
    let mut world = setup();

    // Without setup complete, creating a strategy should fail
    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .create_strategy(BigUint::from(100_000_000u64), ManagedBuffer::from(b"daily"), 1000u64)
        .with_result(ExpectError(4, "DCA strategy not set"))
        .run();
}

#[test]
fn test_modify_strategy_requires_setup() {
    let mut world = setup();

    // Without setup complete, modifying a strategy should fail
    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .modify_strategy(BigUint::from(100_000_000u64), ManagedBuffer::from(b"daily"), 1000u64)
        .with_result(ExpectError(4, "DCA strategy not set"))
        .run();
}

#[test]
fn test_delete_strategy_requires_setup() {
    let mut world = setup();

    // Without setup complete, deleting a strategy should fail
    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .delete_strategy()
        .with_result(ExpectError(4, "DCA strategy not set"))
        .run();
}

#[test]
fn test_deposit_requires_setup() {
    let mut world = setup();

    // Without setup complete, depositing should fail
    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .deposit()
        .with_result(ExpectError(4, "DCA strategy not set"))
        .run();
}

#[test]
fn test_withdraw_requires_setup() {
    let mut world = setup();

    // Without setup complete, withdrawing should fail
    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .withdraw(BigUint::from(100_000_000u64), TokenWithdrawn::Usdc)
        .with_result(ExpectError(4, "DCA strategy not set"))
        .run();
}

// Note: get_all_strategies and get_all_strategies_only_nonces views 
// require the strategy token to be issued via the setup endpoint,
// which requires payment and callback processing not easily testable
// in basic unit tests.

// ============================================
// Setup Module Tests
// ============================================

#[test]
fn test_set_dca_token() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_dca_token(EgldOrEsdtTokenIdentifier::esdt(WEGLD_ID.to_token_identifier()))
        .run();
}

#[test]
fn test_set_min_amount_per_swap() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_min_amount_per_swap(BigUint::from(10_000_000u64))
        .run();
}

#[test]
fn test_set_profit_fee_percentage() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_profit_fee_percentage(1000u64)
        .run();
}

#[test]
fn test_set_custom_slippage_percentage() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .set_custom_slippage_percentage(100u64)
        .run();
}

// ============================================
// Pause Module Tests
// ============================================

#[test]
fn test_pause_and_unpause() {
    let mut world = setup();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .pause()
        .run();

    world.query()
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .is_paused()
        .returns(ExpectValue(true))
        .run();

    world.tx()
        .from(OWNER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .unpause()
        .run();

    world.query()
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .is_paused()
        .returns(ExpectValue(false))
        .run();
}

#[test]
fn test_pause_non_admin_fails() {
    let mut world = setup();

    world.tx()
        .from(USER)
        .to(DCAI_SC)
        .typed(dcai_proxy::DcaiProxy)
        .pause()
        .with_result(ExpectError(4, "Only admin allowed"))
        .run();
}
