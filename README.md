# Vibe Code Bible

A comprehensive documentation site for vibe coding — built with [Fumadocs](https://fumadocs.dev) and [Next.js](https://nextjs.org).

## Viewing the Docs

Visit the live site and navigate to the `/docs` route to browse all documentation.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/docs](http://localhost:3000/docs) to view the docs locally.

## Project Structure

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | Landing page.                                          |
| `app/docs`                | Documentation layout and pages.                        |
| `content/docs`            | MDX documentation source files.                        |
| `app/api/search/route.ts` | Route Handler for search.                              |
