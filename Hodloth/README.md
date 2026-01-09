# DCAi Bot - Build Wars Edition

## 🤖 Introduction: The "Set It and Forget It" Solution

In the volatile world of crypto, relying on emotions or constantly staring at charts often leads to missed opportunities. **DCAi** solves this by automating two critical strategies:

1.  **DCA (Dollar Cost Averaging) / Buying**: Steadily accumulating assets over time to smooth out price fluctuations.
2.  **Take Profit**: Automatically securing gains when a specific target is hit.

This repository contains the **Worker Bots**—the tireless engines that run 24/7 to execute the instructions you set on our Smart Contracts.

---

## 🔄 The "Brain": The Execution Loop

These bots don't just run once; they live in a continuous "Wake → Check → Work → Sleep" cycle.

**How it works for the Judges:**
*   **Wake Up**: Every hour, the bot wakes up.
*   **Scan**: It looks at the blockchain to find *every* active user strategy.
*   **Check**: It acts as a gatekeeper, verifying specific conditions (Is it time to buy? Did we hit profit?).
*   **Execute**: If—and only if—conditions are met, it triggers a transaction on the connection Smart Contract.
*   **Sleep**: It rests for an hour before the next cycle.

---

## 💰 Bot 1: The Accumulator (Buy Bot)

The **Buy Bot** is responsible for steady investing. It ensures users stick to their plan without manual intervention.

### The "Gatekeeper" Logic
Before buying, the bot asks two simple questions for every user:

1.  **"Is it time?" (Frequency Check)**
    *   *User Setting:* "Buy every 7 days."
    *   *Bot Check:* Has it been 7 days since the last buy?
    *   *Result:* If **NO**, skip. If **YES**, proceed.

2.  **"Do I have money?" (Balance Check)**
    *   *User Setting:* "Buy $50 worth."
    *   *Bot Check:* Does the user have at least $50 USDC in their vault?
    *   *Result:* If **NO**, skip. If **YES**, execute the buy!

---

## 🌾 Bot 2: The Harvester (Take Profit Bot)

The **Take Profit Bot** effectively "watches the charts" so the user doesn't have to. It ensures that when a token pumps, the user actually walks away with the profit.

### The "Gatekeeper" Logic
This bot performs a price check against the user's goal:

1.  **"Did we win?" (Profit Check)**
    *   *User Setting:* "Sell when I'm up 20%."
    *   *Smart Contract Logic:* The contract constantly calculates the average buy price of the user's position vs. current market price.
    *   *Bot Check:* Does the Smart Contract say the target is reached?
    *   *Result:* If **NO**, hold. If **YES**, sell everything and secure the cash!

---

## 🏆 Summary for Judges

This project isn't just a UI; it's a full-stack automation protocol.
*   **Smart Contracts** hold the funds and rules.
*   **These Bots** are the executors that turn those rules into reality, ensuring trustless, automated wealth building.
