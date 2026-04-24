/**
 * Tests for the CarCard component.
 * CarCard is an async server component — we await it before rendering.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CarCard from '@/components/CarCard';

const defaultProps = {
  id: 'nio-es6',
  brand: 'NIO',
  model: 'ES6',
  category: 'Electric SUV',
  monthlyAed: 8500,
  imageUrl: 'https://example.com/nio-es6.jpg',
  available: true,
};

describe('CarCard', () => {
  it('renders brand name', async () => {
    const Card = await CarCard(defaultProps);
    render(Card);

    expect(screen.getByText('NIO')).toBeInTheDocument();
  });

  it('renders model name', async () => {
    const Card = await CarCard(defaultProps);
    render(Card);

    expect(screen.getByText('ES6')).toBeInTheDocument();
  });

  it('renders monthly price', async () => {
    const Card = await CarCard(defaultProps);
    render(Card);

    // The mock t() returns the key, so 'common.aed' is the prefix
    // The actual number 8,500 should appear
    expect(screen.getByText(/8,500/)).toBeInTheDocument();
  });

  it('renders vehicle image', async () => {
    const Card = await CarCard(defaultProps);
    render(Card);

    const img = screen.getByAltText('NIO ES6');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/nio-es6.jpg');
  });

  it('shows available badge when available', async () => {
    const Card = await CarCard(defaultProps);
    render(Card);

    expect(screen.getByText('fleet.available')).toBeInTheDocument();
  });

  it('shows leased badge when not available', async () => {
    const Card = await CarCard({ ...defaultProps, available: false });
    render(Card);

    expect(screen.getByText('fleet.leased')).toBeInTheDocument();
  });

  it('links to the vehicle detail page', async () => {
    const Card = await CarCard(defaultProps);
    render(Card);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/cars/nio-es6');
  });
});
