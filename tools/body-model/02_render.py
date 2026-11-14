"""Render contact views of a .blend, coloured by region. Args: -- <blend> <outprefix> [skin]"""
import bpy, sys, os, math, colorsys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import regions
argv = sys.argv[sys.argv.index("--") + 1:]
blend, prefix = argv[0], argv[1]
show_skin = "skin" in argv[2:]
bpy.ops.wm.open_mainfile(filepath=blend)
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "OBJECT"
scene.display.shading.show_cavity = True
scene.view_settings.view_transform = "Standard"
scene.display.shading.show_object_outline = False
scene.render.film_transparent = False
if scene.world is None: scene.world = bpy.data.worlds.new("w")
scene.world.color = (0.93, 0.94, 0.95)
HEX = {"chest_upper": "e4572e", "chest_lower": "f2a541", "delts_front": "2e86ab", "delts_side": "7bd389", "delts_rear": "9d4edd",
       "traps": "c9184a", "upper_back": "3a7d44", "lower_back": "6a4c93", "neck": "ffb4a2", "obliques": "118ab2", "abs": "ef476f",
       "glutes": "b5179e", "abductors": "ffd166", "quads": "06d6a0", "adductors": "8d99ae", "hamstrings": "f77f00", "calves": "4361ee",
       "biceps": "d62828", "triceps": "2a9d8f", "forearms": "e9c46a", "lats": "0077b6"}
palette = {k: (*[(int(v[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)], 1.0) for k, v in HEX.items()}
only = next((a.split("=")[1] for a in argv if a.startswith("only=")), None)
for o in bpy.data.objects:
    if o.type != "MESH": continue
    kind = o.get("bp3d_kind", "muscle")
    slug = o.get("region") or regions.region_of(o.name.split(".")[0])
    if kind == "skin":
        o.hide_render = not show_skin; o.color = (0.8, 0.8, 0.82, 1)
    else:
        o.color = palette.get(slug, (0.55, 0.56, 0.58, 1.0)) if (only is None or slug == only) else (0.55, 0.56, 0.58, 1.0)
cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = 1.85
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam
scene.render.resolution_x = 700; scene.render.resolution_y = 1500
center = Vector((0, -0.1, 0.80))
views = {"front": -90, "back": 90, "side": 180, "q_front": -55, "q_back": 125}
for name, deg in views.items():
    a = math.radians(deg)
    cam.location = center + Vector((math.cos(a) * 4, math.sin(a) * 4, 0))
    cam.rotation_euler = (math.radians(90), 0, a + math.radians(90))
    scene.render.filepath = f"{prefix}-{name}.png"
    bpy.ops.render.render(write_still=True)
print("rendered", prefix)
