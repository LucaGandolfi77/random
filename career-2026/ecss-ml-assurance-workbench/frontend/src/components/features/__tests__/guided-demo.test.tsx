import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { GuidedDemo, StartDemoButton } from "../GuidedDemo";

function renderDemo(onExit = vi.fn()) {
  return render(
    <MemoryRouter>
      <GuidedDemo onExit={onExit} />
    </MemoryRouter>,
  );
}

function renderWithButton() {
  return render(
    <MemoryRouter>
      <StartDemoButton />
    </MemoryRouter>,
  );
}

describe("StartDemoButton", () => {
  it("renders the launch button with default label", () => {
    renderWithButton();
    expect(screen.getByRole("button", { name: /start guided demo/i })).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(
      <MemoryRouter>
        <StartDemoButton label="Try Demo" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /try demo/i })).toBeInTheDocument();
  });

  it("opens the demo panel when clicked", async () => {
    const user = userEvent.setup();
    renderWithButton();
    await user.click(screen.getByRole("button", { name: /start guided demo/i }));
    expect(screen.getByRole("region", { name: /guided demo step 1 of 10/i })).toBeInTheDocument();
  });
});

describe("GuidedDemo", () => {
  it("renders step 1 by default", () => {
    renderDemo();
    expect(screen.getByRole("region", { name: /guided demo step 1 of 10/i })).toBeInTheDocument();
    expect(screen.getByText("Portfolio overview")).toBeInTheDocument();
    expect(screen.getByText(/The Workbench tracks four aerospace/i)).toBeInTheDocument();
  });

  it("shows the progress bar", () => {
    renderDemo();
    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("aria-valuenow", "1");
    expect(progress).toHaveAttribute("aria-valuemax", "10");
  });

  it("navigates to the next step", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Project detail")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("navigates to the previous step", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText("Portfolio overview")).toBeInTheDocument();
  });

  it("disables Previous button on first step", () => {
    renderDemo();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("shows Finish demo button on last step", async () => {
    const user = userEvent.setup();
    renderDemo();
    // Navigate to last step (step 10)
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
    expect(screen.getByText("Back to the start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finish demo/i })).toBeInTheDocument();
  });

  it("calls onExit when close button is clicked", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    renderDemo(onExit);
    await user.click(screen.getByRole("button", { name: /exit guided demo/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("calls onExit when Finish demo is clicked", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    renderDemo(onExit);
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
    await user.click(screen.getByRole("button", { name: /finish demo/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
