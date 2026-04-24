import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useLocale } from 'next-intl';
import CarsGrid from './CarsGrid';

export default function CarsPage() {
  const locale = useLocale();

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-neutral-50">
        <CarsGrid locale={locale} />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
