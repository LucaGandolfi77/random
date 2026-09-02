import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/utils";
import { SiteLayout } from "../../../layouts/SiteLayout";
import { HomePage, ExpertisePage, CvPage, FlagshipPage, PublicationsIndexPage } from "../site-pages";
import { publications, profile } from "../../../content";

afterEach(() => vi.restoreAllMocks());

describe("Week-4 professional site", () => {
  it("homepage shows the professional title and all four project cards", async () => {
    renderWithProviders(<HomePage />, { path: "/", initialEntry: "/" });
    expect(await screen.findByRole("heading", { name: profile.professionalTitle })).toBeInTheDocument();
    for (const project of profile.projects) {
      expect(screen.getAllByRole("link", { name: project.title }).length).toBeGreaterThan(0);
    }
  });

  it("expertise page renders the four focus areas", async () => {
    renderWithProviders(<ExpertisePage />, { path: "/expertise", initialEntry: "/expertise" });
    expect(await screen.findByRole("heading", { name: "Embedded AI Engineering" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ML Verification" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Space AI Assurance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Runtime Safety" })).toBeInTheDocument();
  });

  it("CV page lists the twelve core competencies and a working print control", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    renderWithProviders(<CvPage />, { path: "/cv", initialEntry: "/cv" });
    expect(await screen.findByTestId("cv")).toBeInTheDocument();
    expect(screen.getAllByText(profile.professionalTitle).length).toBeGreaterThan(0);
    expect(screen.getByText("Core competencies")).toBeInTheDocument();
    expect(screen.getByText("Embedded AI and ML inference")).toBeInTheDocument();
    expect(screen.getByText("Runtime monitoring and drift detection")).toBeInTheDocument();
    expect(profile.competencies).toHaveLength(12);
    await userEvent.click(screen.getByTestId("print-cv"));
    expect(printSpy).toHaveBeenCalled();
  });

  it("flagship page shows the deployment regions and architecture", async () => {
    renderWithProviders(<FlagshipPage />, { path: "/flagship", initialEntry: "/flagship" });
    expect(await screen.findByRole("heading", { name: "Lunar Landing Safety Cage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Architecture" })).toBeInTheDocument();
    expect(screen.getAllByText("CONDITIONAL_GO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NO_GO").length).toBeGreaterThan(0);
  });

  it("publications index lists the four articles", async () => {
    renderWithProviders(<PublicationsIndexPage />, { path: "/publications", initialEntry: "/publications" });
    expect(publications).toHaveLength(4);
    expect(await screen.findByRole("heading", { name: "Publications" })).toBeInTheDocument();
    for (const article of publications) {
      expect(screen.getAllByRole("link", { name: article.title }).length).toBeGreaterThan(0);
    }
  });

  it("mobile navigation opens an accessible menu", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SiteLayout>
        <HomePage />
      </SiteLayout>,
      { path: "/", initialEntry: "/" },
    );
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const menu = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(menu).getByRole("link", { name: "Publications" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "CV" })).toBeInTheDocument();
  });
});
