# TaxiFleet SaaS - Setup Guide

A comprehensive multi-tenant taxi association management platform built with Next.js 16, Appwrite, and Paystack.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Appwrite Setup](#appwrite-setup)
5. [Database Collections](#database-collections)
6. [Paystack Setup](#paystack-setup)
7. [Google Maps Setup](#google-maps-setup)
8. [Running the Project](#running-the-project)
9. [Project Structure](#project-structure)
10. [Features Checklist](#features-checklist)

---

## Overview

TaxiFleet is a SaaS platform designed for taxi associations in South Africa. It provides:

- **Multi-tenancy**: Each taxi association operates independently
- **Owner Management**: Track taxi owners and their membership status
- **Vehicle Management**: Register and monitor fleet vehicles
- **Route Management**: Define and manage operating routes
- **Payment Processing**: Collect membership fees via Paystack
- **Fine Management**: Issue and track disciplinary fines
- **Real-time GPS Tracking**: Monitor vehicle locations on a live map
- **Reports & Analytics**: Generate insights on operations
- **Announcements**: Broadcast messages to all owners

---

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Appwrite Cloud account or self-hosted instance
- Paystack account (for payments)
- Google Maps API key (for vehicle tracking)

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=taxi_saas

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Google Maps (for tracking)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Appwrite Setup

### 1. Create Project

1. Log in to [Appwrite Console](https://cloud.appwrite.io)
2. Create a new project
3. Note your Project ID

### 2. Create API Key

1. Go to Settings > API Keys
2. Create a new API key with the following scopes:
   - `databases.read`
   - `databases.write`
   - `users.read`
   - `users.write`
3. Copy the API key to your `.env.local`

### 3. Create Database

1. Go to Databases
2. Create a new database with ID: `taxi_saas`

---

## Database Collections

Create the following collections in your Appwrite database. Each collection needs specific attributes and indexes.

### Users Collection (`users`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| email | string (255) | Yes | - |
| name | string (255) | Yes | - |
| role | enum: SUPER_ADMIN, ASSOCIATION_ADMIN, OWNER | Yes | - |
| tenantId | string (36) | No | null |
| phone | string (20) | No | - |
| status | enum: active, inactive, suspended | Yes | active |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: email (unique), tenantId, role, status

### Tenants Collection (`tenants`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| name | string (255) | Yes | - |
| slug | string (100) | Yes | - |
| logo | string (500) | No | - |
| address | string (500) | No | - |
| phone | string (20) | Yes | - |
| email | string (255) | Yes | - |
| registrationNumber | string (50) | No | - |
| subscriptionId | string (36) | No | - |
| subscriptionStatus | enum: active, expired, cancelled, pending, trial | Yes | trial |
| settings | string (5000) | No | {} |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: slug (unique), email, subscriptionStatus

### Subscriptions Collection (`subscriptions`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| plan | enum: starter, growth, enterprise | Yes | - |
| status | enum: active, expired, cancelled, pending, trial | Yes | - |
| paystackSubscriptionCode | string (100) | No | - |
| paystackCustomerCode | string (100) | No | - |
| amount | integer | Yes | - |
| billingCycle | enum: monthly, yearly | Yes | monthly |
| currentPeriodStart | datetime | Yes | - |
| currentPeriodEnd | datetime | Yes | - |
| cancelledAt | datetime | No | - |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: tenantId, status, currentPeriodEnd

### Owners Collection (`owners`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| userId | string (36) | No | - |
| firstName | string (100) | Yes | - |
| lastName | string (100) | Yes | - |
| idNumber | string (20) | Yes | - |
| phone | string (20) | Yes | - |
| email | string (255) | Yes | - |
| address | string (500) | No | - |
| membershipStatus | enum: active, suspended, pending | Yes | pending |
| joinedAt | datetime | Yes | - |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: tenantId, idNumber, email, membershipStatus

### Vehicles Collection (`vehicles`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| ownerId | string (36) | Yes | - |
| registrationNumber | string (20) | Yes | - |
| make | string (50) | Yes | - |
| model | string (50) | Yes | - |
| year | integer | Yes | - |
| capacity | integer | Yes | - |
| status | enum: active, inactive, maintenance | Yes | active |
| operatingPermitNumber | string (50) | Yes | - |
| operatingPermitExpiry | datetime | Yes | - |
| insuranceExpiry | datetime | Yes | - |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: tenantId, ownerId, registrationNumber (unique per tenant), status

### Routes Collection (`routes`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| name | string (100) | Yes | - |
| code | string (20) | Yes | - |
| origin | string (255) | Yes | - |
| destination | string (255) | Yes | - |
| distance | float | No | 0 |
| baseFare | float | No | 0 |
| maxVehicles | integer | Yes | - |
| currentVehicleCount | integer | Yes | 0 |
| status | enum: active, inactive | Yes | active |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: tenantId, code, status

### Membership Payments Collection (`membership_payments`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| ownerId | string (36) | Yes | - |
| amount | float | Yes | - |
| paymentType | enum: membership, fine, other | Yes | - |
| status | enum: pending, completed, failed, refunded | Yes | pending |
| paystackReference | string (100) | No | - |
| paystackTransactionId | string (100) | No | - |
| period | string (20) | Yes | - |
| paidAt | datetime | No | - |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: tenantId, ownerId, status, paystackReference, paidAt

### Fines Collection (`fines`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| ownerId | string (36) | Yes | - |
| vehicleId | string (36) | No | - |
| type | string (50) | Yes | - |
| description | string (1000) | Yes | - |
| amount | float | Yes | - |
| status | enum: pending, paid, waived, appealed | Yes | pending |
| issuedBy | string (36) | Yes | - |
| issuedAt | datetime | Yes | - |
| paidAt | datetime | No | - |
| paymentId | string (36) | No | - |
| createdAt | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: tenantId, ownerId, status, issuedAt

### Notifications Collection (`notifications`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| tenantId | string (36) | Yes | - |
| userId | string (36) | No | - |
| title | string (255) | Yes | - |
| message | string (2000) | Yes | - |
| type | enum: announcement, payment, fine, compliance, system | Yes | - |
| priority | enum: low, medium, high | Yes | medium |
| read | boolean | Yes | false |
| readAt | datetime | No | - |
| createdAt | datetime | Yes | - |

**Indexes**: tenantId, userId, type, read, createdAt

### Live Locations Collection (`live_locations`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| vehicleId | string (36) | Yes | - |
| tenantId | string (36) | Yes | - |
| latitude | float | Yes | - |
| longitude | float | Yes | - |
| speed | float | Yes | 0 |
| heading | float | Yes | 0 |
| status | enum: active, idle, offline | Yes | offline |
| timestamp | datetime | Yes | - |
| updatedAt | datetime | Yes | - |

**Indexes**: vehicleId (unique), tenantId, status, updatedAt

### Location History Collection (`location_history`)

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| vehicleId | string (36) | Yes | - |
| tenantId | string (36) | Yes | - |
| latitude | float | Yes | - |
| longitude | float | Yes | - |
| speed | float | Yes | 0 |
| heading | float | Yes | 0 |
| timestamp | datetime | Yes | - |

**Indexes**: vehicleId, tenantId, timestamp

---

## Paystack Setup

### 1. Create Paystack Account

1. Sign up at [Paystack](https://paystack.com)
2. Complete business verification
3. Get your API keys from Settings > API Keys & Webhooks

### 2. Configure Webhook

1. In Paystack Dashboard, go to Settings > API Keys & Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
3. Select events:
   - `charge.success`
   - `subscription.create`
   - `subscription.disable`
   - `invoice.payment_failed`
4. Copy the webhook secret to your `.env.local`

### 3. Create Subscription Plans

In Paystack Dashboard, create subscription plans matching:
- **Starter**: R500/month
- **Growth**: R1500/month
- **Enterprise**: R5000/month

---

## Google Maps Setup

### 1. Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API

### 2. Create API Key

1. Go to APIs & Services > Credentials
2. Create an API key
3. Restrict to your domain for production
4. Add to `.env.local`

---

## Running the Project

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Production

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

---

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (marketing)/         # Public marketing pages
│   │   ├── page.tsx         # Landing page
│   │   └── pricing/
│   ├── admin/               # Super admin dashboard
│   │   ├── page.tsx
│   │   └── tenants/
│   ├── api/                  # API routes
│   │   ├── payments/
│   │   ├── tracking/
│   │   └── webhooks/
│   ├── dashboard/           # Post-login routing
│   └── tenant/[tenantId]/   # Tenant dashboard
│       ├── announcements/
│       ├── dashboard/
│       ├── fines/
│       ├── membership/
│       ├── owners/
│       ├── reports/
│       ├── routes/
│       ├── settings/
│       ├── tracking/
│       └── vehicles/
├── components/
│   ├── admin/               # Admin-specific components
│   ├── auth/                # Auth forms
│   ├── tenant/              # Tenant dashboard components
│   ├── tracking/            # GPS tracking components
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── appwrite/            # Appwrite client & collections
│   │   ├── collections/     # Collection-specific operations
│   │   ├── client.ts
│   │   ├── config.ts
│   │   └── server.ts
│   ├── auth/                # Authentication utilities
│   │   ├── rbac.ts         # Role-based access control
│   │   └── session.ts
│   └── paystack/            # Paystack integration
├── types/                   # TypeScript interfaces
└── middleware.ts            # Auth middleware
```

---

## Features Checklist

### Phase 1 (MVP)

- [x] Multi-tenant architecture
- [x] User authentication (Appwrite Auth)
- [x] Role-based access control (SUPER_ADMIN, ASSOCIATION_ADMIN, OWNER)
- [x] Tenant self-service registration
- [x] Owner management (CRUD)
- [x] Vehicle management (CRUD)
- [x] Route management (CRUD)
- [x] Basic subscription with Paystack

### Phase 2 (Billing & Reporting)

- [x] Membership fee billing
- [x] Paystack payment integration
- [x] Payment history tracking
- [x] Webhook handling for payment events
- [x] Fines management (issue, waive, mark paid)
- [x] Reports & analytics dashboard
- [x] Revenue tracking
- [x] Compliance monitoring

### Phase 3 (GPS Tracking)

- [x] Real-time GPS tracking API
- [x] Live location storage
- [x] Location history
- [x] Google Maps integration
- [x] Live vehicle map with status indicators
- [x] Vehicle status detection (active/idle/offline)
- [x] Trip playback UI (framework ready)
- [x] Announcements/notifications system

### Super Admin Module

- [x] Platform dashboard with stats
- [x] Tenant management
- [x] View all associations
- [x] Platform-wide analytics

---

## API Endpoints

### Tracking APIs

- `POST /api/tracking/location` - Submit GPS coordinates from vehicle
- `GET /api/tracking/locations?tenantId=xxx` - Get all live locations for tenant
- `GET /api/tracking/history?vehicleId=xxx` - Get location history

### Payment APIs

- `POST /api/payments/initialize` - Initialize Paystack payment
- `GET /api/payments/verify?reference=xxx` - Verify payment
- `POST /api/webhooks/paystack` - Handle Paystack webhooks

---

## Support

For issues or questions, please open an issue on the repository.
