import type {Seconds} from './units';

/**
 * Every simulation module supports a fixed-step update, reset and cleanup.
 * Modules never read wall-clock time; they receive the fixed step.
 */
export interface SimModule{
  readonly id:string;
  fixedUpdate?(dt:Seconds,time:Seconds):void;
  reset():void;
  dispose():void;
}

/** Folder ownership for parallel agents (see docs/CONTRACTS.md). */
export const MODULE_OWNERS={
  'src/contracts':'A Foundation and integration',
  'src/app':'A Foundation and integration',
  'src/engine':'A Foundation and integration',
  'src/world':'B Geography and assets',
  'content/locations':'B Geography and assets',
  'src/vehicle':'C Vehicle and input',
  'src/input':'C Vehicle and input',
  'src/cockpit':'D Cockpit and XR',
  'src/xr':'D Cockpit and XR',
  'src/actors':'E Actors and scenarios',
  'src/scenarios':'E Actors and scenarios',
  'content/scenarios':'E Actors and scenarios',
  'src/assessment':'F Assessment and interface',
  'src/ui':'F Assessment and interface',
  'src/storage':'F Assessment and interface',
  'tests/browser':'G QA'
} as const;
