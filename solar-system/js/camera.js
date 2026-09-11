// Camera rig: OrbitControls plus smooth focus / follow transitions.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.02;
    this.controls.maxDistance = 3000;

    this.target = null;                 // Body being followed (null = Sun / overview)
    this.offset = new THREE.Vector3();  // camera position relative to target
    this.transition = null;
    this._goal = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  // Move to look at a body. `distance` = desired camera distance from it.
  focus(body, distance, duration = 1.4) {
    this.target = body;
    const startTarget = this.controls.target.clone();
    const startOffset = this.camera.position.clone().sub(startTarget);
    const dir = startOffset.clone().normalize();
    // Keep the current viewing direction but nudge slightly above the ecliptic for a nicer angle.
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.4, 1).normalize();
    dir.y = Math.max(dir.y, 0.18);
    dir.normalize();
    const endOffset = dir.multiplyScalar(distance);
    this.transition = { t: 0, duration, startTarget, startOffset, endOffset };
    this.controls.minDistance = body ? body.radius * 1.6 : 0.02;
  }

  update(dt) {
    const goal = this.target ? this.target.worldPos : this._goal.set(0, 0, 0);

    if (this.transition) {
      const tr = this.transition;
      tr.t = Math.min(1, tr.t + dt / tr.duration);
      const s = easeInOut(tr.t);
      this.controls.target.lerpVectors(tr.startTarget, goal, s);
      this.offset.lerpVectors(tr.startOffset, tr.endOffset, s);
      this.camera.position.copy(this.controls.target).add(this.offset);
      if (tr.t >= 1) this.transition = null;
    } else {
      this.controls.target.copy(goal);
      this.camera.position.copy(goal).add(this.offset);
    }

    this.controls.update();
    this.offset.copy(this.camera.position).sub(this.controls.target);
  }

  get distance() { return this.offset.length(); }
}
