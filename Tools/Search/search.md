# Search Tools
> Dedicated search engines that give your app instant, typo-tolerant, faceted search -- the kind users expect from Google but rarely get from a `WHERE name LIKE '%query%'` clause.

---

## When to Use What

| Feature | Algolia | Meilisearch | Typesense |
|---|---|---|---|
| **Pricing (free tier)** | 10K requests/mo, 10K records | Free (self-hosted), Cloud ~$0.35/hr | Free (self-hosted), Cloud ~$0.11/hr |
| **Open-source** | No (proprietary) | Yes (MIT) | Yes (GPL-3.0) |
| **Self-hostable** | No (SaaS only) | Yes | Yes |
| **Typo tolerance** | Excellent (configurable distance) | Excellent (built-in) | Excellent (configurable `num_typos`) |
| **Faceted search** | Yes (first-class) | Yes | Yes |
| **Geo-search** | Yes (`aroundLatLng`) | Yes (`_geo` field) | Yes (built-in `geopoint` type) |
| **AI/ML features** | Recommendations, Re-Ranking, Personalization | None | None |
| **React UI library** | `react-instantsearch` (official) | `react-instantsearch` via adapter | `react-instantsearch` via adapter |
| **Latency** | ~1-20ms (global CDN) | ~1-50ms (depends on host) | ~1-20ms (in-memory) |
| **Best for** | Managed service, AI features, budget flexibility | Self-hosted, privacy-first, open-source | Performance-critical, geo-heavy apps |

### The Opinionated Take

**Default choice: Algolia** if you have any budget. The developer experience is unmatched, the global CDN makes latency a non-issue, and AI features (recommendations, re-ranking) are genuinely useful. The free tier covers most side projects and early startups.

**Default choice: Meilisearch** if you need self-hosted or open-source. Closest Algolia alternative in DX, excellent defaults out of the box, and the `react-instantsearch` adapter means you can swap between Algolia and Meilisearch with minimal code changes.

**Typesense** is strong if geo-search is a core feature or you want extremely low-latency self-hosted search. Its in-memory architecture is blazingly fast but requires more RAM.

---

## Principles

### 1. Know When You Need Dedicated Search

Not every app needs Algolia. Consider the alternatives first:

- **Fewer than ~10K rows?** Postgres `ILIKE` or SQLite `LIKE` with indexing is fine.
- **Basic full-text?** Postgres `tsvector`/`tsquery` or MySQL `FULLTEXT` indexes handle keyword search.
- **Need typo tolerance, facets, instant-as-you-type?** Now you need a dedicated search engine.
- **Need search across multiple models/tables?** Search engines flatten data into documents, making cross-model search trivial.
- **Need relevance ranking beyond alphabetical/date?** Search engines provide configurable ranking out of the box.

The threshold: once users complain search "doesn't work" or you are writing increasingly complex SQL to handle misspellings, it is time.

### 2. Design Indexes as Denormalized Views

A search index is not your database. It is a denormalized, read-optimized projection designed for fast retrieval.

```typescript
// BAD: mirroring normalized tables
// index: "users" -> { id, name, email }
// index: "orders" -> { id, userId, total }

// GOOD: flatten into what users actually search for
// index: "products" -> {
//   id, name, description, price,
//   category_name,   // denormalized from categories table
//   brand_name,      // denormalized from brands table
//   avg_rating,      // pre-computed
//   review_count,    // pre-computed
//   in_stock: true,  // computed boolean
//   image_url,       // ready for display
// }
```

Include every field you want to **search on**, **filter by**, **sort by**, or **display in results**. Pre-compute aggregates. Store display-ready data so the frontend never needs a second fetch. Keep records under ~10KB.

### 3. Keep Search in Sync with Your Database

Your database is the source of truth. The search index is derived. They will drift unless you build a sync pipeline.

**Strategy A: Event-Driven (Recommended)** -- trigger index updates on every DB write:

```typescript
// Prisma middleware that syncs to search on every write
prisma.$use(async (params, next) => {
  const result = await next(params);
  const indexedModels = ["Product", "Article"];
  if (!indexedModels.includes(params.model ?? "")) return result;

  const indexName = params.model!.toLowerCase() + "s";

  switch (params.action) {
    case "create":
    case "update":
      await searchClient.index(indexName).addDocuments([transformForSearch(result)]);
      break;
    case "delete":
      await searchClient.index(indexName).deleteDocument(result.id);
      break;
  }
  return result;
});
```

**Strategy B: Periodic Re-index** -- cron job for simpler apps where minutes of staleness is acceptable:

```typescript
// scripts/reindex-search.ts -- run via cron, Vercel Cron, or GitHub Actions
const products = await prisma.product.findMany({
  include: { category: true, brand: true, reviews: true },
});

const documents = products.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  category_name: p.category.name,
  avg_rating: p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length || 0,
  in_stock: p.stock > 0,
}));

await searchClient.index("products").addDocuments(documents);
```

### 4. Tune Relevance Before You Ship

Default relevance works for demos, not production. Key levers:

- **Searchable attributes priority**: Search in `name` first, then `description`. A match in `name` ranks higher.
- **Custom ranking**: After text relevance, sort by `popularity_score`, `review_count`, or `created_at`.
- **Synonyms**: "laptop" should match "notebook computer".
- **Typo tolerance thresholds**: Allow 1 typo for 4+ character words, 2 for 8+.

### 5. Performance: Debounce, Cache, Abort

Search fires on every keystroke. Without care you will hammer your engine and annoy users with flickering results.

```typescript
// hooks/useSearch.ts
import { useCallback, useRef, useState } from "react";

export function useSearch<T>(searchFn: (q: string) => Promise<T[]>, debounceMs = 250) {
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, T[]>>(new Map());

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setIsSearching(false); return; }

    const cached = cacheRef.current.get(query);
    if (cached) { setResults(cached); return; }

    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchFn(query);
        cacheRef.current.set(query, data);
        if (cacheRef.current.size > 100) {
          cacheRef.current.delete(cacheRef.current.keys().next().value!);
        }
        setResults(data);
      } finally { setIsSearching(false); }
    }, debounceMs);
  }, [searchFn, debounceMs]);

  return { results, isSearching, search };
}
```

Note: `react-instantsearch`'s `<SearchBox>` handles debouncing internally. This hook is for custom search inputs.

### 6. Security: Never Expose Admin Keys

Every search engine has admin keys (server-only) and search-only keys (safe for browser).

```typescript
// .env.local -- NEXT_PUBLIC_ prefix = bundled into client JS

// Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=search_only_key    // public: OK
ALGOLIA_ADMIN_KEY=admin_key                       // PRIVATE: server-only

// Meilisearch
NEXT_PUBLIC_MEILISEARCH_HOST=https://ms.example.com
NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=search_key     // public: OK
MEILISEARCH_MASTER_KEY=master_key                 // PRIVATE: server-only

// Typesense
NEXT_PUBLIC_TYPESENSE_HOST=ts.example.com
NEXT_PUBLIC_TYPESENSE_SEARCH_KEY=search_key       // public: OK
TYPESENSE_ADMIN_KEY=admin_key                     // PRIVATE: server-only
```

### 7. Test Search Like You Test APIs

```typescript
describe("Product Search", () => {
  beforeAll(async () => {
    const index = client.index("products_test");
    await index.addDocuments([
      { id: "1", name: "Wireless Bluetooth Headphones", category: "Audio", price: 59.99 },
      { id: "2", name: "USB-C Charging Cable", category: "Accessories", price: 12.99 },
      { id: "3", name: "Mechanical Keyboard", category: "Peripherals", price: 89.99 },
    ]);
    await index.waitForTasks();
  });

  it("finds exact matches", async () => {
    const results = await client.index("products_test").search("keyboard");
    expect(results.hits).toHaveLength(1);
  });

  it("handles typos", async () => {
    const results = await client.index("products_test").search("keybord");
    expect(results.hits).toHaveLength(1);
  });

  it("filters by facet", async () => {
    const results = await client.index("products_test").search("", {
      filter: ["category = Audio"],
    });
    expect(results.hits).toHaveLength(1);
  });
});
```

---

## LLM Instructions

### Algolia

Algolia is fully managed SaaS. You push data to their servers, configure ranking, and query from the frontend with a search-only API key.

**Install:**

```bash
npm install algoliasearch react-instantsearch
```

**Initialize clients:**

```typescript
// lib/algolia.ts
import algoliasearch from "algoliasearch";

// Server-side (for indexing -- never expose to browser)
export const algoliaAdmin = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

// Client-side (search-only key is safe for browser)
export const algoliaSearch = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);
```

**Create index and push records:**

```typescript
// scripts/seed-algolia.ts
import { algoliaAdmin } from "@/lib/algolia";
import { prisma } from "@/lib/db";

async function seedAlgolia() {
  const index = algoliaAdmin.initIndex("products");

  // Configure index settings
  await index.setSettings({
    searchableAttributes: ["name", "brand", "category", "description"],
    attributesForFaceting: [
      "searchable(category)", "searchable(brand)", "price", "in_stock", "rating",
    ],
    customRanking: ["desc(popularity)", "desc(rating)"],
    attributesToRetrieve: ["objectID", "name", "brand", "category", "price", "image_url", "rating", "slug"],
    attributesToSnippet: ["description:30"],
    hitsPerPage: 20,
    typoTolerance: true,
    minWordSizefor1Typo: 4,
    minWordSizefor2Typos: 8,
  });

  const products = await prisma.product.findMany({
    include: { category: true, brand: true },
  });

  // Algolia requires `objectID` as unique identifier
  const records = products.map((p) => ({
    objectID: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category.name,
    brand: p.brand.name,
    rating: p.avgRating,
    popularity: p.salesCount,
    in_stock: p.stock > 0,
    image_url: p.imageUrl,
    slug: p.slug,
  }));

  const { objectIDs } = await index.saveObjects(records);
  console.log(`Indexed ${objectIDs.length} products to Algolia.`);
}

seedAlgolia().catch(console.error);
```

**Sync pipeline (API route for webhook/event-driven updates):**

```typescript
// app/api/webhooks/sync-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { algoliaAdmin } from "@/lib/algolia";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { action, productId } = await req.json();
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const index = algoliaAdmin.initIndex("products");

  if (action === "delete") {
    await index.deleteObject(productId);
    return NextResponse.json({ success: true });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, brand: true },
  });

  if (!product) {
    await index.deleteObject(productId);
    return NextResponse.json({ success: true });
  }

  await index.saveObject({
    objectID: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category.name,
    brand: product.brand.name,
    rating: product.avgRating,
    in_stock: product.stock > 0,
    image_url: product.imageUrl,
    slug: product.slug,
  });

  return NextResponse.json({ success: true });
}
```

**React InstantSearch component:**

```typescript
// components/search/ProductSearch.tsx
"use client";

import {
  InstantSearch, SearchBox, Hits, RefinementList, Pagination,
  Stats, Configure, Highlight, useInstantSearch,
} from "react-instantsearch";
import { algoliaSearch } from "@/lib/algolia";
import Image from "next/image";
import Link from "next/link";

function ProductHit({ hit }: { hit: any }) {
  return (
    <Link href={`/products/${hit.slug}`} className="block p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {hit.image_url && (
          <Image src={hit.image_url} alt={hit.name} width={80} height={80} className="rounded object-cover" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            <Highlight attribute="name" hit={hit} />
          </h3>
          <p className="text-sm text-gray-500">{hit.brand} / {hit.category}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-lg">${hit.price.toFixed(2)}</span>
            <span className="text-sm text-yellow-600">{hit.rating.toFixed(1)} stars</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyQueryBoundary({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { indexUiState } = useInstantSearch();
  if (!indexUiState.query) return fallback;
  return children;
}

export function ProductSearch() {
  return (
    <InstantSearch searchClient={algoliaSearch} indexName="products" routing={true}>
      <Configure hitsPerPage={20} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <SearchBox
          placeholder="Search products..."
          classNames={{
            input: "w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none",
            submit: "hidden",
            reset: "hidden",
          }}
        />
        <EmptyQueryBoundary fallback={<p className="text-gray-500 mt-4">Start typing to search...</p>}>
          <Stats className="text-sm text-gray-500 my-4" />
          <div className="flex gap-8">
            <aside className="w-64 shrink-0 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Category</h3>
                <RefinementList attribute="category" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Brand</h3>
                <RefinementList attribute="brand" searchable showMore />
              </div>
            </aside>
            <main className="flex-1">
              <Hits hitComponent={ProductHit} classNames={{ list: "grid gap-4" }} />
              <Pagination className="mt-8 flex justify-center gap-2" />
            </main>
          </div>
        </EmptyQueryBoundary>
      </div>
    </InstantSearch>
  );
}
```

**Algolia AI Recommendations (optional, paid):**

```typescript
// components/search/Recommendations.tsx
"use client";

import { RelatedProducts, FrequentlyBoughtTogether } from "@algolia/recommend-react";
import recommend from "@algolia/recommend";

const recommendClient = recommend(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

export function ProductRecommendations({ productId }: { productId: string }) {
  return (
    <div className="space-y-8">
      <RelatedProducts
        recommendClient={recommendClient}
        indexName="products"
        objectIDs={[productId]}
        maxRecommendations={4}
        itemComponent={({ item }) => <div className="p-3 border rounded">{item.name} - ${item.price}</div>}
      />
      <FrequentlyBoughtTogether
        recommendClient={recommendClient}
        indexName="products"
        objectIDs={[productId]}
        maxRecommendations={3}
        itemComponent={({ item }) => <div className="p-3 border rounded">{item.name} - ${item.price}</div>}
      />
    </div>
  );
}
```

---

### Meilisearch

Open-source, self-hostable search engine in Rust. Excellent defaults, great DX, best Algolia alternative for teams wanting full control.

**Install:**

```bash
npm install meilisearch react-instantsearch @meilisearch/instant-meilisearch
```

**Run locally (Docker):**

```bash
docker run -d --name meilisearch -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-master-key \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest
```

**Initialize client:**

```typescript
// lib/meilisearch.ts
import { MeiliSearch } from "meilisearch";

// Server-side (master key -- never expose to browser)
export const meiliAdmin = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
});
```

**Create index, configure, and push documents:**

```typescript
// scripts/setup-meilisearch.ts
import { meiliAdmin } from "@/lib/meilisearch";
import { prisma } from "@/lib/db";

async function setup() {
  // Step 1: Create a search-only API key
  const searchKey = await meiliAdmin.createKey({
    name: "Frontend Search Key",
    description: "Search-only key safe for browser",
    actions: ["search"],
    indexes: ["products"],
    expiresAt: null,
  });
  console.log("Search key:", searchKey.key);

  // Step 2: Create and configure index
  await meiliAdmin.createIndex("products", { primaryKey: "id" });
  const index = meiliAdmin.index("products");

  // Searchable attributes (order = priority)
  await index.updateSearchableAttributes(["name", "brand", "category", "description", "tags"]);

  // Filterable attributes (required for faceted search)
  await index.updateFilterableAttributes(["category", "brand", "price", "in_stock", "rating"]);

  // Sortable attributes
  await index.updateSortableAttributes(["price", "rating", "created_at"]);

  // Ranking rules (order matters)
  await index.updateRankingRules([
    "words", "typo", "proximity", "attribute", "sort", "exactness", "rating:desc",
  ]);

  // Synonyms
  await index.updateSynonyms({
    laptop: ["notebook", "portable computer"],
    phone: ["smartphone", "mobile", "cell phone"],
  });

  // Typo tolerance
  await index.updateTypoTolerance({
    enabled: true,
    minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    disableOnAttributes: ["sku"],
  });

  // Step 3: Push documents
  const products = await prisma.product.findMany({
    include: { category: true, brand: true, tags: true },
  });

  const documents = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category.name,
    brand: p.brand.name,
    tags: p.tags.map((t) => t.name),
    rating: p.avgRating,
    in_stock: p.stock > 0,
    image_url: p.imageUrl,
    slug: p.slug,
    created_at: p.createdAt.getTime(),
  }));

  const task = await index.addDocuments(documents);
  await meiliAdmin.waitForTask(task.taskUid);
  console.log(`Indexed ${documents.length} products.`);
}

setup().catch(console.error);
```

**Server-side search (API route):**

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { meiliAdmin } from "@/lib/meilisearch";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const category = req.nextUrl.searchParams.get("category");
  const sort = req.nextUrl.searchParams.get("sort");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");

  const filters: string[] = ["in_stock = true"];
  if (category) filters.push(`category = "${category}"`);

  const sortBy: string[] = [];
  if (sort === "price_asc") sortBy.push("price:asc");
  if (sort === "price_desc") sortBy.push("price:desc");
  if (sort === "rating") sortBy.push("rating:desc");

  const results = await meiliAdmin.index("products").search(query, {
    filter: filters,
    sort: sortBy,
    limit: 20,
    offset: (page - 1) * 20,
    facets: ["category", "brand", "in_stock"],
    attributesToHighlight: ["name", "description"],
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>",
  });

  return NextResponse.json({
    hits: results.hits,
    totalHits: results.estimatedTotalHits,
    facets: results.facetDistribution,
    processingTimeMs: results.processingTimeMs,
  });
}
```

**React integration with `react-instantsearch` adapter:**

```typescript
// lib/meilisearch-client.ts (client-side)
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";

export const { searchClient: meiliSearchClient } = instantMeiliSearch(
  process.env.NEXT_PUBLIC_MEILISEARCH_HOST!,
  process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY!,
  { placeholderSearch: false, primaryKey: "id", finitePagination: true }
);
```

```typescript
// components/search/MeiliProductSearch.tsx
"use client";

import { InstantSearch, SearchBox, Hits, RefinementList, Pagination, Stats, Highlight, SortBy } from "react-instantsearch";
import { meiliSearchClient } from "@/lib/meilisearch-client";
import Link from "next/link";

function ProductHit({ hit }: { hit: any }) {
  return (
    <Link href={`/products/${hit.slug}`} className="block p-4 border rounded-lg hover:shadow-md">
      <h3 className="font-semibold"><Highlight attribute="name" hit={hit} /></h3>
      <p className="text-sm text-gray-500">{hit.brand} / {hit.category}</p>
      <p className="font-bold mt-1">${hit.price.toFixed(2)}</p>
    </Link>
  );
}

export function MeiliProductSearch() {
  return (
    <InstantSearch searchClient={meiliSearchClient} indexName="products">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <SearchBox placeholder="Search products..." classNames={{ input: "flex-1 px-4 py-3 border rounded-lg text-lg", submit: "hidden", reset: "hidden" }} />
          <SortBy items={[
            { label: "Relevance", value: "products" },
            { label: "Price (Low)", value: "products:price:asc" },
            { label: "Price (High)", value: "products:price:desc" },
            { label: "Rating", value: "products:rating:desc" },
          ]} />
        </div>
        <Stats className="text-sm text-gray-500 mb-4" />
        <div className="flex gap-8">
          <aside className="w-64 shrink-0 space-y-6">
            <div><h3 className="font-semibold mb-2">Category</h3><RefinementList attribute="category" /></div>
            <div><h3 className="font-semibold mb-2">Brand</h3><RefinementList attribute="brand" searchable /></div>
          </aside>
          <main className="flex-1">
            <Hits hitComponent={ProductHit} classNames={{ list: "grid gap-4" }} />
            <Pagination className="mt-8 flex justify-center gap-2" />
          </main>
        </div>
      </div>
    </InstantSearch>
  );
}
```

**Multi-index search (searching across types simultaneously):**

```typescript
const results = await meiliAdmin.multiSearch({
  queries: [
    { indexUid: "products", q: query, limit: 5, attributesToHighlight: ["name"] },
    { indexUid: "articles", q: query, limit: 3, attributesToHighlight: ["title"] },
  ],
});
// results.results[0] = product hits, results.results[1] = article hits
```

---

### Typesense

Open-source, in-memory search engine in C++. Extremely fast, built-in geo-search, enforces a schema (unlike Algolia and Meilisearch which are schema-less).

**Install:**

```bash
npm install typesense react-instantsearch typesense-instantsearch-adapter
```

**Run locally (Docker):**

```bash
docker run -d --name typesense -p 8108:8108 \
  -v $(pwd)/typesense-data:/data \
  typesense/typesense:27.1 \
  --data-dir=/data --api-key=your-admin-key --enable-cors
```

**Initialize client:**

```typescript
// lib/typesense.ts
import Typesense from "typesense";

export const typesenseAdmin = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || "localhost",
    port: parseInt(process.env.TYPESENSE_PORT || "8108"),
    protocol: process.env.TYPESENSE_PROTOCOL || "http",
  }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY!,
  connectionTimeoutSeconds: 5,
});
```

**Create collection with schema and index documents:**

```typescript
// scripts/setup-typesense.ts
import { typesenseAdmin } from "@/lib/typesense";
import { prisma } from "@/lib/db";

async function setup() {
  // Step 1: Create search-only API key
  const searchKey = await typesenseAdmin.keys().create({
    description: "Frontend search-only key",
    actions: ["documents:search"],
    collections: ["products", "stores"],
  });
  console.log("Search key:", searchKey.value);

  // Step 2: Create collection with schema (Typesense requires this upfront)
  try { await typesenseAdmin.collections("products").delete(); } catch { /* doesn't exist */ }

  await typesenseAdmin.collections().create({
    name: "products",
    fields: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "brand", type: "string", facet: true },
      { name: "category", type: "string", facet: true },
      { name: "tags", type: "string[]", facet: true },
      { name: "price", type: "float", facet: true },
      { name: "rating", type: "float" },
      { name: "review_count", type: "int32" },
      { name: "in_stock", type: "bool", facet: true },
      { name: "image_url", type: "string", index: false },
      { name: "slug", type: "string", index: false },
      { name: "created_at", type: "int64" },
      { name: "location", type: "geopoint", optional: true },
    ],
    default_sorting_field: "rating",
    token_separators: ["-", "/"],
    symbols_to_index: ["+", "#"],
  });

  // Step 3: Index documents
  const products = await prisma.product.findMany({
    include: { category: true, brand: true, tags: true },
  });

  const documents = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    brand: p.brand.name,
    category: p.category.name,
    tags: p.tags.map((t) => t.name),
    price: p.price,
    rating: p.avgRating,
    review_count: p.reviewCount,
    in_stock: p.stock > 0,
    image_url: p.imageUrl,
    slug: p.slug,
    created_at: Math.floor(p.createdAt.getTime() / 1000),
    ...(p.latitude && p.longitude ? { location: [p.latitude, p.longitude] } : {}),
  }));

  const importResults = await typesenseAdmin.collections("products").documents().import(documents, { action: "upsert" });
  const failures = importResults.filter((r) => !r.success);
  console.log(`Indexed ${documents.length - failures.length} products. ${failures.length} failures.`);
}

setup().catch(console.error);
```

**Search queries with `query_by`:**

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { typesenseAdmin } from "@/lib/typesense";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const category = req.nextUrl.searchParams.get("category");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");

  const filters: string[] = ["in_stock:=true"];
  if (category) filters.push(`category:=${category}`);

  const results = await typesenseAdmin.collections("products").documents().search({
    q: query || "*",
    query_by: "name,brand,category,description,tags",
    query_by_weights: "5,3,3,1,2",
    filter_by: filters.join(" && "),
    sort_by: "_text_match:desc,rating:desc",
    page,
    per_page: 20,
    facet_by: "category,brand,in_stock",
    highlight_full_fields: "name,description",
    num_typos: 2,
  });

  return NextResponse.json({
    hits: results.hits?.map((h) => ({ ...h.document, _highlight: h.highlights })),
    totalHits: results.found,
    facets: results.facet_counts,
  });
}
```

**Geo-search (Typesense's built-in strength):**

```typescript
// Find stores within a radius, sorted by distance
async function searchNearbyStores(lat: number, lng: number, radiusKm: number) {
  const results = await typesenseAdmin.collections("stores").documents().search({
    q: "*",
    query_by: "name,address",
    filter_by: `location:(${lat}, ${lng}, ${radiusKm} km)`,
    sort_by: `location(${lat}, ${lng}):asc`,
    per_page: 20,
  });

  return results.hits?.map((h) => ({
    ...h.document,
    distance_km: h.geo_distance_meters
      ? (h.geo_distance_meters.location / 1000).toFixed(1)
      : null,
  }));
}

// Example: coffee shops near Times Square
const stores = await searchNearbyStores(40.758, -73.9855, 5);
```

**Stores collection schema for geo-search:**

```typescript
await typesenseAdmin.collections().create({
  name: "stores",
  fields: [
    { name: "name", type: "string" },
    { name: "address", type: "string" },
    { name: "city", type: "string", facet: true },
    { name: "type", type: "string", facet: true },
    { name: "rating", type: "float" },
    { name: "location", type: "geopoint" },   // [lat, lng] format
  ],
  default_sorting_field: "rating",
});
```

**React integration with `typesense-instantsearch-adapter`:**

```typescript
// lib/typesense-search-client.ts (client-side)
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";

const typesenseAdapter = new TypesenseInstantSearchAdapter({
  server: {
    nodes: [{
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST!,
      port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT || "443"),
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || "https",
    }],
    apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY!,
  },
  additionalSearchParameters: {
    query_by: "name,brand,category,description,tags",
    query_by_weights: "5,3,3,1,2",
    num_typos: 2,
  },
});

export const typesenseSearchClient = typesenseAdapter.searchClient;
```

```typescript
// components/search/TypesenseProductSearch.tsx
"use client";

import { InstantSearch, SearchBox, Hits, RefinementList, Pagination, Highlight, SortBy, Configure } from "react-instantsearch";
import { typesenseSearchClient } from "@/lib/typesense-search-client";
import Link from "next/link";

function ProductHit({ hit }: { hit: any }) {
  return (
    <Link href={`/products/${hit.slug}`} className="block p-4 border rounded-lg hover:shadow-md">
      <h3 className="font-semibold"><Highlight attribute="name" hit={hit} /></h3>
      <p className="text-sm text-gray-500">{hit.brand} / {hit.category}</p>
      <span className="font-bold">${hit.price.toFixed(2)}</span>
    </Link>
  );
}

export function TypesenseProductSearch() {
  return (
    <InstantSearch searchClient={typesenseSearchClient} indexName="products">
      <Configure hitsPerPage={20} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <SearchBox placeholder="Search products..." classNames={{ input: "flex-1 px-4 py-3 border rounded-lg text-lg", submit: "hidden", reset: "hidden" }} />
          <SortBy items={[
            { label: "Relevance", value: "products" },
            { label: "Price (Low)", value: "products/sort/price:asc" },
            { label: "Price (High)", value: "products/sort/price:desc" },
            { label: "Rating", value: "products/sort/rating:desc" },
          ]} />
        </div>
        <div className="flex gap-8">
          <aside className="w-64 shrink-0 space-y-6">
            <div><h3 className="font-semibold mb-2">Category</h3><RefinementList attribute="category" /></div>
            <div><h3 className="font-semibold mb-2">Brand</h3><RefinementList attribute="brand" searchable /></div>
          </aside>
          <main className="flex-1">
            <Hits hitComponent={ProductHit} classNames={{ list: "grid gap-4" }} />
            <Pagination className="mt-8 flex justify-center gap-2" />
          </main>
        </div>
      </div>
    </InstantSearch>
  );
}
```

---

## Examples

### Swapping Between Search Engines

All three engines support `react-instantsearch` via adapters, so you can build a universal search UI:

```typescript
// lib/search-client.ts -- change NEXT_PUBLIC_SEARCH_PROVIDER to swap engines
import type { SearchClient } from "instantsearch.js";

type Provider = "algolia" | "meilisearch" | "typesense";
const PROVIDER = (process.env.NEXT_PUBLIC_SEARCH_PROVIDER as Provider) || "algolia";

let searchClient: SearchClient;

switch (PROVIDER) {
  case "algolia": {
    const algoliasearch = (await import("algoliasearch")).default;
    searchClient = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
    ) as unknown as SearchClient;
    break;
  }
  case "meilisearch": {
    const { instantMeiliSearch } = await import("@meilisearch/instant-meilisearch");
    const { searchClient: mc } = instantMeiliSearch(
      process.env.NEXT_PUBLIC_MEILISEARCH_HOST!,
      process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY!
    );
    searchClient = mc as unknown as SearchClient;
    break;
  }
  case "typesense": {
    const TypesenseAdapter = (await import("typesense-instantsearch-adapter")).default;
    const adapter = new TypesenseAdapter({
      server: {
        nodes: [{ host: process.env.NEXT_PUBLIC_TYPESENSE_HOST!, port: 443, protocol: "https" }],
        apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY!,
      },
      additionalSearchParameters: { query_by: "name,brand,category,description" },
    });
    searchClient = adapter.searchClient as unknown as SearchClient;
    break;
  }
}

export { searchClient };
```

### Project Structure (Any Engine)

```
project/
  app/
    search/page.tsx              # Search page (server component wrapper)
    api/webhooks/sync-search/route.ts  # Webhook for DB sync
  components/search/
    ProductSearch.tsx             # Client component with InstantSearch
  lib/
    algolia.ts                   # OR meilisearch.ts OR typesense.ts
  scripts/
    seed-search.ts               # One-time index setup + seed
  docker-compose.yml             # For Meilisearch or Typesense
  .env.local                     # API keys
```

---

## Common Mistakes

### 1. Exposing Admin Keys to the Browser

**Wrong:** Using `NEXT_PUBLIC_ALGOLIA_ADMIN_KEY` in a client file.
**Fix:** Admin keys must never have the `NEXT_PUBLIC_` prefix. Use search-only keys on the client.

### 2. Not Debouncing Custom Search Input

**Wrong:** `<input onChange={(e) => search(e.target.value)} />` fires on every keystroke.
**Fix:** Use `useDebouncedCallback` at 200-300ms, or use `react-instantsearch`'s `<SearchBox>` which debounces automatically.

### 3. Mirroring Normalized Database Schema in Indexes

**Wrong:** Three separate indexes for `users`, `orders`, `products` that mirror your tables.
**Fix:** One denormalized `products` index with all display-ready fields (`category_name`, `avg_rating`, `brand_name`).

### 4. Not Waiting for Meilisearch Async Tasks

**Wrong:** Calling `index.addDocuments(docs)` then immediately searching -- Meilisearch indexing is async.
**Fix:** In scripts and tests, call `await client.waitForTask(task.taskUid)` before querying.

### 5. Forgetting to Configure Filterable/Facet Attributes

**Wrong:** Trying to filter by `category` without declaring it filterable first.
**Fix:** Algolia: `attributesForFaceting: ["category"]`. Meilisearch: `updateFilterableAttributes(["category"])`. Typesense: `{ facet: true }` in schema.

### 6. Indexing Huge Records

**Wrong:** Including full HTML blog content (50KB) or hundreds of nested comment objects per record.
**Fix:** Index short excerpts and plain text. Store large content in your database. Keep records under 10KB.

### 7. Not Setting Searchable Attribute Priority

**Wrong:** All attributes at equal priority so a `description` match ranks the same as a `name` match.
**Fix:** Order `searchableAttributes` by priority: `name` first, `description` last. Typesense uses `query_by_weights`.

### 8. Using Search as Your Primary Data Store

**Wrong:** Fetching product detail pages from the search index.
**Fix:** Search is for **finding** things. Your database is for **loading** things. Query the database for detail pages.

### 9. Forgetting Empty and Error States

**Wrong:** `<SearchBox /><Hits />` with no handling for errors, loading, or zero results.
**Fix:** Use `useInstantSearch()` to access `status`, `error`, and `results.nbHits` for proper UI states.

### 10. Not Testing Typos and Edge Cases

**Wrong:** Only testing with exact, well-formed queries like "Wireless Headphones".
**Fix:** Test typos (`"keybord"`), partial queries (`"wire"`), empty queries, special characters (`"c++"`), and very long input.

---

> **See also:** [Databases](../Databases/databases.md) for database-native full-text search (Postgres `tsvector`, MySQL `FULLTEXT`) | [Backend/Database-Design](../../Backend/Database-Design/database-design.md) for query patterns and when to reach for a dedicated search engine
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
