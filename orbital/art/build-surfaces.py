"""Generate the station's small, seamless, linear-light material tile."""
from pathlib import Path
import math
import random
from PIL import Image

size = 256
rng = random.Random(1214)
tau = math.tau
def modes(count, limit):
    return [(rng.randint(1, limit), rng.randrange(-limit, limit) or 1, rng.random()*tau)
            for _ in range(count)]
def comb(xs, u, v):
    return sum(math.cos(tau*(kx*u+ky*v)+angle) for kx,ky,angle in xs)/len(xs)
paint = modes(21, 19)
dust = modes(15, 80)
folds = modes(19, 6)
image = Image.new("RGB", (size, size))
data = []
for y in range(size):
    v = y/size
    for x in range(size):
        u = x/size
        grain = comb(paint,u,v)
        grit = comb(dust,u,v)
        # Long longitudinal brush marks, with their amplitude broken up by
        # fine oxide spots; use integer periods to preserve tile wrap.
        brushed = .55 + .14*math.sin(tau*(30*v)+.19*math.sin(tau*3*u)) + .29*grit
        blanket = .50 + .35*comb(folds,u,v) + .10*math.sin(tau*(9*v+2*u)) + .08*grit
        coat = .53 + .38*grain + .26*grit
        data.append(tuple(round(255*max(0,min(1,c))) for c in (coat,blanket,brushed)))
image.putdata(data)
image.save(Path(__file__).resolve().parents[1]/"surfaces.png", optimize=True)
