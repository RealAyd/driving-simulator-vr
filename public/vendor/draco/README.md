# Draco glTF decoder (Google Draco, Apache-2.0)

`draco_wasm_wrapper.js` and `draco_decoder.wasm` are the glTF-branch builds of
https://github.com/google/draco, copied unchanged from `examples/jsm/libs/draco/gltf/`
in the npm package `three@0.180.0` (only these two decoder files; no Three.js code).

Used by the photorealistic tiles experiment only (src/experiments/tiles): Google's
3D Tiles meshes use KHR_draco_mesh_compression, and Babylon's default decoder URL
(cdn.babylonjs.com) is not reachable from every network, so a copy is served with the build.
