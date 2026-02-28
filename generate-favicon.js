const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || '/Users/thindery/projects/agent-paige/assets/logo';
const sourceDir = process.argv[3] || '/Users/thindery/.openclaw/workspace/assets/logo-v2';

// ICO header format
// ICO files are actually a container format with BMPs or PNGs
// For simplicity and modern browser support, we'll use PNG approach

// Just ensure the favicon files are in place
const sizes = [16, 32, 48, 128];

async function generateFavicons() {
  for (const size of sizes) {
    const inputFile = path.join(sourceDir, `logo-v2-${size}.png`);
    if (fs.existsSync(inputFile)) {
      fs.copyFileSync(inputFile, path.join(targetDir, `favicon-${size}.png`));
      console.log(`Copied favicon-${size}.png`);
    } else {
      // Generate from 512
      await sharp(path.join(sourceDir, 'logo-v2-512.png'))
        .resize(size, size)
        .png()
        .toFile(path.join(targetDir, `favicon-${size}.png`));
      console.log(`Generated favicon-${size}.png from 512`);
    }
  }
  
  // Copy 32px as main favicon.png
  fs.copyFileSync(
    path.join(sourceDir, 'logo-v2-32.png'),
    path.join(targetDir, 'favicon.png')
  );
  console.log('Copied favicon.png (32px)');
}

generateFavicons().catch(console.error);
