import bpy, math, array, os, struct
from mathutils import Vector, Quaternion
arm=bpy.data.objects['astronaut_skeleton']
names=['gloves','glove_fingertips','wrist_rings','suit_torso_arms']
# Decimate bind meshes before evaluating either pose. Preserve finger silhouette
# disproportionately; the many almost-coplanar sleeve/ring polygons cost more
# than they contribute in a browser.
for name,ratio in zip(names,(.34,.65,.15,.61)):
 o=bpy.data.objects[name]
 bpy.context.view_layer.objects.active=o
 o.select_set(True)
 if o.data.shape_keys: o.shape_key_clear()
 modifier=o.modifiers.new("Browser polygon budget","DECIMATE")
 modifier.ratio=ratio
 o.modifiers.move(len(o.modifiers)-1,0)
 bpy.ops.object.modifier_apply(modifier=modifier.name)
 o.select_set(False)

prefixes={'Gloves':'astronaut_04_GlovesS_', 'Body':'astronaut_04_jackletS_'}
images={n:bpy.data.images[k+'BaseColor.png'] for n,k in prefixes.items()}
for k,im in images.items():
 im.scale(512,512)
 a=array.array('f',[0.0])*(512*512*4);im.pixels.foreach_get(a);images[k]=a
# Export one compact combined mask: authored luminance, normal XY and
# roughness. The base mesh retains the original per-vertex material chroma.
# UV row 0 remains the first row, matching WebGL's default upload orientation.
material_out=os.environ.get('APOLLO_MAP_RAW')
if material_out:
 material_samples={}
 for material,base in prefixes.items():
  maps=[]
  for suffix in ('Normal','Roughness'):
   im=bpy.data.images[base+suffix+'.png']
   im.scale(512,512)
   data=array.array('f',[0.0])*(512*512*4);im.pixels.foreach_get(data);maps.append(data)
  material_samples[material]=(images[material],*maps)
 packed=array.array('B')
 for row in range(512):
  for material in ('Gloves','Body'):
   color,norm,rough=material_samples[material]
   for col in range(512):
    k=(row*512+col)*4
    luma=.2126*color[k]+.7152*color[k+1]+.0722*color[k+2]
    packed.extend(round(255*max(0.,min(1.,a))) for a in (luma,norm[k],norm[k+1],rough[k]))
 with open(material_out,'wb') as handle:packed.tofile(handle)
def sample(k,u,v):
 im=images[k];ii=((int(v*512)%512)*512+int(u*512)%512)*4
 return tuple(max(.005,min(1.,im[ii+i])) for i in range(3))
def gathering(grip):
 for pb in arm.pose.bones:
  pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0)
 for pb in arm.pose.bones:
  name=pb.name
  if not name.startswith('LeftHand') or name.endswith('WristTwist'):continue
  if 'Thumb' in name:
   amount=-.18 if 'Proximal' in name else -.20 if 'Distal' in name else 0
  else:
   amount=-.12 if name.endswith('Proximal') else -.43 if name.endswith('Intermediate') else -.38 if name.endswith('Distal') else 0
  if amount:
   axis=pb.bone.matrix_local.to_quaternion().inverted()@Vector((1,0,0))
   pb.rotation_quaternion=Quaternion(axis,amount*grip)
 bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get()
 parts={}
 for name in names:
  o=bpy.data.objects[name]; ev=o.evaluated_get(deps); me=ev.to_mesh()
  me.calc_loop_triangles()
  uv=me.uv_layers.active.data
  item=[]
  for t in me.loop_triangles:
   if not all((o.matrix_world@o.data.vertices[i].co).y>.245 for i in t.vertices):continue
   for vi,li in zip(t.vertices,t.loops):
    co=ev.matrix_world@me.vertices[vi].co; no=ev.matrix_world.to_3x3()@me.corner_normals[li].vector
    v=uv[li].uv
    material=o.data.materials[0].name
    if not grip: rgb=sample(material,v.x,v.y)
    else:rgb=(0,0,0)
    # Pack two material UV spaces into the available 24-bit lane.
    u0=max(.001,min(.999,v.x))
    texcoord=(u0*.5+(.5 if material=='Body' else 0.),max(.001,min(.999,v.y)))
    item.append((tuple(co),tuple(no.normalized()),rgb,name,texcoord))
  ev.to_mesh_clear()
  parts[name]=item
 return sum((parts[n] for n in names),[])
opened=gathering(0)
closed=gathering(1)
assert len(opened)==len(closed)
wrist=(.010,.360,.966)
def coords(p, angle, scale, shift):
 x,y,z=[p[k]-wrist[k] for k in range(3)]; ca=math.cos(angle);si=math.sin(angle)
 return (x*scale+shift[0],(ca*y-si*z)*scale+shift[1],(si*y+ca*z)*scale+shift[2])
def rotate_normal(p,angle):
 x,y,z=p
 ca=math.cos(angle);si=math.sin(angle)
 return x,ca*y-si*z,si*y+ca*z

# Static open and closed endpoint anchors relative to Wosy's hand origin; the
# held transform is fitted to the real horizontal rail, not the camera.
aa,bb=-0.10,-0.49
sc=1.19
shift0=(.062,.121,.002);shift1=(.068,.154,.077)
out=array.array('f')
for a,b in zip(opened,closed):
 u,v=coords(a[0],aa,sc,shift0),coords(b[0],bb,sc,shift1)
 # Separate a touch of blue from the black rubber and retain the textile's base map.
 rgb=a[2]
 out.extend((*u,*v,*rgb,*rotate_normal(a[1],aa),*rotate_normal(b[1],bb),*a[4]))
path=os.environ.get('APOLLO_OUT','apollo-arm.f32')
with open(path,'wb')as f:out.tofile(f)
for g,label in [(opened,'OPEN'),(closed,'CONTACT')]:
 for group in names:
  ps=[coords(v[0],aa if label=='OPEN' else bb,sc,shift0 if label=='OPEN' else shift1) for v in g if v[3]==group]
  print(label,group,len(ps), tuple((round(min(v[k] for v in ps),3),round(max(v[k] for v in ps),3))for k in range(3)))
print('Baked paired Apollo',len(opened)//3,'triangles',len(out)*4,'bytes')
