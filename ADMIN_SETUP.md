# Admin Panel Setup Guide

## 1. Push Prisma Schema Changes

Run the following command to apply the Admin model to your database:

```bash
npx prisma db push
```

## 2. Seed Super Admin

Create the super admin account:

```bash
npx tsx prisma/seed-admin.ts
```

**Super Admin Credentials:**
- Email: `admin@gosafezw.com`
- Password: `GoSafeZW#2026`

## 3. Access Admin Panel

1. Navigate to `/admin/login`
2. Login with the super admin credentials
3. You'll be redirected to `/admin` dashboard

## Completed Features

✅ Admin authentication (login, verify)
✅ Admin dashboard with stats
✅ Users management (view, edit password, delete, verify ID)
✅ Taxi drivers management (view, approve, delete)

## Remaining Pages to Create

The following pages need to be created following the same pattern as the drivers/users pages:

### 1. Bus Providers (`/admin/bus-providers`)
- API: `/api/admin/bus-providers` (GET, PATCH, DELETE)
- Similar to drivers page
- Model: `BusProvider` with `isVerified` field

### 2. Parcel Providers (`/admin/parcel-providers`)
- API: `/api/admin/drivers?serviceType=parcel` (filter by serviceType: 'motorbike')
- Reuse drivers API with filter
- Show only drivers with `serviceType: 'motorbike'`

### 3. Home Service Providers (`/admin/home-service-providers`)
- API: `/api/admin/home-service-providers` (GET, PATCH, DELETE)
- Model: `ServiceProvider` with `isVerified` field

### 4. Bus Schedules (`/admin/bus-schedules`)
- API: `/api/admin/bus-schedules` (GET, PATCH)
- View all schedules, edit them
- Cannot add new schedules (as per requirements)

### 5. Cities (`/admin/cities`)
- API: `/api/admin/cities` (GET, POST, DELETE)
- Add new cities, delete cities
- Model: `City`

### 6. City-to-City Requests (`/admin/city-to-city`)
- API: `/api/admin/city-to-city` (GET with filters)
- Filter by status: active, cancelled, completed
- Model: `CityToCityRequest`

### 7. Ride Requests (`/admin/rides`)
- API: `/api/admin/rides` (GET with filters)
- Filter by status: pending, searching, accepted, in_progress, completed, cancelled
- Model: `RideRequest`

### 8. Parcel Requests (`/admin/parcels`)
- API: `/api/admin/parcels` (GET with filters)
- Filter by status
- Model: `ParcelRequest`

### 9. Service Requests (`/admin/services`)
- API: `/api/admin/services` (GET with filters)
- Filter by status
- Model: `ServiceRequest`

### 10. Bus Bookings (`/admin/bus-bookings`)
- API: `/api/admin/bus-bookings` (GET with filters)
- Filter by status: pending, confirmed, cancelled
- Model: `BusBooking`

## Pattern for Creating New Pages

1. Create API route in `src/app/api/admin/[resource]/route.ts`
2. Add authentication check (same as existing routes)
3. Create page component in `src/app/admin/[resource]/page.tsx`
4. Follow the same UI pattern as drivers/users pages
5. Add filters for status where applicable

## Notes

- All admin routes require authentication via JWT token stored in `localStorage` as `admin_token`
- The admin layout automatically handles authentication and redirects to login if not authenticated
- All pages follow the same design pattern with gray-800 backgrounds and consistent styling
