# Sentinel SIEM – Security Operations Center (SOC) Monitoring Dashboard

A lightweight, web-based **Security Information and Event Management (SIEM)** dashboard designed to demonstrate the fundamental workflow of a Security Operations Center (SOC).

Sentinel SIEM centralizes security logs, visualizes monitoring statistics, manages alerts, and tracks security incidents through a modular web application.

> **Project Type:** Educational / Academic SIEM Implementation

## Overview

Security Information and Event Management (SIEM) systems collect, normalize, and analyze security events from different sources to help administrators monitor threats and respond to incidents.

**Sentinel SIEM** demonstrates these concepts through a centralized web interface with modules for:

- Security monitoring dashboard
- Security log management
- Alert management
- Incident tracking
- Administrator login
- Reports
- REST API-based backend services
- MongoDB data storage

The project provides a simplified SOC environment suitable for learning and demonstrating core SIEM concepts.

## Objectives

- Centralize security log monitoring
- Provide security event visualization
- Manage and prioritize security alerts
- Track incidents throughout their lifecycle
- Store security events using MongoDB
- Provide REST API integration between the frontend and backend
- Demonstrate a modular SOC monitoring workflow

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| API Testing | Postman |
| Development | VS Code, Git |

## System Architecture

The application follows a client-server architecture:

```text
┌──────────────────────────────┐
│        Web Browser           │
│   Dashboard / Logs / Alerts  │
│       / Incidents            │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│       Node.js + Express      │
│                              │
│ Routes → Controllers         │
│                              │
│ Dashboard / Logs / Alerts    │
│ Incidents / Reports          │
└──────────────┬───────────────┘
               │
               │ Mongoose
               ▼
┌──────────────────────────────┐
│           MongoDB            │
│                              │
│ Logs / Alerts / Incidents    │
│ Users                        │
└──────────────────────────────┘
```

The browser communicates with REST APIs implemented using Express.js. Controllers process requests and Mongoose provides interaction with MongoDB.

## Key Modules

### 1. Administrator Login

The login module provides an administrator entry point before accessing the SIEM dashboard.

![Login Module]
<img width="1192" height="828" alt="login" src="https://github.com/user-attachments/assets/baa194f2-c774-4bf3-b0f2-0cd572eb97b2" />


### 2. SOC Dashboard

The dashboard provides an overview of the security environment, including:

- Total logs
- Active alerts
- Critical alerts
- Online hosts
- Threat score
- Event timeline
- Severity distribution
- Recent alerts
- Recent logs

![SOC Dashboard]
<img width="1192" height="838" alt="dashboard" src="https://github.com/user-attachments/assets/b71895b6-be9a-4487-8ed5-9697a0bf3011" />


### 3. Security Logs

The Logs module displays security events with:

- Timestamp
- Source IP
- Severity
- Event type
- Current status

It also provides search and export functionality to assist with log analysis.

![Security Logs]
<img width="1192" height="496" alt="logs" src="https://github.com/user-attachments/assets/23965306-a52e-400d-b329-307352d746ef" />


### 4. Security Alerts

The Alerts module prioritizes security events according to severity and provides actions for handling alerts.

The dashboard tracks:

- Total alerts
- Critical alerts
- Open alerts
- Resolved alerts

Analysts can acknowledge or resolve security alerts.

![Security Alerts]
<img width="1192" height="412" alt="alerts" src="https://github.com/user-attachments/assets/d80b1fa8-bb5a-4e09-9f48-5da7240ac1cd" />


### 5. Incident Management

The Incident Management module tracks detected incidents and their lifecycle.

It includes:

- Incident ID
- Detection time
- Priority
- Incident type
- Assigned analyst
- Current status
- Assignment and closure actions

The incident lifecycle is represented using statuses such as **Open**, **In Progress**, and **Closed**.

![Incident Management]
<img width="1192" height="824" alt="incidents" src="https://github.com/user-attachments/assets/881a0d7b-e8e4-4041-ae88-8ff55d0240d3" />


## Database

The Logs collection stores security event information including:

- Timestamp
- Source IP
- Event type
- Severity
- Message
- Status

The application architecture also supports collections for alerts, incidents, and users.

## Backend

The backend exposes REST APIs for dashboard statistics and log management.

The Express.js routes invoke controller functions, which interact with MongoDB through Mongoose.

Example backend structure:

```text
backend/
├── config/
│   └── database.js
├── controllers/
│   ├── alertController.js
│   ├── dashboardController.js
│   ├── incidentController.js
│   └── logController.js
├── models/
│   ├── Alert.js
│   ├── Incident.js
│   └── Log.js
├── routes/
│   ├── alertRoutes.js
│   ├── dashboardRoutes.js
│   ├── incidentRoutes.js
│   └── logRoutes.js
├── package.json
├── package-lock.json
└── server.js
```

## Frontend Structure

```text
SIEM/
├── index.html
├── dashboard.html
├── logs.html
├── alerts.html
├── incidents.html
├── reports.html
├── dashboard.js
├── logs.js
├── alerts.js
├── incidents.js
├── reports.js
├── dashboard.css
├── logs.css
├── alerts.css
├── incidents.css
├── reports.css
├── style.css
└── backend/
```

## Installation

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB
- Git

### 1. Clone the repository

```bash
git clone https://github.com/vinay-kumar-kode/SIEM-Dashboard.git
cd SIEM-Dashboard
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

Do **not** commit `.env` to GitHub.

### 4. Start the backend

```bash
npm start
```

If the project uses a different start script, run the command defined in `backend/package.json`.

### 5. Open the frontend

Open the frontend entry page in a browser or serve the frontend using a local web server, depending on the project configuration.

## Testing

The application was tested using **Postman** and a web browser.

Testing covered:

- REST API operations
- CRUD operations
- Dashboard loading
- Security log display
- Alert display and handling
- Incident management

## Results

Sentinel SIEM successfully demonstrates a simplified SOC monitoring workflow by:

- Displaying security events
- Visualizing security statistics
- Categorizing alerts by severity
- Managing alert status
- Tracking incidents
- Providing centralized monitoring through a web interface

## Project Advantages

- Lightweight and educational
- Centralized security monitoring
- Modular architecture
- Responsive web interface
- REST API-based backend
- MongoDB-backed data storage
- Extensible architecture

## Future Enhancements

Potential improvements include:

- Role-Based Access Control (RBAC)
- Real-time updates using Socket.IO
- Email notifications
- IDS integration
- Security event correlation rules
- Automated report generation

## Disclaimer

This project is intended for **educational and demonstration purposes**. It is a simplified SIEM implementation and is not intended to replace production-grade enterprise SIEM platforms.

## Author

**Vinay Kumar Kode**

GitHub: https://github.com/vinay-kumar-kode

Repository: https://github.com/vinay-kumar-kode/SIEM-Dashboard
