"""Import every BodyParts3D muscle element and the skin into one .blend (metres, Z up).
Run: Blender --background --factory-startup --python-exit-code 1 --python 01_import.py"""
import bpy, os, sys, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bp3d_index as b
OUT = os.path.join(os.environ.get("BODY_MODEL_WORKDIR", os.path.expanduser("~/Projects/gym-assets/body-model")), "out")
os.makedirs(OUT, exist_ok=True)
names, elements = b.load()
todo = {os.path.join(b.OBJ_DIR, f): ("skin" if f == "FJ2810.obj" else "muscle") for f in json.load(open(os.path.join(os.path.dirname(__file__), "muscle_files.json")))}
todo.update({os.path.join(b.OBJ_DIR, f): "bone" for f in json.load(open(os.path.join(os.path.dirname(__file__), "bone_files.json")))})
bpy.ops.wm.read_factory_settings(use_empty=True)
inventory = []
for i, (path, concept) in enumerate(sorted(todo.items())):
    head = open(path, encoding="utf-8", errors="replace").read(1500)
    m = re.search(r"English name : (.+)", head)
    name = (m.group(1).strip() if m else os.path.basename(path)).lower()
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path, forward_axis="Y", up_axis="Z", global_scale=0.001)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        o.name = name[:60]
        o["bp3d_file"] = os.path.basename(path)
        o["bp3d_kind"] = concept
        bb = [o.matrix_world @ __import__("mathutils").Vector(c) for c in o.bound_box]
        mn = [min(v[k] for v in bb) for k in range(3)]; mx = [max(v[k] for v in bb) for k in range(3)]
        inventory.append({"name": name, "file": os.path.basename(path), "kind": o["bp3d_kind"],
                          "tris": sum(len(p.vertices) - 2 for p in o.data.polygons),
                          "min": [round(v, 4) for v in mn], "max": [round(v, 4) for v in mx]})
    if i % 40 == 0: print("imported", i, len(todo), flush=True)
json.dump(inventory, open(os.path.join(OUT, "inventory.json"), "w"), indent=0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "bp3d_raw.blend"))
print("done", len(inventory), "objects, tris", sum(x["tris"] for x in inventory))
