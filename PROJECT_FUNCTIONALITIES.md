# GIS Survey & Erection Management System — Comprehensive Module-Wise Functional Specification

This document provides a comprehensive, module-by-module specification of all functionalities across the **GIS Survey Mobile Application** (`gis_survey_app`) and the **Django Admin & Master Backend** (`gis_admin`).

---

## Table of Contents
1. [System Architecture & Technology Stack](#1-system-architecture--technology-stack)
2. [Module 1: Authentication, Authorization & User Profile](#2-module-1-authentication-authorization--user-profile)
3. [Module 2: Field Executive Dashboard & Navigation Hub](#3-module-2-field-executive-dashboard--navigation-hub)
4. [Module 3: Line Survey & Electrical Route Mapping](#4-module-3-line-survey--electrical-route-mapping)
5. [Module 4: Erection Execution & Verification Workflow](#5-module-4-erection-execution--verification-workflow)
6. [Module 5: Interactive Vector Canvas & Line Routing (SVG Engine)](#6-module-5-interactive-vector-canvas--line-routing-svg-engine)
7. [Module 6: Inline Structure & Span Distance Editor](#7-module-6-inline-structure--span-distance-editor)
8. [Module 7: Automated Material Summary & Bill of Quantities (BoQ) Engine](#8-module-7-automated-material-summary--bill-of-quantities-boq-engine)
9. [Module 8: Compliance Imagery & Cloudflare R2 / S3 Object Storage](#9-module-8-compliance-imagery--cloudflare-r2--s3-object-storage)
10. [Module 9: Offline-First Architecture & Sync Terminal](#10-module-9-offline-first-architecture--sync-terminal)
11. [Module 10: Backend Master Management & REST API Ecosystem](#11-module-10-backend-master-management--rest-api-ecosystem)
12. [Data Payload Design & Integrity Guidelines](#12-data-payload-design--integrity-guidelines)

---

## 1. System Architecture & Technology Stack

### 1.1 Architecture Overview
The system provides electrical distribution network mapping and physical erection auditing for High Tension (33KV HT, 11KV HT) and Low Tension (440V LT) power lines. It bridges field operations with administrative compliance via an offline-capable mobile client and a centralized GIS database.

```
┌─────────────────────────────────────────────────────────────┐
│                   Mobile Client (Expo / React Native)        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ Active Survey │ │ Erection Exec │ │  SVG Route Canvas │  │
│  └───────┬───────┘ └───────┬───────┘ └─────────┬─────────┘  │
│          │                 │                   │            │
│          ▼                 ▼                   ▼            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │      Redux Toolkit Store + Local AsyncStorage Cache    │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTPS / REST (JWT Auth)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Django Admin Backend (gis_admin)            │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ JWT Auth/RBAC │ │ Master Models │ │ Survey/Erection   │  │
│  └───────┬───────┘ └───────┬───────┘ └─────────┬─────────┘  │
│          │                 │                   │            │
│          ▼                 ▼                   ▼            │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  PostgreSQL Database  │       │ Cloudflare R2 / S3    │  │
│  │  (GIS & JSONB Attrs)  │       │ (Encrypted Photos)    │  │
│  └───────────────────────┘       └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack
* **Mobile Client**:
  * Framework: React Native with Expo SDK 57 (TypeScript)
  * State Management: Redux Toolkit with AsyncStorage persistence
  * Form Handling: React Hook Form with custom accessible UI controllers
  * Visualization: `react-native-svg` custom vector rendering engine
  * Camera & Media: `react-native-vision-camera` / Expo Camera with on-device compression
* **Backend Platform**:
  * Core: Python 3.12, Django 5.x, Django REST Framework
  * Database: PostgreSQL with JSONB schema flexibility for node attributes
  * Security: Custom JWT middleware with session refresh and role-based access control (RBAC)
  * Media Cloud Storage: Cloudflare R2 / AWS S3 with pre-signed upload keys and short-lived certified viewing URLs

---

## 2. Module 1: Authentication, Authorization & User Profile

### 2.1 Functionalities
* **Intro & Splash Showcase (`IntroScreen.tsx`)**:
  * High-tech introduction explaining GIS line mapping, erection verification, and compliance photo auditing.
  * Auto-transition or manual entry to login.
* **Secure Login Terminal (`LoginScreen.tsx`)**:
  * Username/Password authentication against `/gis/administration/admin/login/`.
  * Returns user identifiers (`user_id`, `role_name`, `designation_name`, phone, email) and cryptographic JWT token.
  * Role mapping for System Administrators, Field Surveyors, Contractors, and Quality Verifiers.
  * Credentials validation, connection error handling, and offline credential retention.
* **Persistent Session & Token Interceptor (`rest.ts`, `authService.ts`)**:
  * Automatically injects `Authorization: Bearer <token>` into all outbound HTTP requests.
  * Intercepts 401/403 responses to trigger refresh flows or secure logout.
  * Local state hydration on application boot via `loadPersistedState`.
* **User Profile & Environment Diagnostics (`ProfileScreen.tsx`)**:
  * Displays surveyor credentials, ID (`SRV-XXX`), designated electrical division, and account metadata.
  * Provides base API environment URL switching (Local Server, Dev Network, Production Cloud).
  * One-tap secure logout and cache purging.

---

## 3. Module 2: Field Executive Dashboard & Navigation Hub

### 3.1 Functionalities
* **Dashboard Summary Hub (`DashboardScreen.tsx`)**:
  * Live status overview of active surveys, completed inspections, and items pending synchronization.
  * Quick-action launcher buttons:
    * **Start New Survey**: Direct jump into line configuration.
    * **Execute Erection Run**: Direct jump into physical construction inspection.
    * **View Route History**: Jump into recorded surveys.
    * **Sync Terminal**: Inspect queued records.
* **GPS Telemetry Lock**:
  * Native GPS coordinate acquisition (`latitude`, `longitude`, `altitude`, `accuracy`).
  * Visual telemetry HUD card providing satellite accuracy metrics and re-acquisition controls.
* **Bottom Tab Navigation (`App.tsx`)**:
  * Quick switching between Dashboard, Survey Runs, Erection Execution, Sync Terminal, and Profile.
  * Dynamic notification badge on Sync Terminal indicating un-synced queue items.

---

## 4. Module 3: Line Survey & Electrical Route Mapping

### 4.1 Functionalities
* **Survey Initialization Setup (`SurveySetupScreen.tsx`)**:
  * Selection of Line Type:
    * `HT_33KV`: 33 KV High Tension Line
    * `HT_11KV`: 11 KV High Tension Line
    * `LT_440V`: 440 V Low Tension Line
  * Selection of Starting Point: Substation, HT Tapping Point, Existing DTR, Existing Pole, etc.
  * Feeder designation, contractor selection, district, block, and village mapping.
* **Active Survey Capture Engine (`ActiveSurveyScreen.tsx` & `ActiveSurveyForm.tsx`)**:
  * **Automatic Node Sequencing**: Generates sequential identifiers (`HT-P-1`, `HT-P-2`, `P-1`, `DTR-0`).
  * **Tapping Point / Branch Logic**: Allows surveys to originate from tap structures (`TAP-1`) or branch from existing lines.
  * **Structure Role Assignment**: Flags nodes as Intermediate, Tap, Terminal, or Transformer Platform.
  * **Hardware & Material Specification**:
    * **Pole Type**: Dropdown backed by `pole_type` domain lookup (`1` = Concrete Pole, `2` = Non-Concrete Pole).
    * **Pole Master**: Dropdown backed by `PoleMaster` model (`8M ST Pole`, `9M ST Pole`, `11M ST Pole`, etc.).
    * **Conductor Type**: ACSR / ABC specifications (e.g., `100 sqmm ACSR`, `120Sqmm AB Cable`).
    * **Transformer (DTR) Platform**: DTR capacity selection (`25 KVA`, `63 KVA`, `100 KVA`, etc.), serial number logging.
    * **Earthing Installation**: Earthing type (Coil, Pipe, Plate) and quantity input.
    * **Stay Set Support**: Stay set specification (HT Stay Set, LT Stay Set) and quantity input.
    * **Low Tension Clamping & Distribution**: Pole DB codes, dead-end clamps, suspension clamps, IPCs, service connections.
* **Survey Runs Browser (`SurveyListScreen.tsx`)**:
  * Filterable listing of historical and locally saved surveys.
  * Search by feeder, contractor, drawing number, or date.
  * Direct route inspection and resume capability.

---

## 5. Module 4: Erection Execution & Verification Workflow

### 5.1 Functionalities
* **Erection Project Setup (`ErectionSetupScreen.tsx`)**:
  * Links physical construction verification to approved engineering drawings (`drawing_no`).
  * Selects Type of Work (`TOW`), Starting Point (`LTSP`), contractor, district, and village.
* **Erection Execution Overview (`ErectionExecutionScreen.tsx`)**:
  * Master listing of all live and pending erection drawing projects.
  * Displays total recorded poles, surveyor assignments, and completion badges.
* **Erection Project Audit & Details (`ErectionDetailsScreen.tsx`)**:
  * Detailed route visualizer displaying nodes, parent-child electrical dependencies, and coordinates.
  * **Deep Pole Edit Modal**:
    * Surveyor can choose any recorded pole to inspect or modify.
    * Fetches certified details from server via `GetErectionPoleDetailsService`.
    * Pre-fills all structure specifications (Pole Type, Pole Master, Conductor, Earthing, Stay Set).
    * Pre-fills and renders previously uploaded compliance photos via signed R2 URLs.
  * **Continue Erection From Chosen Pole**:
    * Enables route continuation or branching from any specific recorded pole.
* **Selective Form Logic for HT Lines (33KV & 11KV)**:
  * For 33KV and 11KV HT lines, the mobile form strictly streamlines the view to relevant compliance sections:
    1. Structure Specification (Pole Type, Pole Master, Pole Qty)
    2. Earthing Installation
    3. Stay Set Support
    4. Compliance Photo Evidence Slots
    5. Remarks
  * Hides non-applicable LT sections (Pole DB, Clamping accessories, Service Connections) to eliminate field clutter.

---

## 6. Module 5: Interactive Vector Canvas & Line Routing (SVG Engine)

### 6.1 Functionalities (`SurveySvgCanvas.tsx`)
* **Vector Projection Engine**:
  * Projects geographic coordinates (`latitude`, `longitude`) onto a 2D Cartesian SVG viewport (`SVG_WIDTH: 320`, `SVG_HEIGHT: 240`).
  * Auto-scales bounding box to fit the entire route regardless of line length or orientation.
* **Multi-Touch Controls**:
  * Pan and zoom support with scale limits from `0.25x` to `3.0x`.
* **Visual Topology & Hierarchy**:
  * **Structures (Nodes)**:
    * Distinct visual glyphs for DTRs (Distribution Transformers), HT Poles, LT Poles, and Tap Poles.
    * Color-coded status indicators (New Erection vs. Existing/Old infrastructure).
    * Selection highlight halo when a pole is selected.
  * **Spans (Electrical Connectors)**:
    * Coiled / wavy electrical path connectors linking parent and child poles.
    * Displays cable specification tag and calculated span distance in meters.
    * Visual selection indicator when a span is tapped for editing.

---

## 7. Module 6: Inline Structure & Span Distance Editor

### 7.1 Functionalities (`SurveyAttributeEditor.tsx`)
* **Strategic View Placement**:
  * Positioned directly **above the Material & BoQ Summary** section in `ErectionDetailsScreen.tsx` for immediate field visibility upon tapping any map span.
* **Dedicated Span Editing Mode**:
  * When a span connector is tapped between two poles, the editor renders strictly:
    1. **SPAN DISTANCE (METERS)**: Direct input/update of the physical distance between the two poles (e.g. `45m`).
    2. **PARENT NODE / ID (CONNECTION)**: Verification and reassignment of the feeding source pole (e.g. `HT-P-1`).
  * Non-pertinent fields are hidden in span mode to maximize surveyor speed.
* **Structure Node Editing Mode**:
  * When a pole node is tapped, displays Node Label, Parent Connection, Height Spec, Structure Type, Latitude, and Longitude.
* **Real-Time Database Persistence**:
  * Tapping **APPLY STRUCTURE CHANGES** executes:
    1. Immediate local Redux store update for instantaneous canvas feedback.
    2. Dispatches `updateSpanDistanceAction` which calls the backend endpoint:
       `POST /gis/administration/erection/span/update/`
    3. Persists `spanDistance`, `span_distance`, and `parent_label` in the database.
    4. Automatically recalculates cumulative line length in the Material Summary.

---

## 8. Module 7: Automated Material Summary & Bill of Quantities (BoQ) Engine

### 8.1 Functionalities (`ErectionDetailsScreen.tsx`)
* **Automated Bill of Quantities Calculation**:
  * Aggregates field-captured attributes across all structures in real time:
* **Material Categorization Breakdown**:
  * **Poles & Structures**:
    * Total pole count.
    * Concrete vs. Non-Concrete split (derived from domain code `1` vs `2`).
    * Breakdown by pole height: `8M ST Poles`, `9M ST Poles`, `11M ST Poles`, and other structures.
    * Condition categorization: New installations vs. Existing assets.
  * **Distribution Transformers (DTR)**:
    * Total transformer installations.
    * Breakdown by capacity: `25 KVA`, `63 KVA`, `100 KVA`, `250 KVA`, etc.
    * New installations vs. Existing platforms.
  * **Conductors & Spans**:
    * Total span count.
    * Total route line length in meters (sum of all span distances).
    * Conductor type breakdown with individual lengths (e.g., `120Sqmm AB Cable: 450m`).
  * **Stay Set Supports**:
    * Total stay sets used.
    * HT Stay Sets vs. LT Stay Sets breakdown.
  * **Earthing Systems**:
    * Total earthing units installed.
    * Coil, Pipe, and Plate earthing counts.
  * **Distribution Boxes & Clamping Accessories**:
    * 1-Phase and 3-Phase Pole DB counts.
    * Dead-end clamps, suspension clamps, pole clamps, IPCs, and service connections.
    * Danger boards and anti-climbing devices.

---

## 9. Module 8: Compliance Imagery & Cloudflare R2 / S3 Object Storage

### 9.1 Functionalities (`ActiveSurveyCamera.tsx`, `ActiveSurveyScreen.tsx`)
* **Integrated Field Camera Viewport**:
  * Direct camera stream with crosshairs and location telemetry banner.
  * Shutter flash micro-animation and haptic feedback.
  * Integrated torch toggle for low-light conditions.
* **Strict Category Photo Slots**:
  * Structures require photo compliance evidence before saving:
    * **POLE**: 4 photos for Concrete Pole, 2 photos for Non-Concrete Pole.
    * **EARTHING**: 1 mandatory photo showing the earthing electrode installation.
    * **STAY_SET**: 1 mandatory photo showing stay rod and guy wire installation.
    * **POLE_DB**: Compliance photo of distribution box mounting (LT lines).
* **Cloudflare R2 / S3 Document Pipeline**:
  * Client-side image compression targeting under 5MB per photo.
  * Multi-part form upload to `POST /gis/administration/s3/upload/`.
  * Generates organized cloud storage keys: `GIS/erections/{erection_id}/{pole_label}/{year}/{month}/{day}/{uuid}.jpg`.
  * Secure pre-signed URL generation via `POST /gis/administration/s3/sign/` for certified image retrieval.
  * Full-screen interactive photo viewer modal with zoom and pan controls.

---

## 10. Module 9: Offline-First Architecture & Sync Terminal

### 10.1 Functionalities (`SyncQueueScreen.tsx`, `store/index.ts`)
* **Offline-First Data Pipeline**:
  * Operates without network connectivity in remote terrain.
  * Completed survey runs are stored in Redux and mirrored to persistent device storage (`AsyncStorage`).
* **Sync Terminal Interface**:
  * Displays pending survey lines, node counts, and capture timestamps.
  * Color-coded status badges: `PENDING`, `SYNCING`, `SYNCED`, `ERROR`.
* **Reliable Batch Syncing Engine**:
  * Uploads surveys and erections sequentially with dependency validation.
  * Synchronizes all nodes, attributes, and photos.
  * Automatic retry mechanisms with detailed error reporting.

---

## 11. Module 10: Backend Master Management & REST API Ecosystem

### 11.1 Backend Models (`survey_management/models.py`, `master_management/models.py`)
* `SurveyLine`: High-level survey container tracking line type, surveyor, feeder, and sync status.
* `SurveyNode`: Point-level survey records holding coordinates, sequence numbers, and JSONB attributes.
* `ErectionExecution`: Approved engineering drawing implementation tracking contractor, work type, and status.
* `ErectionNode`: Physical erection records with explicit foreign keys to `PoleMaster`, `TransformerMaster`, `ConductorMaster`, and JSONB attributes.
* `ErectionNodeImage`: Relational storage of uploaded compliance photo keys and categories.
* `DomainLookup`: Universal lookup table holding standardized domain codes and descriptions (`pole_type`, `earthing`, `stay_set`, `pole_db`, `type_of_work`, `lt_starting_point`).

### 11.2 API Route Registry (`gis_admin/api.py`, `master_management/urls.py`)

| Endpoint Route | HTTP Method | Module | Description |
|---|---|---|---|
| `/gis/administration/admin/login/` | `POST` | Auth | Surveyor & admin authentication |
| `/gis/administration/admin/logout/` | `POST` | Auth | Session termination |
| `/gis/administration/health/` | `GET` | Health | Service & DB connectivity check |
| `/gis/administration/erection/start/` | `POST` | Erection | Initiates an erection execution run |
| `/gis/administration/erection/list/` | `POST` | Erection | Lists all erection projects with filters |
| `/gis/administration/erection/detail/` | `POST` | Erection | Fetches full drawing details and node list |
| `/gis/administration/erection/node/save/` | `POST` | Erection | Creates or patches an erection node |
| `/gis/administration/erection/pole/details/`| `POST` | Erection | Fetches certified node details & signed R2 URLs |
| `/gis/administration/erection/span/update/` | `POST` | Erection | Updates span distance & parent node in DB |
| `/gis/administration/erection/complete/` | `POST` | Erection | Marks erection project as finished |
| `/gis/administration/survey/list/` | `POST` | Survey | Lists all survey lines |
| `/gis/administration/survey/detail/` | `POST` | Survey | Fetches complete survey line and node map |
| `/gis/administration/survey/span/update/` | `POST` | Survey | Updates survey line span distance in DB |
| `/gis/administration/s3/upload/` | `POST` | Media | Uploads compliance image to Cloudflare R2 |
| `/gis/administration/s3/sign/` | `POST` | Media | Generates certified signed URL for R2 key |
| `/gis/administration/master/domains/` | `POST` | Master | Fetches domain lookup codes and values |
| `/gis/administration/master/poles/` | `POST` | Master | Fetches pole specifications master list |
| `/gis/administration/master/conductors/` | `POST` | Master | Fetches conductor specifications list |
| `/gis/administration/master/transformers/`| `POST` | Master | Fetches transformer capacities master list |

---

## 12. Data Payload Design & Integrity Guidelines

To guarantee relational consistency and prevent database corruption, all developers and automated agents must adhere to the following payload contract:

1. **Master Dropdowns**:
   * Every master dropdown value stored in the DB (transformers, conductors, pole masters) must be stored as the numeric `id` (e.g., `pole_type_id: 4`, `conductor: 2`, `dtr_capacity: 1`), **never as a string label or name**.
2. **Domain Lookups**:
   * Every domain dropdown value stored in the DB (e.g., `pole_type`, `earthing`, `stay_set`, `pole_db`, `type_of_work`, `lt_starting_point`) must be stored as the numeric or standardized `domain_code` string/number, **never as a display name or label**.
   * Specifically for `pole_type`:
     * `1` = Concrete Pole
     * `2` = Non-Concrete Pole
3. **Span Distances**:
   * Stored in node attributes as `spanDistance` and `span_distance`.
   * When queried for mathematical BoQ calculations, parsed using `parseFloat()` to safely handle numeric strings and values containing meter suffixes (e.g. `45m`).
