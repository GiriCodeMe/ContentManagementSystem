Read the AGENTS.md file in this project. Build the complete CMS application as described:
Backend (server/index.js): Create an Express API with two endpoints — GET /api/pages returns a list of all markdown files (slug + title extracted from first heading), and GET /api/pages/:slug returns the content of one file converted from markdown to HTML using the "marked" package.
Frontend (client/src/): Create a React app with a sidebar showing all pages, a main content area that renders the selected page's HTML, and a search bar that filters pages in real-time.
Wire them together: the frontend fetches data from the backend API. Clicking a page in the sidebar loads its content. The first page loads by default.
The server/content/ folder already has 7 markdown files — use them as the data source.

Before you start, ask me which UI theme I want (A, B, or C — see AGENTS.md). Then build everything in one go. Make sure the app runs with npm run dev from the root folder.

I want to build a web portal that shows documents from a folder — with a sidebar menu, page viewer, and search. It has a backend that reads files and a frontend that displays them. Read the AGENTS.md for details. Before writing any code, ask me questions about what I want — use simple, non-technical language. Then propose a plan and build it step by step.

Redesign the UI of this CMS portal to match the visual style of epam.com — use their color palette, typography style, and overall look and feel. Browse https://epam.com for reference. Keep all existing functionality intact.

Breadcrumbs and Metadata
Add breadcrumb navigation to the content area: [DESCRIBE BREADCRUMBS — e.g., "Home > Page Title" at the top of each page]. Also display page metadata: [LIST METADATA — e.g., file creation date, word count, estimated reading time]. Style the metadata [DESCRIBE STYLE — e.g., as a subtle gray bar below the breadcrumbs].

Syntax Highlighting
Add syntax highlighting for code blocks in the markdown content. Use [LIBRARY — e.g., highlight.js or Prism.js] to highlight code in [LANGUAGES — e.g., JavaScript, Python, HTML, CSS]. Style the code blocks with [DESCRIBE STYLE — e.g., a dark background, rounded corners, and a "Copy" button in the top-right corner].

Table of Contents
Add an auto-generated Table of Contents for each page. The ToC should [DESCRIBE BEHAVIOR — e.g., appear as a sidebar on the right side of the content area, show all H2 and H3 headings as clickable links]. When clicking a ToC item, [DESCRIBE SCROLL — e.g., smoothly scroll to that heading]. Highlight [DESCRIBE ACTIVE STATE — e.g., the currently visible heading in the ToC as the user scrolls].

CRUD editing — the ability to edit page content directly in the browser (Edit button → text area with markdown → Save writes back to the server)
Categories and tags — each page can have a category and tags (at the top of the .md file). The sidebar groups pages by category; tags are clickable and work as filters
Full-text search — enhanced search: searches not only by titles but also by page content. Shows snippets with highlighted matching words


## themes

	Theme	Description	Style
1	A — Documentation Portal	Clean white, blue accents	Technical documentation
2	B — Internal Wiki (EPAM)	EPAM blue header, gray sidebar	Corporate internal portal
3	C — Knowledge Base	Dark sidebar, light content area	Modern knowledge base

