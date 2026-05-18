const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  // We'll fetch all projects to do a comprehensive analysis
  const { data: dbProjects, error } = await supabase
    .from('projects')
    .select('project_id, assignee, designer_fee, funds_status, payment_status, approval_date, project_status')
    .eq('project_status', 'Approved');

  if (error) {
    console.error("Error fetching projects:", error);
    return;
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

    // Determine the expected clearance date
    // A project approved in Month X should clear on the 15th of Month X+1.
    const approvalDate = new Date(dbProj.approval_date);
    let clearanceMonth = approvalDate.getUTCMonth() + 1; // 0-indexed, so +1 moves to next month
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
      currentFundsStatus: dbProj.funds_status,
      paymentStatus: dbProj.payment_status
    };

    if (dbProj.payment_status === 'Paid') {
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

  // Generate markdown report
  let md = `# Payout Clearance Analysis\n`;
  md += `**Date Context:** ${today.toISOString().split('T')[0]}\n\n`;
  md += `This report calculates the clearance statuses based on the rule: **Projects approved in Month X become Cleared (Available) on the 15th of Month X+1.**\n\n`;

  for (const assignee in assigneeStats) {
    const stats = assigneeStats[assignee];
    
    // Only include assignees that have newly available or pending projects to keep it relevant
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
