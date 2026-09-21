import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceNav, BackLink } from "../WorkspaceNav";

function renderNav() {
  return render(
    <MemoryRouter>
      <WorkspaceNav />
    </MemoryRouter>,
  );
}

describe("WorkspaceNav", () => {
  it("renders Workbench projects link", () => {
    renderNav();
    expect(screen.getByRole("link", { name: /workbench projects/i })).toHaveAttribute("href", "/projects");
  });

  it("renders Assurance registry link", () => {
    renderNav();
    expect(screen.getByRole("link", { name: /assurance registry/i })).toHaveAttribute("href", "/assurance");
  });

  it("renders Portfolio (week 3) link", () => {
    renderNav();
    expect(screen.getByRole("link", { name: /portfolio \(week 3\)/i })).toHaveAttribute("href", "/portfolio");
  });

  it("shows ECSS disclaimer text", () => {
    renderNav();
    expect(screen.getByText(/ECSS-informed · not certified/i)).toBeInTheDocument();
  });
});

describe("BackLink", () => {
  it("renders a link with the correct href and label", () => {
    render(
      <MemoryRouter>
        <BackLink to="/portfolio" label="Back to portfolio" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /back to portfolio/i });
    expect(link).toHaveAttribute("href", "/portfolio");
  });

  it("renders the arrow icon", () => {
    render(
      <MemoryRouter>
        <BackLink to="/portfolio" label="Back" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Back")).toBeInTheDocument();
  });
});
