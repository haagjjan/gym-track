"""Cull hidden geometry, decimate to the phone budget, join per region and side, export GLB.
Args: -- <tris_tracked> <tris_other> <tris_bone> <tris_skin> <out.glb>"""
import bpy, bmesh, os, sys, math, json, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils import kdtree
OUT = os.path.join(os.environ.get("BODY_MODEL_WORKDIR", os.path.expanduser("~/Projects/gym-assets/body-model")), "out")
argv = sys.argv[sys.argv.index("--") + 1:]
T_TRACKED, T_OTHER, T_BONE, T_SKIN = (int(a) for a in argv[:4]); glb_path = argv[4]
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "composed.blend"))
scene = bpy.context.scene
objs = [o for o in bpy.data.objects if o.type == "MESH" and o.get("bp3d_kind") != "skin"]
for o in [o for o in bpy.data.objects if o.type == "MESH" and o.get("bp3d_kind") == "skin"]:
    bpy.data.objects.remove(o)
# apply modifiers (lat sheets)
dg = bpy.context.evaluated_depsgraph_get()
for o in objs:
    if o.modifiers:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = me

def area(o): return sum(p.area for p in o.data.polygons)
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
dirs = []
for el in (-60, -35, -15, 0, 15, 35, 60):
    for k in range(12):
        az = 2 * math.pi * k / 12 + el
        dirs.append(Vector((math.cos(az) * math.cos(math.radians(el)), math.sin(az) * math.cos(math.radians(el)), math.sin(math.radians(el)))))
dirs += [Vector((0, 0, 1)), Vector((0, 0, -1))]
def build_bvh(members):
    verts, polys = [], []
    for o in members:
        base = len(verts); verts += [v.co.copy() for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(verts, polys)
def visible(bvh, c, n):
    start = c + n * 0.0015
    for d in dirs:
        if d.dot(n) < 0.05: continue
        if bvh.ray_cast(start, d, 3.0)[0] is None: return True
    return False

# ---- 1. drop objects nobody can see (sampled) ----------------------------
bvh = build_bvh(objs); random.seed(3)
kept, dropped = [], []
for o in objs:
    polys = o.data.polygons
    sample = random.sample(range(len(polys)), min(500, len(polys)))
    hits = 0
    for i in sample:
        c = polys[i].center; n = polys[i].normal
        if visible(bvh, c, n) or visible(bvh, c, -n): hits += 1
    frac = hits / max(len(sample), 1)
    if frac < (0.004 if o.get("region") else 0.06) and o.get("bp3d_kind") != "skinpart":
        dropped.append(o.name); bpy.data.objects.remove(o)
    else: kept.append(o)
print("kept", len(kept), "dropped", len(dropped))

# ---- 2. decimate the closed meshes by area -------------------------------
groups = {"tracked": [o for o in kept if o.get("region")], "other": [o for o in kept if not o.get("region") and o.get("bp3d_kind") == "muscle"],
          "bone": [o for o in kept if o.get("bp3d_kind") == "bone"], "skin": [o for o in kept if o.get("bp3d_kind") == "skinpart"]}
WEIGHT = {"abs": 2.5, "delts_side": 1.4, "neck": 1.4}
def warea(o): return area(o) * WEIGHT.get(o.get("region") or "", 1.0)
for gname, budget in (("tracked", T_TRACKED), ("other", T_OTHER), ("bone", T_BONE), ("skin", T_SKIN)):
    total_area = sum(warea(o) for o in groups[gname]) or 1
    for o in groups[gname]:
        target = max(60 if gname == "tracked" else 16, budget * warea(o) / total_area)
        ratio = min(1.0, target / max(tris(o), 1))
        if ratio < 1.0:
            m = o.modifiers.new("dec", "DECIMATE"); m.ratio = ratio; m.use_collapse_triangulate = True
dg = bpy.context.evaluated_depsgraph_get()
for o in kept:
    if o.modifiers:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = me

# ---- 3. remove faces that stay hidden, keeping a two-ring margin ---------
bvh = build_bvh(kept)
for o in kept:
    if o.get("bp3d_kind") == "skinpart" or o.get("region"): continue      # tracked muscles stay closed: no holes, ever
    bm = bmesh.new(); bm.from_mesh(o.data)
    vis = set()
    for f in bm.faces:
        pts = [f.calc_center_median()] + [(f.calc_center_median() + v.co * 2) / 3 for v in f.verts]
        if any(visible(bvh, p, f.normal) or visible(bvh, p, -f.normal) for p in pts): vis.add(f)
    for _ in range(2):
        grow = set()
        for f in vis:
            for v in f.verts: grow.update(v.link_faces)
        vis |= grow
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in vis], context="FACES")
    bm.to_mesh(o.data); bm.free()
kept = [o for o in kept if len(o.data.polygons) > 0]

# ---- join per region and side -------------------------------------------
def join(members, name):
    bm = bmesh.new()
    for o in members:
        tmp = bmesh.new(); tmp.from_mesh(o.data)
        me = bpy.data.meshes.new("tmp"); tmp.to_mesh(me); tmp.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    mat = bpy.data.materials.new(name); mat.use_nodes = True; me.materials.append(mat)
    return ob
buckets = {}
for o in kept:
    if o.get("region"): key = f"muscle_{o['region']}_{o.get('side') or 'C'}"
    elif o.get("bp3d_kind") == "skinpart": key = "body_skin"
    elif o.get("bp3d_kind") == "bone": key = "body_bone"
    else: key = "body_other"
    buckets.setdefault(key, []).append(o)
final = [join(m, k) for k, m in sorted(buckets.items())]
for o in kept: bpy.data.objects.remove(o)
# ground the figure: feet on z = 0, centred on x
zmin = min(v.co.z for o in final for v in o.data.vertices)
ymid = sum(v.co.y for o in final for v in o.data.vertices) / sum(len(o.data.vertices) for o in final)
for o in final: o.data.transform(Matrix.Translation((0, -ymid, -zmin)))
report = {o.name: tris(o) for o in final}
report["_total"] = sum(report.values()); report["_dropped"] = len(dropped)
json.dump(report, open(glb_path + ".report.json", "w"), indent=1)
print("TOTAL", report["_total"])
bpy.ops.wm.save_as_mainfile(filepath=glb_path.replace(".glb", ".blend"))
bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", export_yup=True, export_apply=True, export_normals=True,
                          export_texcoords=False, export_materials="EXPORT", export_animations=False)
print("exported", glb_path, os.path.getsize(glb_path))
