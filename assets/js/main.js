const ui = {
    mobileMenuButton: document.getElementById('mobileMenuBtn'),
    mobileMenu: document.getElementById('mobileMenu'),
    heroCanvas: document.getElementById('hero-canvas'),
    studioCanvas: document.getElementById('studio-canvas'),
    speedSlider: document.getElementById('speedSlider'),
    speedValue: document.getElementById('speedVal'),
    polyCount: document.getElementById('polyCount')
};

let heroScene;
let heroCamera;
let heroRenderer;
let heroMeshGroup;
let heroCoreMesh;
let heroDragging = false;
let heroPreviousPosition = { x: 0, y: 0 };
let heroTargetRotation = { x: 0.2, y: 0.4 };

let studioScene;
let studioCamera;
let studioRenderer;
let studioMesh;
let studioSpeed = 1;
let currentGeometry = 'torusKnot';
let currentMaterial = 'physical';

const geometries = {
    torusKnot: () => new THREE.TorusKnotGeometry(1.2, 0.38, 120, 16),
    icosahedron: () => new THREE.IcosahedronGeometry(1.6, 1),
    octahedron: () => new THREE.OctahedronGeometry(1.8, 0)
};

const polygonCounts = {
    torusKnot: '12,480 Tris',
    icosahedron: '3,840 Tris',
    octahedron: '1,280 Tris'
};

function getStudioMaterial(type) {
    if (type === 'physical') {
        return new THREE.MeshPhysicalMaterial({
            color: 0x78a98e,
            emissive: 0x101a17,
            metalness: 0.4,
            roughness: 0.15,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            reflectivity: 0.9
        });
    }

    if (type === 'wireframe') {
        return new THREE.MeshStandardMaterial({
            color: 0x9ed8b5,
            emissive: 0x9ed8b5,
            emissiveIntensity: 0.25,
            wireframe: true
        });
    }

    return new THREE.MeshStandardMaterial({
        color: 0xe8eee9,
        metalness: 1,
        roughness: 0.05
    });
}

function addDragControls(canvas, onDrag) {
    let pointerId = null;
    let previousPosition = { x: 0, y: 0 };

    canvas.addEventListener('pointerdown', event => {
        pointerId = event.pointerId;
        previousPosition = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(pointerId);
    });

    canvas.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId) return;
        const deltaX = event.clientX - previousPosition.x;
        const deltaY = event.clientY - previousPosition.y;
        onDrag(deltaX, deltaY);
        previousPosition = { x: event.clientX, y: event.clientY };
    });

    const releasePointer = event => {
        if (event.pointerId === pointerId) pointerId = null;
    };
    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);
    canvas.addEventListener('lostpointercapture', releasePointer);
}

function resizeRenderer(canvas, renderer, camera) {
    const container = canvas.parentElement;
    const width = canvas.clientWidth || container.clientWidth;
    const height = canvas.clientHeight || container.clientHeight;
    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function initHeroScene() {
    const canvas = ui.heroCanvas;
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    heroCamera.position.z = 5.2;
    heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    resizeRenderer(canvas, heroRenderer, heroCamera);

    heroScene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const mintLight = new THREE.PointLight(0x9ed8b5, 3, 50);
    mintLight.position.set(5, 5, 5);
    heroScene.add(mintLight);

    const coralLight = new THREE.PointLight(0xd98f75, 2.5, 50);
    coralLight.position.set(-5, -5, 3);
    heroScene.add(coralLight);

    heroMeshGroup = new THREE.Group();

    const mintRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.04, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0x78a98e, metalness: 0.9, roughness: 0.1 })
    );
    heroMeshGroup.add(mintRing);

    const coralRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.03, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0xd98f75, metalness: 0.9, roughness: 0.2 })
    );
    coralRing.rotation.x = Math.PI / 2.5;
    heroMeshGroup.add(coralRing);

    heroCoreMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 0),
        new THREE.MeshPhysicalMaterial({
            color: 0x9ed8b5,
            metalness: 0.3,
            roughness: 0.1,
            transmission: 0.6,
            thickness: 1.2
        })
    );
    heroMeshGroup.add(heroCoreMesh);

    const halo = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.05, 1),
        new THREE.MeshBasicMaterial({ color: 0xe8eee9, wireframe: true, transparent: true, opacity: 0.2 })
    );
    heroMeshGroup.add(halo);

    const particlePositions = new Float32Array(200 * 3);
    for (let index = 0; index < particlePositions.length; index += 1) {
        particlePositions[index] = (Math.random() - 0.5) * 8;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    heroMeshGroup.add(new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({ color: 0x9ed8b5, size: 0.03, transparent: true, opacity: 0.5 })
    ));

    heroScene.add(heroMeshGroup);
    addDragControls(canvas, (deltaX, deltaY) => {
        heroDragging = true;
        heroTargetRotation.y += deltaX * 0.008;
        heroTargetRotation.x += deltaY * 0.008;
    });
    canvas.addEventListener('pointerup', () => { heroDragging = false; });
    canvas.addEventListener('pointercancel', () => { heroDragging = false; });

    document.getElementById('resetCameraBtn').addEventListener('click', () => {
        heroTargetRotation = { x: 0.2, y: 0.4 };
    });

    animateHero();
}

function animateHero() {
    requestAnimationFrame(animateHero);
    if (!heroMeshGroup) return;

    heroMeshGroup.rotation.y += (heroTargetRotation.y - heroMeshGroup.rotation.y) * 0.08;
    heroMeshGroup.rotation.x += (heroTargetRotation.x - heroMeshGroup.rotation.x) * 0.08;

    if (!heroDragging) {
        heroTargetRotation.y += 0.004;
        heroCoreMesh.rotation.x += 0.01;
        heroCoreMesh.rotation.z += 0.008;
    }

    heroRenderer.render(heroScene, heroCamera);
}

function initStudioScene() {
    const canvas = ui.studioCanvas;
    const container = canvas.parentElement;
    const width = container.clientWidth;
    studioScene = new THREE.Scene();
    studioCamera = new THREE.PerspectiveCamera(45, width / container.clientHeight, 0.1, 100);
    studioCamera.position.set(0, 0, 5.5);
    studioRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    resizeRenderer(canvas, studioRenderer, studioCamera);

    studioScene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const mintLight = new THREE.DirectionalLight(0x9ed8b5, 3);
    mintLight.position.set(4, 5, 3);
    studioScene.add(mintLight);

    const coralLight = new THREE.DirectionalLight(0xd98f75, 2);
    coralLight.position.set(-4, -4, -2);
    studioScene.add(coralLight);

    studioMesh = new THREE.Mesh(geometries[currentGeometry](), getStudioMaterial(currentMaterial));
    studioScene.add(studioMesh);
    addDragControls(canvas, (deltaX, deltaY) => {
        studioMesh.rotation.y += deltaX * 0.01;
        studioMesh.rotation.x += deltaY * 0.01;
    });

    animateStudio();
}

function setStudioGeometry(type, button) {
    if (!geometries[type] || !studioMesh) return;

    currentGeometry = type;
    studioMesh.geometry.dispose();
    studioMesh.geometry = geometries[type]();
    ui.polyCount.textContent = polygonCounts[type];

    document.querySelectorAll('.geo-btn').forEach(item => {
        item.classList.remove('border-hyper-cyan', 'text-hyper-cyan');
        item.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('border-hyper-cyan', 'text-hyper-cyan');
    button.setAttribute('aria-pressed', 'true');
}

function setStudioMaterial(type, button) {
    if (!studioMesh) return;

    currentMaterial = type;
    studioMesh.material.dispose();
    studioMesh.material = getStudioMaterial(type);

    document.querySelectorAll('.mat-btn').forEach(item => {
        item.classList.remove('border-hyper-cyan');
        item.setAttribute('aria-pressed', 'false');
        item.querySelector('i').classList.add('hidden');
    });
    button.classList.add('border-hyper-cyan');
    button.setAttribute('aria-pressed', 'true');
    button.querySelector('i').classList.remove('hidden');
}

function animateStudio() {
    requestAnimationFrame(animateStudio);
    if (!studioMesh) return;

    studioMesh.rotation.y += 0.008 * studioSpeed;
    studioMesh.rotation.x += 0.004 * studioSpeed;
    studioRenderer.render(studioScene, studioCamera);
}

function initializePage() {
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    ui.mobileMenuButton.addEventListener('click', () => {
        const isExpanded = ui.mobileMenuButton.getAttribute('aria-expanded') === 'true';
        ui.mobileMenuButton.setAttribute('aria-expanded', String(!isExpanded));
        ui.mobileMenu.classList.toggle('hidden');
    });

    ui.mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            ui.mobileMenu.classList.add('hidden');
            ui.mobileMenuButton.setAttribute('aria-expanded', 'false');
        });
    });

    ui.speedSlider.addEventListener('input', event => {
        studioSpeed = Number.parseFloat(event.target.value);
        ui.speedValue.textContent = `${studioSpeed.toFixed(1)}x`;
    });

    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', event => {
            const bounds = card.getBoundingClientRect();
            const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
            const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
            card.style.transform = `perspective(1000px) rotateX(${-vertical * 8}deg) rotateY(${horizontal * 8}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    initHeroScene();
    initStudioScene();

    const resizeCanvases = () => {
        if (heroRenderer && heroCamera) resizeRenderer(ui.heroCanvas, heroRenderer, heroCamera);
        if (studioRenderer && studioCamera) resizeRenderer(ui.studioCanvas, studioRenderer, studioCamera);
    };
    window.addEventListener('resize', resizeCanvases);
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(resizeCanvases);
        observer.observe(ui.heroCanvas.parentElement);
        observer.observe(ui.studioCanvas.parentElement);
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
