#![no_std]

use multiversx_sc::hex_literal::hex;

pub static MAX_PERCENTAGE: u64 = 10000; // 100%
pub static DEFAULT_SLIPPAGE: u64 = 50; // 0.5%
pub static WAD_DECIMALS: usize = 18;
pub static ONE_WAD: u64 = 1_000_000_000_000_000_000;
pub static TOKEN_ISSUANCE_COST: u64 = 50_000_000_000_000_000;

// pub(crate) static ISSUE_TOKEN_CALLBACK_NAME: &str = "issue_token_callback";
pub static SWAP_TOKENS_FIXED_INPUT_FUNC_NAME: &[u8] = b"swapTokensFixedInput";

// // DEVNET
// pub const USDC_IDENTIFIER: &str = "USDC-350c4e";
// pub const WEGLD_IDENTIFIER: &str = "WEGLD-a28c59";
// pub const XEXCHANGE_ROUTER_SC_ADDRESS: [u8; 32] =
//     hex!("00000000000000000500efaec7cfb7443e7589e187575d19ebc5f6f770987ceb");
// pub const WRAPPER_SC_ADDRESS: [u8; 32] =
//     hex!("000000000000000005000b1e5b244325095849f4e37134661d5bfdcd925e7ceb");

// MAINNET
pub static USDC_IDENTIFIER: &str = "USDC-c76f1f";
pub static WEGLD_IDENTIFIER: &str = "WEGLD-bd4d79";
pub static XEXCHANGE_ROUTER_SC_ADDRESS: [u8; 32] =
    hex!("0000000000000000050006b46b15091d730e5f3b8c87c3e9c8a5d818c7ba5483");
pub static WRAPPER_SC_ADDRESS: [u8; 32] =
    hex!("00000000000000000500be4eba4b2eccbcf1703bbd6b2e0d1351430e769f5483");