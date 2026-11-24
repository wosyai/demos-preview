"""Pack the two-stage Blender export as little-endian indexed GPU buffers."""
import array
import math
import pathlib
import struct
import sys

raw = array.array('f')
with open(sys.argv[1], 'rb') as stream:
    raw.fromfile(stream, pathlib.Path(sys.argv[1]).stat().st_size // 4)
if sys.byteorder != 'little':
    raw.byteswap()
vertices = {}
indices = array.array('H')
out = bytearray()
for i in range(0, len(raw), 15):
    p = raw[i:i+6]
    # Fit the evaluated closed fingers to the rear and top of the 87 mm rail.
    p[4] += .020
    p[5] -= .036
    # Roll the closed pose around the rail axis rather than through it.
    # This leaves the contact distance unchanged and makes the curled tips
    # visible above the wrist.
    turn=.44
    ca,sa=math.cos(turn),math.sin(turn)
    p[4],p[5]=ca*p[4]-sa*p[5],sa*p[4]+ca*p[5]
    norm=list(raw[i+9:i+15])
    norm[4],norm[5]=ca*norm[4]-sa*norm[5],sa*norm[4]+ca*norm[5]
    # Route the sleeve to the near-left of the camera while keeping the
    # wrist/glove and every vertex that touches the rail in the same place.
    for o in (0, 3):
        back = max(0., p[o+2] - .150)
        p[o] -= back * .92
        p[o+1] -= back * .24
    packed = struct.pack('<6h4B6b2x', *(round(v*10000) for v in p),
                        *(round(c*255) for c in raw[i+6:i+9]), 0,
                        *(round(127*max(-1.,min(1.,v))) for v in norm))
    if packed not in vertices:
        vertices[packed] = len(vertices)
        out.extend(packed)
    indices.append(vertices[packed])
if sys.byteorder != 'little':
    indices.byteswap()
pathlib.Path(sys.argv[2]).write_bytes(struct.pack('<4sII', b'KAV2', len(vertices), len(indices))+out+indices.tobytes())
print(f'{len(vertices)} vertices, {len(indices)//3} triangles')
