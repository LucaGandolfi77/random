class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.shipMesh = null;
    this.parkingMeshes = [];
    this.obstacleMeshes = [];
    this.movingObstacleMeshes = [];
    this.gravityMeshes = [];
    this.particleSystem = null;
    this.time = 0;
    this.initialized = false;
  }

  init() {
    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0a2e);
      this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.001);
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 5000);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;

      const ambient = new THREE.AmbientLight(0x404060, 0.5);
      this.scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(100, 200, 100);
      this.scene.add(dirLight);
      const pointLight = new THREE.PointLight(0x00d4ff, 1, 500);
      pointLight.position.set(0, 100, 0);
      this.scene.add(pointLight);

      const grid = new THREE.GridHelper(100, 100, 0x00d4ff, 0x0a1628);
      grid.position.y = -0.5;
      this.scene.add(grid);
      this.initialized = true;
    } catch(e) {
      console.error('3D init failed:', e);
    }
  }

  resize(w, h) {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render(level, ship, time) {
    if (!this.initialized) return;
    this.time += 0.016;
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    this.clearMeshes();

    // Parking spots
    for (const spot of level.parkingSpots) {
      const grad = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.3 + 0.1*Math.sin(time*4) });
      const geom = new THREE.BoxGeometry(spot.w, 1, spot.h);
      const mesh = new THREE.Mesh(geom, grad);
      mesh.position.set(spot.x, 0.5, spot.y);
      mesh.rotation.y = -spot.angle;
      this.scene.add(mesh);
      this.parkingMeshes.push(mesh);
    }

    // Static obstacles
    for (const obs of level.obstacles) {
      let geom;
      if (obs.type === 'circle') {
        geom = new THREE.SphereGeometry(obs.r, 16, 16);
      } else {
        geom = new THREE.BoxGeometry(obs.w, obs.h, 20);
      }
      const mat = new THREE.MeshPhongMaterial({ color: 0x444466, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(obs.x, 5, obs.y);
      this.scene.add(mesh);
      this.obstacleMeshes.push(mesh);
    }

    // Moving obstacles
    for (const mo of (level.movingObstacles || [])) {
      let geom;
      if (obs.type === 'circle') {
        geom = new THREE.SphereGeometry(obs.r, 16, 16);
      } else {
        geom = new THREE.BoxGeometry(mo.w, mo.h, 20);
      }
      const mat = new THREE.MeshPhongMaterial({ color: 0x884422, emissive: 0x442200, emissiveIntensity: 0.3 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(mo.x, 5, mo.y);
      this.scene.add(mesh);
      this.movingObstacleMeshes.push(mesh);
    }

    // Gravity wells
    for (const gw of (level.gravityWells || [])) {
      const geom = new THREE.SphereGeometry(gw.r, 16, 16);
      const mat = new THREE.MeshPhongMaterial({ color: 0xff00ff, transparent: true, opacity: 0.1, wireframe: true });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(gw.x, 5, gw.y);
      this.scene.add(mesh);
      this.gravityMeshes.push(mesh);
    }

    // Ship
    this.drawShip3D(ship, time);
    this.updateCamera(ship);
    this.renderer.render(this.scene, this.camera);
  }

  drawShip3D(ship, time) {
    if (this.shipMesh) {
      this.scene.remove(this.shipMesh);
      this.shipMesh.geometry.dispose();
      this.shipMesh.material.dispose();
    }

    const s = ship.size;
    const geom = new THREE.ConeGeometry(s * 0.5, s * 2, 4);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(ship.color) });
    this.shipMesh = new THREE.Mesh(geom, mat);
    this.shipMesh.position.set(ship.x, 3, ship.y);
    this.shipMesh.rotation.y = ship.angle;
    this.scene.add(this.shipMesh);

    if (ship.boostActive) {
      const eGeom = new THREE.CylinderGeometry(s*0.2, s*0.3, s*0.8, 8);
      const eMat = new THREE.MeshPhongMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 });
      const eMesh = new THREE.Mesh(eGeom, eMat);
      eMesh.position.set(ship.x - s*0.8*Math.cos(ship.angle), 3, ship.y - s*0.8*Math.sin(ship.angle));
      eMesh.rotation.z = -ship.angle;
      this.scene.add(eMesh);
    }
  }

  updateCamera(ship) {
    const dist = 30, height = 20;
    this.camera.position.set(
      ship.x + dist * Math.cos(ship.angle * 0.3),
      height,
      ship.y + dist * Math.sin(ship.angle * 0.3)
    );
    this.camera.lookAt(ship.x, 0, ship.y);
  }

  clearMeshes() {
    for (const m of [...this.obstacleMeshes, ...this.parkingMeshes, ...this.movingObstacleMeshes, ...this.gravityMeshes]) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.obstacleMeshes = [];
    this.parkingMeshes = [];
    this.movingObstacleMeshes = [];
    this.gravityMeshes = [];
  }
}
