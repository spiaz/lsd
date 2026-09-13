"""Render the neon bus mark as installable PNG icons. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1] / 'public'
for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)]:
    scale = 4
    image = Image.new('RGB', (size * scale, size * scale), '#282A36')
    draw = ImageDraw.Draw(image)
    def box(values): return tuple(round(v * size * scale / 64) for v in values)
    def line(points, fill, width, joint='curve'):
        draw.line([box(point) for point in points], fill=fill, width=round(width * size * scale / 64), joint=joint)
    line([(12, 31), (15, 28), (18, 29), (21, 27), (24, 25), (27, 26), (30, 29), (33, 30), (36, 28), (39, 26), (43, 25), (47, 28), (51, 28)], '#BD93F9', 2)
    draw.rounded_rectangle(box((15, 16, 49, 52)), radius=round(7 * size * scale / 64), fill='#282A36', outline='#BD93F9', width=round(4 * size * scale / 64))
    draw.rectangle(box((20, 22, 44, 35)), fill='#44475A', outline='#8BE9FD', width=round(2.5 * size * scale / 64))
    line([(15, 37), (49, 37)], '#FF79C6', 3)
    for x, colour in [(23, '#50FA7B'), (41, '#FFB86C')]:
        draw.ellipse(box((x-4, 44, x+4, 52)), fill=colour, outline='#282A36', width=round(2 * size * scale / 64))
    for x in [22, 42]:
        draw.ellipse(box((x-2, 40, x+2, 44)), fill='#F1FA8C')
    icon = image.resize((size, size), Image.Resampling.LANCZOS)
    icon.convert('P', palette=Image.Palette.ADAPTIVE, colors=16).save(root / name, optimize=True)