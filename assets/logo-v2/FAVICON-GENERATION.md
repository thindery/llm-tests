# Favicon Generation Note

The multi-resolution .ico file needs to be generated from the available PNGs:

```bash
# Using ImageMagick (when available):
convert logo-v2-16.png logo-v2-32.png logo-v2-48.png logo-v2-128.png favicon-v2.ico

# Or using icotool:
icotool -c -o favicon-v2.ico logo-v2-16.png logo-v2-32.png logo-v2-48.png logo-v2-128.png
```

## Required sizes for ICO:
- 16x16 (browser tab)
- 32x32 (standard favicon)
- 48x48 (Windows taskbar)
- 128x128 (macOS Safari pinned tabs)

## Online Alternative:
Use https://favicon.io/ or https://realfavicongenerator.net/ with logo-v2-512.png

The source PNGs are ready for conversion.
