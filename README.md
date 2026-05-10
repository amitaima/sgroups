# SGroups

SGroups is a Hebrew-first web app for students working together on academic projects. It helps teams manage shared work through project spaces, tasks, deadlines, calendars, team collaboration, and project-focused dashboards.[cite:243][cite:237]

**Live demo:** [https://sgroups.netlify.app/](https://sgroups.netlify.app/)

## Overview

SGroups is designed around the real workflow of student teams rather than a generic business dashboard. Users first enter a projects home page, then open a specific project dashboard where they can track progress, deadlines, team activity, and shared work resources.[cite:247][cite:237]

The product is built mainly for students, with teacher access planned as a secondary role for viewing progress and later commenting. There is no distinction between admin and regular students in the current product direction.[cite:236]

## Features

- Hebrew-first interface and user experience.[cite:243]
- Projects home page for browsing and opening the user’s projects.[cite:247]
- Project-based dashboards instead of one global dashboard.[cite:247]
- Progress overview with key project status information.[cite:237]
- Deadline tracking, including nearest and final deadlines.[cite:237]
- Team member visibility and shared project context.[cite:237]
- Open tasks view focused on current team work.[cite:237]
- Student-oriented navigation with sections such as management, tasks, calendar, and groups.[cite:235]
- Responsive sidebar behavior: fixed on larger screens, collapsible on smaller ones, and adapted for phones.[cite:235]
- Theme-aware design system with light and dark mode support through centralized tokens.[cite:242]

## Design language

SGroups uses a warm earthy visual system instead of a cold corporate dashboard style. Its palette is built around Golden Chestnut, Dusty Olive, Tan, Parchment, and Tropical Teal, and the UI uses frosted-glass and glassmorphism effects to create a softer academic product feel.[cite:238][cite:240]

The design system is token-based, with centralized values for colors, radii, shadows, spacing, and theme behavior. This makes the app easier to scale consistently across pages and components.[cite:242][cite:245]

## Tech stack

- React.[cite:266]
- TypeScript.[cite:266]
- Tailwind CSS v4.[cite:266][cite:245]
- Firebase, including Firestore-backed project data.[cite:266][cite:269]
- Netlify for deployment.[cite:266]

## Routing structure

The authenticated app flow is centered around projects. Users land on a projects page first, and each project opens into its own route using a project identifier, following a structure such as `/projects/:projectId`.[cite:247][cite:269]

This keeps the experience aligned with multi-user academic collaboration, where each project has its own context, dashboard, tasks, and team state.[cite:247][cite:237]

## Current product direction

The current SGROUPS direction focuses on:

- A strong student collaboration experience.[cite:236]
- Clean, structured code and reusable UI foundations.[cite:239][cite:245]
- Design-token-driven consistency across the app.[cite:242][cite:245]
- Firebase-backed real project data instead of dummy dashboards.[cite:269]
- A more polished academic interface with rich but practical visual styling.[cite:238][cite:240]

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

SGroups is deployed on Netlify. Production builds are generated from the repository and published through the configured Netlify build pipeline.[cite:266]

## Vision

SGroups aims to give student teams a dedicated academic workspace that feels modern, focused, and collaborative. Instead of adapting a generic productivity tool, it is being shaped specifically around project-based learning, deadlines, shared responsibility, and team progress.[cite:237][cite:236]

---

Built for student project collaboration in a Hebrew-first experience.
