# Hackathon Submission Texts

## **1. Description (Short)**
*Paste this into the "Description" field.*

**Problem:**
Retail investors fail due to emotional trading. They buy the top due to FOMO, panic sell the bottom, and most critically, lack a disciplined exit strategy, often watching 50% gains turn into losses. Traditional DCA tools are "blind"—buying arbitrarily regardless of market conditions.

**Solution:**
DCAi is the first **AI-Powered, Automated Dollar Cost Averaging protocol on MultiversX**.
It solves the execution gap with three key pillars:
1.  **AI Validation:** Our Neuro-Engine (HODLOTH) helps users optimize their strategy (frequency, amount, target) *before* they commit funds.
2.  **Automated Execution:** A decentralized bot executes DCA buys on a strict schedule, removing hesitation.
3.  **Auto Take-Profit:** The "Killer Feature." Users set a profit target (e.g., +30%), and the protocol automatically swaps the position back to USDC when the target is hit, securing gains while you sleep.

**How it Works:**
Users connect their wallet, define a strategy, and fund it with USDC. A unique "Child Contract" is deployed for security (Non-Custodial). Our background Python bot monitors the strategy every ~10 minutes to execute buys or trigger the Take-Profit mechanism.

---

## **2. README**
*Paste this into the "README" field.*

### **Project Overview**
DCAi revolutionizes "stacking" by combining traditional Dollar Cost Averaging with AI-driven analysis and automated exit strategies. Unlike standard tools, DCAi ensures you not only accumulate assets efficiently but also secure profits automatically.

### **Key Features**
*   **Neuro-Engine Analysis:** Pre-deployment strategy validation using historical data and liquidity metrics.
*   **Parent-Child Architecture:** A factory contract deploys a unique, isolated Vault contract for every user strategy, ensuring maximum security and no commingling of funds.
*   **Automated Take-Profit:** Smart Contracts track your average buy price and trigger a sell order instantly when your ROI target is met.
*   **Non-Custodial:** Users retain full control to simple Modify, Withdraw, or Delete strategies at any time.

### **Technologies Used**
*   **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion (Animations).
*   **Blockchain:** MultiversX (Elrond), Rust (Smart Contracts).
*   **AI/LLM:** Grok API (HODLOTH Analysis).
*   **Automation:** Python 3 (Bot for periodic execution and price monitoring).
*   **Integration:** MultiversX SDK, xPortal.

### **Setup Instructions**

**1. Frontend Application:**
```bash
git clone https://github.com/klepi21/dcai.git
cd dcai
npm install
npm run dev
# Open http://localhost:3000
```

**2. Smart Contracts:**
*   Located in `/contracts`.
*   Deploy `Parent` contract using `mxpy`.
*   Update `config.ts` with the new Smart Contract address.

**3. Automation Bot:**
*   Requires Python 3.9+.
*   Install requirements: `pip install -r requirements.txt`.
*   Run the scheduler: `python3 scheduler.py`.

### **Dependencies**
*   Node.js v18+
*   npm / yarn
*   Python 3 (for the bot)
*   MultiversX `mxpy` CLI (for contract deployment)
