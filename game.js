import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon';
import * as lil from 'lil-gui';

class PoolGame {
    constructor() {
        // Level and shot tracking
        this.level = 1;
        this.shotsRemaining = 6;
        this.baseWallCount = 10;
        this.isGameOver = false;

        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x362F4F, 8, 22);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x362F4F);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Set up camera position (top-down view from above, closer)
        this.camera.position.set(0, 6, 0);
        this.camera.lookAt(0, 0, 0);

        // Add controls: rotate around Y only (top-down orbit), no pan
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minPolarAngle = 0;   // lock top-down view
        this.controls.maxPolarAngle = 0;   // no tilt

        // Physics: bullet-style adaptive substeps (fast ball = smaller steps, no tunneling)
        this.PHYSICS_DT = 1 / 60;
        this.physicsAccumulator = 0;
        this.lastFrameTime = 0;
        this.BULLET_SAFE_DISTANCE = 0.04;  // max movement per step when ball is fast
        this.MIN_STEP_DT = 1 / 240;
        this.MAX_SUBSTEPS = 30;

        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
            allowSleep: true,
            broadphase: new CANNON.NaiveBroadphase()
        });
        this.world.defaultContactMaterial.friction = 0.15;
        this.world.defaultContactMaterial.restitution = 0.35;
        this.world.solver.iterations = 16;

        // Aiming state
        this.isAiming = false;
        this.aimStart = new THREE.Vector3();
        this.aimEnd = new THREE.Vector3();
        this.maxImpulse = 50;  // Fixed max power
        this.impulseMultiplier = 4;  // Increased shot power
        this.activeTouchId = null;  // Track the active touch for aiming

        // Store walls for cleanup; fadingWalls = hit walls whose mesh is still fading out
        this.walls = [];
        this.fadingWalls = [];
        this.impactEffects = [];  // holographic hit effects (mesh + light, updated in animate)

        // Create wall counter display
        this.createWallCounter();

        // Create pool table
        this.createPoolTable();
        
        // Add lighting
        this.setupLighting();

        // Create a single ball
        this.createBall();

        // Create aiming line
        this.createAimingLine();

        // Create random walls
        this.createRandomWalls();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Add mouse event listeners
        this.setupMouseEvents();
    }

    createWallCounter() {
        // Create game info container
        const infoContainer = document.createElement('div');
        infoContainer.style.position = 'absolute';
        infoContainer.style.top = 'calc(20px + env(safe-area-inset-top))';
        infoContainer.style.right = 'calc(20px + env(safe-area-inset-right))';
        infoContainer.style.color = '#E4FF30';

        // Responsive font sizing (min 18px, max 28px)
        const baseFontSize = Math.min(28, Math.max(18, window.innerWidth / 30));
        infoContainer.style.fontSize = `${baseFontSize}px`;
        infoContainer.style.fontFamily = 'Arial, sans-serif';
        infoContainer.style.textAlign = 'right';
        
        // Create wall counter
        const counterDiv = document.createElement('div');
        counterDiv.id = 'wall-counter';
        
        // Create shots counter
        const shotsDiv = document.createElement('div');
        shotsDiv.id = 'shots-counter';
        
        // Create level display
        const levelDiv = document.createElement('div');
        levelDiv.id = 'level-display';
        
        infoContainer.appendChild(levelDiv);
        infoContainer.appendChild(shotsDiv);
        infoContainer.appendChild(counterDiv);
        document.body.appendChild(infoContainer);
        
        this.updateGameInfo();
    }

    updateGameInfo() {
        const counter = document.getElementById('wall-counter');
        const shots = document.getElementById('shots-counter');
        const level = document.getElementById('level-display');
        
        if (counter && shots && level) {
            counter.textContent = `Walls: ${this.walls.length}`;
            shots.textContent = `Shots: ${this.shotsRemaining}`;
            level.textContent = `Level: ${this.level}`;
        }
    }

    createPoolTable() {
        // Table felt (mint)
        const tableGeometry = new THREE.BoxGeometry(10, 0.1, 5);
        const tableMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x008BFF,
            side: THREE.DoubleSide
        });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.receiveShadow = true;
        this.scene.add(table);

        // Physics body for table
        const tableBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(5, 0.05, 2.5)),
            material: new CANNON.Material()
        });
        this.world.addBody(tableBody);

        // Store table material for later use in createBall
        this.tableMaterial = tableBody.material;
    }

    createBall() {
        const ballRadius = 0.15;
        const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
        const ballMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFD700,
            shininess: 100,
            emissive: 0xFFD700,
            emissiveIntensity: 0.18
        });

        // Create Three.js mesh
        this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ballMesh.position.set(0, ballRadius, 0);
        this.ballMesh.castShadow = true;
        this.scene.add(this.ballMesh);

        // Create Cannon.js body – mass 1, sphere inertia is automatic
        this.ballBody = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Sphere(ballRadius),
            position: new CANNON.Vec3(0, ballRadius, 0),
            material: new CANNON.Material(),
            linearDamping: 0.38,
            angularDamping: 0.35
        });
        this.world.addBody(this.ballBody);

        // Ball–table: felt – low restitution (minimal bounce), enough friction for natural roll
        const ballTableContactMaterial = new CANNON.ContactMaterial(
            this.ballBody.material,
            this.tableMaterial,
            {
                friction: 0.42,
                restitution: 0.12
            }
        );
        this.world.addContactMaterial(ballTableContactMaterial);

        // Add invisible walls after ball is created
        this.createWalls();
    }

    createWalls() {
        const wallHeight = 0.5;
        const wallThickness = 0.1;

        // Boundary walls: cushions – very low friction (clean angle in = angle out), good bounce
        const wallMaterial = new CANNON.Material();
        const ballMaterial = this.ballBody.material;
        const wallContactMaterial = new CANNON.ContactMaterial(
            wallMaterial,
            ballMaterial,
            {
                friction: 0.02,
                restitution: 0.80
            }
        );
        this.world.addContactMaterial(wallContactMaterial);

        // Left wall
        const leftWall = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, 2.5)),
            position: new CANNON.Vec3(-5, wallHeight/2, 0),
            material: wallMaterial
        });
        this.world.addBody(leftWall);

        // Right wall
        const rightWall = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, 2.5)),
            position: new CANNON.Vec3(5, wallHeight/2, 0),
            material: wallMaterial
        });
        this.world.addBody(rightWall);

        // Top wall
        const topWall = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(5, wallHeight, wallThickness)),
            position: new CANNON.Vec3(0, wallHeight/2, -2.5),
            material: wallMaterial
        });
        this.world.addBody(topWall);

        // Bottom wall
        const bottomWall = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(5, wallHeight, wallThickness)),
            position: new CANNON.Vec3(0, wallHeight/2, 2.5),
            material: wallMaterial
        });
        this.world.addBody(bottomWall);
    }

    createAimingLine() {
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xE4FF30 });
        this.aimingLine = new THREE.Line(lineGeometry, lineMaterial);
        this.aimingLine.visible = false;
        this.scene.add(this.aimingLine);
    }

    setupLighting() {
        // Ambient – soft white for retro flashy look
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.58);
        this.scene.add(ambientLight);

        // Main key light from above (ceiling light over the table)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.1);
        mainLight.position.set(0, 8, 0);
        mainLight.target.position.set(0, 0, 0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 20;
        mainLight.shadow.camera.left = -6;
        mainLight.shadow.camera.right = 6;
        mainLight.shadow.camera.top = 4;
        mainLight.shadow.camera.bottom = -4;
        mainLight.shadow.bias = -0.0002;
        this.scene.add(mainLight.target);
        this.scene.add(mainLight);

        // Soft fill from the side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(4, 3, 2);
        fillLight.target.position.set(0, 0, 0);
        this.scene.add(fillLight.target);
        this.scene.add(fillLight);

        // Subtle rim for depth
        const rimLight = new THREE.DirectionalLight(0xa0c8ff, 0.2);
        rimLight.position.set(-3, 2, -2);
        rimLight.target.position.set(0, 0, 0);
        this.scene.add(rimLight.target);
        this.scene.add(rimLight);
    }

    setupMouseEvents() {
        const raycaster = new THREE.Raycaster();
        const inputPos = new THREE.Vector2();

        // Unified input position extractor for mouse and touch
        const getInputPosition = (event) => {
            if (event.touches && event.touches.length > 0) {
                // Touch event - use first touch or active touch
                let touch = event.touches[0];

                // If we have an active touch ID, find that specific touch
                if (this.activeTouchId !== null) {
                    for (let i = 0; i < event.touches.length; i++) {
                        if (event.touches[i].identifier === this.activeTouchId) {
                            touch = event.touches[i];
                            break;
                        }
                    }
                }

                return {
                    x: touch.clientX,
                    y: touch.clientY,
                    touchId: touch.identifier
                };
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                // Touch end event - use changedTouches
                const touch = event.changedTouches[0];
                return {
                    x: touch.clientX,
                    y: touch.clientY,
                    touchId: touch.identifier
                };
            } else {
                // Mouse event
                return {
                    x: event.clientX,
                    y: event.clientY,
                    touchId: null
                };
            }
        };

        const onInputStart = (event) => {
            if (this.isGameOver || this.shotsRemaining <= 0) return;

            // Prevent default touch behavior (scrolling, zooming)
            if (event.type === 'touchstart') {
                event.preventDefault();
            }

            const pos = getInputPosition(event);

            // For touch, only start aiming if no touch is active
            if (pos.touchId !== null && this.activeTouchId !== null) {
                return; // Already aiming with another touch
            }

            // Calculate input position in normalized device coordinates
            inputPos.x = (pos.x / window.innerWidth) * 2 - 1;
            inputPos.y = -(pos.y / window.innerHeight) * 2 + 1;

            // Update the picking ray with the camera and input position
            raycaster.setFromCamera(inputPos, this.camera);

            // Check proximity to ball (generous hit radius for touch)
            const closestPoint = new THREE.Vector3();
            raycaster.ray.closestPointToPoint(this.ballMesh.position, closestPoint);
            const distToBall = closestPoint.distanceTo(this.ballMesh.position);
            const hitRadius = pos.touchId !== null ? 0.8 : 0.15;

            if (distToBall < hitRadius) {
                this.isAiming = true;
                this.activeTouchId = pos.touchId; // Store touch ID (null for mouse)
                this.aimStart.copy(this.ballMesh.position);
                this.aimEnd.copy(this.aimStart);
                this.aimingLine.visible = true;
                this.controls.enabled = false;  // no rotation while aiming
            }
        };

        const onInputMove = (event) => {
            if (!this.isAiming) return;

            // Prevent default touch behavior
            if (event.type === 'touchmove') {
                event.preventDefault();
            }

            const pos = getInputPosition(event);

            // For touch, only process if it's the active touch
            if (this.activeTouchId !== null && pos.touchId !== this.activeTouchId) {
                return;
            }

            // Calculate input position in normalized device coordinates
            inputPos.x = (pos.x / window.innerWidth) * 2 - 1;
            inputPos.y = -(pos.y / window.innerHeight) * 2 + 1;

            // Create a plane at the ball's height
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.ballMesh.position.y);

            // Update the picking ray
            raycaster.setFromCamera(inputPos, this.camera);

            // Find intersection with the plane
            const intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, intersection);

            // Constrain movement to XZ plane
            intersection.y = this.ballMesh.position.y;

            // Update aim end position
            this.aimEnd.copy(intersection);

            // Update aiming line
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                this.aimStart,
                this.aimEnd
            ]);
            this.aimingLine.geometry = lineGeometry;
        };

        const onInputEnd = (event) => {
            if (!this.isAiming) return;

            // For touch events, check if it's the active touch ending
            if (event.type === 'touchend' || event.type === 'touchcancel') {
                const pos = getInputPosition(event);
                if (this.activeTouchId !== null && pos.touchId !== this.activeTouchId) {
                    return; // Different touch ended, not the aiming one
                }
            }

            // Decrease shots remaining
            this.shotsRemaining--;
            this.updateGameInfo();

            // Calculate impulse direction and magnitude
            const direction = new THREE.Vector3().subVectors(this.aimStart, this.aimEnd);
            const distance = direction.length();
            const impulse = Math.min(distance * this.impulseMultiplier, this.maxImpulse);

            direction.normalize();
            this.ballBody.wakeUp();
            this.ballBody.applyImpulse(
                new CANNON.Vec3(direction.x * impulse, 0, direction.z * impulse),
                new CANNON.Vec3(0, 0, 0)
            );

            // Reset aiming state
            this.isAiming = false;
            this.activeTouchId = null;
            this.aimingLine.visible = false;
            this.controls.enabled = true;  // allow rotation again

            // Check if game over
            if (this.shotsRemaining <= 0 && this.walls.length > 0) {
                this.gameOver();
            }
        };

        // Add mouse event listeners
        window.addEventListener('mousedown', onInputStart);
        window.addEventListener('mousemove', onInputMove);
        window.addEventListener('mouseup', onInputEnd);

        // Add touch event listeners with passive: false to allow preventDefault
        window.addEventListener('touchstart', onInputStart, { passive: false });
        window.addEventListener('touchmove', onInputMove, { passive: false });
        window.addEventListener('touchend', onInputEnd);
        window.addEventListener('touchcancel', onInputEnd);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate(time = 0) {
        requestAnimationFrame((t) => this.animate(t));

        const delta = this.lastFrameTime ? Math.min((time - this.lastFrameTime) / 1000, 0.1) : this.PHYSICS_DT;
        this.lastFrameTime = time;

        this.physicsAccumulator += delta;
        let steps = 0;
        const v = this.ballBody.velocity;
        while (steps < this.MAX_SUBSTEPS) {
            const speedXZ = Math.sqrt(v.x * v.x + v.z * v.z);
            const stepDt = Math.max(
                this.MIN_STEP_DT,
                Math.min(this.PHYSICS_DT, this.BULLET_SAFE_DISTANCE / Math.max(speedXZ, 0.1))
            );
            if (this.physicsAccumulator < stepDt) break;
            this.world.step(stepDt);
            this.physicsAccumulator -= stepDt;
            steps++;
            // Check after each substep so we don't miss contacts (ball may bounce away next step)
            this.checkWallCollisions();
        }

        // Keep ball on table (prevent sinking or floating)
        const ballRadius = this.ballBody.shapes[0].radius;
        const tableY = 0.05;
        const minY = tableY + ballRadius;
        if (this.ballBody.position.y < minY) {
            this.ballBody.position.y = minY;
            this.ballBody.velocity.y = Math.max(0, this.ballBody.velocity.y);
        }

        // Update ball position
        this.ballMesh.position.copy(this.ballBody.position);
        this.ballMesh.quaternion.copy(this.ballBody.quaternion);

        this.updateImpactEffects();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    checkWallCollisions() {
        const contacts = this.world.contacts;
        const wallsToRemove = new Map();  // wall -> impact position (ball position at hit)

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            if (contact.bi !== this.ballBody && contact.bj !== this.ballBody) continue;

            const wallBody = contact.bi === this.ballBody ? contact.bj : contact.bi;
            const wall = this.walls.find(w => w.body === wallBody);
            if (wall && !wall.removing) {
                wallsToRemove.set(wall, this.ballBody.position.clone());
            }
        }

        wallsToRemove.forEach((impactPos, wall) => this.removeWall(wall, impactPos));
    }

    createRandomWalls() {
        // Clear existing walls and any still-fading meshes from previous level
        this.walls.forEach(wall => {
            this.scene.remove(wall.mesh);
            this.world.removeBody(wall.body);
        });
        this.walls = [];
        this.fadingWalls.forEach(wall => {
            this.scene.remove(wall.mesh);
        });
        this.fadingWalls = [];
        this.impactEffects.forEach(eff => {
            this.scene.remove(eff.ring);
            eff.ring.geometry.dispose();
            eff.ring.material.dispose();
        });
        this.impactEffects = [];

        const wallCount = this.baseWallCount + (this.level - 1) * 5;
        const wallWidth = 3;
        const wallHeight = 0.5;
        const wallThickness = 0.12;  // Thicker so collision is reliable (avoids tunneling)

        // Create materials for different wall types
        const normalWallMaterial = new CANNON.Material();
        const blueWallMaterial = new CANNON.Material();
        const redWallMaterial = new CANNON.Material();
        const ballMaterial = this.ballBody.material;

        // Breakable walls: very low friction so rebound angle matches impact angle; restitution by type
        const normalWallContact = new CANNON.ContactMaterial(
            normalWallMaterial,
            ballMaterial,
            {
                friction: 0.02,
                restitution: 0.82
            }
        );

        const blueWallContact = new CANNON.ContactMaterial(
            blueWallMaterial,
            ballMaterial,
            {
                friction: 0.02,
                restitution: 0.42
            }
        );

        const redWallContact = new CANNON.ContactMaterial(
            redWallMaterial,
            ballMaterial,
            {
                friction: 0.02,
                restitution: 0.95
            }
        );

        this.world.addContactMaterial(normalWallContact);
        this.world.addContactMaterial(blueWallContact);
        this.world.addContactMaterial(redWallContact);

        for (let i = 0; i < wallCount; i++) {
            // Random position within table bounds
            const x = (Math.random() - 0.5) * 8; // Keep away from edges
            const z = (Math.random() - 0.5) * 3;
            const y = wallHeight / 2;

            // Random rotation around Y axis
            const rotationY = Math.random() * Math.PI * 2;

            // Determine wall type
            const wallType = Math.random();
            let wallColor, physicsMaterial;

            if (wallType < 0.1) {
                // Lime wall (10% chance, low bounce)
                wallColor = 0xE4FF30;
                physicsMaterial = blueWallMaterial;
            } else if (wallType < 0.2) {
                // Magenta wall (10% chance, high bounce)
                wallColor = 0xFF5FCF;
                physicsMaterial = redWallMaterial;
            } else {
                // Mint wall (80% chance)
                wallColor = 0x00FF9C;
                physicsMaterial = normalWallMaterial;
            }

            // Create visual wall
            const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness);
            const wallMesh = new THREE.Mesh(
                wallGeometry,
                new THREE.MeshPhongMaterial({ 
                    color: wallColor,
                    shininess: 100
                })
            );
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            wallMesh.position.set(x, y, z);
            wallMesh.rotation.y = rotationY;
            this.scene.add(wallMesh);

            // Create physics body
            const wallBody = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(wallWidth/2, wallHeight/2, wallThickness/2)),
                position: new CANNON.Vec3(x, y, z),
                material: physicsMaterial
            });
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
            this.world.addBody(wallBody);

            // Store wall for cleanup
            this.walls.push({ 
                mesh: wallMesh, 
                body: wallBody,
                type: wallColor === 0xE4FF30 ? 'blue' : wallColor === 0xFF5FCF ? 'red' : 'white'
            });
        }
    }

    removeWall(wall, impactPosition) {
        if (wall.removing) return;
        wall.removing = true;

        if (impactPosition) {
            this.spawnImpactEffect(impactPosition);
        }

        // Remove collider immediately so no ghost collisions for the next 200ms
        this.world.removeBody(wall.body);
        const index = this.walls.indexOf(wall);
        if (index > -1) {
            this.walls.splice(index, 1);
        }
        this.updateGameInfo();
        if (this.walls.length === 0) {
            this.nextLevel();
        }

        // Fade out mesh only (collider already gone)
        wall.mesh.material.transparent = true;
        const fadeOutDuration = 200;
        const startTime = Date.now();
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / fadeOutDuration;

            if (progress >= 1) {
                clearInterval(fadeInterval);
                this.scene.remove(wall.mesh);
                const fadeIdx = this.fadingWalls.indexOf(wall);
                if (fadeIdx > -1) {
                    this.fadingWalls.splice(fadeIdx, 1);
                }
                this.updateGameInfo();
            } else {
                const easedProgress = 1 - Math.pow(2, -10 * progress);
                wall.mesh.material.opacity = 1 - easedProgress;
            }
        }, 16);
        this.fadingWalls.push(wall);
    }

    spawnImpactEffect(position) {
        const duration = 120;
        const ringGeometry = new THREE.RingGeometry(0.05, 0.22, 12);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x008BFF,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        ring.scale.setScalar(0.01);
        this.scene.add(ring);

        this.impactEffects.push({
            ring,
            startTime: Date.now(),
            duration
        });
    }

    updateImpactEffects() {
        const now = Date.now();
        for (let i = this.impactEffects.length - 1; i >= 0; i--) {
            const eff = this.impactEffects[i];
            const elapsed = now - eff.startTime;
            const progress = Math.min(elapsed / eff.duration, 1);

            const scale = 0.01 + progress * 0.9;
            eff.ring.scale.setScalar(scale);
            eff.ring.material.opacity = 0.4 * (1 - progress);

            if (progress >= 1) {
                this.scene.remove(eff.ring);
                eff.ring.geometry.dispose();
                eff.ring.material.dispose();
                this.impactEffects.splice(i, 1);
            }
        }
    }

    nextLevel() {
        this.level++;
        this.shotsRemaining = 6 + (this.level - 1);  // 6 at level 1, +1 per level

        // Stop the ball immediately
        this.ballBody.velocity.set(0, 0, 0);
        this.ballBody.angularVelocity.set(0, 0, 0);
        
        // Create new walls after a short delay
        setTimeout(() => {
            this.createRandomWalls();
            this.updateGameInfo();
        }, 1000);
    }

    gameOver() {
        this.isGameOver = true;
        
        // Stop the ball
        this.ballBody.velocity.set(0, 0, 0);
        this.ballBody.angularVelocity.set(0, 0, 0);
        
        // Create game over container
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.color = '#E4FF30';
        gameOverDiv.style.textAlign = 'center';
        gameOverDiv.style.fontFamily = 'Arial, sans-serif';
        gameOverDiv.style.backgroundColor = 'rgba(54, 47, 79, 0.92)';
        gameOverDiv.style.padding = '20px';
        gameOverDiv.style.borderRadius = '10px';
        
        // Add game over text with responsive sizing
        const gameOverText = document.createElement('div');
        gameOverText.style.fontSize = 'clamp(32px, 8vw, 48px)';
        gameOverText.style.marginBottom = '20px';
        gameOverText.textContent = 'Game Over!';

        // Add level reached text with responsive sizing
        const levelText = document.createElement('div');
        levelText.style.fontSize = 'clamp(18px, 4vw, 24px)';
        levelText.style.marginBottom = '30px';
        levelText.textContent = `Level reached: ${this.level}`;

        // Create restart button with responsive sizing and minimum touch target
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Game';
        restartButton.style.fontSize = 'clamp(16px, 3vw, 20px)';
        restartButton.style.padding = 'max(10px, 2vh) max(20px, 4vw)';
        restartButton.style.minWidth = '44px';  // Minimum touch target
        restartButton.style.minHeight = '44px';
        restartButton.style.backgroundColor = '#008BFF';
        restartButton.style.color = '#362F4F';
        restartButton.style.border = 'none';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        restartButton.style.transition = 'background-color 0.3s';
        
        // Add hover effect
        restartButton.onmouseover = () => {
            restartButton.style.backgroundColor = '#FF5FCF';
        };
        restartButton.onmouseout = () => {
            restartButton.style.backgroundColor = '#008BFF';
        };
        
        // Add click handler
        restartButton.onclick = () => {
            document.body.removeChild(gameOverDiv);
            this.restart();
        };
        
        // Assemble the game over screen
        gameOverDiv.appendChild(gameOverText);
        gameOverDiv.appendChild(levelText);
        gameOverDiv.appendChild(restartButton);
        document.body.appendChild(gameOverDiv);
    }

    restart() {
        this.level = 1;
        this.shotsRemaining = 6;
        this.isGameOver = false;
        
        // Reset ball position
        this.ballBody.position.set(0, this.ballMesh.geometry.parameters.radius, 0);
        this.ballBody.velocity.set(0, 0, 0);
        this.ballBody.angularVelocity.set(0, 0, 0);
        
        // Create new walls
        this.createRandomWalls();
        this.updateGameInfo();
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new PoolGame();
}); 