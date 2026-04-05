import { render, screen, fireEvent } from "@testing-library/react";
import PageViewer from "../components/PageViewer";

// highlight.js performs DOM manipulation; mock it for unit tests
vi.mock("highlight.js", () => ({
  default: { highlightElement: vi.fn() },
}));
vi.mock("highlight.js/styles/vs2015.css", () => ({}));

const PAGE = {
  slug: "about",
  title: "About Us",
  html: "<h2>Our Mission</h2><p>We help businesses.</p><pre><code>const x = 1</code></pre>",
  markdown: "## Our Mission\nWe help businesses.\n```js\nconst x = 1\n```",
  category: "Company",
  tags: ["overview", "team"],
  wordCount: 150,
  readingTime: 1,
  lastModified: "2026-04-01T10:00:00.000Z",
};

describe("PageViewer", () => {
  test("shows loading spinner when isLoading=true", () => {
    render(<PageViewer page={null} isLoading={true} onSave={vi.fn()} />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  test("shows empty state when no page", () => {
    render(<PageViewer page={null} isLoading={false} onSave={vi.fn()} />);
    expect(
      screen.getByText("Select a page from the sidebar"),
    ).toBeInTheDocument();
  });

  test("renders page title", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "About Us" }),
    ).toBeInTheDocument();
  });

  test("renders breadcrumbs with category", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "About Us" }),
    ).toBeInTheDocument();
  });

  test("renders metadata bar", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    expect(screen.getByText(/150 words/)).toBeInTheDocument();
    expect(screen.getByText(/1 min read/)).toBeInTheDocument();
  });

  test("renders tags", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    expect(screen.getByText("overview")).toBeInTheDocument();
    expect(screen.getByText("team")).toBeInTheDocument();
  });

  test("enters edit mode on Edit click", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText(/Edit/));
    expect(screen.getByText(/Editing: About Us/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("textarea pre-fills with page markdown", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText(/Edit/));
    const textarea = screen.getByRole("textbox");
    expect(textarea.value).toBe(PAGE.markdown);
  });

  test("cancel returns to view mode", () => {
    render(<PageViewer page={PAGE} isLoading={false} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText(/Edit/));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "About Us" }),
    ).toBeInTheDocument();
  });

  test("calls onSave with correct args", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PageViewer page={PAGE} isLoading={false} onSave={onSave} />);
    fireEvent.click(screen.getByText(/Edit/));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: { value: "## Updated\nNew content" },
    });
    fireEvent.click(screen.getByText(/Save/));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      "about",
      "## Updated\nNew content",
      "Company",
      ["overview", "team"],
    );
  });
});
