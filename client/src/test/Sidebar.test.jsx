import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../components/Sidebar";

const PAGES = [
  {
    slug: "about",
    title: "About Us",
    category: "Company",
    tags: ["overview", "team"],
  },
  { slug: "faq", title: "FAQ", category: "Support", tags: ["faq", "pricing"] },
  {
    slug: "services",
    title: "Services",
    category: "Services",
    tags: ["development"],
  },
];

function renderSidebar(overrides = {}) {
  const props = {
    pages: PAGES,
    selectedSlug: "about",
    onSelectPage: vi.fn(),
    searchQuery: "",
    searchResults: [],
    selectedTag: null,
    onTagSelect: vi.fn(),
    ...overrides,
  };
  return { ...render(<Sidebar {...props} />), props };
}

describe("Sidebar", () => {
  test("renders category headers", () => {
    renderSidebar();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  test("renders page titles", () => {
    renderSidebar();
    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  test("marks active page", () => {
    renderSidebar({ selectedSlug: "faq" });
    const item = screen.getByText("FAQ").closest(".sidebar-item");
    expect(item).toHaveClass("active");
  });

  test("calls onSelectPage when page clicked", () => {
    const { props } = renderSidebar();
    fireEvent.click(screen.getByText("FAQ"));
    expect(props.onSelectPage).toHaveBeenCalledWith("faq");
  });

  test("collapses category on header click", () => {
    renderSidebar();
    const header = screen
      .getByText("Company")
      .closest(".sidebar-section-header");
    fireEvent.click(header);
    expect(header).toHaveClass("collapsed");
  });

  test("renders all tags", () => {
    renderSidebar();
    expect(screen.getByText("overview")).toBeInTheDocument();
    expect(screen.getByText("faq")).toBeInTheDocument();
  });

  test("active tag is highlighted", () => {
    renderSidebar({ selectedTag: "faq" });
    const tag = screen.getByText("faq");
    expect(tag).toHaveClass("active");
  });

  test("calls onTagSelect when tag clicked", () => {
    const { props } = renderSidebar();
    fireEvent.click(screen.getByText("overview"));
    expect(props.onTagSelect).toHaveBeenCalledWith("overview");
  });

  test("shows search results when searchQuery >= 2 chars", () => {
    const results = [
      { slug: "about", title: "About Us", snippet: "TechVision consulting" },
    ];
    renderSidebar({ searchQuery: "tech", searchResults: results });
    expect(screen.getByText("About Us")).toBeInTheDocument();
    // snippet is split by <mark> tags so check the container text
    const snippet = document.querySelector(".search-result-snippet");
    expect(snippet.textContent).toContain("TechVision");
  });

  test("shows no-match message when search returns empty", () => {
    renderSidebar({ searchQuery: "zzz", searchResults: [] });
    expect(screen.getByText("No pages match your search")).toBeInTheDocument();
  });
});
