# 20-vehicle car pack: source handoff

User-supplied archive for the Driving Practice building agent. This folder is a source handoff only; the assets have not been integrated into the simulator.

The original ZIP is preserved byte-for-byte as two parts because it exceeds GitHub's browser upload limit.

## Reconstruct and verify

Run from this folder:

```sh
cat low-poly-car-pack-20-vehicles.zip.part01 low-poly-car-pack-20-vehicles.zip.part02 > low-poly-car-pack-20-vehicles.zip
printf '%s  %s\n' '16b6eba2c4ddc95f9d67f429478157b7b57aa9f427b8436669b5e406371c265d' 'low-poly-car-pack-20-vehicles.zip' | sha256sum -c -
unzip low-poly-car-pack-20-vehicles.zip -d source
```

Original archive: 36,500,536 bytes.
SHA-256: `16b6eba2c4ddc95f9d67f429478157b7b57aa9f427b8436669b5e406371c265d`.

## Archive contents

- `LowPolyFictionalVehiclePack.blend` (37,718,774 bytes)
- `LowPolyFictionalVehiclePack.fbx` (11,496,988 bytes)
- `LowPolyFictionalVehiclePack.obj` (4,449,223 bytes)
- `LowPolyFictionalVehiclePack.stl` (2,600,684 bytes)

No GLB files or licence document are present in the supplied archive. The filename describes 20 vehicles; the individual models and their properties have not yet been audited.

## Building-agent next steps

1. Inspect the Blender/FBX scene, identify the individual vehicles, materials and separate wheels.
2. Check scale, orientation, pivots, triangle counts, textures and suitability for iPhone rendering.
3. Export individually named GLBs and create previews before replacing existing vehicles.
4. Preserve the supplied source files and record the asset provenance/licence from the user's original download source.
5. Keep integration work separate from this handoff. This branch does not deploy anything.
