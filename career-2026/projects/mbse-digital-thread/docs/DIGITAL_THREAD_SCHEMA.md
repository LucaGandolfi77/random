# Digital thread schema

nodes[]: {id, kind, title, version, status, source, links[], data{}}. Allowed downstream kinds are
enforced per source kind (DOWNSTREAM table in mbse/thread.py). Export formats: JSON (model) and DOT
(requirement graph).
