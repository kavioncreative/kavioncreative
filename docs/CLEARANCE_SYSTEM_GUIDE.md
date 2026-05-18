# Freelancer Earnings Clearance System - Implementation Guide

## Overview
This system automatically manages the clearance period for approved projects, transitioning them from **Pending Clearance** to **Available Amount** when the clearance period expires.

---

## 🗄️ Database Setup

### Step 1: Run the Migration

Execute the SQL migration file in your Supabase SQL Editor:

**File:** `migrations/add_clearance_tracking.sql`

This migration will:
- ✅ Add required columns to the `projects` table
- ✅ Create database functions for automatic status updates
- ✅ Set up triggers to initialize clearance tracking
- ✅ Create a view for easy querying with calculated days_left

### Step 2: Enable pg_cron (Optional but Recommended)

For automatic daily status updates:

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Enable **pg_cron** extension
3. Uncomment lines 60-64 in the migration file and re-run:

```sql
SELECT cron.schedule(
    'auto-clear-pending-projects',
    '0 0 * * *', -- Run daily at midnight
    $$ SELECT auto_update_funds_status(); $$
);
```

---

## 🔄 How It Works

### When a Project is Approved

1. **Project Status Changes** to `'Completed'` or `'Delivered'`
2. **Trigger Fires** (`trigger_set_clearance_start`)
3. **Automatic Actions:**
   - Sets `funds_status` = `'Pending'`
   - Sets `clearance_start_date` = current timestamp
   - Fetches `clearance_days` from linked platform (or defaults to 14)

### Daily Countdown

**Real-time Calculation:**
```typescript
daysLeft = clearance_days - daysPassed
```

- **Day 1:** 14 days left
- **Day 2:** 13 days left
- **Day 14:** 0 days left → Auto-transition to 'Cleared'

### Automatic Transition

**Two mechanisms ensure projects move from Pending to Available:**

1. **Client-Side (Real-time):**
   - Frontend calculates `daysLeft` on every render
   - Auto-corrects status if `daysLeft === 0`
   - Refreshes data every hour

2. **Server-Side (Daily):**
   - `auto_update_funds_status()` function runs daily (if pg_cron enabled)
   - Updates database records where clearance period expired
   - Ensures data integrity even if user doesn't visit the page

---

## 📊 Data Flow

```
Project Approved
    ↓
[Trigger: set_clearance_start_date]
    ↓
funds_status = 'Pending'
clearance_start_date = NOW()
clearance_days = 14 (from platform)
    ↓
[Appears in Pending Clearance Table]
Days Left: 14 → 13 → 12 → ... → 1 → 0
    ↓
[Auto-transition when daysLeft = 0]
    ↓
funds_status = 'Cleared'
    ↓
[Appears in Available Amount Table]
Funds Status: "Unpaid"
```

---

## 🎯 Frontend Implementation

### Key Features

1. **Real-time Days Left Calculation:**
```typescript
const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
const daysLeft = Math.max(0, clearance_days - daysPassed);
```

2. **Auto-status Correction:**
```typescript
if (funds_status === 'Pending' && daysLeft === 0) {
    actualStatus = 'Cleared';
}
```

3. **Hourly Auto-refresh:**
```typescript
setInterval(() => {
    fetchEarnings(selectedFreelancer);
}, 3600000); // Every hour
```

---

## 🧪 Testing the System

### Test Scenario 1: New Approved Project

1. Create a project with status `'Completed'`
2. Verify it appears in **Pending Clearance** table
3. Check that **Days Left** shows correct value (e.g., 14)

### Test Scenario 2: Countdown

1. Manually update `clearance_start_date` to 5 days ago:
```sql
UPDATE projects 
SET clearance_start_date = NOW() - INTERVAL '5 days'
WHERE project_id = 'TEST-001';
```
2. Refresh the page
3. Verify **Days Left** shows 9 (14 - 5)

### Test Scenario 3: Automatic Transition

1. Set `clearance_start_date` to 15 days ago:
```sql
UPDATE projects 
SET clearance_start_date = NOW() - INTERVAL '15 days'
WHERE project_id = 'TEST-001';
```
2. Refresh the page
3. Verify project moved to **Available Amount** table
4. Verify **Funds Status** shows "Unpaid"

---

## 🔧 Manual Status Update

If you need to manually trigger the status update:

```sql
SELECT auto_update_funds_status();
```

This will immediately move all expired pending projects to cleared status.

---

## 📝 Database Schema Reference

### New Columns in `projects` Table

| Column | Type | Description |
|--------|------|-------------|
| `funds_status` | text | Payment status: 'Paid', 'Pending', 'Cleared' |
| `designer_fee` | numeric | Freelancer payout amount |
| `account_id` | uuid | Foreign key to accounts table |
| `clearance_start_date` | timestamptz | When clearance period started |
| `clearance_days` | integer | Number of days for clearance (default: 14) |
| `platform_commission_id` | uuid | Link to platform for clearance settings |

### New Database Objects

- **Function:** `calculate_days_left(clearance_start, clearance_period)`
- **Function:** `auto_update_funds_status()`
- **Trigger:** `trigger_set_clearance_start`
- **View:** `freelancer_earnings`

---

## 🚨 Troubleshooting

### Issue: Projects not transitioning automatically

**Solution:**
1. Check if `clearance_start_date` is set:
```sql
SELECT project_id, clearance_start_date, clearance_days, funds_status 
FROM projects 
WHERE funds_status = 'Pending';
```

2. Manually run the update function:
```sql
SELECT auto_update_funds_status();
```

### Issue: Days Left showing incorrect value

**Solution:**
Verify the clearance_start_date is correct:
```sql
SELECT 
    project_id,
    clearance_start_date,
    clearance_days,
    EXTRACT(DAY FROM (NOW() - clearance_start_date))::integer as days_passed,
    clearance_days - EXTRACT(DAY FROM (NOW() - clearance_start_date))::integer as calculated_days_left
FROM projects
WHERE funds_status = 'Pending';
```

### Issue: View not found error

**Solution:**
Re-run the migration to create the view:
```sql
CREATE OR REPLACE VIEW freelancer_earnings AS
SELECT 
    p.*,
    calculate_days_left(p.clearance_start_date, p.clearance_days) as days_left
FROM projects p
WHERE p.status IN ('Completed', 'Delivered');
```

---

## 🎨 UI Behavior

### Pending Clearance Table
- Shows projects with `funds_status = 'Pending'`
- **Days Left** column displays countdown
- Updates hourly automatically

### Available Amount Table
- Shows projects with `funds_status = 'Cleared'`
- **Funds Status** displays "Unpaid"
- **Payout** shows the `designer_fee` amount

---

## 🔐 Security Notes

- All database functions run with `SECURITY DEFINER` for proper RLS enforcement
- The `freelancer_earnings` view respects existing RLS policies
- Only authenticated users can access earnings data

---

## 📈 Performance Optimization

1. **Indexes Created:**
   - `idx_projects_funds_status`
   - `idx_projects_clearance_start`
   - `idx_projects_assignee`

2. **View Optimization:**
   - Pre-filters only completed/delivered projects
   - Calculates days_left efficiently

3. **Client-Side Caching:**
   - Hourly refresh prevents excessive API calls
   - Real-time calculations done in-memory

---

## ✅ Checklist

- [ ] Run migration SQL in Supabase
- [ ] Enable pg_cron extension (optional)
- [ ] Test with a sample project
- [ ] Verify countdown works correctly
- [ ] Confirm automatic transition to Available
- [ ] Check that "Unpaid" status displays correctly

---

## 🆘 Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify RLS policies allow access
3. Ensure all required columns exist
4. Test the database functions manually

---

**Last Updated:** 2026-02-13
**Version:** 1.0.0
