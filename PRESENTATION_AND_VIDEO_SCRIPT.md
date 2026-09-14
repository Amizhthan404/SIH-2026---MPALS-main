# 🇮🇳 Sanchi — Smart India Hackathon 2026
## 5-Part Video Presentation Script
### Problem Statement ID: SIH1770 | MoSPI (Ministry of Statistics and Programme Implementation)
**Project Name:** Sanchi — MPLADS Anomaly & Lifecycle Surveillance Intelligence
**Live Demo URL:** https://sih-2026-mpals-main.onrender.com/
**Target Duration:** 4:30 – 5:00 Minutes
**Tone:** Confident · Authoritative · Technically Rigorous · Mission-Driven

---

## 🎬 Video Blueprint

| Part | Timestamp | Focus | Goal |
|:---|:---|:---|:---|
| **1. The Problem** | `0:00 – 0:55` | MoSPI portal / data screenshot | Make the judge FEEL the problem |
| **2. The Solution** | `0:55 – 1:40` | Solution diagram / feature list | Prove we solved it the right way |
| **3. Our System** | `1:40 – 2:20` | Architecture + tech stack | Show technical depth |
| **4. Prototype Tour** | `2:20 – 4:10` | Live site walkthrough | Demonstrate real working product |
| **5. The Close** | `4:10 – 4:45` | Final dashboard + logo outro | Land with impact |

---

---

## 🎙️ WORD-FOR-WORD VIDEO SCRIPT

---

## PART 1 — THE PROBLEM  (0:00 – 0:55)

### SCREEN: Title card then navigate to MoSPI MPLADS portal

[SPEAKER — calm, serious]

"Every year, the Government of India releases Rs. 5 crore per Member of Parliament under the MPLADS scheme — the Members of Parliament Local Area Development Scheme.

That is Rs. 2,400 crore of public money every single year.

This money is meant to build infrastructure — roads, schools, water systems — directly in the constituencies of MPs across India.

But here is the reality."

### SCREEN: Show the MoSPI portal data view — the spreadsheet-style fund tracking

[SPEAKER — measured, building urgency]

"All fund tracking and project monitoring today happens through manual entries on the MoSPI portal. District-level officers fill in forms. Nodal officers verify. Reports are filed.

The problem? There is no automated layer that catches anomalies.

No flag when Rs. 47 lakhs is released to a contractor and the work completion report appears 11 months later — with no GPS-tagged photo evidence.

No alert when the same vendor wins back-to-back tenders across three districts.

No system that detects when a project drags beyond its sanctioned timeline while more funds keep flowing in.

The audit is always retrospective. The damage is already done."

### SCREEN: Highlight key pain-point bullets on screen (animated text)

[SPEAKER]

"MoSPI identified this exact gap as a national-level priority.

Their problem statement — SIH1770 — asks this question:

'Can we build an AI-driven, real-time anomaly detection and surveillance system that monitors MPLADS fund flow, project lifecycle, and district-level compliance — proactively, before the audit?'

That is the problem we chose. And we built Sanchi."

---

---

## PART 2 — THE SOLUTION  (0:55 – 1:40)

### SCREEN: Solution overview slide or the Sanchi system diagram

[SPEAKER — confident, solution-oriented]

"We call our system Sanchi.

In Sanskrit and Hindi, Sanchi means 'Treasury' — a sacred collection, preserved and protected.

Just as the ancient Sanchi Stupa stands as a monument of integrity across centuries, our system stands as a digital guardian over every rupee of public money."

### SCREEN: Animate the 6 solution pillars one by one

[SPEAKER]

"Sanchi solves the MPLADS monitoring gap through six interlocking capabilities:

ONE — Real-Time Anomaly Detection.
Using a five-vector statistical engine — Z-Score outliers, fund release patterns, contractor repeat-win rates, timeline drift, and work completion gaps — Sanchi flags suspicious projects before the audit begins.

TWO — AI Risk Scoring.
Every project in the system receives a dynamic AI risk score — from 0 to 100 — computed live. High-risk projects are immediately escalated to senior officials.

THREE — Role-Based Access Control.
The platform is designed for government deployment. MP offices, District Collectors, Nodal Officers, and Auditors each see only what they are authorized to see. JWT-authenticated sessions, no exceptions.

FOUR — GIS-Based Project Mapping.
Every project is plotted on a live map of India — with fund utilization overlaid. You can see, district by district, where money is moving and where it is stalling.

FIVE — Automated Reporting.
Sanchi generates audit-ready PDF reports for any project or district — formatted for MoSPI compliance — in one click.

SIX — Integration-Ready Architecture.
The entire backend is built to plug directly into PFMS — the Public Financial Management System — and e-SAKSHI, the existing MoSPI digitization platform. Zero disruption to existing workflows."

---

---

## PART 3 — OUR SYSTEM  (1:40 – 2:20)

### SCREEN: Technical architecture — split-screen showing frontend + backend

[SPEAKER — technical, precise]

"Let me show you how Sanchi is built — because a strong idea needs an even stronger implementation.

Our frontend is a single-page application — pure HTML, CSS, and JavaScript — designed with a government-grade design system: navy blue, disciplined typography, and the Ashoka Chakra embedded in the system identity. No frameworks, no bloat. Fast and deployable on any government server.

Our backend is an Express.js API built in TypeScript — fully typed, with structured middleware, modular routes, and error handling designed for production.

Our database layer is dual-adapter — we run PostgreSQL in production on Render, and SQLite locally during development. The same code, same schema, zero configuration changes between environments.

Our AI engine — the ai-engine module — runs server-side statistical anomaly detection across five dimensions per project:
- Expenditure velocity
- Contractor frequency index
- Timeline deviation ratio
- Document submission lag
- Fund-to-completion ratio

Each of these five vectors feeds a weighted composite score. No black box. Fully explainable. Fully auditable by MoSPI."

### SCREEN: Show the render.yaml and the live Render deployment URL

[SPEAKER]

"And this is not a localhost demo.

Sanchi is live and deployed — right now — on Render cloud, connected via GitHub CI/CD. Every push triggers a fresh build. The URL is active. The database is seeded. The system is running.

This is a production-grade prototype."

---

---

## PART 4 — PROTOTYPE TOUR  (2:20 – 4:10)

### SCREEN: Navigate to https://sih-2026-mpals-main.onrender.com/

[SPEAKER — energetic, demonstration mode]

"Let me walk you through Sanchi live."

---

### PAGE: LOGIN

[SPEAKER]

"We open with the Secure Gateway — the Sanchi login portal.

Notice the Government of India identity markers: the Ashoka Chakra emblem, the MoSPI branding, the Sanchi name in the header. This is not a generic login screen. It is built to look and feel like a real government system.

I will log in as an Auditor — role-based access means I see the full audit dashboard."

[Type credentials and click Login]

---

### PAGE: MAIN DASHBOARD

[SPEAKER]

"We land on the Main Surveillance Dashboard.

At the top — four live KPI cards:
- Total Projects monitored across India
- Total Funds Released in crores
- Active Anomalies Detected — flagged by the AI engine
- High Risk Projects — requiring immediate attention

These numbers are not static. They update as the database changes. This is live data."

---

### PAGE: ANOMALY DETECTION TABLE

[SPEAKER]

"Below — the Anomaly Intelligence Table.

Every flagged project is listed with:
- The project ID and district
- The MP constituency
- The specific anomaly type — whether it is a fund release mismatch, a contractor repeat-win, or a timeline breach
- The AI Risk Score — colour-coded from green to red
- And a direct action button to escalate or investigate

This is the core of Sanchi. This is what MoSPI does not have today."

---

### PAGE: GIS MAP TAB

[SPEAKER]

"Now the GIS Project Map.

Every single MPLADS project in our dataset is plotted here. The colour of each marker reflects fund utilization — green for on-track, yellow for delayed, red for critical.

A District Collector can open this map on any device and immediately see where attention is needed. No report needed. No waiting for a quarterly audit."

---

### PAGE: PROJECT DETAILS DRILL-DOWN

[SPEAKER]

"Clicking into any project opens the Project Intelligence Card.

You see the full lifecycle: sanctions, releases, expenditures, work completion status, and the AI engine's detailed risk breakdown — all five vectors — side by side.

The system explains why a project is flagged. Not just a red flag — a full reasoning chain. This is built for accountability."

---

### PAGE: REPORT GENERATION

[SPEAKER]

"And finally — one-click audit report generation.

The system compiles all project data, anomaly flags, and risk scores into a structured PDF — formatted for MoSPI's reporting standards. Ready to submit. Ready to defend in an audit."

---

---

## PART 5 — THE CLOSE  (4:10 – 4:45)

### SCREEN: Pull back to show the full live dashboard — hold for 3 seconds

[SPEAKER — slow, powerful, deliberate]

"Every year, Rs. 2,400 crore of public money flows into MPLADS.

Every year, the audit happens after the fact — after delays, after diversions, after the damage is recorded.

Sanchi changes that equation.

Not after the fact. In real time.
Not retrospective. Proactive.
Not another report. Intelligence."

### SCREEN: Fade to Sanchi logo — clean, centered, with the tagline below

[SPEAKER — final line, firm and clear]

"We did not build a dashboard.

We built a guardian for public money.

Sanchi — MPLADS Anomaly and Lifecycle Surveillance Intelligence.

Smart India Hackathon 2026. We are ready."

[End screen: Team name · Institution · Problem Statement SIH1770 · Live URL]

---

---

## 📋 Recording Checklist

- [ ] Open the live URL: https://sih-2026-mpals-main.onrender.com/
- [ ] Full-screen browser (F11), hide bookmarks bar
- [ ] Use demo login credentials — do not show personal passwords
- [ ] Record at 1920x1080 minimum — OBS Studio or Loom
- [ ] Narrate clearly — speak at 80% of normal pace
- [ ] Trim all dead-air pauses in editing
- [ ] Add soft background music at 15% volume
- [ ] Add text overlays at each section transition
- [ ] End with a 3-second hold on the Sanchi logo

---

## 🔗 Key Reference Links

| Resource | Link |
|:---|:---|
| Live Prototype | https://sih-2026-mpals-main.onrender.com/ |
| GitHub Repository | https://github.com/Amizhthan404/SIH-2026---MPALS-main |
| MoSPI MPLADS Portal | https://mplads.gov.in/ |
| Problem Statement | SIH1770 — Ministry of Statistics and Programme Implementation |
| PFMS Integration Target | https://pfms.nic.in/ |

---

Script Version 2.0 — Sanchi Rebrand — SIH 2026
