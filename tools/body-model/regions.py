"""Muscle name (BodyParts3D, side removed) -> app region slug. First match wins."""
import re
RULES = [
    ("chest", r"^(clavicular|sternocostal) part of pectoralis major$"),
    ("delts_front", r"^clavicular part of deltoid$"),
    ("delts_side", r"^acromial part of deltoid$"),
    ("delts_rear", r"^spinal part of deltoid$"),
    ("traps", r"^(descending|transverse) part of trapezius$"),
    ("upper_back", r"^ascending part of trapezius$|^rhomboid (major|minor)$|^infraspinatus muscle$|^teres (major|minor)$"),
    ("lower_back", r"^iliocostalis lumborum$|^longissimus thoracis$|^iliocostalis thoracis$|^spinalis thoracis$"),
    ("neck", r"^sternocleidomastoid$"),
    ("obliques", r"^external oblique$"),
    ("glutes", r"^gluteus maximus$"),
    ("abductors", r"^gluteus medius$|^tensor fasciae latae$"),
    ("quads", r"^rectus femoris$|^vastus (lateralis|medialis)$"),
    ("adductors", r"^adductor (longus|magnus|brevis)$|^gracilis$|^pectineus$"),
    ("hamstrings", r"^(long|short) head of biceps femoris$|^semitendinosus$|^semimembranosus$"),
    ("calves", r"^(lateral|medial) head of gastrocnemius$|^soleus$"),
    ("biceps", r"^(long|short) head of biceps brachii$|^brachialis$"),
    ("triceps", r"^(long|lateral|medial) head of triceps brachii$"),
    ("forearms", r"^brachioradialis$|^(flexor|extensor) carpi|^palmaris longus$|pronator teres$|^extensor digitorum$|^flexor digitorum superficialis$|^extensor digiti minimi$|^anconeus$"),
]
SLUGS = [r[0] for r in RULES] + ["lats", "abs"]
# Thin slips that only poke through a neighbour as specks: left out of the figure.
HIDE = r"^abdominal part of pectoralis major$"
def base_name(name):
    return re.sub(r"\b(right|left) ", "", name.lower()).strip()
def side(name):
    return "L" if re.search(r"\bleft\b", name.lower()) else "R" if re.search(r"\bright\b", name.lower()) else "C"
def region_of(name):
    b = base_name(name)
    for slug, pat in RULES:
        if re.search(pat, b):
            return slug
    return None
