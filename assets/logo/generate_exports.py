#!/usr/bin/env python3
"""
Generate all logo exports from SVG source.
Creates PNGs at multiple sizes and favicon.ico
"""

from PIL import Image, ImageDraw
import cairosvg
import io
import os

# Configuration
SOURCE_SVG = "assets/logo/paige-logo-source.svg"
OUTPUT_DIR = "assets/logo"
VIOLET = "#7c3aed"
WHITE = "#ffffff"
BLACK = "#000000"

# Sizes to generate
SIZES = [512, 256, 128, 32]

def svg_to_png(svg_content, size, output_path, bg_color=None):
    """Convert SVG to PNG at given size."""
    # Parse size
    png_data = cairosvg.svg2png(
        bytestring=svg_content.encode('utf-8'),
        output_width=size,
        output_height=size
    )
    
    img = Image.open(io.BytesIO(png_data))
    
    if bg_color:
        # Composite onto background
        bg = Image.new('RGBA', (size, size), bg_color)
        if img.mode == 'RGBA':
            bg.paste(img, (0, 0), img)
        else:
            bg.paste(img, (0, 0))
        img = bg
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    img.save(output_path, 'PNG')
    print(f"✓ Created {output_path}")
    return img

def create_favicon_ico():
    """Create multi-resolution favicon.ico"""
    ico_path = os.path.join(OUTPUT_DIR, "favicon.ico")
    
    # Read source SVG
    with open(SOURCE_SVG, 'r') as f:
        svg_content = f.read()
    
    # Generate sizes for ICO (common favicon sizes)
    ico_sizes = [16, 32, 48, 64]
    images = []
    
    for size in ico_sizes:
        png_data = cairosvg.svg2png(
            bytestring=svg_content.encode('utf-8'),
            output_width=size,
            output_height=size
        )
        img = Image.open(io.BytesIO(png_data))
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        images.append(img)
    
    # Save as ICO
    images[0].save(
        ico_path,
        format='ICO',
        sizes=[(s, s) for s in ico_sizes],
        append_images=images[1:]
    )
    print(f"✓ Created {ico_path}")

def create_logo_mark():
    """Create icon-only mark (no background circle)""e
    This is a simplified version just showing the P symbol"""
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="22 22 56 56">
  <rect x="28" y="22" width="14" height="56" rx="2" fill="#7c3aed"/>
  <path d="M28 22 L62 22 C68 22 72 26 72 32 L72 38 C72 44 68 48 62 48 L42 48" 
        stroke="#7c3aed" stroke-width="14" stroke-linecap="round" fill="none"/>
  <path d="M62 22 L62 32 C62 35 65 38 68 38 L72 38" 
        stroke="#7c3aed" stroke-width="7" stroke-linecap="round" fill="none"/>
  <circle cx="57" cy="35" r="5" fill="#ffffff"/>
</svg>'''
    
    for size in [512, 256, 128, 64, 32]:
        output_path = os.path.join(OUTPUT_DIR, f"logo-mark-{size}.png")
        svg_to_png(svg_content, size, output_path)

def create_horizontal_logo():
    """Create horizontal logo with text"""
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" width="320" height="100">
  <!-- Logo mark (left side, slightly smaller) -->
  <g transform="translate(-10, 0) scale(0.9)">
    <circle cx="50" cy="50" r="46" fill="#7c3aed"/>
    <rect x="28" y="22" width="14" height="56" rx="2" fill="#ffffff"/>
    <path d="M28 22 L62 22 C68 22 72 26 72 32 L72 38 C72 44 68 48 62 48 L42 48" 
          stroke="#ffffff" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M62 22 L62 32 C62 35 65 38 68 38 L72 38" 
          stroke="#ffffff" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="57" cy="35" r="5" fill="#7c3aed"/>
  </g>
  
  <!-- Text: Agent Paige -->
  <text x="100" y="62" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="38" font-weight="600" fill="#7c3aed">Agent Paige</text>
</svg>'''
    
    output_path = os.path.join(OUTPUT_DIR, "logo-horizontal.png")
    svg_to_png(svg_content, 2000, output_path)

def create_social_avatar():
    """Create 1:1 social avatar optimized for Twitter/GitHub"""
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Slightly larger design for social avatars -->
  <g transform="scale(1.1) translate(-5, -5)">
    <circle cx="50" cy="50" r="46" fill="#7c3aed"/>
    <rect x="28" y="22" width="14" height="56" rx="2" fill="#ffffff"/>
    <path d="M28 22 L62 22 C68 22 72 26 72 32 L72 38 C72 44 68 48 62 48 L42 48" 
          stroke="#ffffff" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M62 22 L62 32 C62 35 65 38 68 38 L72 38" 
          stroke="#ffffff" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="57" cy="35" r="5" fill="#7c3aed"/>
  </g>
</svg>'''
    
    # Create at 400x400 (optimal for Twitter/GitHub)
    output_path = os.path.join(OUTPUT_DIR, "social-avatar.png")
    svg_to_png(svg_content, 400, output_path)

def main():
    print("🎨 Generating Agent Paige logo exports...\n")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Read source SVG
    with open(SOURCE_SVG, 'r') as f:
        svg_content = f.read()
    
    # Generate full logo PNGs
    print("📦 Full logo (with background circle):")
    for size in SIZES:
        output_path = os.path.join(OUTPUT_DIR, f"logo-{size}.png")
        svg_to_png(svg_content, size, output_path)
    
    print("\n📦 Logo mark (icon only):")
    create_logo_mark()
    
    print("\n📦 Favicon:")
    create_favicon_ico()
    
    print("\n📦 Horizontal logo:")
    create_horizontal_logo()
    
    print("\n📦 Social avatar:")
    create_social_avatar()
    
    print("\n✅ All exports complete!")

if __name__ == "__main__":
    main()
