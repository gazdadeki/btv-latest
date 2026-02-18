# BTV - Event Scheduling System

A comprehensive event scheduling and reservation system built with NestJS, TypeScript, and Percona XtraDB Cluster.

## Features

- User authentication with JWT and refresh tokens
- User verification system with email codes
- Subscription system (Free/Gold tiers)
- Stripe integration for payments and subscriptions
- Event scheduling with recurring patterns
- Slot reservation system with team balance
- Real-time updates via WebSocket
- Firebase push notifications
- Comprehensive audit logging
- User activity tracking
- Admin dashboard API
- Player client API

## Prerequisites

- Node.js 22+
- MySQL/Percona XtraDB Cluster (external)
- Firebase project with service account JSON file (for push notifications)

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `env.example` to `.env` and configure
4. Run migrations: `npm run migration:run`
5. Start development server: `npm run start:dev`

Installation steps above are the current source of truth for this repository snapshot.

## Development

Automated setup scripts are not included in this repository snapshot.

## Frontend

This backend is part of a Turborepo monorepo. The frontend lives in the monorepo root.

- Admin panel + public pages (`/downloads`, `/reset-password`) are served by `apps/web` (Next.js, port 3001).
- Run all services from the monorepo root: `npm run dev`
- Run only the backend: `npm run dev:backend`
- Build all: `npm run build`

## Production

Production setup documentation is not included in this repository snapshot.

## Remote Database (required)

This repository expects a remote/shared MySQL or Percona instance for all
environments (dev, test, prod). Use dedicated databases per environment and
point `.env` / `.env.test` to the appropriate host.

Minimal setup (run on the remote database server):

```
CREATE DATABASE btv;
CREATE DATABASE btv_test;

CREATE USER 'btv_app'@'%' IDENTIFIED BY 'change_me';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON btv.* TO 'btv_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON btv_test.* TO 'btv_app'@'%';
FLUSH PRIVILEGES;
```

Then:

1. Copy `env.example` to `.env` and set `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`,
   `DB_DATABASE`.
2. Run migrations: `npm run migration:run`
3. Start development server: `npm run start:dev`

## API Documentation

Swagger documentation available at `/api` when running in development mode.
