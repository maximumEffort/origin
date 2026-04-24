/**
 * Tests for the Navbar component.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '@/components/Navbar';

// Mock AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ customer: null, loading: false, login: jest.fn(), logout: jest.fn(), refreshProfile: jest.fn() }),
}));

describe('Navbar', () => {
  it('renders navigation links', () => {
    render(<Navbar />);

    // The translation mock returns the key, so nav links use translation keys
    expect(screen.getByText('fleet')).toBeInTheDocument();
    expect(screen.getByText('calculator')).toBeInTheDocument();
    expect(screen.getByText('about')).toBeInTheDocument();
    expect(screen.getByText('contact')).toBeInTheDocument();
  });

  it('renders the language switcher button with current locale label', () => {
    render(<Navbar />);

    // useLocale returns 'en', locale labels map has en: 'EN'
    // There are multiple buttons (lang switcher + mobile toggle), so check for EN text
    expect(screen.getByText('EN')).toBeInTheDocument();
    const langButton = screen.getByText('EN').closest('button')!;
    expect(langButton).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('opens language dropdown on click', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    // Click the language switcher (button with 'EN' text)
    const langButton = screen.getByText('EN').closest('button')!;
    await user.click(langButton);

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
    expect(screen.getByText('中文')).toBeInTheDocument();
  });

  it('toggles mobile menu', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const toggleBtn = screen.getByLabelText('Toggle menu');
    expect(toggleBtn).toBeInTheDocument();

    // Menu should not be visible initially (no mobile menu links in the mobile drawer)
    // After clicking toggle, the mobile menu appears with the same links
    await user.click(toggleBtn);

    // Mobile menu duplicates the links — we should now have more link elements
    const fleetLinks = screen.getAllByText('fleet');
    expect(fleetLinks.length).toBeGreaterThanOrEqual(2); // desktop + mobile
  });

  it('renders the Origin logo', () => {
    render(<Navbar />);
    expect(screen.getByRole('img', { name: 'Origin' })).toBeInTheDocument();
  });

  it('renders CTA button', () => {
    render(<Navbar />);
    expect(screen.getByText('cta')).toBeInTheDocument();
  });
});
