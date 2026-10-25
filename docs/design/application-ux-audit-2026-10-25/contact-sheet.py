import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path(__file__).resolve().parent
records = json.loads((base / 'live-owner-evidence.json').read_text(encoding='utf8'))
routes = ['/dashboard','/my-work','/tasks','/projects','/people','/settings','/decisions','/notifications','/documents','/revisions','/reviews','/client-reviews','/external-access','/turnkey','/time','/workforce','/learning','/learning/skills','/learning/training','/learning/library','/performance','/project-health','/reports','/integrations','/automation','/saved-reports','/assistance','/site']
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
for width in (1440, 390):
    tile_w, tile_h = (288, 220) if width == 1440 else (195, 455)
    sheet = Image.new('RGB', (tile_w*7, tile_h*4+40), '#f4f1e9')
    draw = ImageDraw.Draw(sheet)
    draw.text((12,10), f'Existing staged Owner entry views — {width}px — top viewport crops, not redesigns', fill='#182c29', font=font)
    for index, route in enumerate(routes):
        options = [r for r in records if r['width'] == width and r['route'] in (route, 'http://localhost:59443'+route)]
        record = options[-1]
        image = Image.open(base / record['screenshot']).convert('RGB')
        # Preserve the raw screenshot separately. These are labeled index thumbnails.
        image = image.crop((0, 0, image.width, min(image.height, 900 if width == 1440 else 844)))
        image.thumbnail((tile_w-8, tile_h-30))
        x, y = index%7*tile_w, index//7*tile_h+40
        draw.text((x+4,y+3), route, fill='#182c29', font=font)
        sheet.paste(image, (x+4,y+26))
    sheet.save(base / f'owner-contact-sheet-{width}.jpg', quality=90)
