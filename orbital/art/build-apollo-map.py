"""Pack the used UV regions of the authored Apollo material maps."""
from pathlib import Path
from array import array
from PIL import Image, ImageDraw, ImageFilter
from math import hypot
import sys

maps, mesh, output = map(Path,sys.argv[1:4])
atlas = Image.frombytes("RGBA",(1024,512),maps.read_bytes())
verts = array('f'); verts.frombytes(mesh.read_bytes())
assert len(verts)%51==0
mask = Image.new("L",atlas.size)
draw = ImageDraw.Draw(mask)
for base in range(0,len(verts),51):
    draw.polygon([(round(verts[base+i+15]*1023),round(verts[base+i+16]*511))
                  for i in (0,17,34)],fill=255)
# Pad the mesh islands for derivative filtering and mipmaps.
mask = mask.filter(ImageFilter.MaxFilter(21))
result = Image.new("RGBA",atlas.size,(128,128,128,196))
result.paste(atlas,(0,0),mask)
# Content-locked seam tracks in the known glove/sleeve UV islands, not
# helmet-space coordinates. The cuff's narrow orange band is intentional.
r,g,b,a=result.split()
a=a.point(lambda v:round(.85*v))
result=Image.merge("RGBA",(r,g,b,a))
# Supersample authored curves before final UV resolution. That keeps the
# marked band clean even where UVs occupy only a few pixels across the cuff.
s=4
layer=Image.new("RGBA",(1024*s,512*s),(0,0,0,0))
mask=Image.new("L",layer.size,0)
ink=ImageDraw.Draw(layer)
coverage=ImageDraw.Draw(mask)
def scaled(path):
    return [(round(x*s),round(y*s)) for x,y in path]
def line(path,fill,width):
    path=scaled(path)
    ink.line(path,fill=fill,width=max(1,round(width*s)),joint="curve")
    coverage.line(path,fill=255,width=max(1,round(width*s)),joint="curve")
def polygon(path,fill):
    path=scaled(path)
    ink.polygon(path,fill=fill);coverage.polygon(path,fill=255)
def curve(path):
    points=[path[0]]+path+[path[-1]]
    for a,b,c,d in zip(points,points[1:],points[2:],points[3:]):
        for i in range(8):
            t=i/8; t2=t*t; t3=t2*t
            yield tuple(.5*((2*v)+(-u+w)*t+(2*u-5*v+4*w-x)*t2+
                           (-u+3*v-3*w+x)*t3) for u,v,w,x in zip(a,b,c,d))
    yield path[-1]
glove=list(curve([(482,219),(475,227),(474,238),(480,253),(482,265),(481,281),(479,295)]))
line(glove,(46,118,152,171),3.1)
def stitches(track,pitch,length,dull,bright):
    offset=0
    for (ax,ay),(bx,by) in zip(track,track[1:]):
        dx,dy=bx-ax,by-ay
        total=hypot(dx,dy)
        while offset<total:
            stop=min(total,offset+length)
            first=(ax+offset/total*dx,ay+offset/total*dy)
            last=(ax+stop/total*dx,ay+stop/total*dy)
            line([first,last],dull,1.6)
            line([first,last],bright,.8)
            offset+=pitch
        offset-=total
stitches(glove[::8],5.8,2.7,(81,116,137,147),(143,123,115,151))
cuff_upper=list(curve([(910,33),(911,28),(905,25),(894,24),(882,24),(871,23),(861,21.5)]))
cuff_lower=list(curve([(906,37),(906,32),(901,28),(890,27),(880,26.5),(870,26),(861,24.2)]))
polygon(cuff_upper+cuff_lower[::-1],(134,128,128,252))
line(cuff_upper,(103,140,131,247),.55)
line(cuff_lower,(153,111,127,249),.55)
# The illustration is composited channel-by-channel: alpha is packed
# roughness/trim data, not image transparency.
result_hi=result.resize(layer.size,Image.Resampling.NEAREST)
result_hi.paste(layer,(0,0),mask)
result_hi.resize(result.size,Image.Resampling.BICUBIC).save(output,optimize=True)
