"""Close-up renders. Args: -- <blend> <prefix> <cx> <cy> <cz> <scale>"""
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0]); prefix = a[1]; c = Vector((float(a[2]), float(a[3]), float(a[4]))); scale = float(a[5])
s = bpy.context.scene; s.render.engine = "BLENDER_WORKBENCH"; s.display.shading.light = "STUDIO"; s.display.shading.color_type = "OBJECT"
s.display.shading.show_cavity = True; s.view_settings.view_transform = "Standard"
if s.world is None: s.world = bpy.data.worlds.new("w")
s.world.color = (0.93, 0.94, 0.95)
COL = {"body_skin": (0.85, 0.72, 0.62, 1), "body_other": (0.3, 0.5, 0.9, 1), "body_bone": (0.95, 0.95, 0.8, 1)}
for o in bpy.data.objects:
    if o.type == "MESH": o.color = COL.get(o.name, (0.75, 0.3, 0.3, 1) if "forearms" in o.name else (0.55, 0.56, 0.58, 1))
cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = scale
cam = bpy.data.objects.new("c", cd); s.collection.objects.link(cam); s.camera = cam
s.render.resolution_x = 700; s.render.resolution_y = 700
for name, deg in {"front": -90, "outer": 180, "back": 90, "inner": 0}.items():
    r = math.radians(deg); cam.location = c + Vector((math.cos(r) * 3, math.sin(r) * 3, 0)); cam.rotation_euler = (math.radians(90), 0, r + math.radians(90))
    s.render.filepath = f"{prefix}-{name}.png"; bpy.ops.render.render(write_still=True)
