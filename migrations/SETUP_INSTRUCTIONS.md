# Clearance System Setup - Step by Step

## ⚠️ Important: Run These Steps in Order

### Step 1: Run the Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the **ENTIRE contents** of `migrations/add_clearance_tracking.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

**Expected Result:** You should see "Success. No rows returned"

---

### Step 2: Verify the Migration

Run this query to check if columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('funds_status', 'designer_fee', 'clearance_start_date', 'clearance_days', 'account_id', 'platform_commission_id');
```

**Expected Result:** Should return 6 rows showing all the new columns

---

### Step 3: Test with Sample Data

Now you can run the test query:

```sql
-- Create a test project that should be in Pending
INSERT INTO projects (
    project_id, 
    project_title,
    status, 
    designer_fee, 
    assignee, 
    clearance_start_date, 
    clearance_days, 
    funds_status,
    action_move
)
VALUES (
    'TEST-001', 
    'Test Project for Clearance',
    'Completed', 
    500, 
    'freelancer@example.com', 
    NOW(), 
    14, 
    'Pending',
    'New'
);

-- Verify it appears in the view with days_left
SELECT 
    project_id, 
    project_title,
    designer_fee, 
    funds_status, 
    clearance_start_date,
    clearance_days,
    days_left
FROM freelancer_earnings
WHERE project_id = 'TEST-001';
```

**Expected Result:** Should show the project with `days_left = 14`

---

### Step 4: Test Automatic Transition

Simulate a project that should have cleared:

```sql
-- Create a project with clearance period expired
INSERT INTO projects (
    project_id, 
    project_title,
    status, 
    designer_fee, 
    assignee, 
    clearance_start_date, 
    clearance_days, 
    funds_status,
    action_move
)
VALUES (
    'TEST-002', 
    'Expired Clearance Project',
    'Completed', 
    750, 
    'freelancer@example.com', 
    NOW() - INTERVAL '15 days',  -- Started 15 days ago
    14,                           -- 14 day clearance
    'Pending',
    'New'
);

-- Run the auto-update function
SELECT auto_update_funds_status();

-- Check if it moved to Cleared
SELECT 
    project_id, 
    funds_status, 
    clearance_start_date,
    days_left
FROM freelancer_earnings
WHERE project_id = 'TEST-002';
```

**Expected Result:** `funds_status` should be `'Cleared'` and `days_left` should be `0`

---

## 🔧 Troubleshooting

### Error: "relation 'projects' does not exist"
**Solution:** Your database doesn't have the projects table. Run `supabase_schema.sql` first.

### Error: "column already exists"
**Solution:** The migration was already run. You can skip Step 1.

### Error: "function auto_update_funds_status does not exist"
**Solution:** The migration didn't complete. Re-run the entire migration file.

### Error: "view freelancer_earnings does not exist"
**Solution:** Re-run the migration file, specifically the view creation part (lines 91-100).

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] All 6 new columns exist in `projects` table
- [ ] Function `auto_update_funds_status()` exists
- [ ] Function `calculate_days_left()` exists
- [ ] Trigger `trigger_set_clearance_start` exists
- [ ] View `freelancer_earnings` exists
- [ ] Test project TEST-001 shows 14 days left
- [ ] Test project TEST-002 auto-transitioned to Cleared

---

## 🎯 Next: Using in the Application

Once migration is complete:

1. **Refresh your app** - The frontend will now query real data
2. **Select a freelancer** - Use the dropdown on Freelancer Earnings page
3. **Check the tables:**
   - Pending Clearance: Shows projects with countdown
   - Available Amount: Shows cleared projects ready for payout
   - Lifetime Earnings: Shows paid projects

---

## 📝 Clean Up Test Data

After testing, remove test projects:

```sql
DELETE FROM projects WHERE project_id IN ('TEST-001', 'TEST-002');
```

---

**Need Help?** Check `docs/CLEARANCE_SYSTEM_GUIDE.md` for detailed documentation.
