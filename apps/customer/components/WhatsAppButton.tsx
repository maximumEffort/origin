'use client';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/constants';

export default function WhatsAppButton() {
  const t = useTranslations('whatsapp');

  return (
    <a
      href={whatsappUrl(t('greeting'))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('tooltip')}
      title={t('tooltip')}
      className="fixed bottom-6 end-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-xl hover:bg-[#1ebe5d] hover:scale-110 transition-all duration-200 wa-pulse"
    >
      <MessageCircle size={26} fill="white" />
    </a>
  );
}
