#!/usr/bin/env node
/**
 * Remy Ticket Auto-Updater
 * 
 * Processes agent updates via sessions_send and updates remy-tracker tickets.
 * This script handles the Option B requirement - automatically updating
 * tickets when agents report progress.
 * 
 * Usage:
 *   node update-ticket.js --message "agent message here"
 *   Or called programmatically from Remy's message handler
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const REMY_TRACKER_CLI = path.join(process.env.HOME, 'projects', 'remy-tracker', 'cli', 'src', 'index.js');
const DB_PATH = path.join(process.env.HOME, 'projects', 'remy-tracker', 'remy.db');

// Parse command line args
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].replace('--', '');
      args[key] = process.argv[i + 1] || true;
      i++;
    }
  }
  return args;
}

// Extract ticket ID from message
function extractTicketId(message) {
  const ticketMatch = message.match(/\b(REMY-\d+|TICKET-\d+|#[A-Z]+-\d+)\b/);
  return ticketMatch ? ticketMatch[1] : null;
}

// Extract status from message
function extractStatus(message) {
  const statusPatterns = [
    { pattern: /Status:\s*(\w+)/i, group: 1 },
    { pattern: /Moved to\s*(\w+)/i, group: 1 },
    { pattern: /(?:In Dev|In QA|Closed\/Done|To Dev|To Research|Tylor Decision|Dev Backlog)/i, default: null }
  ];
  
  for (const { pattern, group } of statusPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[group || 0];
    }
  }
  
  // Check for status keywords inline
  const statuses = ['In Dev', 'In QA', 'Closed/Done', 'To Dev', 'To Research', 'Tylor Decision', 'Dev Backlog'];
  for (const status of statuses) {
    if (message.toLowerCase().includes(status.toLowerCase())) {
      return status;
    }
  }
  
  return null;
}

// Extract agent info
function extractAgentInfo(message) {
  const agentMatch = message.match(/([👨‍💼👩‍💼🔌⚛️🎨🛠️🧪🛡️🔍📊🔎🤖🦞])\s*(\w[\w\s-]*)/);
  if (agentMatch) {
    return {
      emoji: agentMatch[1],
      name: agentMatch[2].trim()
    };
  }
  
  // Try to find common agent names
  const agents = ['tech-lead', 'api-architect', 'fe-dev', 'fe-architect', 'dev', 'qa', 'designer', 
                  'security-architect', 'researcher', 'business-analyst', 'seo-specialist', 'api-dev'];
  const lowerMsg = message.toLowerCase();
  for (const agent of agents) {
    if (lowerMsg.includes(agent.toLowerCase())) {
      return { emoji: '🤖', name: agent };
    }
  }
  
  return { emoji: '🤖', name: 'Unknown Agent' };
}

// Build comment text from message
function buildCommentText(message, agentInfo) {
  // Remove the update banner and format nicely
  let text = message
    .replace(/🎫\s*\S+\s*[|]\s*[👨‍💼👩‍💼🔌⚛️🎨🛠️🧪🛡️🔍📊🔎🤖🦞]\s*[^\n]+\n/, '')
    .replace(/━━━━+\n/g, '')
    .trim();
  
  // Keep the key sections
  const sections = [];
  
  // Extract action
  const actionMatch = text.match(/📍\s*Action:\s*([^\n]+)/);
  if (actionMatch) sections.push(`Action: ${actionMatch[1]}`);
  
  // Extract progress
  const progressMatch = text.match(/📊\s*Progress:\s*([^\n]+)/);
  if (progressMatch) sections.push(`Progress: ${progressMatch[1]}`);
  
  // Extract blockers
  const blockerMatch = text.match(/🚧\s*Blockers?:\s*([^\n]+)/);
  if (blockerMatch && blockerMatch[1] !== 'None') sections.push(`⚠️ Blocker: ${blockerMatch[1]}`);
  
  // Extract next steps
  const nextMatch = text.match(/🎯\s*Next:\s*([^\n]+)/);
  if (nextMatch) sections.push(`Next: ${nextMatch[1]}`);
  
  // If no sections parsed, use cleaned message
  if (sections.length === 0) {
    return text.substring(0, 500); // Limit length
  }
  
  return sections.join('\\n');
}

// Run remy CLI command
function runRemyCommand(args) {
  const cmd = `node ${REMY_TRACKER_CLI} ${args}`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', cwd: process.env.HOME });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

// Update ticket status
function updateTicketStatus(ticketId, status) {
  const result = runRemyCommand(`update ${ticketId} --status="${status}"`);
  console.log(`Status update for ${ticketId}:`, result.success ? 'SUCCESS' : 'FAILED');
  return result;
}

// Add comment to ticket
function addTicketComment(ticketId, text, agent, role) {
  // Escape special characters for shell
  const escapedText = text.replace(/"/g, '\\"');
  const escapedAgent = (agent || 'Unknown').replace(/"/g, '\\"');
  const escapedRole = (role || 'dev').replace(/"/g, '\\"');
  
  const result = runRemyCommand(
    `comment ${ticketId} --text="${escapedText}" --agent="${escapedAgent}" --role="${escapedRole}"`
  );
  console.log(`Comment added to ${ticketId}:`, result.success ? 'SUCCESS' : 'FAILED');
  return result;
}

// Main processing function
function processAgentMessage(message) {
  console.log('='.repeat(60));
  console.log('Processing agent message...');
  console.log('='.repeat(60));
  console.log('Message:', message.substring(0, 100) + '...');
  
  // Extract ticket ID
  const ticketId = extractTicketId(message);
  if (!ticketId) {
    console.log('❌ No ticket ID found in message');
    return { success: false, reason: 'no_ticket_id' };
  }
  console.log('🎫 Ticket:', ticketId);
  
  // Extract agent info
  const agentInfo = extractAgentInfo(message);
  console.log('👤 Agent:', agentInfo.name);
  
  // Extract potential status change
  const newStatus = extractStatus(message);
  
  // Build comment text
  const commentText = buildCommentText(message, agentInfo);
  
  // Add comment
  const commentResult = addTicketComment(ticketId, commentText, agentInfo.name);
  
  // Update status if detected
  let statusResult = null;
  if (newStatus) {
    console.log('📊 Status change detected:', newStatus);
    statusResult = updateTicketStatus(ticketId, newStatus);
  }
  
  console.log('='.repeat(60));
  
  return {
    success: true,
    ticketId,
    agent: agentInfo.name,
    commentAdded: commentResult.success,
    statusUpdated: statusResult?.success || false,
    newStatus: newStatus || null
  };
}

// Main entry point
function main() {
  const args = parseArgs();
  
  if (args.message) {
    const result = processAgentMessage(args.message);
    console.log('\nResult:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  } else {
    console.log('Usage: node update-ticket.js --message "agent update message"');
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  processAgentMessage,
  extractTicketId,
  extractStatus,
  extractAgentInfo,
  buildCommentText
};

// Run if executed directly
if (require.main === module) {
  main();
}
