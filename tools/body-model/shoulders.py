"""Expose the anterior deltoid heads as closed, bilateral selection surfaces."""
import bpy


def anterior_deltoids():
    # The source clavicular meshes are mostly internal and produce spikes after
    # inflation. A tapered envelope follows clavicle-to-humerus direction and
    # leaves the lateral deltoid visible. It is an app-level approximation.
    for side, sign in [("L", 1), ("R", -1)]:
        target = bpy.data.objects["muscle_delts_front_" + side]
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14)
        envelope = bpy.context.object
        for vertex in envelope.data.vertices:
            x, y, z = vertex.co
            t = (z + 1) / 2
            vertex.co = (sign * (.23 - .055 * t + .046 * (.35 + .65 * t) * x),
                         -.015 + .052 * (.65 + .35 * t) * y,
                         1.265 + .18 * t)
        target.data = envelope.data.copy()
        bpy.data.objects.remove(envelope, do_unlink=True)
        if sign < 0:
            for polygon in target.data.polygons:
                polygon.flip()


def reduce_neutral_geometry(max_triangles=40000):
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    count = lambda obj: sum(len(face.vertices) - 2 for face in obj.data.polygons)
    muscles = sum(count(obj) for obj in meshes if obj.name.startswith("muscle_"))
    neutral = [obj for obj in meshes if not obj.name.startswith("muscle_")]
    ratio = min(1, (max_triangles - muscles) / sum(count(obj) for obj in neutral))
    if ratio <= 0:
        raise RuntimeError("Muscle geometry alone exceeds the triangle budget")
    for obj in neutral:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Neutral geometry budget", "DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
