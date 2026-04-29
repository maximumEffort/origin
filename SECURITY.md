# Security Policy

## Reporting a vulnerability

**Do not open a public issue.** Report privately via GitHub's Security Advisories:

👉 https://github.com/maximumEffort/origin/security/advisories/new

Or email: amr.sarhan52@gmail.com

We aim to respond within 48 hours. Please include:
- Steps to reproduce
- Affected URL / endpoint
- Potential impact

## Scope

This policy covers the Origin platform:
- Customer site (origin-customer.vercel.app and attached custom domains)
- Admin dashboard (origin-admin.vercel.app)
- Backend API (`api.origin-auto.ae`, hosted on Azure Container Apps in UAE North)

## Out of scope

- Social engineering of Origin staff
- Physical security
- DoS/DDoS volumetric attacks (handled at the infrastructure layer)
- Vulnerabilities in third-party services (Stripe, Twilio, SendGrid, Vercel, Microsoft Azure) — report to them directly

## Safe harbour

We won't pursue legal action for good-faith security research that:
- Doesn't access, modify, or destroy customer data
- Doesn't disrupt production service
- Uses the report channel above before public disclosure
- Gives us reasonable time to patch (90 days default, or sooner for critical issues)

## Compliance

Origin operates under UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL). Security issues involving personal data are prioritised.
