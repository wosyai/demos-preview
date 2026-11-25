"""Bake VIIRS photographic luminance residuals in bounded latitude strips, not a global GPU atlas."""
import argparse, io, math, pathlib, struct, subprocess
from PIL import Image
import numpy as np

SOURCE = 'https://svs.gsfc.nasa.gov/vis/a030000/a030700/a030763/global_vir_2015287_mosaic_750m_scale.75.tif'
W,H=40031,20015
NX,NY,T=32,16,1024
ROOT=pathlib.Path(__file__).resolve().parents[1]

def read(start,stop):
    # Query separates cache entries on transparent proxies which discard Range from cache keys.
    data=subprocess.check_output(['curl','-fLsS','--retry','2','--max-time','180','--max-filesize',str(stop-start),
        '--range',f'{start}-{stop-1}',SOURCE+f'?orbital={start}-{stop-1}'])
    if len(data)!=stop-start:raise ValueError(f'wrong byte range {start}:{stop}, got {len(data)}')
    return data

def u16(v): return struct.pack('<H',v)
def u32(v): return struct.pack('<I',v)
def field(tag,typ,n,value): return struct.pack('<HHII',tag,typ,n,value)

def strip_image(header,row1,row2):
    offsets=struct.unpack_from('<10008I',header,284)
    sizes=struct.unpack_from('<10008I',header,40316)
    a,b=row1//2,(row2+1)//2; lo=offsets[a]; hi=offsets[b-1]+sizes[b-1]
    # Each independent LZW strip is two rows; retain only this narrow band at a time.
    src=read(lo,hi)
    N=b-a; tags=12; tail=8+2+tags*12+4
    pixelstart=tail+6+8*N
    fields=[field(256,4,1,W),field(257,4,1,min(2*N,H-2*a)),field(258,3,3,tail),
            field(259,3,1,5),field(262,3,1,2),field(273,4,N,tail+6),
            field(274,3,1,1),field(277,3,1,3),field(278,3,1,2),field(279,4,N,tail+6+4*N),
            field(284,3,1,1),field(317,3,1,2)]
    buf=io.BytesIO();buf.write(b'II*\0'+u32(8)+u16(tags)+b''.join(fields)+u32(0)+u16(8)*3)
    buf.write(struct.pack('<%dI'%N,*[v-lo+pixelstart for v in offsets[a:b]]))
    buf.write(struct.pack('<%dI'%N,*sizes[a:b])); buf.write(src); del src
    img=Image.open(buf);img.load();buf.close()
    return img,a*2

def make(row,header):
    # Fetch 1/4 latitude-band at a time to keep peak source pixels small.
    boxY=row*H/NY
    bands=[]
    for i in range(4):
        y0=(row+i/4)*H/NY;y1=(row+(i+1)/4)*H/NY
        img,top=strip_image(header,max(0,int(y0)-4),min(H,math.ceil(y1)+4))
        bands.append(img.convert('L').resize((NX*T,T//4),Image.Resampling.LANCZOS,box=(0,y0-top,W,y1-top)));del img
    fine=Image.new('L',(NX*T,T))
    for j,b in enumerate(bands): fine.paste(b,(0,j*T//4))
    base=Image.open(ROOT/'earth.jpg').convert('L'); dest=ROOT/'earth-detail';dest.mkdir(exist_ok=True)
    for x in range(NX):
        coarse=base.resize((T,T),Image.Resampling.BILINEAR,box=(x*base.width/NX,row*base.height/NY,(x+1)*base.width/NX,(row+1)*base.height/NY))
        hi=np.asarray(fine.crop((x*T,0,(x+1)*T,T))).astype(np.int16)
        difference=hi-np.asarray(coarse).astype(np.int16)
        residual=Image.fromarray(np.uint8(np.clip(128+2*difference,0,255)),'L')
        # Match the approved review master without keeping intermediate assets.
        with io.BytesIO() as master:
            residual.save(master,format='WEBP',quality=72,method=4)
            with Image.open(master) as reviewed:
                reviewed.convert('L').save(dest/f'{row:02}-{x:02}.avif',quality=31,speed=8,max_threads=2)
    print('baked',row,flush=True)

if __name__=='__main__':
    opts=argparse.ArgumentParser();opts.add_argument('rows',nargs='*',type=int)
    args=opts.parse_args();header=read(0,106894)
    assert header[:8]==b'II*\0\x08\0\0\0' and struct.unpack_from('<I',header,30)[0]==W
    for row in args.rows or range(NY): make(row,header)
