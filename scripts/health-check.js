#!/usr/bin/env node
// Hourly OpenClaw Health Check Script
// Runs: tail -n 100 ~/.openclaw/logs/gateway.err.log | analyze

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.env.HOME, '.openclaw', 'logs');
const REPORT = [];

function checkLogs() {
  const errLog = path.join(LOG_DIR, 'gateway.err.log');
  
  if (!fs.existsSync(errLog)) {
    console.log('⚠️ Log file not found');
    return;
  }
  
  // Read last 100 lines
  const lines = fs.readFileSync(errLog, 'utf-8')
    .split('\n')
    .filter(l => l.trim())
    .slice(-100);
  
  // Check for issues
  const slowListeners = lines.filter(l => l.includes('Slow listener'));
  const errors = lines.filter(l => /error|Error|ERROR/.test(l) && !l.includes('ExperimentalWarning'));
  const rateLimits = lines.filter(l => /429|quota|exhausted/.test(l));
  const wsDrops = lines.filter(l => /WebSocket was closed/.test(l));
  
  console.log('📊 OpenClaw Health Report - ' + new Date().toLocaleString());
  console.log('='.repeat(50));
  
  if (slowListeners.length > 0) {
    console.log(`⚠️ Slow listeners: ${slowListeners.length}`);
    slowListeners.slice(-3).forEach(l => console.log('   ' + l.slice(0, 100)));
  } else {
    console.log('✅ No slow listeners detected');
  }
  
  if (errors.length > 0 && errors.length !== slowListeners.length) {
    console.log(`⚠️ Errors: ${errors.length}`);
    errors.slice(-3).forEach(l => console.log('   ' + l.slice(0, 100)));
  }
  
  if (rateLimits.length > 0) {
    console.log(`❌ Rate limits: ${rateLimits.length} (API issues)`);
  } else {
    console.log('✅ No rate limits');
  }
  
  if (wsDrops.length > 0) {
    console.log(`🔌 WebSocket drops: ${wsDrops.length}`);
  } else {
    console.log('✅ WebSocket stable');
  }
  
  const status = (slowListeners.length === 0 && errors.length === 0 && rateLimits.length === 0)
    ? '🟢 HEALTHY'
    : (rateLimits.length > 0 || slowListeners.length > 5 ? '🔴 CRITICAL' : '🟡 WARNINGS');
  
  console.log('='.repeat(50));
  console.log(`Status: ${status}`);
}

checkLogs();
