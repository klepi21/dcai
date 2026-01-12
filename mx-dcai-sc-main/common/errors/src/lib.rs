#![no_std]

pub static ERROR_PAUSED: &[u8] = b"Paused";
pub static ERROR_NOT_PAUSED: &[u8] = b"Not paused";

pub static ERROR_NOT_ADMIN: &[u8] = b"Only admin allowed";
pub static ERROR_NOT_BOT: &[u8] = b"Only bot allowed";

pub static ERROR_STRATEGY_NOT_SET: &[u8] = b"DCA strategy not set";
pub static ERROR_STRATEGY_ALREADY_SET: &[u8] = b"DCA strategy already set";

pub static ERROR_INVALID_FREQUENCY: &[u8] = b"Invalid DCA frequency";
pub static ERROR_INVALID_AMOUNT_PER_SWAP: &[u8] = b"Invalid amount per swap";

pub static ERROR_INVALID_STRATEGY_TOKEN: &[u8] = b"Invalid strategy token";
pub static ERROR_INSUFFICIENT_STRATEGY_TOKEN_BALANCE: &[u8] = b"Insufficient strategy token balance";

pub static ERROR_INVALID_USDC_TOKEN: &[u8] = b"Invalid USDC token";
pub static ERROR_INVALID_USDC_AMOUNT: &[u8] = b"Invalid USDC amount";
pub static ERROR_INVALID_DCA_TOKEN_AMOUNT: &[u8] = b"Invalid DCA token amount";