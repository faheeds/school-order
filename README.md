# School Lunch Preorder System

Production-oriented school lunch preorder app for a restaurant serving next-day school deliveries. Parents place orders, pay online, get automatic confirmation emails, and staff generate printable student labels and CSV exports from the admin dashboard.

## Proposed Architecture

### Stack

- Next.js App Router with TypeScript for the full-stack app shell
- PostgreSQL for relational order, menu, school, and payment data
- Prisma for schema, migrations, seed data, and typed database access
- NextAuth credentials auth for admin login
- Stripe Checkout + verified webhook for payment processing
- Resend email abstraction for order confirmation and resend support
- Tailwind CSS for fast, practical UI
- `@react-pdf/renderer` for printable label PDFs
- Vitest for business-rule test coverage
- Docker + Docker Compose for local deployment

### Why this stack

- It keeps the ordering form, admin dashboard, server routes, and validation in one codebase.
- Prisma makes the data model easy to extend later for more schools, delivery windows, or menu complexity.
- Stripe Checkout reduces PCI risk and speeds up a reliable payment flow.
- Resend is simple to operate and easy to swap if you later prefer SendGrid.
- Next.js route handlers fit webhook handling, CSV export, and PDF generation cleanly.

## File Structure

```text
school-lunch-preorder/
  app/
    (marketing)/
      order/page.tsx
      checkout/success/page.tsx
    admin/
      login/page.tsx
      dashboard/page.tsx
      orders/page.tsx
      orders/[orderId]/page.tsx
      orders/labels-print/page.tsx
      menu/page.tsx
      schools/page.tsx
      delivery-dates/page.tsx
    api/
      auth/[...nextauth]/route.ts
      checkout/create-session/route.ts
      stripe/webhook/route.ts
      admin/orders/route.ts
      admin/orders/[orderId]/route.ts
      admin/labels/route.ts
      admin/export/route.ts
  components/
    admin/
    forms/
  lib/
    auth.ts
    orders.ts
    admin.ts
    db.ts
    env.ts
    validation/
    payments/
    email/
    pdf/
  prisma/
    schema.prisma
    seed.ts
    migrations/.../migration.sql
  tests/
```

## Data Model

Prisma models included:

- `AdminUser`
- `School`
- `DeliveryDate`
- `MenuItem`
- `DeliveryMenuItem`
- `MenuOption`
- `Student`
- `Order`
- `OrderItem`
- `Payment`
- `EmailLog`
- `ProcessedWebhookEvent`

The order and order item records snapshot additions, removals, allergy notes, and special instructions so label output stays kitchen-friendly even after menu definitions evolve.

## Core Workflow

1. Parent opens `/order`.
2. Parent selects a school delivery date and menu item.
3. System validates that the selected delivery date is still before the configured cutoff.
4. App creates a pending order and starts a Stripe Checkout session.
5. Stripe webhook verifies the event, enforces idempotency using `ProcessedWebhookEvent`, and marks the order/payment as paid.
6. Confirmation email is sent automatically after successful payment. If email fails, the order remains valid and the failure is logged for retry.
7. Admin reviews paid orders in `/admin/orders`, exports CSVs, opens sticker print view, or downloads a labels PDF.

## Local Setup

### 1. Install dependencies

```powershell
npm.cmd install
```

### 2. Create environment file

```powershell
Copy-Item .env.example .env
```

Set at minimum:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`

### 3. Start PostgreSQL

Option A: local Postgres

Option B: Docker Compose

```powershell
docker compose up -d db
```

### 4. Run Prisma migration and seed

```powershell
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the app

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Seed Data

The seed creates:

- 1 admin account
- 2 sample schools
- 2 menu items with add-ons and removals
- 3 upcoming delivery dates per school
- menu availability for those delivery dates

Default seeded admin credentials come from:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

If not provided:

- email: `admin@example.com`
- password: `ChangeMe123!`

## Stripe Webhook Setup

Run Stripe CLI locally:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook secret from Stripe CLI into `STRIPE_WEBHOOK_SECRET`.

## Email Setup

This project uses Resend through `lib/email/service.ts`.

If `RESEND_API_KEY` and `EMAIL_FROM` are not configured, the app code is still present, but live email delivery will not work. Email failures are logged in `EmailLog`, and admins can retry from the orders screen.

## Deployment

### Vercel + managed Postgres

- Add all env vars in your hosting platform
- Run `prisma migrate deploy`
- Ensure Stripe webhook endpoint points to `/api/stripe/webhook`

### Docker

```powershell
docker compose up --build
```

## Tests

Included tests cover:

- cutoff validation
- paid order state mapping after checkout success
- duplicate webhook idempotency helper logic
- label generation mapping

Run tests:

```powershell
npm.cmd test
```

## Notes and Assumptions

- The app currently supports one lunch item per order. This keeps label generation and checkout simple and reliable; it can be extended to multi-item carts later.
- Refund UI currently marks an order refunded in the application. Live Stripe refund execution can be added as a next step if you want real refund API calls.
- Admin auth uses credential login seeded from the database.
- Delivery dates are explicit records so you can control availability and cutoff per school/date.
- The print view and PDF generator default to paid orders only.

## Secrets or Live Credentials Still Needed

- PostgreSQL connection string
- Stripe publishable key
- Stripe secret key
- Stripe webhook signing secret
- Resend API key
- verified sender email address
- secure `NEXTAUTH_SECRET`
