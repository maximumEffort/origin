/**
 * IntegrationsModule — barrel module for all Phase 6 third-party integrations.
 *
 * Import this single module into AppModule to make all integration services
 * available across the application.
 *
 * Services exported:
 *  - WhatsAppService   → booking confirmations, reminders, support messages
 *  - CheckoutService   → card payments, Apple Pay, Google Pay (AED)
 *  - TwilioService     → OTP verification via SMS
 *  - SendGridService   → transactional emails
 *  - GoogleMapsService → location autocomplete & distance matrix
 *  - FirebaseService   → mobile push notifications
 *  - TabbyService      → BNPL instalment payments
 */
import { Module } from '@nestjs/common';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { CheckoutModule } from './checkout/checkout.module';
import { TwilioModule } from './twilio/twilio.module';
import { SendGridModule } from './sendgrid/sendgrid.module';
import { GoogleMapsModule } from './google-maps/google-maps.module';
import { FirebaseModule } from './firebase/firebase.module';
import { TabbyModule } from './tabby/tabby.module';

@Module({
  imports: [
    WhatsAppModule,
    CheckoutModule,
    TwilioModule,
    SendGridModule,
    GoogleMapsModule,
    FirebaseModule,
    TabbyModule,
  ],
  exports: [
    WhatsAppModule,
    CheckoutModule,
    TwilioModule,
    SendGridModule,
    GoogleMapsModule,
    FirebaseModule,
    TabbyModule,
  ],
})
export class IntegrationsModule {}
