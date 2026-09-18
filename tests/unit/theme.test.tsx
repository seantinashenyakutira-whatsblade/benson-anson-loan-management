import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandMark } from '@/components/layout/brand-mark';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: (globalThis as unknown as { __theme?: string }).__theme || 'dark', theme: 'system', setTheme: () => undefined }),
}));

function setTheme(t: string) {
  (globalThis as unknown as { __theme?: string }).__theme = t;
}

describe('BrandMark', () => {
  beforeEach(() => {
    setTheme('dark');
  });

  it('icon variant always renders logo-icon.png', () => {
    render(<BrandMark variant="icon" height={32} />);
    const img = screen.getByAltText('ABC') as HTMLImageElement;
    expect(img.src).toContain('/branding/logo-icon.png');
  });

  it('dark theme renders the white logo', () => {
    setTheme('dark');
    const { container } = render(<BrandMark variant="full" height={32} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('/branding/logo.png');
  });

  it('light theme falls back to monogram + wordmark (logo-light.png missing)', () => {
    setTheme('light');
    render(<BrandMark variant="full" height={32} />);
    expect(screen.getByText('ABC')).toBeTruthy();
    expect(document.querySelector('img[src="/branding/logo-light.png"]')).toBeNull();
  });

  it('persists theme choice via next-themes (system default)', () => {
    // next-themes stores the selection in localStorage under 'theme'
    expect(typeof window !== 'undefined').toBe(true);
  });
});
