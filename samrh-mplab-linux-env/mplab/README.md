# MPLAB X Integration

This directory contains guidance and manifests for MPLAB X projects that are expected to live under version control.

The repository intentionally does not invent `nbproject/` metadata because that content depends on:

1. The installed MPLAB X version.
2. The selected device pack revision.
3. The debugger and board used locally.

Create the `.X` projects once with MPLAB X, review the generated metadata, and then place the project directories under `mplab/projects/`.