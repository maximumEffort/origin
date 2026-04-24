/**
 * Tests for the WhatsAppButton component.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import WhatsAppButton from '@/components/WhatsAppButton';

describe('WhatsAppButton', () => {
  it('renders a link to WhatsApp', () => {
    render(<WhatsAppButton />);

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    // The href should contain wa.me and the greeting key (from mocked useTranslations)
    expect(link.getAttribute('href')).toContain('https://wa.me/971521439746');
  });

  it('has correct accessibility attributes', () => {
    render(<WhatsAppButton />);

    const link = screen.getByRole('link');
    // aria-label is the 'tooltip' key returned by mock
    expect(link).toHaveAttribute('aria-label', 'tooltip');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens in new tab', () => {
    render(<WhatsAppButton />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
