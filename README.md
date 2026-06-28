# FinRipple

FinRipple is a Next.js financial shockwave simulator. It models how market events can ripple through companies, sectors, ETFs, commodities, and countries using a local evidence-backed knowledge graph.

## Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root. For local evidence collection, set a descriptive SEC User-Agent:

```bash
SEC_USER_AGENT="FinRipple research project your-name@example.com"
```

## Environment Variables

### AWS / DynamoDB

These are used by the DynamoDB setup, seed, and persistent graph lookup paths:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
DYNAMODB_ENTITIES_TABLE="FinRippleEntities"
DYNAMODB_RELATIONSHIPS_TABLE="FinRippleRelationships"
```

If DynamoDB is not configured, the app can still run simulations from local data and runtime evidence.

### Vercel

Set the same runtime variables in Vercel Project Settings:

```bash
SEC_USER_AGENT="FinRipple research project your-name@example.com"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
DYNAMODB_ENTITIES_TABLE="FinRippleEntities"
DYNAMODB_RELATIONSHIPS_TABLE="FinRippleRelationships"
```

Vercel Analytics is enabled automatically in production.

## Run Locally

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the production server after building:

```bash
npm run start
```

## Knowledge Graph

Collect public evidence and rebuild the local graph:

```bash
npm run collect:real-evidence
npm run build:kg
```

Seed DynamoDB, if AWS environment variables are configured:

```bash
npm run setup:dynamodb
npm run seed
```

Evidence is cached under `data/evidence/`.

## Disclaimer

FinRipple output is an illustrative simulation, not investment advice. It should not be used as the sole basis for investment, trading, or risk-management decisions.
