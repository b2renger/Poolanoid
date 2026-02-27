import * as THREE from 'three';
import { CONFIG } from '../config.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

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

        // Second-finger rotation state
        this.rotateTouchId = null;
        this.rotateLastX = 0;
        this.viewAngle = 0;

        // Callbacks (set by game)
        /** @type {Function} Returns true if a shot is allowed. */
        this.canShoot = () => true;
        /** @type {Function} Returns the ball mesh position (THREE.Vector3). */
        this.getBallPosition = () => new THREE.Vector3();
        /** @type {Function|null} Called with (direction: THREE.Vector3, magnitude: number). */
        this.onShoot = null;
        /** @type {Function|null} Called with (powerRatio: number) 0–1 during aiming, null on release. */
        this.onAimPowerChange = null;
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

            // If already aiming, capture second finger for rotation
            if (this.isAiming && event.changedTouches) {
                const newTouch = event.changedTouches[0];
                if (newTouch.identifier !== this.activeTouchId && this.rotateTouchId === null) {
                    this.rotateTouchId = newTouch.identifier;
                    this.rotateLastX = newTouch.clientX;
                }
                return;
            }

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

                // Compute initial aimEnd from click position
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ballPos.y);
                const intersection = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, intersection);
                intersection.y = ballPos.y;
                this.aimEnd.copy(intersection);

                this.aimingLine.visible = this.aimLineScale > 0;
                this.controls.enabled = false;
                this._updateAim();
            }
        };

        const onInputMove = (event) => {
            if (event.type === 'touchmove') event.preventDefault();

            // Handle rotation finger
            if (this.rotateTouchId !== null && event.touches) {
                for (let i = 0; i < event.touches.length; i++) {
                    if (event.touches[i].identifier === this.rotateTouchId) {
                        const rx = event.touches[i].clientX;
                        this.viewAngle += (rx - this.rotateLastX) * CONFIG.CAMERA.ROTATE_SENSITIVITY;
                        this.rotateLastX = rx;
                        break;
                    }
                }
            }

            if (!this.isAiming) return;

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
            this._updateAim();
        };

        const onInputEnd = (event) => {
            // Check if rotation finger was released
            if (event.changedTouches) {
                for (let i = 0; i < event.changedTouches.length; i++) {
                    if (event.changedTouches[i].identifier === this.rotateTouchId) {
                        this.rotateTouchId = null;
                        break;
                    }
                }
            }

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
            this.rotateTouchId = null;
            this.aimingLine.visible = false;
            this.controls.enabled = true;
            if (this.onAimPowerChange) this.onAimPowerChange(null);
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

    /** Apply accumulated view rotation on top of the current camera orientation. */
    applyViewRotation() {
        if (this.viewAngle !== 0) {
            this.camera.rotateOnWorldAxis(Y_AXIS, this.viewAngle);
        }
    }

    /** Update power ratio callback and aim line geometry from current aimStart/aimEnd. */
    _updateAim() {
        // Notify power ratio for visual feedback (ball color)
        if (this.onAimPowerChange) {
            const dragDist = new THREE.Vector3().subVectors(this.aimStart, this.aimEnd).length();
            const magnitude = Math.min(dragDist * CONFIG.AIMING.IMPULSE_MULTIPLIER, CONFIG.AIMING.MAX_IMPULSE);
            this.onAimPowerChange(magnitude / CONFIG.AIMING.MAX_IMPULSE);
        }

        // Draw predictive line in shot direction (reversed from drag)
        if (this.aimLineScale > 0) {
            const dir = new THREE.Vector3().subVectors(this.aimStart, this.aimEnd);
            const dragDist = dir.length();
            if (dragDist > 0.01) {
                dir.normalize();
                const len = CONFIG.AIMING.AIM_LINE_MAX_LENGTH * this.aimLineScale;
                const lineEnd = new THREE.Vector3().copy(this.aimStart).addScaledVector(dir, len);

                // Only draw if the line meets minimum pixel length on screen
                const startNDC = this.aimStart.clone().project(this.camera);
                const endNDC = lineEnd.clone().project(this.camera);
                const dx = (endNDC.x - startNDC.x) * window.innerWidth * 0.5;
                const dy = (endNDC.y - startNDC.y) * window.innerHeight * 0.5;
                const pixelLen = Math.sqrt(dx * dx + dy * dy);

                if (pixelLen >= CONFIG.AIMING.AIM_LINE_MIN_LENGTH) {
                    this.aimingLine.geometry = new THREE.BufferGeometry().setFromPoints([this.aimStart, lineEnd]);
                }
            }
        }
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
