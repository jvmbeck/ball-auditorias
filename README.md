# Ball Auditorias

A web application for digitizing factory 5S audits, recording process evaluations, and organizing audit data for analysis.

**[Source Code](https://github.com/jvmbeck/ball-auditorias)**

## Overview

Ball Auditorias was developed to support factory quality-audit workflows by replacing manual audit records with a centralized digital application.

The system allows users to record daily audit results across industrial processes and provides a structured way to review evaluations and analyze collected data.

The application was previously used in a factory environment. This project provided practical experience translating an operational workflow into a web application, from data collection to visualization.

## Features

- **Digital audit recording:** Record daily 5S audit evaluations through a web interface.
- **Process evaluation:** Organize audit results across 37 industrial processes, using a 1, 3, and 5 rating scale.
- **Audit history:** Store audit records for subsequent consultation and analysis.
- **Action plans:** Maintain action-plan records associated with the audit workflow.
- **Data visualization:** Use charts to make audit results easier to interpret.
- **Cloud-backed application:** Use Firebase services to support the application's data and deployment infrastructure.

## Screenshots

<img width="1910" height="956" alt="image" src="https://github.com/user-attachments/assets/23396407-7f9d-4970-bad3-8a94b0117a44" />

### Audit Dashboard

<img width="1150" height="555" alt="image" src="https://github.com/user-attachments/assets/c49a7d71-3208-4460-9ae3-4dce2e3c3941" />
<img width="1136" height="887" alt="image" src="https://github.com/user-attachments/assets/f9a3a71a-047f-462f-a43b-4ead3111b673" />

_Overview of audit results and visual summaries._

### Daily Audit

<img width="1443" height="602" alt="image" src="https://github.com/user-attachments/assets/75a149be-a0ca-492c-89d2-a6399f691225" />

_Interface for recording process evaluations._

### Action Plans

<img width="1458" height="794" alt="image" src="https://github.com/user-attachments/assets/794e308b-c5cb-449b-8c9c-841b0279295d" />

_Action-plan records used to support follow-up activities._

## Tech Stack

| Technology  | Purpose                                   |
| ----------- | ----------------------------------------- |
| Vue 3       | Frontend framework                        |
| Quasar      | UI framework and application tooling      |
| TypeScript  | Static typing                             |
| Pinia       | Application state management              |
| Firebase    | Backend services and cloud infrastructure |
| ECharts     | Data visualization                        |
| Vue ECharts | Integration of ECharts with Vue           |
| Vue Router  | Client-side routing                       |

## Architecture

Ball Auditorias follows a modular frontend architecture built around Vue 3, Pinia, and Firebase. Application responsibilities are separated into UI components, centralized state management, and service modules responsible for business logic and data persistence.

### Application Structure

**Frontend — Vue 3 and Quasar**

The presentation layer is organized into pages and reusable components, with separate interfaces for auditors and administrators.

Vue Router manages navigation and uses route metadata to distinguish public, authenticated, and role-restricted routes.

**State Management — Pinia**

Pinia stores centralize application state and coordinate interactions between the UI and service layer.

The main stores are responsible for:

- Authentication state and user profile resolution.
- Daily 5S audit state, including selected processes, ratings, and supporting files.
- Analytics data, loading states, caching, and request deduplication.

**Service Layer**

Dedicated service modules encapsulate Firebase operations and application-specific business logic.

This keeps data access and persistence operations separate from presentation components and allows workflows to be reused across the application.

**Backend Services — Firebase**

The application uses:

- **Firebase Authentication:** User authentication.
- **Cloud Firestore:** Audit records, process evaluations, user profiles, and action plans.
- **Firebase Storage:** Storage of images attached to audit evaluations.

### Key Data Workflows

#### 1. Authentication and Authorization

Firebase Authentication manages user identity, while Firestore stores application-level user profiles and roles.

After authentication, the application resolves the corresponding user profile and uses the assigned role to determine navigation permissions.

The two main roles are `admin` and `operator`, each with access to different application areas.

#### 2. Daily 5S Audit Processing

The audit workflow is managed through a dedicated Pinia store and service modules.

Auditors select processes and submit evaluations using a rating scale of 1, 3, or 5. Evaluations with a rating of 1 require an issue reason and supporting image.

The service layer persists individual process results in Firestore, uploads supporting images to Firebase Storage, and updates the corresponding audit document with aggregate ratings.

Images are resized and converted to WebP when supported by the browser before upload, helping reduce storage requirements.

#### 3. Automatic Action-Plan Synchronization

Audit evaluations are connected to an action-plan workflow.

When a process evaluation is updated, the application compares its previous issue reasons with the new ones. New issues generate action-plan records, while removed issues cause their corresponding plans to be cancelled.

Related updates are committed using Firestore write batches, keeping the action-plan records synchronized with the evaluation workflow.

#### 4. Analytics and Data Processing

The analytics layer retrieves monthly audit data and transforms it into datasets used by the dashboard.

Derived metrics include monthly score trends, process-level heatmaps, issue distributions, and rankings of processes receiving the lowest rating.

The analytics Pinia store also implements a 15-minute cache and request deduplication to avoid unnecessary repeated data retrieval.

## Engineering Decisions

Some of the main engineering considerations behind the application included:

- **Separation of concerns:** Keeping UI components, application state, and Firebase operations in distinct layers.
- **Business-rule validation:** Enforcing evaluation requirements, including mandatory issue descriptions and images for low-rated processes.
- **Data consistency:** Synchronizing audit evaluations and related action plans through dedicated service logic.
- **Efficient data retrieval:** Using canonical monthly datasets, caching, and request deduplication for analytics.
- **Image optimization:** Resizing and converting uploaded images to WebP when browser support is available.

## Engineering Focus

The project involved translating a factory audit workflow into a digital system, with particular attention to:

- Representing audit evaluations and related records in an application data model.
- Supporting structured evaluations across multiple industrial processes.
- Organizing audit data for historical consultation and visual analysis.
- Integrating frontend application state with Firebase services.
- Presenting collected data through interactive charts.

## Running Locally

The application uses Quasar CLI and npm-compatible tooling.

Prerequisites:

- Node.js and a compatible package manager.
- Firebase project configuration and access to the required Firebase services.

To install dependencies:

```bash
npm install
```

To start the development server:

```bash
npm run dev
```

To build the application:

```bash
npm run build
```

Firebase configuration and service permissions must be set up appropriately for the application to run against a Firebase project. Do not use production credentials or unrestricted production data for local development.

## Project Status

Previously used in a factory environment. The repository is maintained as a portfolio project demonstrating the development of a cloud-backed industrial audit application.

## Author

Developed by [jvmbeck](https://github.com/jvmbeck).
