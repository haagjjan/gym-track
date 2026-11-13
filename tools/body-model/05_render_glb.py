"""Render the exported figure, coloured by region from object names. Args: -- <blend> <prefix> [only=slug]"""
import bpy, sys, os, math
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=argv[0]); prefix = argv[1]
only = next((a.split("=")[1] for a in argv if a.startswith("only=")), None)
HEX = {"chest": "e4572e", "delts_front": "2e86ab", "delts_side": "7bd389", "delts_rear": "9d4edd",
       "traps": "c9184a", "upper_back": "3a7d44", "lower_back": "6a4c93", "neck": "ffb4a2", "obliques": "118ab2", "abs": "ef476f",
       "glutes": "b5179e", "abductors": "ffd166", "quads": "06d6a0", "adductors": "8d99ae", "hamstrings": "f77f00", "calves": "4361ee",
       "biceps": "d62828", "triceps": "2a9d8f", "forearms": "e9c46a", "lats": "0077b6"}
s = bpy.context.scene; s.render.engine = "BLENDER_WORKBENCH"; s.display.shading.light = "STUDIO"; s.display.shading.color_type = "OBJECT"
s.display.shading.show_cavity = True; s.view_settings.view_transform = "Standard"
if s.world is None: s.world = bpy.data.worlds.new("w")
s.world.color = (0.93, 0.94, 0.95)
for o in bpy.data.objects:
    if o.type != "MESH": continue
    slug = o.name[7:-2] if o.name.startswith("muscle_") else None
    grey = (0.52, 0.53, 0.55, 1) if o.name == "body_other" else (0.7, 0.7, 0.72, 1)
    o.color = (*[(int(HEX[slug][i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)], 1) if slug in HEX and (only is None or only == slug) else grey
cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = 1.8
cam = bpy.data.objects.new("c", cd); s.collection.objects.link(cam); s.camera = cam
s.render.resolution_x = 640; s.render.resolution_y = 1400
for name, deg in {"front": -90, "back": 90, "side": 180, "q_front": -55, "q_back": 125}.items():
    a = math.radians(deg); cam.location = Vector((0, 0, 0.86)) + Vector((math.cos(a) * 4, math.sin(a) * 4, 0))
    cam.rotation_euler = (math.radians(90), 0, a + math.radians(90))
    s.render.filepath = f"{prefix}-{name}.png"; bpy.ops.render.render(write_still=True)
