"""KYC OCR — Azure Document Intelligence integration (ADR-0002).

Phase A: schema migration + backend module + endpoints, gated by
`KYC_OCR_ENABLED=false`. Customer uploads enqueue an async job that
extracts structured fields (name, ID number, DOB, expiry) for use in
admin review and customer-side pre-fill.
"""
