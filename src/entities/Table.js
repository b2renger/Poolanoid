import * as THREE from 'three';
import * as CANNON from 'cannon';
import { CONFIG } from '../config.js';

/**
 * Table entity: creates the pool table mesh, physics body, and boundary cushion walls.
 */
export class Table {
    constructor(scene, physics) {
        const { TABLE_WIDTH, TABLE_HEIGHT, TABLE_DEPTH } = CONFIG.DIMENSIONS;

        // Visual
        const geometry = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_HEIGHT, TABLE_DEPTH);
        const material = new THREE.MeshPhongMaterial({
            color: CONFIG.COLORS.TABLE,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Physics
        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_DEPTH / 2)),
            material: new CANNON.Material()
        });
        physics.addBody(body);
        this.physicsMaterial = body.material;
    }

    /** Creates the 4 invisible boundary cushion walls around the table. */
    createBoundaryWalls(physics, ballMaterial) {
        const { WALL_HEIGHT, BOUNDARY_WALL_THICKNESS, TABLE_WIDTH, TABLE_DEPTH } = CONFIG.DIMENSIONS;
        const hw = TABLE_WIDTH / 2;
        const hd = TABLE_DEPTH / 2;

        const wallMaterial = new CANNON.Material();
        const contactMaterial = new CANNON.ContactMaterial(
            wallMaterial, ballMaterial,
            {
                friction: CONFIG.PHYSICS.BALL_CUSHION_FRICTION,
                restitution: CONFIG.PHYSICS.BALL_CUSHION_RESTITUTION
            }
        );
        physics.addContactMaterial(contactMaterial);

        const walls = [
            { shape: new CANNON.Vec3(BOUNDARY_WALL_THICKNESS, WALL_HEIGHT, hd), pos: new CANNON.Vec3(-hw, WALL_HEIGHT / 2, 0) },
            { shape: new CANNON.Vec3(BOUNDARY_WALL_THICKNESS, WALL_HEIGHT, hd), pos: new CANNON.Vec3(hw, WALL_HEIGHT / 2, 0) },
            { shape: new CANNON.Vec3(hw, WALL_HEIGHT, BOUNDARY_WALL_THICKNESS), pos: new CANNON.Vec3(0, WALL_HEIGHT / 2, -hd) },
            { shape: new CANNON.Vec3(hw, WALL_HEIGHT, BOUNDARY_WALL_THICKNESS), pos: new CANNON.Vec3(0, WALL_HEIGHT / 2, hd) }
        ];

        for (const { shape, pos } of walls) {
            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(shape),
                position: pos,
                material: wallMaterial
            });
            physics.addBody(body);
        }
    }
}
