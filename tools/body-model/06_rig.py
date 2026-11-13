"""Rig the exported figure: closed inner body, tapered skin extremities, 19-bone skeleton, pose clips.
From the pose study (pose-study/build.py). Args: -- <figure.blend> <out.glb>"""
import bpy, bmesh, math, os, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import sys
BASE=os.path.dirname(os.path.abspath(__file__))
ARGS=sys.argv[sys.argv.index('--')+1:]
FIGURE,OUT_GLB=ARGS[0],ARGS[1]
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(FIGURE),'composed.blend'))
raw=next(o for o in bpy.data.objects if o.get('bp3d_kind')=='skin')
skin=raw.data.copy()
parts=next(o for o in bpy.data.objects if o.get('bp3d_kind')=='skinpart')
raw_min=[min(v.co[i] for v in parts.data.vertices) for i in range(3)]
raw_max=[max(v.co[i] for v in parts.data.vertices) for i in range(3)]
skin.use_fake_user=True
# Loading a second scene would discard the copied mesh, so append the baseline.
for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
with bpy.data.libraries.load(FIGURE) as (src,dst): dst.objects=src.objects
for o in dst.objects:
 if o is not None: bpy.context.scene.collection.objects.link(o)
old=bpy.data.objects['body_skin']
offset=Vector((0,min(v.co.y for v in old.data.vertices)-raw_min[1],max(v.co.z for v in old.data.vertices)-raw_max[2]))
bpy.data.objects.remove(old,do_unlink=True)
import sys
sys.path.insert(0,BASE)
from surface import surface,smooth
ob=surface(skin,offset)
from shoulders import anterior_deltoids,reduce_neutral_geometry
anterior_deltoids()
reduce_neutral_geometry()
# One skeleton shared by all named muscle meshes and the neutral envelope.
armdata=bpy.data.armatures.new('BodyRig'); rig=bpy.data.objects.new('BodyRig',armdata); bpy.context.scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
spec={}
def bone(name,head,tail,parent=None):
 b=armdata.edit_bones.new(name); b.head=head; b.tail=tail
 if parent: b.parent=armdata.edit_bones[parent]
 spec[name]=(Vector(head),Vector(tail))
bone('pelvis',(0,0,.84),(0,0,1.0))
bone('spine',(0,0,1.0),(0,0,1.24),'pelvis')
bone('chest',(0,0,1.24),(0,0,1.43),'spine')
bone('neck',(0,0,1.43),(0,0,1.53),'chest')
bone('head',(0,0,1.53),(0,0,1.69),'neck')
for side,sign in [('L',1),('R',-1)]:
 def pt(x,y,z): return (sign*x,y,z)
 bone('clavicle.'+side,pt(.025,0,1.40),pt(.185,0,1.405),'chest')
 bone('upper_arm.'+side,pt(.185,0,1.405),pt(.235,.005,1.17),'clavicle.'+side)
 bone('forearm.'+side,pt(.235,.005,1.17),pt(.263,.005,.91),'upper_arm.'+side)
 bone('hand.'+side,pt(.263,.005,.91),pt(.275,-.015,.76),'forearm.'+side)
 bone('thigh.'+side,pt(.09,0,.94),pt(.093,-.002,.48),'pelvis')
 bone('shin.'+side,pt(.093,-.002,.48),pt(.083,.015,.13),'thigh.'+side)
 bone('foot.'+side,pt(.083,.015,.13),pt(.09,-.12,.035),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
def distance(p,a,b):
 ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (p-a-ab*t).length
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
 o.data.validate()
 o.data.name=o.name
 material=bpy.data.materials.new(o.name+' neutral');material.diffuse_color=(.52,.55,.59,1)
 o.data.materials.clear();o.data.materials.append(material)
 for p in o.data.polygons:p.material_index=0
 groups={n:o.vertex_groups.new(name=n) for n in spec}
 for v in o.data.vertices:
  p=v.co; x,y,z=p; side='L' if x>=0 else 'R'
  torso=['pelvis','spine','chest','neck','head']
  arms=['clavicle.'+side,'upper_arm.'+side,'forearm.'+side,'hand.'+side]
  legs=['pelvis','thigh.'+side,'shin.'+side,'foot.'+side]
  slug=o.name[7:-2] if o.name.startswith('muscle_') else ''
  if slug in ['biceps','triceps','forearms']: names=arms
  elif slug.startswith('delts'): names=['chest']+arms[:2]
  elif slug in ['quads','hamstrings','adductors','abductors','glutes','calves']: names=legs
  elif slug: names=torso
  elif abs(x)>(.19 if z<1.05 else .155) and .72<z<1.47: names=arms
  elif z<.98: names=legs
  else: names=torso
  if o.name=='body_bone': names=torso if z>1.0 and abs(x)<.20 else names
  if o.get('core') and z>.98:
   arm_factor=smooth(.14,.205,abs(x))*(1-smooth(1.40,1.48,z))
   tw=[(math.exp(-distance(p,*spec[n])**2/.008),n) for n in torso]
   aw=[(math.exp(-distance(p,*spec[n])**2/.008),n) for n in arms]
   scores_weight=[(w/sum(v for v,_ in tw)*(1-arm_factor),n) for w,n in tw]+[(w/sum(v for v,_ in aw)*arm_factor,n) for w,n in aw]
   chosen=sorted(scores_weight,reverse=True)[:4];total=sum(w for w,n in chosen)
   for w,n in chosen:groups[n].add([v.index],w/total,'REPLACE')
   continue
  scores=sorted([(distance(p,*spec[n]),n) for n in names])[:3]
  weights=[math.exp(-((d-scores[0][0])/.045)**2) for d,n in scores]; total=sum(weights)
  for (_,n),w in zip(scores,weights):
   if w/total>.001: groups[n].add([v.index],w/total,'REPLACE')
 mod=o.modifiers.new('Body skeleton','ARMATURE'); mod.object=rig; o.parent=rig
 for p in o.data.polygons: p.use_smooth=True
# Static pose clips can be sampled or blended; the bind pose remains unchanged.
poses={'Relaxed':{'upper_arm.L':(0,0,-6),'upper_arm.R':(0,0,6)},'ArmsRaised':{'upper_arm.L':(0,0,-82),'upper_arm.R':(0,0,82),'forearm.L':(0,0,-110),'forearm.R':(0,0,110)}}
for name,rotations in poses.items():
 rig.animation_data_clear()
 for b in rig.pose.bones:
  b.rotation_mode='XYZ'; b.rotation_euler=(0,0,0)
  if b.name in rotations: b.rotation_euler=tuple(math.radians(v) for v in rotations[b.name])
  for frame in (1,25): b.keyframe_insert(data_path='rotation_euler',frame=frame,group=b.name)
 rig.animation_data.action.name=name
 track=rig.animation_data.nla_tracks.new(); track.name=name; track.strips.new(name,1,rig.animation_data.action); track.mute=True
 rig.animation_data.action.use_fake_user=True
rig.animation_data_clear()
rig.animation_data_create()
for b in rig.pose.bones: b.rotation_euler=(0,0,0)
bpy.context.scene.render.fps=24
bpy.ops.wm.save_as_mainfile(filepath=OUT_GLB.replace('.glb','.blend'))
bpy.ops.export_scene.gltf(filepath=OUT_GLB,export_format='GLB',export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_texcoords=False)
json.dump({'meshes':[o.name for o in meshes],'bones':list(spec),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'offset':list(offset)},open(OUT_GLB+'.report.json','w'),indent=2)
