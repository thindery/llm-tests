const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Simple ICO header generator for PNG embedding (for modern browsers)
// Actually ICO format is complex, let's just copy the PNGs for now
const sourceDir = process.argv[2] || '/Users/thindery/.openclaw/workspace/assets/logo-v2';
const targetDir = process.argv[3] || '/Users/thindery/projects/agent-paige/assets/logo';

// Copy the 32px PNG as favicon.png (Next.js can handle this)
fs.copyFileSync(
  path.join(sourceDir, 'logo-v2-32.png'),
  path.join(targetDir, 'favicon.png')
);

// Copy the 16px version too
fs.copyFileSync(
  path.join(sourceDir, 'logo-v2-16.png'),
  path.join(targetDir, 'favicon-16.png')
);

console.log('Favicon PNGs copied successfully');
