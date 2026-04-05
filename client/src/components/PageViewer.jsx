import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/vs2015.css";

export default function PageViewer({ page, isLoading, onSave }) {
  const contentRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [activeTocId, setActiveTocId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editMd, setEditMd] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Re-run whenever the page content changes
  useEffect(() => {
    if (!contentRef.current || !page) return;

    // Assign stable IDs to h2/h3 and build ToC
    const headings = Array.from(contentRef.current.querySelectorAll("h2, h3"));
    const tocItems = headings.map((h, i) => {
      const id = `h-${i}`;
      h.id = id;
      return { id, text: h.textContent, level: parseInt(h.tagName[1]) };
    });
    setToc(tocItems);
    setActiveTocId(tocItems[0]?.id ?? null);

    // Syntax highlight every code block
    contentRef.current.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });

    // Add copy buttons to each <pre>
    contentRef.current.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.onclick = () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 2000);
        });
      };
      pre.appendChild(btn);
    });
  }, [page]);

  // IntersectionObserver to highlight active ToC item on scroll
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveTocId(e.target.id);
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: "-70px 0px -60% 0px" },
    );
    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc]);

  const handleEdit = () => {
    setEditMd(page.markdown);
    setEditing(true);
    setSaveMsg("");
  };
  const handleCancel = () => {
    setEditing(false);
    setSaveMsg("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(page.slug, editMd, page.category, page.tags);
      setEditing(false);
      setSaveMsg("ok");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg("err:" + err.message);
    } finally {
      setSaving(false);
    }
  };

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="content-wrapper">
        <div className="content-main">
          <div className="loading">
            <div className="loading-spinner" />
            Loading…
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="content-wrapper">
        <div className="content-main">
          <div className="empty-state">
            <h3>Select a page from the sidebar</h3>
            <p>Choose any document to start reading</p>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(page.lastModified).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
  const saveMsgOk = saveMsg === "ok";
  const saveMsgErr = saveMsg.startsWith("err:");

  return (
    <div className="content-wrapper">
      <div className="content-main">
        <div className="page-container">
          {/* Breadcrumbs */}
          <nav className="breadcrumbs">
            <span className="bc-link">Home</span>
            <span className="bc-sep">›</span>
            <span className="bc-link">{page.category}</span>
            <span className="bc-sep">›</span>
            <span>{page.title}</span>
          </nav>

          {/* Metadata bar */}
          <div className="page-meta-bar">
            <div className="meta-item">📄 {page.wordCount} words</div>
            <div className="meta-divider" />
            <div className="meta-item">⏱ {page.readingTime} min read</div>
            <div className="meta-divider" />
            <div className="meta-item">🗓 {formattedDate}</div>
          </div>

          {/* Title row + Edit button */}
          {!editing && (
            <div className="page-heading-row">
              <h1 className="page-title">{page.title}</h1>
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>
                ✏ Edit
              </button>
            </div>
          )}

          {/* Tag chips */}
          {!editing && page.tags.length > 0 && (
            <div className="content-tags">
              {page.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Edit mode */}
          {editing ? (
            <>
              <div className="page-heading-row">
                <h1 className="page-title">Editing: {page.title}</h1>
              </div>
              <textarea
                className="edit-textarea"
                value={editMd}
                onChange={(e) => setEditMd(e.target.value)}
              />
              <div className="edit-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "💾 Save"}
                </button>
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                {saveMsgOk && (
                  <span className="save-msg ok">Saved successfully!</span>
                )}
                {saveMsgErr && (
                  <span className="save-msg err">{saveMsg.slice(4)}</span>
                )}
              </div>
            </>
          ) : (
            <div
              ref={contentRef}
              className="page-content"
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
          )}
        </div>
      </div>

      {/* Right ToC */}
      {!editing && toc.length > 0 && (
        <div className="toc">
          <div className="toc-inner">
            <div className="toc-title">On this page</div>
            {toc.map((item) => (
              <a
                key={item.id}
                className={[
                  "toc-item",
                  item.level === 3 ? "h3" : "",
                  activeTocId === item.id ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => scrollTo(item.id)}
              >
                {item.text}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
