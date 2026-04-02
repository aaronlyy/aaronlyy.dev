// Color helpers
// Convert HSL components to RGB array [r, g, b].
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Convert a hex string like #3c6dad to RGB array [r, g, b].
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Write the active accent color into CSS custom properties.
// This keeps all styling in CSS while JS only updates the variables.
function applyAccent(hex) {
  const [r, g, b] = hexToRgb(hex);
  document.documentElement.style.setProperty("--color-accent", hex);
  document.documentElement.style.setProperty("--color-accent-rgb", `${r}, ${g}, ${b}`);
}

// Generate a random accent color tuned for the active theme.
// Dark mode gets brighter accents, light mode gets darker accents.
function generateAccent(dark) {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 16) + 55;
  // dark bg: lighter colors (55–70%), light bg: darker (30–42%)
  const l = dark
    ? Math.floor(Math.random() * 16) + 55
    : Math.floor(Math.random() * 13) + 30;
  const [r, g, b] = hslToRgb(h, s, l);
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

// Shared outro for every intro animation:
// keep the final value visible briefly, then fade overlay away.
function finishIntro(overlay, onDone) {
  setTimeout(() => {
    overlay.classList.add("is-hidden");
    setTimeout(() => {
      overlay.remove();
      onDone();
    }, 260);
  }, 260);
}

// Intro 1: Scramble reveal
// Shows random hex-like characters that gradually lock into the target value.
function runScrambleIntro(target, text, overlay, onFinal, onDone) {
  const chars = "0123456789ABCDEF";
  let frame = 0;
  const totalFrames = 25;

  // Progressively reveal more correct characters over time.
  const timer = setInterval(() => {
    const reveal = Math.min(target.length, Math.floor((frame / totalFrames) * target.length));
    // Build one frame of text: '#' stays fixed, revealed chars are correct,
    // unrevealed chars are random hex digits.
    const value = target
      .split("")
      .map((ch, i) => {
        if (i === 0) return "#";
        if (i <= reveal) return ch;
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");

    text.textContent = value;
    text.style.color = value;
    frame += 1;

    if (frame > totalFrames) {
      // Animation end: show exact target and pass control back.
      clearInterval(timer);
      text.textContent = target;
      text.style.color = target;
      onFinal(target);
      finishIntro(overlay, onDone);
    }
  }, 35);
}

// Intro 2: Wave
// Characters bounce in with a staggered delay (wave-like motion).
function runWaveIntro(target, text, overlay, onFinal, onDone) {
  text.classList.add("intro-hex-bounce");
  text.innerHTML = "";

  // Render each character as a span so CSS can animate them independently.
  target.split("").forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "intro-char";
    span.style.animationDelay = `${i * 45}ms`;
    span.style.color = target;
    span.textContent = ch;
    text.appendChild(span);
  });

  // Wait until the last staggered character finishes, then finalize.
  const totalMs = (target.length - 1) * 45 + 420;
  setTimeout(() => {
    text.style.color = target;
    onFinal(target);
    finishIntro(overlay, onDone);
  }, totalMs);
}

// Intro 3: Bubble sort
// Start with a wrong order, then fix it using adjacent swaps only.
function runBubbleSortIntro(target, text, overlay, onFinal, onDone) {
  text.classList.add("intro-hex-shuffle");
  text.innerHTML = "";

  // We split into spans so each character can be moved to an exact x-position.
  const chars = target.split("");
  const spans = chars.map((ch, idx) => {
    const span = document.createElement("span");
    span.className = "intro-shell-char";
    span.textContent = ch;
    span.dataset.charIndex = String(idx);
    text.appendChild(span);
    return span;
  });

  // Measure widths to compute each slot's x-position.
  const widths = spans.map((span) => span.getBoundingClientRect().width);
  const targetPositions = [];
  let cursor = 0;
  for (const w of widths) {
    targetPositions.push(cursor);
    cursor += w;
  }
  text.style.width = `${cursor}px`;

  // Create a shuffled start order (except first '#', which stays at slot 0).
  const shuffled = Array.from({ length: chars.length - 1 }, (_, i) => i + 1);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Safety: ensure it is actually unsorted so animation is visible.
  if (shuffled.every((value, idx) => value === idx + 1) && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  // currentOrder maps slot -> character index currently occupying that slot.
  const currentOrder = [0, ...shuffled];

  // Helper to derive currently displayed hex value from current order.
  const currentValue = () => currentOrder.map((charIdx) => chars[charIdx]).join("");

  // Disable transitions for the first paint so initial wrong state appears instantly.
  spans.forEach((span) => {
    span.style.transition = "none";
  });

  // Draw characters according to currentOrder and update live text color.
  const renderOrder = () => {
    currentOrder.forEach((charIdx, slotIdx) => {
      const span = spans[charIdx];
      span.style.transitionDelay = "0ms";
      span.style.transform = `translate(${targetPositions[slotIdx]}px, 0px)`;
      span.style.opacity = "1";
    });
    text.style.color = currentValue();
  };

  renderOrder();

  // Force layout, then re-enable transitions so subsequent swaps animate.
  void text.offsetWidth;
  spans.forEach((span) => {
    span.style.transition = "";
  });

  // Build bubble-sort swap plan (adjacent swaps only) for slots 1..n.
  // We compute steps first, then play them back with timing.
  const sim = currentOrder.slice();
  const swaps = [];
  for (let end = sim.length - 1; end > 1; end -= 1) {
    for (let i = 1; i < end; i += 1) {
      if (sim[i] > sim[i + 1]) {
        swaps.push(i);
        [sim[i], sim[i + 1]] = [sim[i + 1], sim[i]];
      }
    }
  }

  // Execute swaps one by one over time.
  const stepMs = 240;
  swaps.forEach((leftIdx, step) => {
    setTimeout(() => {
      [currentOrder[leftIdx], currentOrder[leftIdx + 1]] = [currentOrder[leftIdx + 1], currentOrder[leftIdx]];
      renderOrder();
    }, step * stepMs);
  });

  // Finalize after last swap plus small settle delay.
  const totalMs = swaps.length * stepMs + 520;
  setTimeout(() => {
    text.style.color = target;
    onFinal(target);
    finishIntro(overlay, onDone);
  }, totalMs);
}

// Intro registry
// To add a new intro: create function(target, text, overlay, onFinal, onDone)
// and register it here.
const introAnimations = [runScrambleIntro, runWaveIntro, runBubbleSortIntro];
const introAnimationByName = {
  random: null,
  scramble: runScrambleIntro,
  wave: runWaveIntro,
  bubblesort: runBubbleSortIntro,
};

// Creates overlay + text container and runs either a forced or random intro.
function runHexIntro(targetHex, onFinal, onDone, animationName = "random") {
  const overlay = document.createElement("div");
  const text = document.createElement("span");
  const target = targetHex.toUpperCase();

  overlay.className = "intro-overlay";
  text.className = "intro-hex";
  overlay.appendChild(text);
  document.body.appendChild(overlay);

  const forced = introAnimationByName[animationName];
  const animation = forced || introAnimations[Math.floor(Math.random() * introAnimations.length)];
  animation(target, text, overlay, onFinal, onDone);
}

// Global startup state
// Theme preference is applied before interactions start.
const savedTheme = localStorage.getItem("theme");
let isDark = savedTheme === "dark";
if (isDark) document.documentElement.setAttribute("data-theme", "dark");

// Initial accent: use locked value if available, otherwise generate new one.
const locked = localStorage.getItem("accent-locked");
let hex = locked || generateAccent(isDark);
applyAccent(hex);

// Main app bootstrap
document.addEventListener("DOMContentLoaded", () => {
  // Prevent overlapping intros / actions.
  let introRunning = true;

  // the label in the top right hand corner displaying the current accent color
  const label = document.getElementById("accent-label");
  // box thats shows if the current color is locked
  const checkbox = document.getElementById("accent-lock");
  // toggle to switch between light and dark mode
  const themeBtn = document.getElementById("theme-toggle");

  // UI initialization
  label.textContent = "";
  checkbox.checked = !!locked;
  themeBtn.textContent = isDark ? "light" : "dark";

  // Run intro with a given animation name.
  const runIntro = (animationName = "random") => {
    runHexIntro(hex, (value) => {
      label.textContent = value;
    }, () => {
      introRunning = false;
    }, animationName);
  };

  // Regenerate accent and keep lock value in sync if lock is active.
  const regenerateAccent = () => {
    hex = generateAccent(isDark);
    applyAccent(hex);
    if (checkbox.checked) {
      localStorage.setItem("accent-locked", hex);
    }
  };

  // Toggle between light/dark mode and persist preference.
  const toggleTheme = () => {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      themeBtn.textContent = "light";
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
      themeBtn.textContent = "dark";
    }
  };

  // First intro when page is ready.
  runIntro("random");

  // Top-right button: toggle theme, maybe new accent, then play intro.
  themeBtn.addEventListener("click", () => {
    if (introRunning) return;

    introRunning = true;
    label.textContent = "";

    toggleTheme();
    // Unlocked accent should adapt to the new theme.
    if (!checkbox.checked) {
      regenerateAccent();
    }

    runIntro("random");
  });

  // Ignore keybinds while typing into form-like elements.
  const isTypingTarget = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  };

  // Keyboard shortcuts
  // r: scramble, b: bubblesort, w: wave, t: toggle theme, s: scramble alias
  document.addEventListener("keydown", (event) => {
    if (introRunning || isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();

    // r: scramble intro + random color
    if (key === "r" && !event.shiftKey) {
      event.preventDefault();
      introRunning = true;
      label.textContent = "";
      regenerateAccent();
      runIntro("scramble");
      return;
    }

    // shift+r or s: same as scramble
    if ((key === "r" && event.shiftKey) || key === "s") {
      event.preventDefault();
      introRunning = true;
      label.textContent = "";
      regenerateAccent();
      runIntro("scramble");
      return;
    }

    // b: force bubblesort intro
    if (key === "b") {
      event.preventDefault();
      introRunning = true;
      label.textContent = "";
      regenerateAccent();
      runIntro("bubblesort");
      return;
    }

    // w: force wave intro
    if (key === "w") {
      event.preventDefault();
      introRunning = true;
      label.textContent = "";
      regenerateAccent();
      runIntro("wave");
      return;
    }

    // t: toggle theme
    if (key === "t") {
      event.preventDefault();
      themeBtn.click();
    }
  });

  // Copy current hex value on label click.
  // Uses Clipboard API with a textarea fallback for broader compatibility.
  label.addEventListener("click", () => {
    if (introRunning) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex);
    } else {
      const ta = document.createElement("textarea");
      ta.value = hex;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    label.textContent = "copied";
    clearTimeout(label._resetTimer);
    label._resetTimer = setTimeout(() => { label.textContent = hex; }, 1000);
  });

  // Lock checkbox persists the current accent in localStorage.
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      localStorage.setItem("accent-locked", hex);
    } else {
      localStorage.removeItem("accent-locked");
    }
  });
});
