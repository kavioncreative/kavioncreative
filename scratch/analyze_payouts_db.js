import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envFile = fs.readFileSync('.env', 'utf8');
const envLines = envFile.split('\n');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  } else if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  const { data: dbProjects, error } = await supabase
    .from('projects')
    .select('project_id, assignee, designer_fee, funds_status, clearance_start_date, status')
    .eq('status', 'Approved');

  if (error) {
    console.error("Error fetching projects:", error);
    return;
  }
  console.log("Total Approved Projects:", dbProjects.length);
  if (dbProjects.length > 0) {
    console.log("Sample project:", dbProjects[0]);
  }

  const assigneeStats = {};
  const today = new Date('2026-05-16T00:00:00Z');

  for (const dbProj of dbProjects) {
    const assignee = dbProj.assignee;
    if (!assignee) continue;

    if (!assigneeStats[assignee]) {
      assigneeStats[assignee] = {
        name: assignee,
        paidProjects: [],
        clearedButUnpaid: [],
        newlyAvailable: [],
        pending: [],
        totalAvailableAmount: 0,
        paidAmount: 0
      };
    }

    const stats = assigneeStats[assignee];
    const fee = Number(dbProj.designer_fee) || 0;

    const approvalDate = new Date(dbProj.clearance_start_date);
    let clearanceMonth = approvalDate.getUTCMonth() + 1; // 0-indexed, so +1 is next month
    let clearanceYear = approvalDate.getUTCFullYear();

    if (clearanceMonth > 11) {
      clearanceMonth = 0;
      clearanceYear++;
    }

    const expectedClearanceDate = new Date(Date.UTC(clearanceYear, clearanceMonth, 15));

    const projectInfo = {
      id: dbProj.project_id,
      fee: fee,
      approvalDate: approvalDate.toISOString().split('T')[0],
      expectedClearanceDate: expectedClearanceDate.toISOString().split('T')[0],
      currentFundsStatus: dbProj.funds_status
    };

    if (dbProj.funds_status === 'Paid') {
      stats.paidProjects.push(projectInfo);
      stats.paidAmount += fee;
    } else if (expectedClearanceDate <= today) {
      // It should have been cleared by now
      if (dbProj.funds_status === 'Cleared') {
        stats.clearedButUnpaid.push(projectInfo);
        stats.totalAvailableAmount += fee;
      } else {
        stats.newlyAvailable.push(projectInfo);
        stats.totalAvailableAmount += fee;
      }
    } else {
      // Still pending
      stats.pending.push(projectInfo);
    }
  }

  let md = `# Payout Clearance Analysis\n`;
  md += `**Date Context:** ${today.toISOString().split('T')[0]}\n\n`;
  md += `This report calculates the clearance statuses based on the rule: **Projects approved in Month X become Cleared (Available) on the 15th of Month X+1.**\n\n`;

  for (const assignee in assigneeStats) {
    const stats = assigneeStats[assignee];
    
    if (stats.newlyAvailable.length === 0 && stats.clearedButUnpaid.length === 0) continue;

    md += `## Assignee: ${assignee}\n`;
    md += `- **Total Newly Available Amount:** $${stats.newlyAvailable.reduce((sum, p) => sum + p.fee, 0)}\n`;
    md += `- **Already Cleared (Unpaid) Amount:** $${stats.clearedButUnpaid.reduce((sum, p) => sum + p.fee, 0)}\n`;
    md += `- **New Total Available Amount:** **$${stats.totalAvailableAmount}**\n\n`;
    
    md += `### Breakdown\n`;
    md += `- **Paid Projects:** ${stats.paidProjects.length} (Total Paid: $${stats.paidAmount})\n`;
    md += `- **Newly Available Projects (Should be cleared):** ${stats.newlyAvailable.length}\n`;
    
    if (stats.newlyAvailable.length > 0) {
      md += `\n| Project ID | Fee | Approval Date | Expected Clearance Date |\n`;
      md += `|---|---|---|---|\n`;
      stats.newlyAvailable.forEach(p => {
        md += `| ${p.id} | $${p.fee} | ${p.approvalDate} | ${p.expectedClearanceDate} |\n`;
      });
      md += `\n`;
    }

    if (stats.clearedButUnpaid.length > 0) {
      md += `- **Already Cleared Projects:** ${stats.clearedButUnpaid.length}\n`;
    }
    
    md += `- **Still Pending (Future Clearance):** ${stats.pending.length}\n\n`;
    md += `---\n\n`;
  }

  fs.writeFileSync('./scratch/payout_analysis_report.md', md);
  console.log("Analysis saved to ./scratch/payout_analysis_report.md");
}

analyze();
