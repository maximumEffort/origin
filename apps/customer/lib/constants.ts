// Central place for all runtime constants.
// Set NEXT_PUBLIC_WHATSAPP_NUMBER in your .env.local file to override.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '971521439746';

export const whatsappUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
