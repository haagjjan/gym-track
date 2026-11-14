"""Compose the figure from the raw import: classify, split abs from the oblique sheet,
build the lat sheets, cut skin parts. Saves out/composed.blend (full resolution).
Coordinates: metres, Z up, front = -Y, figure's right = -X."""
import bpy, bmesh, os, sys, math, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import regions
OUT = os.path.join(os.environ.get("BODY_MODEL_WORKDIR", os.path.expanduser("~/Projects/gym-assets/body-model")), "out")
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "bp3d_raw.blend"))
P = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "params.json")))

def lerp_table(table, z):
    table = sorted(table)
    if z <= table[0][0]: return table[0][1]
    for (z0, v0), (z1, v1) in zip(table, table[1:]):
        if z <= z1: return v0 + (v1 - v0) * (z - z0) / (z1 - z0)
    return table[-1][1]

objs = [o for o in bpy.data.objects if o.type == "MESH"]
from mathutils import Matrix
for o in objs:                       # bake the import scale into the vertices
    o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4); o.data.update()
skin = next(o for o in objs if o.get("bp3d_kind") == "skin")
muscles = [o for o in objs if o is not skin]
for o in muscles:
    o["region"] = (regions.region_of(o.name.split(".")[0]) or "") if o.get("bp3d_kind") == "muscle" else ""
    o["side"] = regions.side(o.name)

import re, numpy as np
for o in list(muscles):
    if re.search(regions.HIDE, regions.base_name(o.name.split(".")[0])):
        bpy.data.objects.remove(o); muscles.remove(o)

def inflate(obj, amount):
    """Gym build: push the belly of a muscle outward along its normals; the ends stay put."""
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00002)       # weld, or the surface cracks open
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data); bm.free(); obj.data.update()
    me = obj.data; n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co); co = co.reshape(n, 3)
    no = np.empty(n * 3); me.vertices.foreach_get("normal", no); no = no.reshape(n, 3)
    ne = len(me.edges); ed = np.empty(ne * 2, dtype=np.int64); me.edges.foreach_get("vertices", ed); ed = ed.reshape(ne, 2)
    for _ in range(16):                                              # smooth the directions: fibre relief makes raw normals noisy
        acc = no.copy(); np.add.at(acc, ed[:, 0], no[ed[:, 1]]); np.add.at(acc, ed[:, 1], no[ed[:, 0]])
        no = acc / np.maximum(np.linalg.norm(acc, axis=1, keepdims=True), 1e-9)
    centred = co - co.mean(axis=0)
    axis = np.linalg.svd(centred, full_matrices=False)[2][0]
    t = centred @ axis; t = (t - t.min()) / max(t.max() - t.min(), 1e-9)
    w = 0.2 + 0.8 * np.sin(np.pi * t) ** 0.8
    me.vertices.foreach_set("co", (co + no * (amount * w)[:, None]).ravel()); me.update()

def split_faces(obj, pred, new_name):
    """Move faces for which pred(centroid, normal) is true into a new object."""
    bm = bmesh.new(); bm.from_mesh(obj.data)
    sel = [f for f in bm.faces if pred(f.calc_center_median(), f.normal)]
    if not sel: bm.free(); return None
    bm.faces.index_update()
    idx = {f.index for f in sel}
    keep_bm = bm.copy()
    selset = set(sel)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in selset], context="FACES")
    keep_bm.faces.ensure_lookup_table()
    bmesh.ops.delete(keep_bm, geom=[f for f in keep_bm.faces if f.index in idx], context="FACES")
    me = bpy.data.meshes.new(new_name); bm.to_mesh(me); bm.free()
    keep_bm.to_mesh(obj.data); keep_bm.free()
    new = bpy.data.objects.new(new_name, me); bpy.context.scene.collection.objects.link(new)
    for k in ("side", "bp3d_kind"): new[k] = obj.get(k, "")
    return new

# --- abs: the rectus zone of the external-oblique sheet -------------------
for o in [m for m in muscles if regions.base_name(m.name.split(".")[0]) == "external oblique"]:
    def is_rectus(c, n):
        return P["abs"]["z_min"] <= c.z <= P["abs"]["z_max"] and abs(c.x) < lerp_table(P["abs"]["half_width"], c.z) and n.y < 0.2
    part = split_faces(o, is_rectus, "rectus zone " + o["side"])
    if part: part["region"] = "abs"; muscles.append(part)

for o in muscles:
    amount = P["build"].get(o.get("region") or "", 0)
    if amount: inflate(o, amount)

# --- lats: a sheet laid over the deeper back muscles ----------------------
dg = bpy.context.evaluated_depsgraph_get()
EXCLUDE = ("deltoid", "biceps brachii", "triceps", "brachi", "carpi", "digit", "pollicis", "pronator", "supinator", "palmaris", "anconeus", "trapezius", "indicis", "hand", "teres", "infraspinatus", "rhomboid")
verts, polys = [], []
for o in muscles:
    if o.get("bp3d_kind") != "muscle" or any(k in o.name for k in EXCLUDE): continue
    base = len(verts)
    verts += [o.matrix_world @ v.co for v in o.data.vertices]
    polys += [[base + i for i in p.vertices] for p in o.data.polygons]
bvh = BVHTree.FromPolygons(verts, polys)
skin_bvh = BVHTree.FromPolygons([v.co.copy() for v in skin.data.vertices], [list(p.vertices) for p in skin.data.polygons])
gaps = []
L = P["lats"]
axis_y = L["axis_y"]
def in_poly(pt, poly):
    x, y = pt; inside = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): inside = not inside
    return inside
for sign, sname in ((-1, "R"), (1, "L")):
    nt, nz = 150, 150
    t0, t1 = min(p[0] for p in L["outline"]), max(p[0] for p in L["outline"])
    z0, z1 = min(p[1] for p in L["outline"]), max(p[1] for p in L["outline"])
    grid = {}; pts = []
    for i in range(nt + 1):
        th = t0 + (t1 - t0) * i / nt
        for j in range(nz + 1):
            z = z0 + (z1 - z0) * j / nz
            if not in_poly((th, z), L["outline"]): continue
            a = math.radians(th)
            d = Vector((sign * math.sin(a), math.cos(a), 0))       # theta 0 = straight back (+Y)
            axis = Vector((0, axis_y, z))
            hit, normal, _, dist = bvh.ray_cast(axis + d * 0.6, -d)
            if hit is None: continue
            r_env = (hit - axis).length
            shit, _, _, sdist = skin_bvh.ray_cast(axis + d * 0.02, d)   # from inside: first skin = torso skin
            r = r_env + L["offset"]
            if shit is not None:
                gaps.append(sdist + 0.02 - r_env)
                r = min(max(r, sdist + 0.02 - L["skin_depth"]), r_env + L["max_lift"])
            grid[(i, j)] = len(pts); pts.append((axis, d, r))
    # smooth the radius field: fill dips first (a sheet spans hollows), then relax
    nb = {k: [grid[n] for n in ((k[0] + 1, k[1]), (k[0] - 1, k[1]), (k[0], k[1] + 1), (k[0], k[1] - 1)) if n in grid] for k in grid}
    rad = [p[2] for p in pts]
    for it in range(L["fill_passes"] + L["relax_passes"]):
        new = rad[:]
        for k, i0 in grid.items():
            if not nb[k]: continue
            mean = sum(rad[n] for n in nb[k]) / len(nb[k])
            new[i0] = max(rad[i0], mean) if it < L["fill_passes"] else 0.5 * rad[i0] + 0.5 * mean
        rad = new
    pts = [a + d * r for (a, d, _), r in zip(pts, rad)]
    faces = []
    for (i, j), a in grid.items():
        b, c, d2 = grid.get((i + 1, j)), grid.get((i + 1, j + 1)), grid.get((i, j + 1))
        if b is None or c is None or d2 is None: continue
        if max((pts[a] - pts[c]).length, (pts[b] - pts[d2]).length) > L["max_edge"]: continue
        faces.append((a, b, c, d2) if sign < 0 else (a, d2, c, b))
    me = bpy.data.meshes.new("lat " + sname); me.from_pydata(pts, [], faces); me.update()
    ob = bpy.data.objects.new("latissimus dorsi sheet " + sname, me); bpy.context.scene.collection.objects.link(ob)
    ob["region"] = "lats"; ob["side"] = sname; ob["bp3d_kind"] = "muscle"
    mod = ob.modifiers.new("smooth", "SMOOTH"); mod.iterations = L["smooth"]; mod.factor = 0.5
    mod2 = ob.modifiers.new("solid", "SOLIDIFY"); mod2.thickness = L["thickness"]; mod2.offset = -1
    muscles.append(ob)
    gaps.sort(); print("lat", sname, len(pts), len(faces), "skin gap p10/p50/p90", [round(gaps[int(len(gaps) * q)], 4) for q in (0.1, 0.5, 0.9)])

# --- skin parts: head, hands, feet (clean plane cuts) ----------------------
S = P["skin"]
def cut(bm, z, keep_above):
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=keep_above, clear_outer=not keep_above)
parts = bmesh.new()
for kind in ("head", "feet", "hands"):
    bm = bmesh.new(); bm.from_mesh(skin.data)
    if kind == "head": cut(bm, S["head_z"], True)
    elif kind == "feet": cut(bm, S["foot_z"], False)
    else:
        cut(bm, S["hand_z"], False)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().x) < S["hand_x"]], context="FACES")
    me = bpy.data.meshes.new("t"); bm.to_mesh(me); bm.free(); parts.from_mesh(me); bpy.data.meshes.remove(me)
me = bpy.data.meshes.new("skin parts"); parts.to_mesh(me); parts.free()
part = bpy.data.objects.new("skin parts", me); bpy.context.scene.collection.objects.link(part)
part["bp3d_kind"] = "skinpart"; part["region"] = ""
skin.hide_render = True
# muscles and bones end where the skin parts begin
for o in list(muscles):
    if o.modifiers: continue
    xs = [v.co.x for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
    if not zs: continue
    cx = abs(sum(xs) / len(xs))
    bm = bmesh.new(); bm.from_mesh(o.data)
    if max(zs) > S["head_z"]: cut(bm, S["head_z"], False)
    if min(zs) < S["foot_z"]: cut(bm, S["foot_z"], True)
    if cx > S["arm_x"] and min(zs) < S["hand_z"]: cut(bm, S["hand_z"], True)
    if len(bm.faces) == 0:
        bm.free(); bpy.data.objects.remove(o); muscles.remove(o); continue
    bm.to_mesh(o.data); bm.free()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "composed.blend"))
print("composed", len(muscles))
