#!/usr/bin/env node
/**
 * ralph-ac.js - Ralph Workflow AC Management
 * Adds acceptance criteria to the official acceptance_criteria table
 * 
 * Part of: ~/.openclaw/workspace/skills/ralph/
 * 
 * Usage: ./ralph-ac.sh <ticket> --given="..." --when="..." --then="..."
 *        ./ralph-ac.sh <ticket> --file=ac.json
 *        ./ralph-ac.sh <ticket> --mark=planner|setup
 *        ./ralph-ac.sh <ticket> --list
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.REMY_DB || `${process.env.HOME}/projects/remy-tracker/remy.db`;
const API_BASE = process.env.REMY_API || 'http://localhost:3474';

function runSQL(sql) {
  try {
    return execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '"""')}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (e) {
    console.error('SQL Error:', e.message);
    process.exit(1);
  }
}

function getTicketId(ticketNum) {
  const result = runSQL(`SELECT id FROM tickets WHERE ticket_number='${ticketNum}'`);
  if (!result) {
    console.error(`❌ Ticket ${ticketNum} not found`);
    process.exit(1);
  }
  return result;
}

function callAPI(ticketId, given, when, thenText, sortOrder = 0) {
  const body = JSON.stringify({
    given_text: given,
    when_text: when,
    then_text: thenText,
    sort_order: sortOrder
  });
  
  try {
    // Use curl for API call
    const result = execSync(`curl -s -w "\\n%{http_code}" -X POST "${API_BASE}/api/tickets/${ticketId}/ac" \\
      -H "Content-Type: application/json" \\
      -H "X-Role: pm" \\
      -d '${body.replace(/'/g, "'\''")}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const lines = result.trim().split('\n');
    const statusCode = lines[lines.length - 1];
    
    if (statusCode !== '200' && statusCode !== '201') {
      console.error(`❌ API Error: HTTP ${statusCode}`);
      console.error('Response:', lines.slice(0, -1).join('\n'));
      process.exit(1);
    }
    
    return true;
  } catch (e) {
    console.error('❌ API Call Failed:', e.message);
    process.exit(1);
  }
}

function addAC(ticketNum, given, when, thenText, sortOrder = 0) {
  const ticketId = getTicketId(ticketNum);
  
  // Use API instead of direct SQL
  callAPI(ticketId, given, when, thenText, sortOrder);
  console.log(`✅ AC added to ${ticketNum}`);
}

function addACFromFile(ticketNum, filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const acList = JSON.parse(content);
  
  let count = 0;
  acList.forEach((ac, index) => {
    addAC(ticketNum, ac.given, ac.when, ac.then, ac.sort || index);
    count++;
  });
  
  console.log(`✅ Added ${count} AC to ${ticketNum}`);
}

function markPlannerComplete(ticketNum) {
  const ticketId = getTicketId(ticketNum);
  const sql = `UPDATE ralph_workflow_steps SET completed=1, completed_at=datetime('now'), completed_by='pm' WHERE ticket_id=${ticketId} AND phase='Planner'`;
  runSQL(sql);
  console.log(`✅ Planner phase marked complete`);
}

function markSetupComplete(ticketNum) {
  const ticketId = getTicketId(ticketNum);
  const sql = `UPDATE ralph_workflow_steps SET completed=1, completed_at=datetime('now'), completed_by='pm' WHERE ticket_id=${ticketId} AND phase='Setup'`;
  runSQL(sql);
  console.log(`✅ Setup phase marked complete`);
}

function listAC(ticketNum) {
  const ticketId = getTicketId(ticketNum);
  const sql = `SELECT sort_order, substr(given_text, 1, 40) as given, status FROM acceptance_criteria WHERE ticket_id=${ticketId} ORDER BY sort_order`;
  const result = runSQL(sql);
  console.log(`\n📋 AC for ${ticketNum}:\n${result}`);
}

function showHelp() {
  console.log(`
Remy AC-Add - Add acceptance criteria to tickets

Usage:
  remy ac-add <ticket> --given="..." --when="..." --then="..." [--sort=N]
  remy ac-add <ticket> --file=path/to/ac.json
  remy ac-add <ticket> --mark=planner|setup
  remy ac-add <ticket> --list

Options:
  --given="text"      Given condition (Gherkin)
  --when="text"       When action (Gherkin)
  --then="text"       Then result (Gherkin)
  --sort=N            Sort order (default: 0)
  --file=path         JSON file with AC array
  --mark=phase        Mark Ralph phase complete (planner|setup)
  --list              List existing AC for ticket
  --help              Show this help

Environment:
  REMY_DB             Path to remy.db (default: ~/projects/remy-tracker/remy.db)

Examples:
  # Add single AC
  remy ac-add REMY-018 \\
    --given="user is on the board" \\
    --when="they click View Table" \\
    --then="they see table view" \\
    --sort=0

  # Add AC from JSON file
  remy ac-add REMY-018 --file=./ac-list.json

  # Mark phases complete
  remy ac-add REMY-018 --mark=planner
  remy ac-add REMY-018 --mark=setup

  # List AC for ticket
  remy ac-add REMY-018 --list
`);
}

// Parse args
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

const ticketNum = args[0];
if (!ticketNum || ticketNum.startsWith('--')) {
  console.error('❌ Ticket number required');
  showHelp();
  process.exit(1);
}

// Parse options
const options = {};
args.slice(1).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=', 2);
    options[key] = value || true;
  }
});

// Handle commands
if (options.file) {
  addACFromFile(ticketNum, options.file);
} else if (options.mark) {
  if (options.mark === 'planner') markPlannerComplete(ticketNum);
  else if (options.mark === 'setup') markSetupComplete(ticketNum);
  else {
    console.error('❌ --mark must be "planner" or "setup"');
    process.exit(1);
  }
} else if (options.list) {
  listAC(ticketNum);
} else if (options.given && options.when && options.then) {
  addAC(ticketNum, options.given, options.when, options.then, parseInt(options.sort) || 0);
} else {
  console.error('❌ Required: --given, --when, --then OR --file OR --mark OR --list');
  showHelp();
  process.exit(1);
}
