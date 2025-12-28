# DCAi Architecture

## System Overview

DCAi is a full-stack decentralized application consisting of three main components:

1. **Frontend (Next.js)**: User interface and wallet interactions
2. **Smart Contracts (MultiversX)**: On-chain strategy management and execution
3. **Automation Microservice**: Background service for automated DCA and take-profit execution

## Architecture Diagram

```mermaid
graph TB
    subgraph "User Layer"
        U[User with MultiversX Wallet]
    end
    
    subgraph "Frontend Application (Next.js)"
        UI[React UI Components]
        HODLOTH[Strategy Analysis Modal]
        API_ROUTE[/api/analyze-strategy]
    end
    
    subgraph "External Services"
        GROK_API[Grok/HODLOTH LLM API]
        MX_API[MultiversX API<br/>Token Prices & Market Data]
    end
    
    subgraph "MultiversX Blockchain"
        PARENT[Parent DCA Contract<br/>Contract Registry]
        CHILD1[Child DCA Contract 1<br/>Token A Strategies]
        CHILD2[Child DCA Contract 2<br/>Token B Strategies]
        CHILD3[Child DCA Contract N<br/>Token N Strategies]
    end
    
    subgraph "Automation Microservice"
        SCHEDULER[Task Scheduler<br/>Frequency Monitor]
        PRICE_MONITOR[Price Monitor<br/>Take Profit Checker]
        EXECUTOR[Transaction Executor<br/>DCA & Take Profit]
    end
    
    U -->|Connect Wallet| UI
    UI -->|Create Strategy| HODLOTH
    HODLOTH -->|Analyze Parameters| API_ROUTE
    API_ROUTE -->|LLM Request| GROK_API
    API_ROUTE -->|Market Data| MX_API
    GROK_API -->|Analysis Results| API_ROUTE
    API_ROUTE -->|Display Analysis| HODLOTH
    HODLOTH -->|User Confirms| UI
    UI -->|Create Strategy TX| PARENT
    PARENT -->|Deploy Strategy| CHILD1
    PARENT -->|Deploy Strategy| CHILD2
    PARENT -->|Deploy Strategy| CHILD3
    
    SCHEDULER -->|Check Frequencies| CHILD1
    SCHEDULER -->|Check Frequencies| CHILD2
    SCHEDULER -->|Check Frequencies| CHILD3
    SCHEDULER -->|Trigger DCA| EXECUTOR
    EXECUTOR -->|Execute Buy| CHILD1
    EXECUTOR -->|Execute Buy| CHILD2
    EXECUTOR -->|Execute Buy| CHILD3
    
    PRICE_MONITOR -->|Monitor Prices| MX_API
    PRICE_MONITOR -->|Check Take Profit| CHILD1
    PRICE_MONITOR -->|Check Take Profit| CHILD2
    PRICE_MONITOR -->|Check Take Profit| CHILD3
    PRICE_MONITOR -->|Trigger Sell| EXECUTOR
    EXECUTOR -->|Execute Sell| CHILD1
    EXECUTOR -->|Execute Sell| CHILD2
    EXECUTOR -->|Execute Sell| CHILD3
    
    UI -->|Query Strategies| MX_API
    MX_API -->|Strategy Data| UI
    UI -->|Deposit/Withdraw| CHILD1
    UI -->|Deposit/Withdraw| CHILD2
    UI -->|Deposit/Withdraw| CHILD3
    
    style U fill:#e1f5ff
    style UI fill:#c8e6c9
    style HODLOTH fill:#fff9c4
    style API_ROUTE fill:#fff9c4
    style GROK_API fill:#ffccbc
    style MX_API fill:#ffccbc
    style PARENT fill:#b39ddb
    style CHILD1 fill:#b39ddb
    style CHILD2 fill:#b39ddb
    style CHILD3 fill:#b39ddb
    style SCHEDULER fill:#f8bbd0
    style PRICE_MONITOR fill:#f8bbd0
    style EXECUTOR fill:#f8bbd0
```

## Component Details

### 1. Frontend (Next.js Application)

**Location**: `src/app/dcaboard/`

**Responsibilities**:
- User authentication and wallet connection
- Strategy creation and management UI
- Portfolio tracking and display
- Transaction history visualization
- Integration with HODLOTH LLM for strategy analysis

**Key Features**:
- Real-time token price fetching
- Market data integration
- Transaction status tracking
- Responsive design with dark mode support

### 2. Smart Contracts (MultiversX)

**Parent Contract**:
- Manages registry of all DCA contracts
- Handles contract deployment for different tokens
- Provides setup information (min amounts, allowed frequencies)

**Child Contracts** (One per token):
- Manages individual DCA strategies
- Stores strategy parameters (frequency, amount, take profit)
- Holds USDC and token balances
- Executes swaps via DEX integration
- Records transaction history (buys/sells)

**Strategy Token (Meta ESDT)**:
- Each strategy is represented as a unique NFT/Meta ESDT
- Token identifier format: `DCAI{TOKEN}-{hash}-{nonce}`
- Contains strategy metadata and ownership

### 3. Automation Microservice

**Purpose**: Automatically execute DCA purchases and take-profit sales without user intervention.

**Components**:

1. **Task Scheduler**
   - Monitors all active strategies
   - Checks if DCA frequency has elapsed
   - Triggers buy transactions when due
   - Handles multiple strategies concurrently

2. **Price Monitor**
   - Continuously monitors token prices
   - Compares current price to strategy's entry price
   - Calculates profit percentage
   - Triggers sell transactions when take-profit threshold is met

3. **Transaction Executor**
   - Constructs and signs transactions
   - Executes swaps on MultiversX DEX
   - Handles transaction failures and retries
   - Updates strategy state after execution

**Key Features**:
- Fully automated execution
- No user interaction required after strategy creation
- Handles network congestion and retries
- Monitors multiple strategies simultaneously
- Gas-efficient transaction batching (if applicable)

## Data Flow

### Strategy Creation Flow

1. User connects wallet → Frontend
2. User fills strategy form → Frontend
3. User clicks "Create Strategy" → Frontend
4. HODLOTH analysis triggered → API Route → Grok API
5. Analysis results displayed → Frontend
6. User confirms → Frontend
7. Create strategy transaction → Parent Contract
8. Parent contract deploys strategy → Child Contract
9. Strategy token minted → User's wallet
10. Strategy appears in user's active strategies → Frontend

### Automated DCA Execution Flow

1. Automation microservice monitors strategies → Scheduler
2. Frequency elapsed detected → Scheduler
3. Check strategy has sufficient USDC → Child Contract
4. Execute swap transaction → Executor → DEX
5. Update strategy balances → Child Contract
6. Record buy transaction → Child Contract
7. Frontend fetches updated data → MultiversX API

### Automated Take Profit Flow

1. Automation microservice monitors prices → Price Monitor
2. Price increase detected → Price Monitor
3. Calculate profit percentage → Price Monitor
4. Check if threshold met → Price Monitor
5. Execute sell transaction → Executor → DEX
6. Update strategy balances → Child Contract
7. Record sell transaction → Child Contract
8. Frontend fetches updated data → MultiversX API

## Security Considerations

- **Smart Contract Security**: All contracts are auditable on-chain
- **API Key Security**: LLM API keys stored server-side only
- **Transaction Signing**: All transactions require user wallet approval
- **Rate Limiting**: LLM requests limited to prevent abuse
- **Input Validation**: All user inputs validated before submission

## Technology Stack

- **Frontend**: Next.js 13, React 18, TypeScript, Tailwind CSS
- **Blockchain**: MultiversX (Elrond)
- **Smart Contracts**: Rust (MultiversX VM)
- **AI/LLM**: Grok API (HODLOTH)
- **Automation**: Custom microservice (Node.js/Python)
- **APIs**: MultiversX Gateway API, MultiversX API

## Scalability

- **Multi-token Support**: Each token has its own child contract
- **Multiple Strategies**: Users can create unlimited strategies
- **Concurrent Execution**: Microservice handles multiple strategies simultaneously
- **Efficient Queries**: Optimized API calls with caching where appropriate

