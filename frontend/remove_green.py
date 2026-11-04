from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / "public" / "cogniva-logo.png"
BACKUP = HERE.parent / "docs" / "cogniva-logo-green.png"

# Исходник с зелёным фоном: сохраняем один раз, дальше всегда читаем из него
if not BACKUP.exists():
    BACKUP.parent.mkdir(exist_ok=True)
    BACKUP.write_bytes(OUT.read_bytes())

img = Image.open(BACKUP).convert("RGBA")
a = np.asarray(img).astype(np.float32)
rgb = a[..., :3]

# Цвет фона: медиана по пикселям рамки в 6 px по всему периметру
border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3),
                         rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
key = np.median(border, axis=0)
print("цвет фона (R,G,B):", key.round())

# Прозрачность по расстоянию до цвета фона
dist = np.sqrt(((rgb - key) ** 2).sum(axis=2))
LOW, HIGH = 30.0, 120.0
alpha = np.clip((dist - LOW) / (HIGH - LOW), 0, 1)

# Убираем примесь зелёного: цвет = (пиксель - (1-alpha)*фон) / alpha
safe = np.maximum(alpha, 0.02)[..., None]
clean = np.clip((rgb - (1 - alpha)[..., None] * key) / safe, 0, 255)
clean[alpha < 0.02] = 0

out = Image.fromarray(np.dstack([clean, alpha * 255]).astype(np.uint8), "RGBA")

# Обрезаем пустые поля
box = out.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
if box:
    pad = 12
    l, t, r, b = box
    out = out.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, out.width), min(b + pad, out.height)))

out.save(OUT, optimize=True)
corner = np.asarray(out)[0, 0]
print("размер:", out.size, "· альфа в углу (должна быть 0):", corner[3])