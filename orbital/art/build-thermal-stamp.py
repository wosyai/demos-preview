"""Prepare the orthographic ImageGen panel n=7 albedo for array sampling."""
from pathlib import Path
from PIL import Image
import sys

image = Image.open(sys.argv[1]).convert("RGB")
assert abs(image.width/image.height-3)<.02, "expected the registered 3:1 master"
# The output packs the UV rectangle in the existing square texture-array
# slot. Metric geometry restores its 2.42 x .81 aspect during rendering.
image.resize((512,512),Image.Resampling.LANCZOS).save(
    Path(__file__).resolve().parents[1]/"thermal-panel.jpg",
    quality=89,subsampling=0,optimize=True)
