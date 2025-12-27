'use client';
import { useState } from 'react';

export default function DocsPage() {
  const [openSection, setOpenSection] = useState<string | null>('what-is-dcai');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className='flex w-full justify-center overflow-visible'>
      <div className='flex w-full max-w-6xl flex-col gap-12 bg-background text-foreground overflow-visible'>
        {/* Header */}
        <section className='flex flex-col gap-1 overflow-visible'>
          <div className='flex flex-col gap-0.5'>
            <h1 className='text-2xl font-semibold tracking-tight'>DCAi Documentation</h1>
            <p className='max-w-xl text-sm text-[hsl(var(--gray-300)/0.8)]'>
              Complete guide to using DCAi - AI-powered Dollar Cost Averaging on MultiversX
            </p>
          </div>
        </section>

        {/* Documentation Content */}
        <section className='flex flex-col gap-6'>
          {/* What is DCAi */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('what-is-dcai')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>What is DCAi?</h2>
              <span className='text-xl'>{openSection === 'what-is-dcai' ? '−' : '+'}</span>
            </button>
            {openSection === 'what-is-dcai' && (
              <div className='mt-4 space-y-3 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <p>
                  DCAi is an AI-powered decentralized application (dApp) built on MultiversX that enables users to implement Dollar Cost Averaging (DCA) strategies for cryptocurrency investments. DCA is an investment strategy where you invest a fixed amount of money at regular intervals, regardless of the asset's price.
                </p>
                <p>
                  DCAi combines traditional DCA principles with AI analysis to help optimize your investment strategy. The platform uses HODLOTH, DCAi's custom LLM specifically designed for DCA strategy analysis, to evaluate market conditions and provide recommendations for your DCA parameters.
                </p>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('how-it-works')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>How DCAi Works</h2>
              <span className='text-xl'>{openSection === 'how-it-works' ? '−' : '+'}</span>
            </button>
            {openSection === 'how-it-works' && (
              <div className='mt-4 space-y-4 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>1. Strategy Creation</h3>
                  <p className='mb-2'>
                    When you create a DCA strategy, you specify:
                  </p>
                  <ul className='list-disc list-inside space-y-1 ml-4'>
                    <li><strong>Token:</strong> The cryptocurrency you want to DCA into (e.g., EGLD, HTM)</li>
                    <li><strong>USDC per Swap:</strong> The amount of USDC to invest in each DCA transaction</li>
                    <li><strong>Frequency:</strong> How often the DCA executes (hourly, daily, weekly, or monthly)</li>
                    <li><strong>Take Profit %:</strong> Optional percentage gain at which to automatically sell (e.g., 10% profit)</li>
                  </ul>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>2. HODLOTH Analysis</h3>
                  <p>
                    Before creating your strategy, HODLOTH (DCAi's custom LLM designed specifically for DCA strategies) analyzes your parameters using:
                  </p>
                  <ul className='list-disc list-inside space-y-1 ml-4 mt-2'>
                    <li>Current token price and market data</li>
                    <li>Total liquidity and 24h trading volume</li>
                    <li>Your specified DCA parameters</li>
                  </ul>
                  <p className='mt-2'>
                    HODLOTH provides risk assessment, identifies potential issues, and suggests parameter improvements to optimize your strategy. This LLM was built exclusively for DCAi to understand the nuances of dollar cost averaging strategies.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>3. Automatic Execution</h3>
                  <p>
                    Once your strategy is active and funded, DCAi automatically executes buy orders at your specified frequency. Each buy transaction is recorded in your strategy's history.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>4. Take Profit</h3>
                  <p>
                    If you've set a take profit percentage, DCAi will automatically sell your tokens when the price increases by that percentage, locking in your profits.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Getting Started */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('getting-started')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>Getting Started</h2>
              <span className='text-xl'>{openSection === 'getting-started' ? '−' : '+'}</span>
            </button>
            {openSection === 'getting-started' && (
              <div className='mt-4 space-y-4 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Step 1: Connect Your Wallet</h3>
                  <p>
                    Connect your MultiversX wallet (e.g., xPortal, DeFi Wallet) to the DCAi platform. Make sure you have USDC in your wallet to fund your DCA strategies.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Step 2: Review HODLOTH Analysis</h3>
                  <p>
                    When you click "Create Strategy", HODLOTH (DCAi's custom LLM) will analyze your parameters. Review the risk assessment, issues, and suggestions provided. You can either proceed with your original parameters or use HODLOTH's suggested improvements.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Step 3: Fund Your Strategy</h3>
                  <p>
                    After creating a strategy, deposit USDC into it. This USDC will be used for the automatic DCA purchases. You can deposit more funds at any time.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Step 4: Monitor Your Strategy</h3>
                  <p>
                    Track your strategy's performance in the "Active strategies" section. View your buy history, take profit transactions, current balances, and modify or delete strategies as needed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('features')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>Features</h2>
              <span className='text-xl'>{openSection === 'features' ? '−' : '+'}</span>
            </button>
            {openSection === 'features' && (
              <div className='mt-4 space-y-3 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <ul className='list-disc list-inside space-y-2 ml-4'>
                  <li><strong>HODLOTH Analysis:</strong> Get intelligent recommendations from HODLOTH, DCAi's custom LLM designed specifically for DCA strategies, based on market conditions</li>
                  <li><strong>Multiple Strategies:</strong> Create and manage multiple DCA strategies for different tokens simultaneously</li>
                  <li><strong>Flexible Frequencies:</strong> Choose from hourly, daily, weekly, or monthly DCA execution</li>
                  <li><strong>Automatic Take Profit:</strong> Set profit targets and let DCAi automatically sell when reached</li>
                  <li><strong>Full Transaction History:</strong> View complete history of all DCA buys and take profit sells</li>
                  <li><strong>Real-time Portfolio Tracking:</strong> Monitor your total portfolio value including USDC and token balances</li>
                  <li><strong>Easy Management:</strong> Modify, pause, or delete strategies at any time</li>
                </ul>
              </div>
            )}
          </div>

          {/* What DCAi Does */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('what-it-does')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>What DCAi Does</h2>
              <span className='text-xl'>{openSection === 'what-it-does' ? '−' : '+'}</span>
            </button>
            {openSection === 'what-it-does' && (
              <div className='mt-4 space-y-3 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <ul className='list-disc list-inside space-y-2 ml-4'>
                  <li>Automatically executes DCA buy orders at your specified frequency</li>
                  <li>Monitors token prices and executes take profit sales when targets are met</li>
                  <li>Provides HODLOTH-powered analysis and recommendations for strategy optimization</li>
                  <li>Tracks all transactions and maintains complete history of your DCA activity</li>
                  <li>Calculates and displays your total portfolio value in real-time</li>
                  <li>Manages multiple strategies simultaneously</li>
                  <li>Handles all smart contract interactions securely on MultiversX blockchain</li>
                </ul>
              </div>
            )}
          </div>

          {/* What DCAi Doesn't Do */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('what-it-doesnt')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>What DCAi Doesn't Do</h2>
              <span className='text-xl'>{openSection === 'what-it-doesnt' ? '−' : '+'}</span>
            </button>
            {openSection === 'what-it-doesnt' && (
              <div className='mt-4 space-y-3 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <ul className='list-disc list-inside space-y-2 ml-4'>
                  <li><strong>Guarantee profits:</strong> DCAi does not guarantee that you will make money. Cryptocurrency investments carry risk.</li>
                  <li><strong>Provide financial advice:</strong> The AI analysis is for informational purposes only and should not be considered financial advice.</li>
                  <li><strong>Stop losses:</strong> DCAi does not currently support automatic stop-loss orders to limit downside risk.</li>
                  <li><strong>Market timing:</strong> DCAi executes at fixed intervals regardless of market conditions (except for take profit).</li>
                  <li><strong>Lending or staking:</strong> Your funds are used solely for DCA purchases, not for lending or staking activities.</li>
                  <li><strong>Cross-chain operations:</strong> DCAi operates exclusively on MultiversX blockchain.</li>
                </ul>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('faq')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>Frequently Asked Questions</h2>
              <span className='text-xl'>{openSection === 'faq' ? '−' : '+'}</span>
            </button>
            {openSection === 'faq' && (
              <div className='mt-4 space-y-6 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: How much does it cost to use DCAi?</h3>
                  <p>
                    A: DCAi charges gas fees for blockchain transactions (creating strategies, deposits, withdrawals, etc.). These fees are paid in EGLD and are standard MultiversX network fees. There are no additional platform fees.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: Can I pause a strategy?</h3>
                  <p>
                    A: Currently, you cannot pause a strategy. However, you can stop funding it by not depositing more USDC, or you can delete the strategy entirely if needed.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: What happens if I run out of USDC in my strategy?</h3>
                  <p>
                    A: If your strategy runs out of USDC, the DCA buy orders will stop executing. You can deposit more USDC at any time to resume the strategy.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: Can I change my strategy parameters after creation?</h3>
                  <p>
                    A: Yes! You can modify your strategy's frequency, USDC per swap, and take profit percentage at any time through the "Modify Strategy" option.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: How accurate is HODLOTH's analysis?</h3>
                  <p>
                    A: HODLOTH is DCAi's custom LLM specifically trained for DCA strategy analysis. It uses current market data and statistical analysis to provide recommendations. However, it should be used as a tool to inform your decisions, not as guaranteed financial advice. Always do your own research.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: What tokens can I DCA into?</h3>
                  <p>
                    A: DCAi supports any token that has been configured in the smart contract. Common tokens include EGLD, HTM, and other MultiversX ecosystem tokens. Check the token dropdown when creating a strategy to see available options.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: Is my money safe?</h3>
                  <p>
                    A: DCAi uses smart contracts on MultiversX blockchain, which are transparent and auditable. However, as with any DeFi application, there are inherent risks including smart contract risks, market volatility, and potential bugs. Only invest what you can afford to lose.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>Q: Can I withdraw my funds at any time?</h3>
                  <p>
                    A: Yes, you can withdraw both USDC and purchased tokens from your strategy at any time. Withdrawals are processed immediately on the blockchain.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Best Practices */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('best-practices')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>Best Practices</h2>
              <span className='text-xl'>{openSection === 'best-practices' ? '−' : '+'}</span>
            </button>
            {openSection === 'best-practices' && (
              <div className='mt-4 space-y-3 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                <ul className='list-disc list-inside space-y-2 ml-4'>
                  <li>Start with smaller amounts to familiarize yourself with the platform</li>
                  <li>Review AI recommendations but make your own informed decisions</li>
                  <li>Diversify across multiple tokens and strategies</li>
                  <li>Set realistic take profit targets (typically 5-20%)</li>
                  <li>Monitor your strategies regularly but avoid over-managing</li>
                  <li>Keep some USDC reserves for market opportunities</li>
                  <li>Understand that DCA works best over longer time horizons</li>
                  <li>Only invest funds you can afford to lose</li>
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

