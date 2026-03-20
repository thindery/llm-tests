import json

# Read the file
with open('/Users/thindery/projects/sleep-stories/library/video-sources-index.json', 'r') as f:
    content = f.read()

# Strip trailing whitespace and check the ending
content = content.rstrip()

# If it ends with }}, remove one }
if content.endswith('}}'):
    content = content[:-1]
    # Write it back
    with open('/Users/thindery/projects/sleep-stories/library/video-sources-index.json', 'w') as f:
        f.write(content)
    print("Fixed extra closing brace")

# Now try to parse
try:
    with open('/Users/thindery/projects/sleep-stories/library/video-sources-index.json', 'r') as f:
        index = json.load(f)
    print(f"JSON is valid! Total sources: {index['total_sources']}")
    print(f"Last source: {index['sources'][-1]['id']}")
    
    # Now add new sources
    with open('/Users/thindery/.openclaw/workspace/new_video_sources.json', 'r') as f:
        new_sources = json.load(f)
    
    # Check for duplicates by URL
    existing_urls = {s['url'] for s in index['sources']}
    added = []
    for source in new_sources:
        if source['url'] not in existing_urls:
            index['sources'].append(source)
            added.append(source['id'])
    
    # Update metadata
    if added:
        index['total_sources'] = len(index['sources'])
        index['last_updated'] = '2026-03-12T04:32:00Z'
        index['last_discovery_scan'] = '2026-03-12'
        index['discovery_summary'] = f"7 new sources added on discovery run 2026-03-12 by video-library-discovery agent. Total sources now {index['total_sources']}. Added: Dareful (CC-BY 4K videos), ISO Republic (CC0 free videos), Beachfront B-Roll (astrophotography), CuteStockFootage (VFX/overlays), and new Pexels/Pixabay collections (nebula, starry night, flowing water)."
        
        # Save the updated index
        with open('/Users/thindery/projects/sleep-stories/library/video-sources-index.json', 'w') as f:
            json.dump(index, f, indent=2)
        
        print(f"\n✅ Added {len(added)} new sources:")
        for s in added:
            print(f"  - {s}")
        print(f"\n📊 Total sources: {index['total_sources']}")
    else:
        print("\n⚠️ No new sources to add (all URLs already exist)")
        
except json.decoder.JSONDecodeError as e:
    print(f"JSON still invalid: {e}")
    print(f"Error at char {e.pos}")
