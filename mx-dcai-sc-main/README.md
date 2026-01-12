# DCAi Smart Contract

A **Dollar Cost Averaging (DCA)** smart contract for the MultiversX blockchain, enabling automated periodic token purchases with integrated xExchange DEX functionality.

---

## Overview

DCAi allows users to create DCA strategies that automatically purchase a target token (e.g., EGLD) using USDC at configurable intervals. Each strategy is represented as a **Dynamic Meta ESDT NFT**, providing users with a transferable token that encapsulates their strategy configuration and balances.

### Key Features

- **Automated DCA Execution** – Bot-driven periodic token purchases
- **Configurable Frequencies** – Support for multiple DCA intervals (daily, weekly, etc.)
- **Take Profit Mechanism** – Automatic profit-taking when target percentage is reached
- **NFT-Based Strategies** – Each strategy is a transferable Dynamic Meta ESDT
- **xExchange Integration** – Multi-hop swaps via xExchange router
- **Admin & Pause Controls** – Comprehensive access control system

---

## Architecture

### Modules

| Module | Description |
|--------|-------------|
| `lib.rs` | Main contract entry point, combines all modules |
| `setup.rs` | Initial configuration and parameter management |
| `strategy.rs` | Strategy CRUD operations and user interactions |
| `bot.rs` | Automated buy and take-profit execution |
| `admins.rs` | Admin role management |
| `pause.rs` | Contract pausability |
| `xexchange/` | DEX integration (router, pair, wrapper) |

### Token Standards

- **Strategy Token**: Dynamic Meta ESDT (Semi-Fungible Token)
- **Input Token**: USDC (`USDC-c76f1f` on mainnet)
- **DCA Token**: Configurable (typically EGLD or WEGLD)

---

## Endpoints

### Owner Endpoints

| Endpoint | Description | Access |
|----------|-------------|--------|
| `setup` | Initial contract configuration (DCA token, frequencies, fees) | Owner only, once |
| `addAdmins` | Add admin addresses | Owner only |
| `removeAdmins` | Remove admin addresses | Owner only |

### Admin Endpoints

| Endpoint | Description |
|----------|-------------|
| `setToken` | Update the DCA target token |
| `setMinAmountPerSwap` | Set minimum USDC amount per swap |
| `addAllowedFrequencies` | Add new DCA frequency options |
| `removeAllowedFrequencies` | Remove DCA frequency options |
| `setProfitFeePercentage` | Set the fee percentage on profits |
| `setCustomSlippagePercentage` | Override default slippage (0.5%) |
| `setBotAddress` | Set the authorized bot address |
| `pause` | Pause the contract |
| `unpause` | Unpause the contract |

### User Endpoints

| Endpoint | Payment Required | Description |
|----------|------------------|-------------|
| `createStrategy` | None | Create a new DCA strategy NFT |
| `modifyStrategy` | Strategy NFT | Update strategy parameters |
| `deleteStrategy` | Strategy NFT | Delete strategy, withdraw all balances |
| `deposit` | Strategy NFT + USDC | Deposit USDC into strategy |
| `withdraw` | Strategy NFT | Withdraw USDC or DCA token from strategy |

### Bot Endpoints

| Endpoint | Description |
|----------|-------------|
| `buy` | Execute DCA buys for eligible strategies |
| `takeProfit` | Execute take-profit sells for eligible strategies |

> **Note**: Admins can also execute bot operations as a fallback mechanism.

---

## Views

| View | Returns |
|------|---------|
| `getSetup` | Full DCA configuration (token, min amount, fees, frequencies, pause state, admins) |
| `getStrategyTokenAttributes` | Strategy details by nonce (balances, history, take-profit status) |
| `getAllStrategies` | All active strategies with full attributes |
| `getAllStrategiesOnlyNonces` | All active strategy nonces |
| `isAdmin` | Check if address is admin |
| `getAdmins` | List of admin addresses |
| `isBot` | Check if address can execute bot operations |
| `getBotAddress` | Current bot address |
| `isPaused` | Contract pause state |
| `getUsdcIdentifier` | USDC token identifier |
| `getWegldIdentifier` | WEGLD token identifier |
| `getXexchangeRouterScAddress` | xExchange router address |
| `getWrapperScAddress` | EGLD wrapper contract address |

---

## Strategy Token Attributes

Each strategy NFT contains the following encoded attributes:

| Field | Type | Description |
|-------|------|-------------|
| `amount_per_swap` | `BigUint` | USDC amount per DCA operation |
| `dca_frequency` | `ManagedBuffer` | Frequency identifier (e.g., "daily") |
| `frequency_in_millis` | `u64` | Frequency duration in milliseconds |
| `take_profit_percentage` | `u64` | Target profit % to trigger sell (basis points) |
| `usdc_balance` | `BigUint` | Current USDC balance in strategy |
| `dca_token_balance` | `BigUint` | Current DCA token balance |
| `last_executed_ts_millis` | `u64` | Timestamp of last execution |
| `buys` | `ManagedVec<Swap>` | History of buy operations |
| `sells` | `ManagedVec<Swap>` | History of sell operations |

---

## Bot Execution Logic

### Buy Execution

A strategy is eligible for `buy` when:
1. `usdc_balance >= amount_per_swap`
2. `current_time >= last_executed_ts_millis + frequency_in_millis`
3. `amount_per_swap * frequency_in_millis > 0` (strategy is active)

The bot aggregates all eligible strategies, performs a single batched swap, and distributes tokens proportionally.

### Take Profit Execution

A strategy is eligible for `takeProfit` when:
1. `dca_token_balance > 0`
2. Strategy is active (`amount_per_swap * frequency_in_millis > 0`)
3. Current DCA token value in USDC >= total buys since last sell × `(1 + take_profit_percentage)`

Profit fee is calculated as: `(amount_received - total_buys_since_last_sell) × profit_fee_percentage`

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_PERCENTAGE` | 10000 | 100% in basis points |
| `DEFAULT_SLIPPAGE` | 50 | 0.5% default slippage |
| `TOKEN_ISSUANCE_COST` | 0.05 EGLD | Cost to issue strategy token |
| `USDC_IDENTIFIER` | `USDC-c76f1f` | Mainnet USDC token |
| `WEGLD_IDENTIFIER` | `WEGLD-bd4d79` | Mainnet WEGLD token |

---

## xExchange Integration

The contract integrates with xExchange DEX for token swaps:

- **Router**: Finds optimal swap paths and executes multi-hop swaps
- **Pair Contracts**: Direct token swaps and price queries
- **Wrapper**: EGLD ↔ WEGLD conversion

### Swap Path Resolution

1. **Direct pair**: Token A → Token B
2. **Via WEGLD**: Token A → WEGLD → Token B
3. **Via USDC**: Token A → USDC → Token B

---

## Events

| Event | Indexed Fields |
|-------|----------------|
| `strategyCreated` | creator, nonce, amount_per_swap, frequency, take_profit_percentage |
| `strategyModified` | modifier, nonce, amount_per_swap, frequency, take_profit_percentage |
| `strategyDeleted` | deleter, nonce, usdc_amount, token_amount |
| `depositMade` | depositor, nonce, usdc_amount |
| `withdrawalMade` | withdrawer, nonce, token, amount |
| `buyExecuted` | nonce, usdc_amount, dca_token_amount |
| `sellExecuted` | nonce, dca_token_amount, usdc_amount |
| `paused` | – |
| `unpaused` | – |
| `adminsAdded` | admins |
| `adminsRemoved` | admins |
| `botAddressSet` | bot |
| `dcaTokenSet` | dca_token |
| `minAmountPerSwapSet` | min_amount_per_swap |
| `allowedFrequenciesAdded` | allowed_frequencies |
| `allowedFrequenciesRemoved` | allowed_frequencies |
| `profitFeePercentageSet` | profit_fee_percentage |
| `customSlippagePercentageSet` | custom_slippage_percentage |
| `strategyTokenCreated` | strategy_token |

---

## Error Codes

| Error | Description |
|-------|-------------|
| `Paused` | Contract is paused |
| `Not paused` | Contract is not paused (for unpause) |
| `Only admin allowed` | Caller is not an admin |
| `Only bot allowed` | Caller is not bot or admin |
| `DCA strategy not set` | Setup not completed |
| `DCA strategy already set` | Setup already performed |
| `Invalid DCA frequency` | Frequency not in allowed list |
| `Invalid amount per swap` | Amount below minimum |
| `Invalid strategy token` | Wrong token sent |
| `Insufficient strategy token balance` | Strategy NFT validation failed |
| `Invalid USDC token` | Wrong USDC token sent |
| `Invalid USDC amount` | Invalid USDC withdrawal amount |
| `Invalid DCA token amount` | Invalid DCA token withdrawal amount |

---

## Build & Deploy

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [multiversx-sc-meta](https://docs.multiversx.com/developers/meta/sc-meta) CLI

### Build

```bash
cd interaction
./build.sh
```

### Test

```bash
cargo test
```

### Deploy

Use the interaction scripts in the `interaction/` folder with appropriate network globals:

```bash
source globals.mainnet.sh  # or globals.devnet.sh
./run.sh deploy
```

---

## Dependencies

- `multiversx-sc`: v0.64.0
- `multiversx-sc-modules`: v0.64.0

---

## License

See [LICENSE](./LICENSE) for details.
