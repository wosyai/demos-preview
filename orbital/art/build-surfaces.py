"""Prepare six insulated texture layers for a single WebGL array.

Usage: python3 art/build-surfaces.py /path/to/original-3x2-sheet.png
The high-resolution editing master is not shipped.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

src = Image.open(sys.argv[1]).convert("RGB")
size = 512
assert src.size == (3*size,2*size), src.size
atlas = Image.new("RGB", src.size)
for layer in range(6):
    x0, y0 = (layer%3)*size, (layer//3)*size
    rgb = np.array(src.crop((x0,y0,x0+size,y0+size)), dtype=np.float32)
    # Make opposite boundaries match, without mirroring entire image quadrants.
    for k in range(30):
        a = .5*np.cos(k/30*np.pi/2)**2
        edge = rgb[:, k].copy()
        rgb[:, k] = (1-a)*edge+a*rgb[:, -k-1]
        rgb[:, -k-1] = (1-a)*rgb[:, -k-1]+a*edge
    for k in range(30):
        a = .5*np.cos(k/30*np.pi/2)**2
        edge = rgb[k, :].copy()
        rgb[k, :] = (1-a)*edge+a*rgb[-k-1, :]
        rgb[-k-1, :] = (1-a)*rgb[-k-1, :]+a*edge
    atlas.paste(Image.fromarray(np.rint(rgb).astype(np.uint8)), (x0,y0))
atlas.save(Path(__file__).resolve().parents[1]/"surfaces.jpg", quality=91, subsampling=0, optimize=True)
