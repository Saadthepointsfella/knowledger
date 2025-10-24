# Knowledge Resonator (MVP)

MVP implementing the resonance loop: Input → Embed → kNN Graph → t-SNE (client) → Force Graph.

## Quickstart (Web)

```bash
cd apps/web
cp .env.example .env.local  # fill OPENAI_API_KEY
pnpm i # or npm i / yarn
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), paste text, click **Resonate**.

## Optional: Python UMAP

```bash
cd apps/python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

Set `NEXT_PUBLIC_PROJECT_API` to your service URL and wire the client switch when N>400.

## Env

* `OPENAI_API_KEY` for embeddings
* `UPSTASH_REDIS_*` (optional) for embedding cache
