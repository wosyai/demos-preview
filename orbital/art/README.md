# EVA art sources

- **Earth:** NASA Goddard Space Flight Center, *Blue Marble 2015*, Amy Moran
  and Jesse Allen (Suomi NPP VIIRS, October 14, 2015).
  [Source and credits](https://svs.gsfc.nasa.gov/30763/). The public
  [10800 × 5400 TIFF](https://svs.gsfc.nasa.gov/vis/a030000/a030700/a030763/global_vir_2015287_mosaic_sm.tif)
  (SHA-256 `e51ba5bad47be7e3f91e26e4e61fd3db6b0be87ab96619e34f6d65776dd7ca92`)
  was resized to 5120 × 2560 with Lanczos, then exported as baseline JPEG
  at quality 81 and chroma subsampling 4:2:0. The globe shader regrades
  the photographed weather and ocean and adds analytical limb scattering.
  The orbit and sky are fictional. The faint optical star field is procedural
  and does not claim to depict real constellations.
- **Apollo forearm:** [Apollo astronaut asset v1.1.0 by Alex
  Maietta](https://github.com/alexmaietta/apollo-astronaut-asset/releases/tag/v1.1.0),
  built on NVIDIA's Omniverse Astronaut sample. The original mesh and
  materials are NVIDIA's, not CC0. The authored rig additions use CC0 1.0.
  See [upstream notice](apollo-NOTICE). No affiliation or endorsement is
  implied. The game's export is a cropped left forearm with two baked poses,
  not a copy of the original rig/project or full texture maps.

The open and contact snapshots are posed separately on the finger bones and
baked with the evaluated weights, cloth color and surface normals. Bind meshes are simplified before either pose is evaluated. The sleeve is routed left of the view while the skin vertices near the grip retain their rail-relative positions. Run the
export from a verified upstream release archive using Blender 5.1.1 or
newer with auto-execution disabled:

```sh
APOLLO_OUT=/tmp/apollo-arm.f32 APOLLO_MAP_RAW=/tmp/apollo-map.raw \
  blender -b -Y /path/to/astronaut.blend \
  -P art/bake-apollo-arm.py
python3 art/pack-apollo-arm.py /tmp/apollo-arm.f32 apollo-arm.bin
python3 art/build-apollo-map.py /tmp/apollo-map.raw /tmp/apollo-arm.f32 apollo-material.png
```

The binary starts with `KAV3` followed by two little-endian uint32 counts.
Each 24-byte indexed vertex carries open/contact positions (six scaled
int16), RGB, open/contact surface normals (six normalized int8), and two
12-bit UV coordinates in three formerly unused bytes. The index buffer
stores uint16 indices. The compact map contains only material islands used
by the forearm, padded for filtering. Its channels contain real source
luminance, tangent-normal XY, and roughness, with an authored cuff band and
stitched glove seam in the same UV coordinates. It joins the station texture
array at load; only the fitted Apollo arm samples these two layers.

No original Blender file, full-size maps, tools, or runtime asset loaders
ship. Wosy supplies the frame-space arm origin and authoritative pose
weight. The authored Wosy mesh remains a fallback if the packaged forearm
cannot load; the vertex-colored Apollo arm still draws if its optional
material map fails.

**Station surfaces:** six generated albedo references (off-white anodized
alloy, brushed titanium, woven insulation, warm film, graphite composite
and blue enamel). The editing master was generated with OpenAI image tools;
it is a fictional material reference, not NASA photography. Run
`python3 art/build-surfaces.py /path/to/material-master.png` to prepare the
compact RGB sheet. The browser decodes it into a single mipmapped texture
array, with no cross-layer bleed. The thermal tile uses restrained weave, stitched binding, and anchored
macro creases rather than repeating weave at a large size. Matching panel
relief and the hatch lamp bounce are baked into Wosy mesh vertices. The
practicals do not add a light pass or cast dynamic shadows. Selected rail, capsule and joint sidewalls carry octahedrally
encoded geometry normals in the same vertex stride; their caps and hard
service edges do not. The albedo pixels are not used as normal maps.

**Thermal panel N7:** the pale quilt albedo on the closest hull panel was
generated with OpenAI image tools from a light-neutral orthographic outline
of the exact Wosy panel. Its exported UV rectangle follows world axes
(z = −6.64 to −4.22, y = −0.76 to 0.05) on the modeled relief; it is not a
camera projection or scene image. Only the panel's 36 relief vertices
select this generated material. Geometry, external shadows, and current
sunlight still come from the live scene. Pack the reference with
`python3 art/build-thermal-stamp.py /path/to/generated-ortho.png`.
