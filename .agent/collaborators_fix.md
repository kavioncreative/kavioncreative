# Collaborators Fix - Project Creation

## Issue Identified
When creating a project, the Collaborators field was incorrectly populated with **Freelancers** instead of **Project Managers** from the creator's team.

## Root Cause
The `teamMembers` state variable was being used for both:
1. Assignee dropdown (should be Freelancers)
2. Collaborators field (should be Project Managers)

After the earlier fix to show all freelancers in the assignee dropdown, `teamMembers` was storing freelancers, which then incorrectly appeared as collaborators.

## Solution Implemented

### 1. Separated State Variables
Created two distinct state variables:
- `teamMembers`: Stores **Freelancers** for the Assignee dropdown
- `pmCollaborators`: Stores **Project Managers** from the creator's team for Collaborators

**Code Location**: `Projects.tsx` lines 91-92
```typescript
const [teamMembers, setTeamMembers] = useState<any[]>([]); // Freelancers for assignee dropdown
const [pmCollaborators, setPmCollaborators] = useState<any[]>([]); // Project Managers for collaborators
```

### 2. Added PM Collaborators Fetch Logic
Created a new `useEffect` to fetch Project Managers from the user's team:

**Code Location**: `Projects.tsx` lines 331-407

**Query Flow**:
1. Get teams the current user belongs to (`team_members`)
2. Get all members of those teams (excluding current user)
3. Filter for **Project Manager role only**
4. De-duplicate and store in `pmCollaborators`

```typescript
useEffect(() => {
    const fetchPMCollaborators = async () => {
        // 1. Get user's teams
        const { data: userTeams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('member_id', profile.id);

        // 2. Get team members (excluding self)
        const { data: teamPMs } = await supabase
            .from('team_members')
            .select('member_id, profiles (id, name, email, role)')
            .in('team_id', teamIds)
            .neq('member_id', profile.id);

        // 3. Filter for Project Managers only
        const uniquePMs = teamPMs
            .filter(m => m.profiles.role?.toLowerCase().trim() === 'project manager')
            .map(m => m.profiles);

        setPmCollaborators(uniquePMs);
    };

    fetchPMCollaborators();
}, [profile]);
```

### 3. Updated Project Creation Payload
Changed the collaborators field to use `pmCollaborators` instead of `teamMembers`:

**Code Location**: `Projects.tsx` lines 996-998

**Before**:
```typescript
collaborators: teamMembers
    .filter(m => m.id !== profile?.id)
    .map(m => ({ id: m.id, name: m.name, role: m.role }))
```

**After**:
```typescript
collaborators: pmCollaborators
    .map(m => ({ id: m.id, name: m.name, role: m.role }))
```

Note: No need to filter out current user since the query already excludes them.

## Behavior After Fix

### Project Creation Flow:
1. **Primary Project Manager**: Set to the user who created the project (`profile.id`)
2. **Collaborators**: Other Project Managers from the same team(s) as the creator
3. **Assignee**: Selected from the Freelancers dropdown

### Project Details Display:
- **Project Manager**: Shows the creator's name
- **Collaborators**: Shows other PMs from the team with "PROJECT MANAGER" badge
- **Assignee**: Shows the selected freelancer

### Console Logs:
- `[DEBUG] Fetching PM collaborators from user team`
- `[DEBUG] User teams for collaborators:` - Shows teams the user belongs to
- `[DEBUG] Team members query result:` - Shows all team members
- `[SUCCESS] PM Collaborators:` - Shows filtered Project Managers

## Verification Checklist

✅ Freelancers do NOT appear in Collaborators  
✅ Only Project Managers from creator's team appear as Collaborators  
✅ Creator is NOT included in Collaborators (only in Primary Manager)  
✅ Assignee dropdown still shows all Freelancers  
✅ Role badges show correctly (PROJECT MANAGER vs FREELANCER)  

## Database Schema

### Collaborators Storage:
```json
{
  "collaborators": [
    {
      "id": "uuid-of-pm",
      "name": "PM Name",
      "role": "Project Manager"
    }
  ]
}
```

### Team Relationships:
```
Creator (PM) → team_members → teams → team_members → Other PMs
                                                          ↓
                                                    Collaborators
```

## Testing Steps

1. **Login as a Project Manager** who belongs to a team with other PMs
2. **Create a new project** via "Choose Your Move"
3. **Select an account** and fill in project details
4. **Select a Freelancer** as the assignee
5. **Submit the project**
6. **Open the project details**
7. **Verify**:
   - Project Manager shows your name
   - Collaborators shows other PMs from your team
   - Collaborators have "PROJECT MANAGER" badge
   - No freelancers appear in Collaborators
   - Assignee shows the selected freelancer

## Edge Cases Handled

1. **User has no team**: `pmCollaborators` will be empty array
2. **User is the only PM in team**: `pmCollaborators` will be empty array
3. **Team has freelancers**: They are filtered out, only PMs included
4. **Team has admins**: They are filtered out, only PMs included
5. **User belongs to multiple teams**: All PMs from all teams are included (de-duplicated)
