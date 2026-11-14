"""Neutral inner volume and tapered extremities, independent of muscle meshes."""
import bpy,bmesh,math
from mathutils import Vector

def smooth(a,b,t):
 t=max(0,min(1,(t-a)/(b-a)));return t*t*(3-2*t)

def surface(skin,offset):
 bm=bmesh.new();bm.from_mesh(skin)
 remove=[]
 for f in bm.faces:
  c=f.calc_center_median()
  if not((c.z>1.40 and (abs(c.x)<.072 or c.z>1.47)) or c.z<.105 or (abs(c.x)>.22 and c.z<.862)):remove.append(f)
 bmesh.ops.delete(bm,geom=remove,context='FACES')
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00003)
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
 bm.to_mesh(skin);bm.free()
 for v in skin.vertices:
  x,y,z=v.co
  if z>1.40:
   taper=.78+.22*smooth(1.40,1.46,z)
   v.co.x*=taper;v.co.y=-.04+(y+.04)*taper
  elif z<.105:
   taper=1-.28*smooth(.025,.105,z)
   center=.082 if x>0 else -.082
   v.co.x=center+(x-center)*taper;v.co.y=-.075+(y+.075)*taper
  else:
   # The hand starts at the wrist, with one flat rim. The forearm tendons end just
   # under that rim: any further and they surface through the palm side of the skin.
   z=min(z,.855);v.co.z=z
   taper=1-.03*smooth(.84,.855,z)
   center=.264 if x>0 else -.264
   v.co.x=center+(x-center)*taper;v.co.y=-.085+(y+.085)*taper
  v.co+=offset
 ob=bpy.data.objects.new('body_skin',skin);bpy.context.scene.collection.objects.link(ob)
 bpy.context.view_layer.objects.active=ob;ob.select_set(True)
 mod=ob.modifiers.new('Extremity detail','DECIMATE');mod.ratio=.12
 bpy.ops.object.modifier_apply(modifier=mod.name)
 bm=bmesh.new();bm.from_mesh(ob.data)
 bmesh.ops.delete(bm,geom=[v for v in bm.verts if 1.40<v.co.z<1.51 and abs(v.co.x)>.055],context='VERTS')
 bm.to_mesh(ob.data);bm.free()
 # Small brow and cheek relief keeps a neutral expression without a flat mask.
 for v in ob.data.vertices:
  x,y,z=v.co
  if z>1.51 and y<-.055:
   brow=math.exp(-((abs(x)-.029)/.020)**2-((z-1.628)/.009)**2)
   cheek=math.exp(-((abs(x)-.041)/.015)**2-((z-1.585)/.017)**2)
   v.co.y-=.0025*brow+.0015*cheek
 pieces=[]
 def ellipsoid(center,scale):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=center)
  o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);pieces.append(o);return o
 def segment(a,b,r):
  a,b=Vector(a),Vector(b);o=ellipsoid((a+b)/2,(r,r,(b-a).length/2+r))
  o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
 # Belly kept a few millimetres inside the abdominal sheet so it never shows through.
 ellipsoid((0,.019,1.14),(.129,.066,.245))
 ellipsoid((0,.016,.91),(.121,.072,.125))
 ellipsoid((0,.014,1.36),(.155,.068,.09))
 segment((0,.01,1.36),(0,.005,1.52),.039)
 for s in [-1,1]:
  segment((s*.08,.012,.94),(s*.095,.006,.50),.052)
  segment((s*.095,.006,.50),(s*.083,.012,.10),.031)
  # The forearm follows the real arm: from the elbow end of the forearm muscles to
  # just inside the hand, so nothing shows behind the muscles from the side and
  # the tendon ends lie on a solid wrist.
  side='L' if s>0 else 'R'
  fore=[v.co.copy() for v in bpy.data.objects['muscle_forearms_'+side].data.vertices]
  top=max(v.z for v in fore)
  elbow=sum((v for v in fore if v.z>top-.035),Vector())/max(1,len([v for v in fore if v.z>top-.035]))
  hand=[v.co.copy() for v in ob.data.vertices if v.co.x*s>.2 and v.co.z<.95]
  rim_z=max(v.z for v in hand)
  rim=[v for v in hand if v.z>rim_z-.02]
  wrist=sum(rim,Vector())/len(rim)
  wrist_end=wrist+(wrist-elbow).normalized()*.035
  segment((s*.15,.008,1.405),tuple(elbow),.031)
  segment(tuple(elbow),tuple(wrist_end),.024)
 bpy.ops.object.select_all(action='DESELECT')
 for p in pieces:p.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();core=bpy.context.object;core.name='body_core'
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 mod=core.modifiers.new('Continuous core','REMESH');mod.mode='VOXEL';mod.voxel_size=.006
 bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=core.modifiers.new('Core smoothing','SMOOTH');mod.factor=1;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=core.modifiers.new('Core budget','DECIMATE');mod.ratio=.075;bpy.ops.object.modifier_apply(modifier=mod.name)
 # Keep the lumbar surface beneath the named lower-back muscles.
 for v in core.data.vertices:
  x,y,z=v.co
  blend=smooth(.94,1.02,z)*(1-smooth(1.31,1.39,z))*(1-smooth(.10,.15,abs(x)))
  if y>.02:v.co.y=y-(y-.02)*.85*blend
 core.data.update()
 # Neutral eyeballs give the eyelids a solid surface rather than empty sockets.
 eyes=[]
 for s in [-1,1]:eyes.append(ellipsoid((s*.028,-.073,1.607),(.011,.010,.009)))
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
 for eye in eyes:eye.select_set(True)
 bpy.context.view_layer.objects.active=ob;bpy.ops.object.join()
 # Merge the core into existing untracked filler, preserving the runtime name contract.
 other=bpy.data.objects.get('body_other')
 core['core']=True
 bpy.data.objects.remove(other,do_unlink=True)
 core.name='body_other'
 return ob
