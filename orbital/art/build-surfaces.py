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
def thermal_quilt(linen):
    """Project one insulated panel, with restrained weave and anchored folds."""
    y,x=np.mgrid[0:size,0:size].astype(np.float32)/(size-1)
    d=np.minimum(np.minimum(x,1-x),np.minimum(y,1-y))
    weave=(linen.mean(axis=2)-217.)*.13
    value=219.+weave
    # Broad fabric relief radiates from off-center fixings and fades inboard.
    fold_specs=[
        (.11,.15,.28,.15,.022,.012,14.0),
        (.15,.83,-.39,.17,.019,.009,17.0),
        (.27,.48,.16,.30,.026,.015,10.0),
        (.55,.14,-.28,.20,.033,.019,14.0),
        (.67,.83,.36,.22,.026,.012,16.0),
        (.83,.45,-.13,.19,.026,.013,11.0),
        (.92,.71,.55,.11,.024,.009,17.0),
    ]
    for x0,y0,slope,extent,soft,narrow,amp in fold_specs:
        along=x-x0
        cross=y-y0-along*slope-.48*along*along
        taper=np.exp(-(along/extent)**2)*np.clip((d-.024)*10.,0.,1.)
        value+=amp*1.20*taper*np.exp(-((cross+.011)/soft)**2)
        value-=amp*2.35*taper*np.exp(-((cross-.015)/narrow)**2)
    # Compressed binding, twin rows of thread and darker corner tabs.
    value-=42.*np.exp(-((d-.016)/.009)**2)
    value-=8.*np.exp(-((d-.036)/.014)**2)
    broadAge=3.*np.sin(11.*x+1.4*np.cos(9.*y))*np.sin(8.*y)
    value+=broadAge
    edgeAlong=np.where(np.minimum(x,1-x)<np.minimum(y,1-y),y,x)
    thread=.5+.5*np.cos(2*np.pi*(edgeAlong*112.))
    value-=13.*(thread>.50)*np.exp(-((d-.032)/.0030)**2)
    value+=19.*(thread>.50)*np.exp(-((d-.038)/.0022)**2)
    edgeTab=(np.minimum(x,1-x)<.065)&(np.minimum(y,1-y)<.055)
    value-=13.*edgeTab.astype(np.float32)
    return np.stack((value+2.,value,value-4.),axis=-1).clip(0,255)
for layer in range(6):
    x0, y0 = (layer%3)*size, (layer//3)*size
    rgb = np.array(src.crop((x0,y0,x0+size,y0+size)), dtype=np.float32)
    if layer==2:rgb=thermal_quilt(rgb)
    # Make opposite boundaries match, without mirroring entire image quadrants.
    for k in range(0 if layer==2 else 30):
        a = .5*np.cos(k/30*np.pi/2)**2
        edge = rgb[:, k].copy()
        rgb[:, k] = (1-a)*edge+a*rgb[:, -k-1]
        rgb[:, -k-1] = (1-a)*rgb[:, -k-1]+a*edge
    for k in range(0 if layer==2 else 30):
        a = .5*np.cos(k/30*np.pi/2)**2
        edge = rgb[k, :].copy()
        rgb[k, :] = (1-a)*edge+a*rgb[-k-1, :]
        rgb[-k-1, :] = (1-a)*rgb[-k-1, :]+a*edge
    atlas.paste(Image.fromarray(np.rint(rgb).astype(np.uint8)), (x0,y0))
atlas.save(Path(__file__).resolve().parents[1]/"surfaces.jpg", quality=91, subsampling=0, optimize=True)
