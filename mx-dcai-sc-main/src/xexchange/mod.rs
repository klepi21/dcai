//! # xExchange Integration Modules
//!
//! This module provides integration with the xExchange DEX on MultiversX.
//!
//! ## Sub-modules
//! * `pair_module` - Interaction with xExchange pair contracts for swaps and price queries
//! * `pair_proxy` - Proxy for calling pair contract endpoints
//! * `router_module` - Interaction with xExchange router for multi-hop swaps
//! * `router_proxy` - Proxy for calling router contract endpoints
//! * `wrapper_module` - EGLD/WEGLD wrapping and unwrapping functionality
//! * `wrapper_proxy` - Proxy for calling wrapper contract endpoints

pub mod pair_module;
pub mod pair_proxy;
pub mod router_module;
pub mod router_proxy;
pub mod wrapper_module;
pub mod wrapper_proxy;
