(() => {
  const scene = document.querySelector("#game-scene");
  const player = document.querySelector("#player");
  const camera = document.querySelector("#camera");
  const startScreen = document.querySelector("#loading");
  const startButton = document.querySelector("#start-button");
  const helpPanel = document.querySelector("#help-panel");
  const ending = document.querySelector("#ending");
  const toast = document.querySelector("#toast");
  const shellCount = document.querySelector("#shell-count");
  const healthValue = document.querySelector("#health-value");
  const questText = document.querySelector("#quest-text");
  const questStep = document.querySelector("#quest-step");
  const questProgress = document.querySelector("#quest-progress");
  const bottomHint = document.querySelector("#bottom-hint");

  const state = {
    started: false,
    shells: new Set(),
    health: 3,
    caveFound: false,
    altarActivated: false,
    returned: false,
    toastTimer: null,
    damageCooldown: false,
    keys: new Set()
  };

  const shellPositions = [
    { x: -6, z: 3 },
    { x: 7, z: -2 },
    { x: -1.8, z: -7.5 }
  ];

  function showToast(message, duration = 2600) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
  }

  function setTask(id, status) {
    const item = document.querySelector(id);
    item.classList.remove("active", "done");
    if (status) item.classList.add(status);
  }

  function updateQuest() {
    const count = state.shells.size;
    shellCount.textContent = `${count} / 3`;
    healthValue.textContent = `${"♥ ".repeat(state.health)}${"♡ ".repeat(3 - state.health)}`.trim();

    setTask("#task-shells", count === 3 ? "done" : "active");
    setTask("#task-cave", state.caveFound ? "done" : (count === 3 ? "active" : ""));
    setTask("#task-altar", state.altarActivated ? "done" : (state.caveFound ? "active" : ""));
    setTask("#task-return", state.returned ? "done" : (state.altarActivated ? "active" : ""));

    let completed = 0;
    if (count === 3) completed++;
    if (state.caveFound) completed++;
    if (state.altarActivated) completed++;
    if (state.returned) completed++;

    questStep.textContent = `${Math.min(completed + 1, 4)}/4`;
    questProgress.style.width = `${(completed / 4) * 100}%`;

    if (count < 3) {
      questText.textContent = `Vind de drie verloren schelpen. Nog ${3 - count} te gaan.`;
    } else if (!state.caveFound) {
      questText.textContent = "De schelpen gloeien. Zoek de verborgen grot aan de noordkant van het eiland.";
    } else if (!state.altarActivated) {
      questText.textContent = "Je hebt de grot gevonden. Activeer het oude altaar met de drie schelpen.";
    } else if (!state.returned) {
      questText.textContent = "Het altaar is geactiveerd. Keer terug naar je boot op het strand.";
    } else {
      questText.textContent = "Missie voltooid! Het eiland is gered.";
    }
  }

  function setMovementEnabled(enabled) {
    camera.setAttribute("look-controls", `enabled: ${enabled}; pointerLockEnabled: false`);
    player.setAttribute("movement-controls", `controls: gamepad, keyboard; speed: 0.15; enabled: ${enabled}`);
  }

  function startGame() {
    state.started = true;
    startScreen.classList.add("hidden");
    setMovementEnabled(true);
    showToast("Welkom op het eiland. Vind de drie magische schelpen!");
    updateQuest();
  }

  function resetGame() {
    state.shells.clear();
    state.health = 3;
    state.caveFound = false;
    state.altarActivated = false;
    state.returned = false;
    state.damageCooldown = false;
    player.setAttribute("position", "0 0 10");

    shellPositions.forEach((_, index) => {
      const shell = document.querySelector(`#shell-${index + 1}`);
      shell.setAttribute("visible", true);
      shell.classList.add("interactable");
    });

    document.querySelector("#altar").setAttribute("position", "0 0.2 -12.5");
    document.querySelector("#altar-trigger").setAttribute("visible", true);
    document.querySelector("#cave-trigger").setAttribute("visible", true);
    ending.classList.add("hidden");
    startScreen.classList.remove("hidden");
    updateQuest();
  }

  function collectShell(el) {
    const number = Number(el.dataset.shell);
    if (state.shells.has(number)) return;
    state.shells.add(number);
    el.classList.remove("interactable");
    el.setAttribute("visible", false);
    showToast(`Magische schelp gevonden! (${state.shells.size}/3)`);
    updateQuest();
    if (state.shells.size === 3) {
      showToast("Alle schelpen gevonden! Zoek de verborgen grot.", 3400);
    }
  }

  function findCave() {
    if (state.caveFound) {
      showToast("Je bent bij de verborgen grot.");
      return;
    }
    if (state.shells.size < 3) {
      showToast("De grot reageert niet. Verzamel eerst alle drie de magische schelpen.");
      return;
    }
    state.caveFound = true;
    document.querySelector("#cave-trigger").classList.remove("interactable");
    document.querySelector("#cave-trigger").setAttribute("visible", false);
    showToast("De grot opent zich. Ga naar het oude altaar!");
    updateQuest();
  }

  function activateAltar() {
    if (!state.caveFound) {
      showToast("Je moet eerst de verborgen grot ontdekken.");
      return;
    }
    if (state.shells.size < 3) {
      showToast("Het altaar heeft alle drie de schelpen nodig.");
      return;
    }
    if (state.altarActivated) {
      showToast("Het altaar straalt al. Breng de magie terug naar je boot.");
      return;
    }
    state.altarActivated = true;
    const crystal = document.querySelector("#altar a-dodecahedron");
    crystal.setAttribute("material", "color: #fff6a5; emissive: #ffe65a; emissiveIntensity: 2");
    document.querySelector("#altar a-light")?.setAttribute("light", "type: point; color: #ffe66b; intensity: 2; distance: 8");
    showToast("Het altaar is geactiveerd! Keer terug naar de boot.");
    updateQuest();
  }

  function returnToBoat() {
    if (!state.altarActivated) {
      showToast("Je boot is klaar, maar de eilandmagie is nog niet hersteld.");
      return;
    }
    state.returned = true;
    updateQuest();
    ending.classList.remove("hidden");
  }

  function interact(el) {
    if (!state.started || !el || !el.classList.contains("interactable")) return;
    const action = el.dataset.action;
    if (action === "shell") collectShell(el);
    if (action === "cave") findCave();
    if (action === "altar") activateAltar();
    if (action === "boat") returnToBoat();
    if (action === "sign") showToast("Volg het strand en zoek naar turquoise lichtjes.");
  }

  function buildEnvironment() {
    const palms = document.querySelector("#palm-trees");
    const rocks = document.querySelector("#rocks");
    const crystals = document.querySelector("#crystals");

    const palmSpots = [
      [-10, 3, -2], [-11, 4, 5], [10, 3, 3], [11, 5, -5],
      [-7, 5, -8], [5, 5, -10], [-13, 2, -5], [13, 2, 1],
      [-4, 6, 8], [8, 6, 8], [-9, 6, 9]
    ];

    palmSpots.forEach(([x, z, y], i) => {
      const tree = document.createElement("a-entity");
      tree.setAttribute("position", `${x} 0 ${y}`);
      tree.innerHTML = `
        <a-cylinder position="0 1.7 0" radius="0.22" height="3.4" rotation="0 0 ${i % 2 ? 7 : -5}" material="color: #795337"></a-cylinder>
        <a-sphere position="0 3.35 0" radius="0.42" scale="1 0.65 1" material="color: #3e9b5b"></a-sphere>
        ${[0,1,2,3,4,5].map(n => `<a-cone position="${Math.cos(n*Math.PI/3)*1.05} ${3.35 + (n%2)*0.12} ${Math.sin(n*Math.PI/3)*1.05}" rotation="0 ${n*60} ${n%2 ? -24 : 24}" radius-bottom="0.24" radius-top="0.03" height="2.25" material="color: ${n%2 ? "#2e8b50" : "#43a95e"}"></a-cone>`).join("")}
      `;
      palms.appendChild(tree);
    });

    const rockSpots = [
      [-8, 0, -1, 1.4], [-9, 0, 2, 1.0], [9, 0, 0, 1.5], [10, 0, -3, 1.0],
      [-4, 0, -10, 1.2], [4, 0, -9, 1.4], [-12, 0, -2, 1.8], [12, 0, 6, 1.3],
      [-5, 0, 8, 1.1], [5, 0, 9, 1.0], [2, 0, -5, 0.8], [-3, 0, 4, 0.7]
    ];
    rockSpots.forEach(([x, y, z, scale], i) => {
      const rock = document.createElement("a-dodecahedron");
      rock.setAttribute("position", `${x} ${y + scale * 0.35} ${z}`);
      rock.setAttribute("radius", String(scale));
      rock.setAttribute("scale", `${1.2} ${0.7 + (i%3)*0.2} ${0.9}`);
      rock.setAttribute("rotation", `${i*13} ${i*27} ${i*7}`);
      rock.setAttribute("material", `color: ${i%2 ? "#7b817c" : "#8b8d83"}; roughness: 1`);
      rocks.appendChild(rock);
    });

    const crystalSpots = [[-9, 0, -5], [9, 0, 5], [5, 0, -7], [-6, 0, 7]];
    crystalSpots.forEach(([x, y, z], i) => {
      const crystal = document.createElement("a-entity");
      crystal.classList.add("hazard");
      crystal.setAttribute("position", `${x} ${y} ${z}`);
      crystal.innerHTML = `
        <a-octahedron position="0 0.8 0" radius="0.55" material="color: #b27cff; emissive: #6b24bb; emissiveIntensity: 1.1; roughness: 0.3" animation="property: rotation; to: 0 360 0; dur: ${4000+i*700}; loop: true; easing: linear"></a-octahedron>
        <a-light type="point" position="0 0.8 0" color="#a76aff" intensity="0.8" distance="3"></a-light>
      `;
      crystals.appendChild(crystal);
    });
  }

  function distanceXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx*dx + dz*dz);
  }

  function updateHazards() {
    if (!state.started || state.health <= 0 || state.damageCooldown) return;
    const pos = player.object3D.position;
    const hazards = [...document.querySelectorAll(".hazard")];
    const hit = hazards.find(h => distanceXZ(pos, h.object3D.position) < 1.35);
    if (!hit) return;

    state.health = Math.max(0, state.health - 1);
    state.damageCooldown = true;
    updateQuest();
    showToast(state.health > 0 ? "Au! Het kristal kostte je energie. Blijf uit de buurt!" : "Je energie is op. Je wordt teruggezet naar het strand.");
    if (state.health <= 0) {
      setTimeout(() => {
        player.setAttribute("position", "0 0 10");
        state.health = 3;
        updateQuest();
        showToast("Je bent hersteld. Probeer de kristallen te ontwijken.");
      }, 1400);
    }
    setTimeout(() => { state.damageCooldown = false; }, 1800);
  }

  let lastHazardCheck = 0;
  scene.addEventListener("loaded", () => {
    buildEnvironment();

    scene.addEventListener("click", event => {
      const target = event.target;
      if (target && target.closest) {
        const interactable = target.closest(".interactable");
        if (interactable) interact(interactable);
      }
    });

    document.querySelectorAll(".interactable").forEach(el => {
      el.addEventListener("click", () => interact(el));
    });

    scene.addEventListener("enter-vr", () => {
      bottomHint.textContent = "VR: richt met je controller en druk op de trigger om te interacteren.";
    });
    scene.addEventListener("exit-vr", () => {
      bottomHint.textContent = "WASD / pijltjes: bewegen · Muis: kijken · Klik: interactie";
    });

    scene.addEventListener("tick", event => {
      if (event.time - lastHazardCheck > 350) {
        lastHazardCheck = event.time;
        updateHazards();
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(event.key)) event.preventDefault();
    state.keys.add(event.key.toLowerCase());
    if (event.key.toLowerCase() === "e") {
      const nearest = [...document.querySelectorAll(".interactable")]
        .filter(el => el.getAttribute("visible") !== false)
        .map(el => ({ el, distance: distanceXZ(player.object3D.position, el.object3D.position) }))
        .sort((a,b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance < 2.5) interact(nearest.el);
    }
  });
  document.addEventListener("keyup", event => state.keys.delete(event.key.toLowerCase()));

  startButton.addEventListener("click", startGame);
  document.querySelector("#help-button").addEventListener("click", () => helpPanel.classList.remove("hidden"));
  document.querySelector("#close-help").addEventListener("click", () => helpPanel.classList.add("hidden"));
  document.querySelector("#resume-button").addEventListener("click", () => helpPanel.classList.add("hidden"));
  document.querySelector("#restart-button").addEventListener("click", resetGame);

  // Een eenvoudige extra toetsenbesturing zodat pijltjes naast WASD werken.
  scene.addEventListener("loaded", () => {
    const speed = 0.075;
    scene.addEventListener("tick", () => {
      if (!state.started || scene.is("vr-mode")) return;
      const direction = new THREE.Vector3();
      camera.object3D.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      const pos = player.object3D.position;
      if (state.keys.has("w") || state.keys.has("arrowup")) pos.addScaledVector(direction, -speed);
      if (state.keys.has("s") || state.keys.has("arrowdown")) pos.addScaledVector(direction, speed);
      if (state.keys.has("a") || state.keys.has("arrowleft")) pos.addScaledVector(side, -speed);
      if (state.keys.has("d") || state.keys.has("arrowright")) pos.addScaledVector(side, speed);
      pos.x = THREE.MathUtils.clamp(pos.x, -15, 15);
      pos.z = THREE.MathUtils.clamp(pos.z, -15, 13);
      pos.y = 0;
    });
  });

  updateQuest();
})();
