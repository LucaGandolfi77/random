import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from '../App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('Accessibility Tests', () => {
  it('App should have no accessibility violations', async () => {
    const { container } = renderApp();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('Homepage should have no accessibility violations', async () => {
    const { container } = renderApp();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe('WCAG 2.1 Compliance', () => {
  it('should have proper heading hierarchy', async () => {
    const { container } = renderApp();
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const h1Count = container.querySelectorAll('h1').length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
    let previousLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      expect(level - previousLevel).toBeLessThanOrEqual(1);
      previousLevel = level;
    });
  });

  it('should have proper form labels', async () => {
    const { container } = renderApp();
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label || ariaLabel || ariaLabelledby).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    });
  });

  it('should have sufficient color contrast', async () => {
    const { container } = renderApp();
    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: true } },
    });
    expect(results.violations).toHaveLength(0);
  });
});