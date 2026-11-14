"""Index of BodyParts3D: concept name -> element OBJ files (is_a tree)."""
import collections, os
SRC = os.path.join(os.environ.get("BODY_MODEL_WORKDIR", os.path.expanduser("~/Projects/gym-assets/body-model")), "source", "bodyparts3d")
OBJ_DIR = os.path.join(SRC, "isa_obj", "isa_BP3D_4.0_obj_99")

def load():
    names = {}
    for line in open(os.path.join(SRC, "isa_parts_list_e.txt"), encoding="utf-8", errors="replace").read().splitlines()[1:]:
        cid, _rep, name = line.split("\t")
        names[name.strip().lower()] = cid
    elements = collections.defaultdict(list)
    for line in open(os.path.join(SRC, "isa_element_parts.txt"), encoding="utf-8", errors="replace").read().splitlines()[1:]:
        cid, _name, fid = line.split("\t")
        elements[cid].append(fid.strip())
    return names, elements

def files_for(name, names, elements):
    cid = names[name.lower()]
    return [os.path.join(OBJ_DIR, f + ".obj") for f in elements[cid]]
