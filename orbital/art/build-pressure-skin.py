"""Pack the registered pressure skin UV image, retaining its fitted borders."""
from pathlib import Path
from PIL import Image
import sys

image = Image.open(sys.argv[1]).convert("RGB")
assert abs(image.width / image.height - 2.42 / 1.72) < .012
image.resize((512,512),Image.Resampling.LANCZOS).save(
    Path(__file__).resolve().parents[1]/"pressure-skin.jpg",
    quality=89,subsampling=0,optimize=True)
