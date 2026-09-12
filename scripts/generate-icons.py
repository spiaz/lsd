"""Render the code-native calendar mark as installable PNG icons. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1] / 'public'
for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)]:
    scale = 4
    image = Image.new('RGB', (size * scale, size * scale), '#282A36')
    draw = ImageDraw.Draw(image)
    def box(values): return tuple(round(v * size * scale / 64) for v in values)
    width = round(3 * size * scale / 64)
    draw.rounded_rectangle(box((17, 19, 47, 47)), radius=round(size * scale / 16), outline='#BD93F9', width=width)
    draw.line(box((18, 28, 46, 28)), fill='#BD93F9', width=width)
    for x in [25, 39]:
        draw.line(box((x, 15, x, 23)), fill='#8BE9FD', width=width)
        draw.ellipse(box((x-2, 35, x+2, 39)), fill='#8BE9FD')
    image.resize((size, size), Image.Resampling.LANCZOS).save(root / name)
