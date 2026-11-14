# Ball Auditorias

A web application for digitizing factory 5S audits, recording process evaluations, and organizing audit data for analysis.

**[Live Application](https://ball-auditorias.web.app/)** · **[Source Code](https://github.com/jvmbeck/ball-auditorias)**

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

![Admin Dashboard]<img width="1910" height="956" alt="image" src="https://github.com/user-attachments/assets/23396407-7f9d-4970-bad3-8a94b0117a44" />

### Audit Dashboard

![Audit dashboard]<img width="1150" height="555" alt="image" src="https://github.com/user-attachments/assets/c49a7d71-3208-4460-9ae3-4dce2e3c3941" />
<img width="1136" height="887" alt="image" src="https://github.com/user-attachments/assets/f9a3a71a-047f-462f-a43b-4ead3111b673" />

*Overview of audit results and visual summaries.*

### Daily Audit

![Daily audit interface]<img width="1443" height="602" alt="image" src="https://github.com/user-attachments/assets/75a149be-a0ca-492c-89d2-a6399f691225" />

*Interface for recording process evaluations.*

### Action Plans

![Action plan interface]<img width="1458" height="794" alt="image" src="https://github.com/user-attachments/assets/794e308b-c5cb-449b-8c9c-841b0279295d" />

*Action-plan records used to support follow-up activities.*

## Tech Stack

| Technology | Purpose |
|---|---|
| Vue 3 | Frontend framework |
| Quasar | UI framework and application tooling |
| TypeScript | Static typing |
| Pinia | Application state management |
| Firebase | Backend services and cloud infrastructure |
| ECharts | Data visualization |
| Vue ECharts | Integration of ECharts with Vue |
| Vue Router | Client-side routing |

## Architecture

The application is built as a Vue single-page application using Quasar and TypeScript.

Pinia manages application state, while Firebase provides cloud services. ECharts, integrated through Vue ECharts, supports the presentation of audit data through visualizations.

This stack supports a separation between the user interface, application state, cloud-backed data operations, and data visualization.

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
