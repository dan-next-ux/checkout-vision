from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

src = Path("handoff/screenshots")
out = Path("handoff/contact-sheet.png")
files = sorted(src.glob("*.png"))
thumb_w = 215
thumb_h = 480
label_h = 34
cols = 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
draw = ImageDraw.Draw(sheet)

for index, file in enumerate(files):
    img = Image.open(file).convert("RGB")
    img.thumbnail((thumb_w, thumb_h), Image.LANCZOS)
    x = (index % cols) * thumb_w
    y = (index // cols) * (thumb_h + label_h)
    sheet.paste(img, (x + (thumb_w - img.width) // 2, y))
    draw.text((x + 8, y + thumb_h + 8), file.stem[:28], fill=(0, 0, 0))

sheet.save(out)
print(out)
