# MPALS — MPLADS Anomaly & Lifecycle Surveillance
### Smart India Hackathon 2026 | Problem Statement ID: 26102
**Ministry of Statistics & Programme Implementation (MoSPI), Government of India**  
*Student Prototype for Decision Support & Scheme Integrity Auditing*

---

## 📌 Problem Statement & Prototype Mission

> **PS 26102** — Development of an AI / Statistical Surveillance Decision-Support System to detect anomalies, expenditure irregularities, milestone divergence, and governance inefficiencies in MPLAD Scheme implementation.

The **Members of Parliament Local Area Development Scheme (MPLADS)** involves thousands of civil works and crores of rupees disbursed across all states and union territories. Real-world scheme oversight faces critical operational challenges:
- Manual auditing cannot scale across 770+ MPs and tens of thousands of active works.
- Payment disbursements in PFMS/EAT may occur ahead of certified ground execution.
- High-value completed assets frequently lack third-party geo-tagged verification.

**MPALS** is an end-to-end full-stack platform providing **explainable statistical anomaly detection, jurisdictional RBAC scoping, and an interactive investigation workspace** for Ministry, State, and District authorities.

---

## 🔬 Statistical Anomaly Engine (What We Actually Built)

We do **not** make exaggerated claims of black-box "deep learning" or opaque neural networks that cannot be audited or explained to a district magistrate. Instead, MPALS implements **rigorous, explainable statistical surveillance & anomaly scoring**:

| Anomaly Detection Method | Statistical Model & Mathematical Formulation | Administrative Purpose |
|---|---|---|
| **Parametric Z-Score Outlier Analysis** | $Z = \frac{x - \mu}{\sigma}$ (threshold $|Z| > 3.0$) | Flags allocation amounts that diverge drastically from national baseline distributions. |
| **Non-Parametric IQR Fencing** | Outlier boundaries: $[Q_1 - 1.5 \times \text{IQR}, Q_3 + 1.5 \times \text{IQR}]$ | Detects extreme skewed distributions without assuming normal distribution. |
| **Cohort Peer Variance** | Deviation percentage from state/tenure peer group median | Identifies localized allocation discrepancies within the same state or house. |
| **Milestone Divergence (Payment vs. Progress)** | Gap $= \left(\frac{\text{Disbursed}}{\text{Sanctioned}} \times 100\right) - \text{Physical Completion \%}$ | Flags works where financial release leads physical ground execution by $\ge 20\%$. |
| **Rapid Pre-Execution Payout** | Rule trigger: Paid $\ge 85\%$ while Completion $\le 20\%$ | Immediate Critical flag for severe premature contractor disbursement. |
| **Asset Inspection Deficit** | Sanctioned $\ge ₹25\text{ Lakhs}$, Status = 'Completed', missing Geo-tag / inspection | Eliminates ghost assets by demanding verified physical inspections. |

Every risk score is **100% explainable**: clicking any MP or alert opens an itemized factor breakdown explaining exactly why the score was computed.

---

## 🛡️ Role-Based Access Control (RBAC) & Security

MPALS implements real **JSON Web Token (JWT)** session security and **bcrypt password hashing** (`saltRounds=10`). API endpoints are strictly guarded by middleware:
- **Ministry Admin** (`role = 'Ministry'`): Unrestricted national scope across all 773 MPs, 36 States/UTs, and all works.
- **State Nodal Officer** (`role = 'State'`): Automatically restricted via `req.user.scope_id` to MPs, alerts, and works in their assigned state (e.g., Maharashtra).
- **District Collector** (`role = 'District'`): Scoped to works and assets within their administrative district.
- **Hon'ble MP** (`role = 'MP'`): Scoped to their constituency or nominated state.
- **Public Guest / Citizen** (`unauthenticated`): Read-only view of aggregated public transparency data; triage actions are locked.

### Pre-Configured Official Demo Credentials

| Role | Official Email | Password | Assigned Jurisdictional Scope |
|---|---|---|---|
| **Ministry Admin** | `admin@mospi.gov.in` | `Password@123` | National Scope (All 773 MPs) |
| **Ministry Analyst** | `analytics@mospi.gov.in` | `Password@123` | National Analytics Scope |
| **State Nodal Officer** | `nodal.maharashtra@gov.in` | `Password@123` | Maharashtra State Scope Only |
| **District Collector** | `dm.mumbai@nic.in` | `Password@123` | Mumbai City District Scope |
| **Hon'ble MP** | `mp.abhishek@sansad.nic.in` | `Password@123` | Rajya Sabha Nominated Constituency |

---

## 🔍 Investigation Workspace & Audit Triage

Alerts in MPALS are not static warnings—they feed directly into an interactive **Investigation Workspace**:
1. **Explainable Why Flagged**: Displays the exact algorithmic formula, deviation standard deviations, and ledger discrepancy.
2. **Evidence Breakdown**: Compares sanctioned cost, cumulative expenditure, payment timestamps, and asset verification status.
3. **Audit Trail**: Shows detection timestamp, current status (`Open`, `Under Review`, `Resolved`, `False Positive`), and the last officer to review the case.
4. **Action Workflow**: Authorized officers can transition the case status with cryptographic attribution saved directly to the database.

---

## 📊 Data Provenance & Transparency Notice

In compliance with hackathon evaluation standards:
- **MP Dataset (773 MPs)**: Source-derived from official MoSPI MPLADS allocation records (542 Lok Sabha constituencies + 231 Rajya Sabha members).
- **Works, Ledgers & Asset Inspections**: Synthetic demonstration scenarios generated to model real-world PFMS expenditure anomalies (such as payment before progress, stalled milestones, and duplicate tenders).
- **Geo-Coordinates**: Deterministic geographic mapping across Indian state headquarters and district centroids.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: `v20.0.0` or `v22.0.0+` (LTS recommended)
- **npm**: `v9.0.0+`
- Works offline: All frontend dependencies (Chart.js UMD) are vendored locally in `vendor/chartjs/chart.umd.min.js`.

### 1. Installation
From the project root:
```bash
cd server
npm install
```

### 2. Database Initialization & Seeding
```bash
npm run db:setup
```
This executes migrations and seeds the SQLite database with 773 MPs, 736 civil works, 1,600+ payment vouchers, 736 physical assets, 1,200+ anomaly alerts, and bcrypt-protected official users.

### 3. Running the Server

#### Development Mode (with hot-reload):
```bash
npm run dev
```

#### Production Build & Start:
```bash
npm run build
npm start
```

Access the platform in your browser at:  
👉 **`http://localhost:5000`**

---

## ⏱️ 3-Minute Hackathon Presentation / Demo Script

| Timestamp | Screen / Action | What to Say / Point Out to Judges |
|---|---|---|
| **0:00 – 0:30** | **Top Info Bar & Provenance** | *"Welcome, respected jury members. This is MPALS, developed for MoSPI Problem Statement 26102. Notice our top bar: we clearly label data provenance—our 773 MPs are derived from official MPLADS allocation records, while works and ledgers model real PFMS transactions."* |
| **0:30 – 1:00** | **Executive Dashboard & Statistical Rigor** | *"Instead of claiming an untrainable 'black box ML' model, MPALS uses explainable statistical surveillance: parametric Z-score, IQR fencing, cohort peer variance, and milestone divergence. Notice our live KPIs: total MPs, fund allocations, and risk distributions computed directly from SQLite."* |
| **1:00 – 1:45** | **Works Monitoring & Payment vs. Progress** | *Click 'Works Monitoring'. Filter by 'Payment Gaps'. Click a flagged work.*<br/>*"Here is our milestone surveillance: we track cumulative financial releases against physical ground completion. Notice this project where 90% of funds were disbursed while physical progress is only 15%—a classic pre-execution risk."* |
| **1:45 – 2:30** | **Alerts & Investigation Workspace** | *Click 'Alerts & Flags'. Click 'Investigate 🔍' on a Critical alert.*<br/>*"Every alert opens our Investigation Workspace. It doesn't just show an error—it gives an explainable breakdown of why it was flagged, the numerical deviation, and the audit trail. In guest mode, triage is locked."* |
| **2:30 – 3:00** | **Role Switcher & RBAC Scoping** | *Click the top-right Role button. Select 'State Nodal Officer (Maharashtra)'.*<br/>*"With one click, we sign in using real JWT and bcrypt authentication. Notice how the entire dashboard instantly re-scopes to Maharashtra only. The officer can now triage the alert and mark it 'Under Review' or 'Resolved', recording their official identity in the audit log."* |

---

## 📁 Repository Structure

```
SIH-2026---MPALS/
├── index.html                   # Official Government-style SPA interface
├── css/
│   ├── main.css                 # Government UI design system (MoSPI / NIC standard)
│   └── animations.css           # Refined micro-interactions
├── js/
│   ├── app.js                   # Application controller, routing & modals
│   ├── ai-engine.js             # Statistical formatters & anomaly definitions
│   ├── charts.js                # Chart.js visualization engine
│   ├── data.js                  # REST API client with JWT session management
│   └── map.js                   # India SVG geographic risk view
├── vendor/
│   └── chartjs/
│       └── chart.umd.min.js     # Vendored offline Chart.js 4.4.8
├── server/                      # Express + TypeScript REST API
│   ├── src/
│   │   ├── config/              # Robust multi-path database & static file resolution
│   │   ├── controllers/         # Scoped controllers (Auth, MPs, Works, Alerts, States)
│   │   ├── middleware/          # JWT authentication & RBAC guards
│   │   ├── routes/              # Protected Express routes (/api/auth, /api/alerts, etc.)
│   │   ├── services/            # Statistical Anomaly Engine (Single Source of Truth)
│   │   ├── types/               # TypeScript data interfaces
│   │   └── index.ts             # Server entry point
│   ├── db/
│   │   ├── migrations/          # SQLite / PostgreSQL schema migrations
│   │   ├── seeds/               # Seeding script with bcrypt hashing & realistic data
│   │   └── mplads.sqlite        # Seeded local database
│   ├── tsconfig.json            # TypeScript configuration
│   └── package.json             # Backend dependencies & scripts
├── README.md                    # Project documentation & audit defense
└── package.json                 # Root script orchestration
```

---

*Developed for Smart India Hackathon 2026 · Problem Statement 26102 · Ministry of Statistics & Programme Implementation (MoSPI)*
