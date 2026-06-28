# FinRipple

## Real Evidence Knowledge Graph

FinRipple can collect local evidence from free public sources and build the
relationship graph without OpenAI, paid APIs, synthetic SEC text, synthetic ETF
holdings, or invented relationships.

Create `.env.local` with a descriptive SEC User-Agent. SEC requires this for
automated EDGAR access:

```bash
SEC_USER_AGENT="FinRipple research project sindhu.kalees2002@gmail.com"
```

Then run:

```bash
npm run collect:real-evidence
npm run build:kg
npm run seed
npm run dev
```

Evidence is cached under:

- `data/evidence/sec/`
- `data/evidence/etf-holdings/`
- `data/evidence/prices/`
- `data/evidence/news/`

If a source cannot be downloaded or parsed, the collector logs a warning and
continues. The graph builder generates fewer relationships rather than filling
gaps with fake data.
