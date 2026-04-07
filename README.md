# Folio Writer

Folio Writer is a web-based Microsoft Word style editor built with Next.js, React, and Tiptap. It ships with a rich WYSIWYG writing surface, local autosave, Markdown export, and server-backed PDF and DOCX export routes for web deployment.

<img width="1631" height="941" alt="image" src="https://github.com/user-attachments/assets/c7e2d4b4-7829-4674-96b2-c994b32ac009" />

## Live Preview

- Vercel preview: [https://skill-deploy-mgq84nbtnb-codex-agent-deploys.vercel.app](https://skill-deploy-mgq84nbtnb-codex-agent-deploys.vercel.app)

## Features

- Rich text editing with headings, lists, checklists, links, tables, quotes, code blocks, images, colors, and highlights
- Slash commands for fast document structure changes
- Local autosave and template-based document starters
- Live Markdown inspector
- Export to `.md`, `.pdf`, and `.docx`
- Responsive editor workspace designed for browser deployment

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Commands

```bash
npm run lint
npm run build
npm run start
```

## Tech Stack

- Next.js 16
- React 19
- Tiptap
- Tailwind CSS 4
- `@react-pdf/renderer`
- `docx`
