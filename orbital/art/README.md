# EVA art sources

- **Earth:** NASA Goddard Space Flight Center, *Blue Marble 2015*, Amy Moran
  and Jesse Allen (Suomi NPP VIIRS, October 14, 2015).
  [Source and credits](https://svs.gsfc.nasa.gov/30763/). A downsampled texture
  from the public 10800 × 5400 mosaic is projected onto the atmosphere-lit
  globe. The in-game view is fictional.
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
APOLLO_OUT=/tmp/apollo-arm.f32 blender -b -Y /path/to/astronaut.blend \
  -P art/bake-apollo-arm.py
python3 art/pack-apollo-arm.py /tmp/apollo-arm.f32 apollo-arm.bin
```

The binary starts with `KAV2` followed by two little-endian uint32 counts.
Each 24-byte indexed vertex carries open/contact positions (six scaled
int16), RGB, open/contact surface normals (six normalized int8) and padding.
The index buffer stores uint16 indices. No original Blender file, textures,
tools, or runtime asset loaders ship. Wosy supplies the frame-space arm origin
and authoritative pose weight. The authored Wosy mesh remains a fallback if
the optional packaged forearm cannot load.

**Station surfaces:** `python3 art/build-surfaces.py` rebuilds the seeded,
seamless alloy/insulation/brush tile. The browser mipmaps that one lightweight
texture; it does not recalculate procedural grain for each frame.
