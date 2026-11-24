import bpy, math, array, os, struct
from mathutils import Vector, Quaternion
arm=bpy.data.objects['astronaut_skeleton']
names=['gloves','glove_fingertips','wrist_rings','suit_torso_arms']
images={n:bpy.data.images[k] for n,k in [('Gloves','astronaut_04_GlovesS_BaseColor.png'),('Body','astronaut_04_jackletS_BaseColor.png')]}
for k,im in images.items():
 im.scale(512,512)
 a=array.array('f',[0.0])*(512*512*4);im.pixels.foreach_get(a);images[k]=a
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
    if not grip: rgb=sample(o.data.materials[0].name,v.x,v.y)
    else:rgb=(0,0,0)
    item.append((tuple(co),tuple(no.normalized()),rgb,name))
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
 out.extend((*u,*v,*rgb,*rotate_normal(a[1],aa),*rotate_normal(b[1],bb)))
path=os.environ.get('APOLLO_OUT','apollo-arm.f32')
with open(path,'wb')as f:out.tofile(f)
for g,label in [(opened,'OPEN'),(closed,'CONTACT')]:
 for group in names:
  ps=[coords(v[0],aa if label=='OPEN' else bb,sc,shift0 if label=='OPEN' else shift1) for v in g if v[3]==group]
  print(label,group,len(ps), tuple((round(min(v[k] for v in ps),3),round(max(v[k] for v in ps),3))for k in range(3)))
print('Baked paired Apollo',len(opened)//3,'triangles',len(out)*4,'bytes')
