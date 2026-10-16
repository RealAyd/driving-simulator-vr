/**
 * The only module that imports Babylon. Deep imports keep the bundle to the
 * parts we use; WebXR is loaded on demand by src/xr.
 */
// Side effect: enables camera.getForwardRay() used for diagnostics and tests.
import '@babylonjs/core/Culling/ray';

export {Engine} from '@babylonjs/core/Engines/engine';
export {Scene} from '@babylonjs/core/scene';
export {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
export {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector';
export {Color3,Color4} from '@babylonjs/core/Maths/math.color';
export {TransformNode} from '@babylonjs/core/Meshes/transformNode';
export {Mesh} from '@babylonjs/core/Meshes/mesh';
export {CreateBox} from '@babylonjs/core/Meshes/Builders/boxBuilder';
export {CreateGround} from '@babylonjs/core/Meshes/Builders/groundBuilder';
export {CreateRibbon} from '@babylonjs/core/Meshes/Builders/ribbonBuilder';
export {CreateTorus} from '@babylonjs/core/Meshes/Builders/torusBuilder';
export {CreateCylinder} from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
export {CreatePlane} from '@babylonjs/core/Meshes/Builders/planeBuilder';
export {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
export {RenderTargetTexture} from '@babylonjs/core/Materials/Textures/renderTargetTexture';
export {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
export {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
export {WebXRState} from '@babylonjs/core/XR/webXRTypes';
export type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
export type {WebXRDefaultExperience} from '@babylonjs/core/XR/webXRDefaultExperience';
