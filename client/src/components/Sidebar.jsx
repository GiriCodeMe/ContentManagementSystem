import { useState } from "react";

function highlightSnippet(snippet, query) {
  if (!query) return snippet;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return snippet.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
}

export default function Sidebar({
  pages,
  selectedSlug,
  onSelectPage,
  searchQuery,
  searchResults,
  selectedTag,
  onTagSelect,
}) {
  const [collapsed, setCollapsed] = useState({});

  const isSearching = searchQuery.trim().length >= 2;

  // Group pages by category
  const categories = {};
  for (const page of pages) {
    const cat = page.category || "General";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(page);
  }

  // All unique tags
  const allTags = [...new Set(pages.flatMap((p) => p.tags))];

  // When tag filter is active, filter pages per category
  const visibleCategories = {};
  for (const [cat, catPages] of Object.entries(categories)) {
    const filtered = selectedTag
      ? catPages.filter((p) => p.tags.includes(selectedTag))
      : catPages;
    if (filtered.length > 0) visibleCategories[cat] = filtered;
  }

  const toggle = (cat) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <aside className="sidebar">
      {/* Page list grouped by category */}
      {!isSearching && (
        <>
          {Object.entries(visibleCategories).map(([cat, catPages]) => (
            <div key={cat} className="sidebar-section">
              <div
                className={`sidebar-section-header${collapsed[cat] ? " collapsed" : ""}`}
                onClick={() => toggle(cat)}
              >
                {cat}
                <span className="chevron">▾</span>
              </div>
              {!collapsed[cat] &&
                catPages.map((page) => (
                  <div
                    key={page.slug}
                    className={`sidebar-item${selectedSlug === page.slug ? " active" : ""}`}
                    onClick={() => onSelectPage(page.slug)}
                  >
                    {page.title}
                  </div>
                ))}
            </div>
          ))}

          {/* Tag filter panel */}
          {allTags.length > 0 && (
            <div className="sidebar-tags">
              <div className="sidebar-tags-label">Filter by tag</div>
              {allTags.map((tag) => (
                <span
                  key={tag}
                  className={`tag${selectedTag === tag ? " active" : ""}`}
                  onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Full-text search results */}
      {isSearching && (
        <div className="search-results">
          <div className="search-results-header">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
            for &ldquo;{searchQuery}&rdquo;
          </div>
          {searchResults.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 16px" }}>
              <p>No pages match your search</p>
            </div>
          ) : (
            searchResults.map((r) => (
              <div
                key={r.slug}
                className="search-result"
                onClick={() => onSelectPage(r.slug)}
              >
                <div className="search-result-title">{r.title}</div>
                <div
                  className="search-result-snippet"
                  dangerouslySetInnerHTML={{
                    __html: highlightSnippet(r.snippet, searchQuery),
                  }}
                />
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
