import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Handles mouse and touch input for aiming and shooting the ball.
 */
export class InputManager {
    constructor(camera, renderer, controls, scene) {
        this.camera = camera;
        this.controls = controls;
        this.isAiming = false;
        this.aimStart = new THREE.Vector3();
        this.aimEnd = new THREE.Vector3();
        this.activeTouchId = null;

        // Callbacks (set by game)
        /** @type {Function} Returns true if a shot is allowed. */
        this.canShoot = () => true;
        /** @type {Function} Returns the ball mesh position (THREE.Vector3). */
        this.getBallPosition = () => new THREE.Vector3();
        /** @type {Function|null} Called with (direction: THREE.Vector3, magnitude: number). */
        this.onShoot = null;
        /** Aim line scale factor (0 = hidden, 1 = full length). Set by game per level. */
        this.aimLineScale = 1;

        // Aiming line
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({ color: CONFIG.COLORS.AIM_LINE });
        this.aimingLine = new THREE.Line(lineGeometry, lineMaterial);
        this.aimingLine.visible = false;
        scene.add(this.aimingLine);

        this.setupEvents(renderer);
    }

    setupEvents(renderer) {
        const raycaster = new THREE.Raycaster();
        const inputPos = new THREE.Vector2();

        const getInputPosition = (event) => {
            if (event.touches && event.touches.length > 0) {
                let touch = event.touches[0];
                if (this.activeTouchId !== null) {
                    for (let i = 0; i < event.touches.length; i++) {
                        if (event.touches[i].identifier === this.activeTouchId) {
                            touch = event.touches[i];
                            break;
                        }
                    }
                }
                return { x: touch.clientX, y: touch.clientY, touchId: touch.identifier };
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                const touch = event.changedTouches[0];
                return { x: touch.clientX, y: touch.clientY, touchId: touch.identifier };
            } else {
                return { x: event.clientX, y: event.clientY, touchId: null };
            }
        };

        const onInputStart = (event) => {
            if (!this.canShoot()) return;
            if (event.type === 'touchstart') event.preventDefault();

            const pos = getInputPosition(event);
            if (pos.touchId !== null && this.activeTouchId !== null) return;

            inputPos.x = (pos.x / window.innerWidth) * 2 - 1;
            inputPos.y = -(pos.y / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(inputPos, this.camera);

            const ballPos = this.getBallPosition();
            const closestPoint = new THREE.Vector3();
            raycaster.ray.closestPointToPoint(ballPos, closestPoint);
            const distToBall = closestPoint.distanceTo(ballPos);
            const hitRadius = pos.touchId !== null ? CONFIG.AIMING.TOUCH_HIT_RADIUS : CONFIG.AIMING.MOUSE_HIT_RADIUS;

            if (distToBall < hitRadius) {
                this.isAiming = true;
                this.activeTouchId = pos.touchId;
                this.aimStart.copy(ballPos);
                this.aimEnd.copy(this.aimStart);
                this.aimingLine.visible = this.aimLineScale > 0;
                this.controls.enabled = false;
            }
        };

        const onInputMove = (event) => {
            if (!this.isAiming) return;
            if (event.type === 'touchmove') event.preventDefault();

            const pos = getInputPosition(event);
            if (this.activeTouchId !== null && pos.touchId !== this.activeTouchId) return;

            inputPos.x = (pos.x / window.innerWidth) * 2 - 1;
            inputPos.y = -(pos.y / window.innerHeight) * 2 + 1;

            const ballPos = this.getBallPosition();
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPos.y);
            raycaster.setFromCamera(inputPos, this.camera);

            const intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, intersection);
            intersection.y = ballPos.y;

            this.aimStart.copy(ballPos);
            this.aimEnd.copy(intersection);

            // Draw predictive line in shot direction (reversed from drag)
            if (this.aimLineScale > 0) {
                const dir = new THREE.Vector3().subVectors(this.aimStart, this.aimEnd);
                const dragDist = dir.length();
                if (dragDist > 0.01) {
                    dir.normalize();
                    const maxLen = CONFIG.AIMING.AIM_LINE_MAX_LENGTH;
                    const len = Math.min(dragDist, maxLen) * this.aimLineScale;
                    const lineEnd = new THREE.Vector3().copy(this.aimStart).addScaledVector(dir, len);
                    this.aimingLine.geometry = new THREE.BufferGeometry().setFromPoints([this.aimStart, lineEnd]);
                }
            }
        };

        const onInputEnd = (event) => {
            if (!this.isAiming) return;

            if (event.type === 'touchend' || event.type === 'touchcancel') {
                const pos = getInputPosition(event);
                if (this.activeTouchId !== null && pos.touchId !== this.activeTouchId) return;
            }

            // Calculate impulse from current ball position
            this.aimStart.copy(this.getBallPosition());
            const direction = new THREE.Vector3().subVectors(this.aimStart, this.aimEnd);
            const distance = direction.length();
            const magnitude = Math.min(distance * CONFIG.AIMING.IMPULSE_MULTIPLIER, CONFIG.AIMING.MAX_IMPULSE);
            direction.normalize();

            if (this.onShoot) {
                this.onShoot(direction, magnitude);
            }

            // Reset aiming state
            this.isAiming = false;
            this.activeTouchId = null;
            this.aimingLine.visible = false;
            this.controls.enabled = true;
        };

        window.addEventListener('mousedown', onInputStart);
        window.addEventListener('mousemove', onInputMove);
        window.addEventListener('mouseup', onInputEnd);
        window.addEventListener('touchstart', onInputStart, { passive: false });
        window.addEventListener('touchmove', onInputMove, { passive: false });
        window.addEventListener('touchend', onInputEnd);
        window.addEventListener('touchcancel', onInputEnd);

        this._onInputStart = onInputStart;
        this._onInputMove = onInputMove;
        this._onInputEnd = onInputEnd;
    }

    dispose() {
        window.removeEventListener('mousedown', this._onInputStart);
        window.removeEventListener('mousemove', this._onInputMove);
        window.removeEventListener('mouseup', this._onInputEnd);
        window.removeEventListener('touchstart', this._onInputStart);
        window.removeEventListener('touchmove', this._onInputMove);
        window.removeEventListener('touchend', this._onInputEnd);
        window.removeEventListener('touchcancel', this._onInputEnd);
    }
}
