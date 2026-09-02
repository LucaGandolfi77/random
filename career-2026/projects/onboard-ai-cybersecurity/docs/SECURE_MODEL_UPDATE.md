# Secure model update

Apply only when: model in pin allowlist, version pinned, manifest valid, artefact checksum matches,
timestamp newer and within age window. Rollback allowed only toward listed trusted versions. Denials
return a reason code (never arbitrary code executed).
