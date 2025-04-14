const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [16, 48, 128]
const inputFile = path.join(__dirname, '../assets/icon.svg')
const outputDir = path.join(__dirname, '../assets')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

sizes.forEach(size => {
  sharp(inputFile)
    .resize(size, size)
    .png()
    .toFile(path.join(outputDir, `icon${size}.png`))
    .then(() => console.log(`Generated ${size}x${size} icon`))
    .catch(err => console.error(`Error generating ${size}x${size} icon:`, err))
}) 