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
                  <h3 className='font-semibold mb-2 text-foreground'>3. Automatic Execution (Powered by Automation Microservice)</h3>
                  <p className='mb-2'>
                    Once your strategy is active and funded, DCAi's <strong>dedicated automation microservice</strong> takes over completely. This background service runs 24/7 and handles all execution automatically:
                  </p>
                  <ul className='list-disc list-inside space-y-1 ml-4 mt-2'>
                    <li><strong>Continuous Monitoring:</strong> The microservice continuously monitors all active strategies, checking if the DCA frequency has elapsed</li>
                    <li><strong>Automatic Buy Execution:</strong> When it's time for a DCA purchase, the microservice automatically executes the swap transaction on the MultiversX DEX</li>
                    <li><strong>No User Action Required:</strong> Once you create and fund a strategy, you can set it and forget it - the microservice handles everything</li>
                    <li><strong>Transaction Recording:</strong> Each buy transaction is automatically recorded in your strategy's history on-chain</li>
                    <li><strong>Multi-Strategy Support:</strong> The microservice can monitor and execute hundreds of strategies simultaneously across all users</li>
                  </ul>
                  <p className='mt-2 text-xs text-[hsl(var(--gray-300)/0.6)] italic'>
                    💡 This is a fully automated backend service that runs independently of the frontend, ensuring your strategies execute even when you're not actively using the dApp.
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-2 text-foreground'>4. Automatic Take Profit (Real-Time Price Monitoring)</h3>
                  <p className='mb-2'>
                    If you've set a take profit percentage, DCAi's automation microservice includes a <strong>real-time price monitoring system</strong> that:
                  </p>
                  <ul className='list-disc list-inside space-y-1 ml-4 mt-2'>
                    <li><strong>Continuous Price Tracking:</strong> Monitors token prices in real-time from MultiversX market data</li>
                    <li><strong>Profit Calculation:</strong> Automatically calculates your profit percentage based on your average entry price</li>
                    <li><strong>Automatic Sell Execution:</strong> When your profit target is reached, the microservice immediately executes a sell transaction</li>
                    <li><strong>Instant Profit Locking:</strong> Your profits are locked in as USDC, which you can withdraw at any time</li>
                    <li><strong>Multiple Strategies:</strong> Can monitor take profit conditions for all your strategies simultaneously</li>
                  </ul>
                  <p className='mt-2'>
                    This happens completely automatically - you don't need to watch the markets or manually execute trades. The microservice handles everything in the background.
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

          {/* Visual Guide: How to Create a Strategy */}
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
            <button
              onClick={() => toggleSection('visual-guide')}
              className='w-full text-left flex items-center justify-between'
            >
              <h2 className='text-lg font-semibold'>📋 Visual Guide: Creating Your First Strategy</h2>
              <span className='text-xl'>{openSection === 'visual-guide' ? '−' : '+'}</span>
            </button>
            {openSection === 'visual-guide' && (
              <div className='mt-4 space-y-6 text-sm'>
                {/* Step 1 */}
                <div className='border-l-4 border-blue-500 pl-4 py-2 bg-[hsl(var(--gray-300)/0.1)] rounded-r'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm'>
                      1
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                        <span>🔌 Connect Your Wallet</span>
                      </h3>
                      <p className='text-[hsl(var(--gray-300)/0.8)] mb-2'>
                        Click the "Connect Wallet" button in the top right corner. Select your MultiversX wallet (xPortal, DeFi Wallet, etc.) and approve the connection.
                      </p>
                      <div className='mt-2 p-3 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded text-xs'>
                        <strong>💡 Tip:</strong> Make sure you have USDC in your wallet before creating a strategy. You'll need it to fund your DCA purchases.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className='border-l-4 border-green-500 pl-4 py-2 bg-[hsl(var(--gray-300)/0.1)] rounded-r'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm'>
                      2
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                        <span>🎯 Fill in Strategy Parameters</span>
                      </h3>
                      <p className='text-[hsl(var(--gray-300)/0.8)] mb-3'>
                        In the "Create Strategy" form, fill in the following:
                      </p>
                      <div className='space-y-2 mb-3'>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span className='text-lg'>🪙</span>
                          <div>
                            <strong className='text-foreground'>Select Token:</strong>
                            <p className='text-xs text-[hsl(var(--gray-300)/0.8)]'>Choose the cryptocurrency you want to DCA into (e.g., EGLD, HTM)</p>
                          </div>
                        </div>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span className='text-lg'>💰</span>
                          <div>
                            <strong className='text-foreground'>USDC per Swap:</strong>
                            <p className='text-xs text-[hsl(var(--gray-300)/0.8)]'>Enter the amount of USDC to invest in each DCA transaction (e.g., 10, 50, 100)</p>
                          </div>
                        </div>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span className='text-lg'>⏰</span>
                          <div>
                            <strong className='text-foreground'>Frequency:</strong>
                            <p className='text-xs text-[hsl(var(--gray-300)/0.8)]'>Select how often to execute (Hourly, Daily, Weekly, Monthly)</p>
                          </div>
                        </div>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span className='text-lg'>📈</span>
                          <div>
                            <strong className='text-foreground'>Take Profit (Optional):</strong>
                            <p className='text-xs text-[hsl(var(--gray-300)/0.8)]'>Enable and set a percentage (e.g., 10%, 15%) to automatically sell when profit target is reached</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className='border-l-4 border-purple-500 pl-4 py-2 bg-[hsl(var(--gray-300)/0.1)] rounded-r'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm'>
                      3
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                        <span>🤖 Review HODLOTH Analysis</span>
                      </h3>
                      <p className='text-[hsl(var(--gray-300)/0.8)] mb-3'>
                        Click "Create Strategy" button. HODLOTH will analyze your strategy parameters and show you:
                      </p>
                      <div className='space-y-2 mb-3'>
                        <div className='p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <strong className='text-foreground'>📊 Risk Level:</strong>
                          <span className='text-xs text-[hsl(var(--gray-300)/0.8)] ml-2'>LOW, MEDIUM, or HIGH</span>
                        </div>
                        <div className='p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <strong className='text-foreground'>⚠️ Issues:</strong>
                          <span className='text-xs text-[hsl(var(--gray-300)/0.8)] ml-2'>Potential problems with your strategy</span>
                        </div>
                        <div className='p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <strong className='text-foreground'>💡 Suggestions:</strong>
                          <span className='text-xs text-[hsl(var(--gray-300)/0.8)] ml-2'>Recommended improvements</span>
                        </div>
                        <div className='p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <strong className='text-foreground'>🎯 Expected Effect:</strong>
                          <span className='text-xs text-[hsl(var(--gray-300)/0.8)] ml-2'>What to expect from the strategy</span>
                        </div>
                      </div>
                      <div className='mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs'>
                        <strong>⚡ Quick Actions:</strong>
                        <ul className='list-disc list-inside mt-1 space-y-1'>
                          <li><strong>"Modify Strategy":</strong> Apply HODLOTH's suggested parameters and create the strategy</li>
                          <li><strong>"Create Strategy":</strong> Proceed with your original parameters</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className='border-l-4 border-orange-500 pl-4 py-2 bg-[hsl(var(--gray-300)/0.1)] rounded-r'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm'>
                      4
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                        <span>✍️ Sign Transaction</span>
                      </h3>
                      <p className='text-[hsl(var(--gray-300)/0.8)] mb-2'>
                        Approve the transaction in your wallet. This will create your strategy on the MultiversX blockchain and mint a unique strategy token to your wallet.
                      </p>
                      <div className='mt-2 p-3 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded text-xs'>
                        <strong>⏱️ Processing:</strong> The transaction typically takes a few seconds to complete. You'll see a confirmation once it's done.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className='border-l-4 border-pink-500 pl-4 py-2 bg-[hsl(var(--gray-300)/0.1)] rounded-r'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-sm'>
                      5
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                        <span>💵 Fund Your Strategy</span>
                      </h3>
                      <p className='text-[hsl(var(--gray-300)/0.8)] mb-3'>
                        Once your strategy is created, you'll see it in the "Active strategies" section. Click the <strong>"Deposit"</strong> button to add USDC funds.
                      </p>
                      <div className='space-y-2'>
                        <div className='p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded text-xs'>
                          <strong>💰 Deposit USDC:</strong> Enter the amount you want to deposit. This USDC will be used for automatic DCA purchases.
                        </div>
                        <div className='p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded text-xs'>
                          <strong>✅ Confirm:</strong> Sign the deposit transaction. Your strategy is now funded and ready!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className='border-l-4 border-cyan-500 pl-4 py-2 bg-[hsl(var(--gray-300)/0.1)] rounded-r'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm'>
                      6
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                        <span>🚀 Strategy is Active!</span>
                      </h3>
                      <p className='text-[hsl(var(--gray-300)/0.8)] mb-3'>
                        Your strategy is now live! The automation microservice will:
                      </p>
                      <div className='space-y-2'>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span>🔄</span>
                          <div className='text-xs'>
                            <strong className='text-foreground'>Automatically execute DCA buys</strong> at your specified frequency
                          </div>
                        </div>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span>📊</span>
                          <div className='text-xs'>
                            <strong className='text-foreground'>Monitor prices</strong> and execute take profit sales when targets are met
                          </div>
                        </div>
                        <div className='flex items-start gap-2 p-2 bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.3)] rounded'>
                          <span>📝</span>
                          <div className='text-xs'>
                            <strong className='text-foreground'>Record all transactions</strong> in your strategy history
                          </div>
                        </div>
                      </div>
                      <div className='mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded text-xs'>
                        <strong>🎉 Congratulations!</strong> Your strategy is now running automatically. You can monitor it, modify it, or add more funds anytime from the "Active strategies" section.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className='mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-lg'>
                  <h4 className='font-semibold mb-2 text-foreground flex items-center gap-2'>
                    <span>📌 Quick Summary</span>
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[hsl(var(--gray-300)/0.8)]'>
                    <div>✓ Connect wallet</div>
                    <div>✓ Fill strategy form</div>
                    <div>✓ Review AI analysis</div>
                    <div>✓ Sign transaction</div>
                    <div>✓ Deposit USDC</div>
                    <div>✓ Strategy runs automatically</div>
                  </div>
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

