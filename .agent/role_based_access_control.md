# System Behavior Verification - Role-Based Access Control

## ✅ Implementation Summary

The system has been updated to implement the following role-based access control:

---

## 1. Freelancers - NOT Linked to Accounts

### Assignee Dropdown (Choose Your Move Modal)
- **Behavior**: Shows ALL freelancers in the system
- **Filter**: `role = 'Freelancer'` (case-insensitive)
- **Independence**: Not filtered by account selection
- **Implementation**: Direct query to `profiles` table
- **Code Location**: `Projects.tsx` lines 151-177

```typescript
// Freelancers are fetched once on component mount
// No dependency on selectedAccount
const { data: freelancers } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .ilike('role', 'freelancer')
    .order('name', { ascending: true });
```

### Account Visibility for Freelancers
- **Behavior**: Freelancers see ALL accounts
- **Reason**: They can be assigned to any project regardless of account
- **Implementation**: `Projects.tsx` lines 147-154

---

## 2. Project Managers - Linked to Accounts via Teams

### Team Membership
- **Stored in**: `team_members` table
- **Links**: Project Manager → Team
- **Filter**: Only users with role = 'Project Manager' (excludes Admins)
- **Code Location**: `Users.tsx` lines 436-443

```typescript
const projectManagers = useMemo(() => {
    return profiles
        .filter(p => {
            const r = p.role?.toLowerCase().trim();
            return r === 'project manager'; // Admins excluded
        })
        .map(p => ({ label: p.name, value: p.id, description: p.email }));
}, [profiles]);
```

### Account Dropdown (Choose Your Move Modal)
- **Behavior**: Project Managers only see accounts assigned to their team(s)
- **Query Flow**:
  1. Get teams the PM belongs to (`team_members`)
  2. Get accounts linked to those teams (`team_accounts`)
  3. Fetch account details for those IDs
- **Code Location**: `Projects.tsx` lines 161-199

```typescript
// 1. Get PM's teams
const { data: userTeams } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('member_id', profile.id);

// 2. Get accounts for those teams
const { data: teamAccountLinks } = await supabase
    .from('team_accounts')
    .select('account_id')
    .in('team_id', teamIds);

// 3. Fetch account details
const { data: teamAccounts } = await supabase
    .from('accounts')
    .select('*')
    .in('id', accountIds);
```

### Project Visibility
- **Behavior**: Project Managers only see projects from accounts assigned to their team
- **Query Flow**:
  1. Get teams the PM belongs to
  2. Get accounts linked to those teams
  3. Fetch projects where `account_id` matches team accounts
- **Code Location**: `Projects.tsx` lines 128-164

```typescript
// Fetch projects filtered by team's accounts
const { data } = await supabase
    .from('projects')
    .select('*')
    .in('account_id', accountIds)
    .order('created_at', { ascending: false });
```

---

## 3. Admins - Full Access

### Account Visibility
- **Behavior**: Admins see ALL accounts
- **Implementation**: Same as Freelancers

### Project Visibility
- **Behavior**: Admins see ALL projects
- **Implementation**: No filtering applied

### Team Creation
- **Behavior**: Admins are excluded from the "Team Members (Project Managers)" dropdown
- **Reason**: Teams are for Project Managers only
- **Code Location**: `Users.tsx` line 440

---

## Database Schema

### Tables Used
1. **profiles** - User information including role
2. **teams** - Team definitions
3. **team_members** - Links Project Managers to Teams
4. **team_accounts** - Links Teams to Accounts
5. **accounts** - Account/client information
6. **projects** - Project data with `account_id` foreign key

### Relationships
```
Project Manager → team_members → teams → team_accounts → accounts
                                                              ↓
                                                          projects
Freelancer (independent) → Can be assigned to any project
```

---

## Console Debug Logs

### Freelancers
- `[DEBUG] Fetching all freelancers (not account-specific)`
- `[SUCCESS] Fetched all freelancers: [array]`

### Project Managers - Accounts
- `[DEBUG] Fetching accounts for user role: project manager`
- `[DEBUG] PM teams: [array]`
- `[DEBUG] Team account links: [array]`
- `[SUCCESS] PM team accounts: [array]`

### Project Managers - Projects
- `[DEBUG] Fetching projects for user role: project manager`
- `[SUCCESS] PM team projects: [count]`

### Admins
- `[SUCCESS] Admin/Freelancer - All accounts: [array]`
- `[SUCCESS] Admin/Freelancer - All projects: [count]`

---

## Verification Checklist

✅ Freelancers are NOT linked to accounts  
✅ All freelancers appear in Assignee dropdown regardless of account selection  
✅ Only Project Managers appear in Create Team modal  
✅ Admins are excluded from Create Team modal  
✅ Project Managers only see accounts assigned to their team  
✅ Project Managers only see projects from their team's accounts  
✅ Admins see all accounts and projects  
✅ Freelancers see all accounts (for assignment flexibility)  

---

## Testing Steps

### For Project Managers:
1. Login as a Project Manager
2. Go to Projects section
3. **Verify**: Only projects from your team's accounts appear
4. Click "Choose Your Move"
5. **Verify**: Account dropdown only shows your team's accounts
6. **Verify**: Assignee dropdown shows ALL freelancers

### For Freelancers:
1. Login as a Freelancer
2. Go to Projects section
3. **Verify**: All projects appear
4. **Note**: Freelancers typically don't create projects, but if they could:
   - Account dropdown would show all accounts
   - Assignee dropdown would show all freelancers

### For Admins:
1. Login as an Admin
2. Go to Projects section
3. **Verify**: All projects appear
4. Click "Choose Your Move"
5. **Verify**: All accounts appear
6. **Verify**: All freelancers appear in Assignee dropdown
7. Go to Users section → Teams tab
8. Click "Create New Team"
9. **Verify**: Only Project Managers appear (Admins excluded)

---

## Summary

The system now correctly implements:
- **Freelancers**: Global visibility, not linked to accounts or teams
- **Project Managers**: Scoped to their team's accounts for both account selection and project visibility
- **Admins**: Full access to everything, but excluded from team membership
