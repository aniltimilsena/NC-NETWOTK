const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const hubsDir = path.resolve(__dirname, '../public/assets/hubs');

async function optimizeHubImages() {
  if (!fs.existsSync(hubsDir)) {
    console.error('Directory not found:', hubsDir);
    return;
  }

  const files = fs.readdirSync(hubsDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
  if (files.length === 0) {
    console.log('No uncompressed .jpg/.png images found to convert in', hubsDir);
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const inputPath = path.join(hubsDir, file);
    const outputPath = path.join(hubsDir, file.replace(/\.(jpe?g|png)$/i, '.webp'));
    const beforeSize = fs.statSync(inputPath).size;
    totalBefore += beforeSize;

    await sharp(inputPath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(outputPath);

    const afterSize = fs.statSync(outputPath).size;
    totalAfter += afterSize;

    console.log(`✓ ${file}: ${(beforeSize / 1024).toFixed(1)} KB -> ${(afterSize / 1024).toFixed(1)} KB`);
    fs.unlinkSync(inputPath);
  }

  console.log(`\n🎉 Total saved: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)} MB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% reduction)`);
}

optimizeHubImages().catch(console.error);
