#![no_std]

use multiversx_sc::{derive_imports::*, imports::*};

pub type Nonce = u64;
pub type Percentage = u64;
pub type Amount<M> = BigUint<M>;
pub type Timestamp = u64;
pub type TimestampInMillis = u64;
pub type DcaFrequency<M> = ManagedBuffer<M>;
pub type DurationInMillis = u64;
pub type DcaFrequencyInMillis<M> = MultiValue2<DcaFrequency<M>, DurationInMillis>;
pub type DcaToken<M> = EgldOrEsdtTokenIdentifier<M>;
pub type AmountPerSwap<M> = BigUint<M>;
pub type MinAmountPerSwap<M> = BigUint<M>;
pub type StrategyToken<M> = TokenIdentifier<M>;
pub type DcaSetup<M> = MultiValue8<
    DcaToken<M>,
    MinAmountPerSwap<M>,
    StrategyToken<M>,
    Percentage,
    Percentage,
    bool,
    MultiValueEncoded<M, ManagedAddress<M>>,
    MultiValueEncoded<M, DcaFrequencyInMillis<M>>,
>;

/// Token types that can be withdrawn
#[type_abi]
#[derive(
    TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Clone, Eq, Debug, ManagedVecItem,
)]
pub enum TokenWithdrawn {
    Usdc = 1,
    DcaToken = 2,
}

#[type_abi]
#[derive(
    TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Clone, Eq, Debug, ManagedVecItem,
)]
pub struct Swap<M: ManagedTypeApi> {
    pub usdc_amount: Amount<M>,
    pub dca_token_amount: Amount<M>,
    pub timestamp_millis: TimestampInMillis,
}
impl<M: ManagedTypeApi> Default for Swap<M> {
    fn default() -> Self {
        Self {
            usdc_amount: BigUint::zero(),
            dca_token_amount: BigUint::zero(),
            timestamp_millis: 0,
        }
    }
}
impl<M: ManagedTypeApi> Swap<M> {
    pub fn new(
        usdc_amount: Amount<M>,
        dca_token_amount: Amount<M>,
        timestamp_millis: TimestampInMillis,
    ) -> Self {
        Self {
            usdc_amount,
            dca_token_amount,
            timestamp_millis,
        }
    }
}
impl<M: ManagedTypeApi> Swap<M> {
    pub fn as_ref<'a>(self) -> Ref<'a, Self> {
        unsafe { Ref::new(self) }
    }
}

#[type_abi]
#[derive(
    TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Clone, Eq, Debug, ManagedVecItem,
)]
pub struct StrategyTokenAttributes<M: ManagedTypeApi> {
    pub amount_per_swap: AmountPerSwap<M>,
    pub dca_frequency: DcaFrequency<M>,
    pub frequency_in_millis: DurationInMillis,
    pub take_profit_percentage: Percentage,
    pub usdc_balance: Amount<M>,
    pub dca_token_balance: Amount<M>,
    pub last_executed_ts_millis: TimestampInMillis,
    pub buys: ManagedVec<M, Swap<M>>,
    pub sells: ManagedVec<M, Swap<M>>,
}
impl<M: ManagedTypeApi> Default for StrategyTokenAttributes<M> {
    fn default() -> Self {
        Self {
            amount_per_swap: BigUint::zero(),
            dca_frequency: ManagedBuffer::new(),
            frequency_in_millis: 0,
            take_profit_percentage: 0,
            usdc_balance: BigUint::zero(),
            dca_token_balance: BigUint::zero(),
            last_executed_ts_millis: 0,
            buys: ManagedVec::new(),
            sells: ManagedVec::new(),
        }
    }
}
impl<M: ManagedTypeApi> StrategyTokenAttributes<M> {
    pub fn new(
        amount_per_swap: AmountPerSwap<M>,
        dca_frequency: DcaFrequency<M>,
        frequency_in_millis: DurationInMillis,
        take_profit_percentage: Percentage,
        usdc_balance: Amount<M>,
        dca_token_balance: Amount<M>,
        last_executed_ts_millis: TimestampInMillis,
        buys: ManagedVec<M, Swap<M>>,
        sells: ManagedVec<M, Swap<M>>,
    ) -> Self {
        Self {
            amount_per_swap,
            dca_frequency,
            frequency_in_millis,
            take_profit_percentage,
            usdc_balance,
            dca_token_balance,
            last_executed_ts_millis,
            buys,
            sells,
        }
    }
}

pub type StrategyTokenAttributesAsType<M> = MultiValue11<
    Nonce,
    AmountPerSwap<M>,
    DcaFrequency<M>,
    DurationInMillis,
    Percentage,
    Amount<M>,
    Amount<M>,
    TimestampInMillis,
    bool,
    ManagedVec<M, Swap<M>>,
    ManagedVec<M, Swap<M>>,
>;
