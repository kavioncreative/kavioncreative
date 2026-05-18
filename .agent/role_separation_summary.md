# Role Separation Implementation Summary

## Overview
Freelancers and Project Managers are strictly separated across all dropdowns in the application.

## Implementation Details

### 1. Create Team Modal (Users Section)
**Location**: `sections/Users.tsx` (lines 982-994)

**Filter Logic** (lines 436-443):
```typescript
const projectManagers = useMemo(() => {
    return profiles
        .filter(p => {
            const r = p.role?.toLowerCase().trim();
            return r === 'project manager' || r === 'admin';
        })
        .map(p => ({ label: p.name, value: p.id, description: p.email }));
}, [profiles]);
```

**Dropdown**:
- **Label**: "Team Members (Project Managers)"
- **Options**: Only users with role "Project Manager" or "Admin"
- **Excluded**: Freelancers are completely excluded from this dropdown

### 2. Assignee Dropdown (Choose Your Move Modal - Projects Section)
**Location**: `sections/Projects.tsx`

**Step 14 Modal** (lines 1603-1606):
```typescript
options={teamMembers
    .filter(m => m.role?.trim().toLowerCase() === 'freelancer')
    .map(m => ({ label: m.name, value: m.name }))
}
```

**Review Section** (lines 1978-1981):
```typescript
options={teamMembers
    .filter(m => m.role?.trim().toLowerCase() === 'freelancer')
    .map(m => ({ label: m.name, value: m.name }))
}
```

**Dropdown**:
- **Label**: "Select Assignee"
- **Options**: Only users with role "Freelancer"
- **Excluded**: Project Managers are completely excluded from this dropdown

## Role Definitions

### Project Manager
- **Appears in**: Create Team modal (Users section)
- **Purpose**: Team leadership and management
- **Can be**: Team members who manage projects
- **Cannot be**: Assigned as project assignees

### Freelancer
- **Appears in**: Assignee dropdown (Choose Your Move modal)
- **Purpose**: Project execution and design work
- **Can be**: Assigned to projects as designers/executors
- **Cannot be**: Team members in the Create Team modal

## Validation
- ✅ Create Team modal filters for "Project Manager" and "Admin" roles only
- ✅ Assignee dropdown filters for "Freelancer" role only
- ✅ Both filters are case-insensitive and trim whitespace
- ✅ No overlap between the two role categories in any dropdown
- ✅ Clear labeling indicates which roles appear in each dropdown

## Debug Logging
The following console logs are active in `Projects.tsx` to help diagnose team member fetching:
- `[DEBUG] teamAccounts for account:` - Shows teams linked to selected account
- `[DEBUG] teamMembers join result:` - Shows raw team member data from database
- `[DEBUG] Final uniqueMembers:` - Shows deduplicated team members before filtering
- `Fetched Team Members for account:` - Shows final team members list

## Notes
- The team member fetching logic in Projects.tsx retrieves all team members first, then filters by role
- Only team members associated with the selected account (via team_accounts table) are shown
- The Create Team modal explicitly labels the field as "Team Members (Project Managers)" to avoid confusion
