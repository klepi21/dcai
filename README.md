# **DCAi - AI-Powered Dollar Cost Averaging on MultiversX**

DCAi is a sophisticated dApp for dollar cost averaging in the MultiversX ecosystem, using advanced AI LLM systems to determine optimal buy and take-profit times.

Built with Next.js and @multiversx/sdk-dapp.

## 🏗️ Architecture

DCAi consists of three main components:
- **Frontend (Next.js)**: User interface and wallet interactions
- **Smart Contracts (MultiversX)**: On-chain strategy management
- **Automation Microservice**: Background service for automated DCA and take-profit execution

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture diagrams and system overview.

### Setup next.config.js.

See [documentation](https://nextjs.org/docs/pages/api-reference/next-config-js/transpilePackages)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@multiversx/sdk-dapp-ui']
};

module.exports = nextConfig;
```

---

## Getting Started

Run the development server on the desired network:

```bash
yarn start-testnet
```

or

```bash
yarn start-devnet
```

or

```bash
yarn start-mainnet
```

Run a production build:

```bash
yarn build-testnet
```

or

```bash
yarn build-devnet
```

or

```bash
yarn build-mainnet
```

and then

```bash
yarn start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
