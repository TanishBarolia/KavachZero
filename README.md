# KavachZero // Unified Security Command Center

> **$0-cost, privacy-first Unified Security Operations Center (SOC)** combining a **Fintech Fraud Shield** (Deepfake + ELA ID Tamper Detection) and an **Omnichannel Phishing Scanner** (Punycode + Quishing QR + NLP Urgency) with a **browser-native SHA-256 tamper-evident audit ledger**.

---

## 👥 Team Architecture & Responsibilities

| Role | Member | Responsibilities | Status |
| :--- | :--- | :--- | :--- |
| **Member 1** | **Harshil Agarwal** | Core Next.js App Router backbone, Supabase PostgreSQL + Auth, Unified Risk Scoring Engine, Live Threat Ticker, Tamper-Evident SHA-256 Ledger, PDF Forensics Exporter, and Command Center UI | **Complete & Production Ready** |
| **Member 2** | Teammate | `FraudShieldModule.tsx` (Client-side passive liveness, canvas ELA, OCR) | Plug-and-play contract ready |
| **Member 3** | Teammate | `PhishingModule.tsx` (Client-side QR scanner `zxing-wasm`, Punycode regex, NLP heuristics) | Plug-and-play contract ready |

---

## ⚡ Quick Start for Teammates

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Local Demo)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*Note: The platform is built with **zero-friction graceful degradation**. If `.env.local` is omitted, the SOC runs in local memory with Web Crypto SHA-256 hashing active.*

### 3. Supabase Schema (If Using PostgreSQL Persistence)
Run the SQL script located in `supabase/schema.sql` inside your [Supabase SQL Editor](https://app.supabase.com):
- Creates `public.audit_logs`
- Configures Row-Level Security (RLS) policies
- Registers `public.audit_logs` with Supabase Realtime

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Command Center.

---

## 🔌 How Member 2 & Member 3 Plug In

Both modules are strictly client-bounded (`'use client'`) and receive a typed `onScanComplete` callback prop:

```typescript
export interface ModuleProps {
  onScanComplete: (input: ModuleScanInput) => Promise<void>;
  isProcessing?: boolean;
}
```

### Data Contract (`src/types/security.ts`)
When your module finishes scanning, invoke:
```typescript
await onScanComplete({
  module: 'FINTECH_KYC', // or 'PHISHING_SCAN'
  rawSubScores: {
    liveness: 85,
    elaExif: 70,
    ocr: 40,
  },
  flags: [
    {
      code: 'LIVENESS_SYNTHETIC_TEXTURE',
      label: 'Diffusion Artifacts Detected',
      severity: 'HIGH',
      details: 'Lack of natural eye micro-movements detected during webcam capture.',
    }
  ],
  metadata: {
    faceMatchConfidence: 42.1,
    elaAnomalyScore: 0.84,
    captureLatencyMs: 340,
  },
  confidence: 96,
});
```

The Core Platform automatically:
1. Feeds the telemetry into `src/lib/risk-engine.ts` to compute a deterministic `0-100` score and verdict (`GO` / `REVIEW` / `BLOCK`).
2. Calculates the cryptographic SHA-256 hash linked to the previous ledger entry using Web Crypto API (`src/lib/audit-chain.ts`).
3. Broadcasts the event across the **Live Threat Ticker** and appends it to the **Tamper-Evident Audit Ledger**.
4. Enables instant one-click **Institutional PDF Forensics Report** generation (`src/lib/pdf-exporter.ts`).

---

## 🛡️ Zero-Knowledge Privacy Guarantee
No raw video frames, webcam images, ID uploads, or PII are ever sent to Supabase or any cloud server. All feature extraction occurs in memory on the client device. Only sanitized risk scores, anonymized flag codes, and SHA-256 hashes are persisted.
