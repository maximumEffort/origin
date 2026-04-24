/**
 * Tests for the Footer component.
 * Footer is an async server component — we await it before rendering.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer', () => {
  it('renders company info and links', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    // Logo
    expect(screen.getByRole('img', { name: 'Origin' })).toBeInTheDocument();

    // Tagline and eco tagline (translation keys)
    expect(screen.getByText('tagline')).toBeInTheDocument();
    expect(screen.getByText('ecoTagline')).toBeInTheDocument();
  });

  it('renders fleet section links', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    expect(screen.getByText('fleetTitle')).toBeInTheDocument();
    expect(screen.getByText('fleetElectric')).toBeInTheDocument();
    expect(screen.getByText('fleetSuv')).toBeInTheDocument();
    expect(screen.getByText('fleetSedan')).toBeInTheDocument();
  });

  it('renders legal/company section links', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    expect(screen.getByText('aboutLink')).toBeInTheDocument();
    expect(screen.getByText('privacy')).toBeInTheDocument();
    expect(screen.getByText('terms')).toBeInTheDocument();
  });

  it('renders contact info with WhatsApp link', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    const waLink = screen.getByText('WhatsApp').closest('a');
    expect(waLink).toHaveAttribute('href', 'https://wa.me/971521439746');
  });

  it('renders phone number', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    const phoneLink = screen.getByText('+971 52 143 9746').closest('a');
    expect(phoneLink).toHaveAttribute('href', 'tel:+971521439746');
  });

  it('renders language switcher links', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('ع')).toBeInTheDocument();
    expect(screen.getByText('中')).toBeInTheDocument();
  });

  it('renders copyright and legal notes', async () => {
    const FooterResolved = await Footer();
    render(FooterResolved);

    expect(screen.getByText('copyright')).toBeInTheDocument();
    expect(screen.getByText('vatNote')).toBeInTheDocument();
    expect(screen.getByText('licence')).toBeInTheDocument();
  });
});
