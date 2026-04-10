# INV FarmTrack — Plant Nursery Management App

A Power Apps code app for managing a plant nursery — tracking plant species, growing batches, inventory, orders, customers, and daily farm tasks.

Built with **React + TypeScript + Vite + Tailwind CSS 4**, connected to **Microsoft Dataverse** via the Power Apps SDK.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Platform | Microsoft Power Apps (code app) |
| Data | Microsoft Dataverse |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Animation | framer-motion |

---

## Data Model

| Table | Logical Name | Description |
|-------|-------------|-------------|
| Plants | `inv_plant` | Species/variety catalog |
| Batches | `inv_batch` | Growing batches / lots |
| Inventory | `inv_inventory` | Current stock on hand |
| Orders | `inv_order` | Customer orders |
| Order Items | `inv_orderitem` | Order line items |
| Customers | `inv_customer` | Customer records |
| Tasks | `inv_task` | Farm tasks & activities |

Publisher prefix: `inv` | Solution: `INV_FarmTrack`

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (demo data, no Dataverse)
npm run dev

# Start with Dataverse token (live data)
DATAVERSE_URL=https://<your-env>.crm.dynamics.com npm run dev:dv
```

Create `.env.local` for Dataverse credentials:
```
VITE_DATAVERSE_URL=https://<your-env>.crm.dynamics.com
VITE_DATAVERSE_TOKEN=<bearer-token>
```

---

## Dataverse Schema

```bash
# Preview changes (dry run)
npm run dataverse:dry-run

# Apply schema to Dataverse
npm run dataverse:apply

# Seed sample data
npm run dataverse:seed
```

---

## Deploy to Power Apps

```bash
# Full build + deploy
npm run deploy

# Deploy without rebuild
npm run deploy:skip-build
```
