import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Origin — Chinese EV Rental Dubai',
    short_name: 'Origin',
    description:
      'Premium Chinese electric vehicle rental in Dubai. NIO, Voyah, Zeekr, BYD.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#163478',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
