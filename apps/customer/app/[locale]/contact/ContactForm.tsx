'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, MapPin, Clock, Phone, Mail, Send, CheckCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import { submitContact } from '@/lib/api';

export default function ContactForm() {
  const t = useTranslations('contact');

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await submitContact(form);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'd like to get in touch.")}`;

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">{t('title')}</h1>
          <p className="text-lg text-neutral-300">{t('subtitle')}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Left sidebar — contact info */}
            <div className="space-y-6">
              {/* WhatsApp card */}
              <div className="bg-[#25D366] rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <MessageCircle size={22} />
                  <h3 className="font-semibold text-lg">{t('whatsappTitle')}</h3>
                </div>
                <p className="text-sm text-white/90 mb-4">{t('whatsappDesc')}</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-[#25D366] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  {t('whatsappBtn')}
                </a>
              </div>

              {/* Office info */}
              <div className="bg-white rounded-xl p-6 border border-neutral-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-neutral-900">{t('officeTitle')}</h3>
                <div className="flex items-start gap-3 text-sm text-neutral-600">
                  <MapPin size={16} className="text-brand shrink-0 mt-0.5" />
                  <span>{t('officeAddress')}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-neutral-600">
                  <Clock size={16} className="text-brand shrink-0 mt-0.5" />
                  <span>{t('officeHours')}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-neutral-600">
                  <Phone size={16} className="text-brand shrink-0 mt-0.5" />
                  <a href="tel:+971521439746" className="hover:text-brand">+971 52 143 9746</a>
                </div>
                <div className="flex items-start gap-3 text-sm text-neutral-600">
                  <Mail size={16} className="text-brand shrink-0 mt-0.5" />
                  <a href="mailto:info@origin-auto.ae" className="hover:text-brand">info@origin-auto.ae</a>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6">{t('formTitle')}</h2>

                {status === 'success' ? (
                  <div className="flex flex-col items-center text-center py-12 gap-4">
                    <CheckCircle size={48} className="text-green-500" />
                    <h3 className="text-lg font-semibold text-neutral-900">{t('successTitle')}</h3>
                    <p className="text-neutral-500">{t('successText')}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-name" className="block text-sm font-medium text-neutral-700 mb-1">{t('name')}</label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          placeholder={t('namePlaceholder')}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-sm font-medium text-neutral-700 mb-1">{t('email')}</label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          placeholder={t('emailPlaceholder')}
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-phone" className="block text-sm font-medium text-neutral-700 mb-1">{t('phone')}</label>
                        <input
                          id="contact-phone"
                          type="tel"
                          placeholder={t('phonePlaceholder')}
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-subject" className="block text-sm font-medium text-neutral-700 mb-1">{t('subject')}</label>
                        <input
                          id="contact-subject"
                          type="text"
                          placeholder={t('subjectPlaceholder')}
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="block text-sm font-medium text-neutral-700 mb-1">{t('message')}</label>
                      <textarea
                        id="contact-message"
                        rows={5}
                        required
                        placeholder={t('messagePlaceholder')}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                      />
                    </div>
                    {status === 'error' && (
                      <p className="text-sm text-red-600">{t('errorText')}</p>
                    )}
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
                    >
                      <Send size={16} />
                      {status === 'sending' ? t('sending') : t('submit')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
