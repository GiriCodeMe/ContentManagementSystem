import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import PageViewer from "./components/PageViewer";

export default function App() {
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const searchTimer = useRef(null);

  // Load pages list on mount
  useEffect(() => {
    fetch("/api/pages")
      .then((r) => r.json())
      .then((data) => {
        setPages(data);
        if (data.length > 0) setSelectedSlug(data[0].slug);
      })
      .catch(console.error);
  }, []);

  // Load selected page content
  useEffect(() => {
    if (!selectedSlug) return;
    setIsLoadingPage(true);
    fetch(`/api/pages/${selectedSlug}`)
      .then((r) => r.json())
      .then((data) => {
        setCurrentPage(data);
        setIsLoadingPage(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoadingPage(false);
      });
  }, [selectedSlug]);

  // Debounced full-text search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then(setSearchResults)
        .catch(console.error);
    }, 300);
  }, [searchQuery]);

  const handleSelectPage = useCallback((slug) => {
    setSelectedSlug(slug);
    setSearchQuery("");
    setSelectedTag(null);
  }, []);

  const handleSave = async (slug, markdown, category, tags) => {
    const res = await fetch(`/api/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, category, tags }),
    });
    if (!res.ok) throw new Error("Save failed");
    // Refresh the page data and list
    const [updated, list] = await Promise.all([
      fetch(`/api/pages/${slug}`).then((r) => r.json()),
      fetch("/api/pages").then((r) => r.json()),
    ]);
    setCurrentPage(updated);
    setPages(list);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">CMS</div>
          <h1>TechVision Knowledge Base</h1>
        </div>

        <div className="header-search">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2.2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search pages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span
              style={{
                cursor: "pointer",
                color: "rgba(255,255,255,.7)",
                fontSize: "16px",
                lineHeight: 1,
              }}
              onClick={() => setSearchQuery("")}
            >
              ×
            </span>
          )}
        </div>
      </header>

      <div className="main-layout">
        <Sidebar
          pages={pages}
          selectedSlug={selectedSlug}
          onSelectPage={handleSelectPage}
          searchQuery={searchQuery}
          searchResults={searchResults}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
        />

        <PageViewer
          page={currentPage}
          isLoading={isLoadingPage}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
