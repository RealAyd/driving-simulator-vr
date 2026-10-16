import { TilesRenderer, WGS84_ELLIPSOID } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin, GLTFExtensionsPlugin, TileCompressionPlugin } from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
window.GoogleTiles = { TilesRenderer, WGS84_ELLIPSOID, GoogleCloudAuthPlugin, GLTFExtensionsPlugin, TileCompressionPlugin, DRACOLoader };
