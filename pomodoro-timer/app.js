(function () {
  "use strict";

  const DEFAULTS = { work: 25, short: 5, long: 15 };
  const LONG_BREAK_EVERY = 4;
  const STORAGE_KEY = "pomo-timer-state-v1";
  const CIRCUMFERENCE = 2 * Math.PI * 137;
  const SESSION_COPY = {
    work: { name: "Focus session", caption: "take it one task at a time" },
    short: { name: "Short break", caption: "a little pause goes a long way" },
    long: { name: "Long break", caption: "you’ve earned a proper rest" },
  };

  const elements = {
    timerCard: document.querySelector(".timer-card"),
    timerFace: document.getElementById("timer-face"),
    time: document.getElementById("timer-time"),
    caption: document.getElementById("timer-caption"),
    sessionName: document.getElementById("session-name"),
    cycleLabel: document.getElementById("cycle-label"),
    ring: document.getElementById("ring-progress"),
    start: document.getElementById("start-button"),
    startLabel: document.getElementById("start-label"),
    reset: document.getElementById("reset-button"),
    hint: document.getElementById("timer-hint"),
    count: document.getElementById("session-count"),
    navCount: document.getElementById("nav-session-count"),
    roundCount: document.getElementById("round-count"),
    roundDots: document.getElementById("round-dots"),
    sessionButtons: document.querySelectorAll(".session-tab"),
    currentDuration: document.getElementById("current-duration"),
    tabWorkLength: document.getElementById("tab-work-length"),
    tabShortLength: document.getElementById("tab-short-length"),
    tabLongLength: document.getElementById("tab-long-length"),
    soundToggle: document.getElementById("sound-toggle"),
    soundLabel: document.getElementById("sound-label"),
    closeOffer: document.getElementById("close-offer"),
    form: document.getElementById("settings-form"),
    workInput: document.getElementById("work-input"),
    shortInput: document.getElementById("short-input"),
    longInput: document.getElementById("long-input"),
    message: document.getElementById("form-message"),
    announcement: document.getElementById("announcement"),
  };

  function readSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return {};
      return saved;
    } catch (error) {
      console.warn("Could not read saved timer settings.", error);
      return {};
    }
  }

  function validDuration(value, max) {
    return Number.isInteger(value) && value >= 1 && value <= max;
  }

  const saved = readSavedState();
  const initialConfig = saved.config && typeof saved.config === "object" ? saved.config : {};
  const config = {
    work: validDuration(initialConfig.work, 180) ? initialConfig.work : DEFAULTS.work,
    short: validDuration(initialConfig.short, 60) ? initialConfig.short : DEFAULTS.short,
    long: validDuration(initialConfig.long, 90) ? initialConfig.long : DEFAULTS.long,
  };

  const state = {
    config,
    session: ["work", "short", "long"].includes(saved.session) ? saved.session : "work",
    completed: Number.isSafeInteger(saved.completed) && saved.completed >= 0 ? saved.completed : 0,
    remainingMs: 0,
    endTime: null,
    running: false,
    soundEnabled: true,
    intervalId: null,
    audioContext: null,
  };
  state.remainingMs = validDuration(saved.remainingMs, 180 * 60 * 1000)
    ? saved.remainingMs
    : state.config[state.session] * 60 * 1000;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config: state.config,
        session: state.session,
        completed: state.completed,
        remainingMs: state.running ? Math.max(0, state.endTime - Date.now()) : state.remainingMs,
      }));
    } catch (error) {
      console.warn("Could not save timer settings.", error);
    }
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function render() {
    const totalMs = state.config[state.session] * 60 * 1000;
    const remaining = state.running ? Math.max(0, state.endTime - Date.now()) : state.remainingMs;
    const time = formatTime(remaining);
    const progress = Math.min(1, Math.max(0, remaining / totalMs));
    const completedInRound = state.completed % LONG_BREAK_EVERY;
    const roundNumber = Math.floor(state.completed / LONG_BREAK_EVERY) + 1;

    elements.time.textContent = time;
    elements.time.setAttribute("aria-label", `${time.split(":")[0]} minutes ${time.split(":")[1]} seconds`);
    elements.sessionName.textContent = SESSION_COPY[state.session].name;
    elements.caption.textContent = SESSION_COPY[state.session].caption;
    elements.cycleLabel.textContent = `ROUND ${String(roundNumber).padStart(2, "0")}`;
    elements.timerFace.dataset.session = state.session;
    elements.sessionButtons.forEach((button) => {
      const selected = button.dataset.session === state.session;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    elements.currentDuration.textContent = String(state.config[state.session]);
    elements.ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    elements.timerCard.classList.toggle("is-running", state.running);
    elements.startLabel.textContent = state.running ? "Pause timer" : "Start focusing";
    elements.start.setAttribute("aria-label", state.running ? "Pause timer" : "Start or resume timer");
    elements.hint.textContent = state.running
      ? "You’re doing great. Stay with it."
      : remaining === 0
        ? "Ready when you are for the next session."
        : state.remainingMs < totalMs
          ? "Paused. Pick up right where you left off."
          : "Your next small step starts here.";
    elements.count.textContent = String(state.completed);
    elements.navCount.textContent = String(state.completed);
    elements.roundCount.textContent = `${completedInRound} / ${LONG_BREAK_EVERY}`;
    elements.roundDots.setAttribute("aria-label", `${completedInRound} of ${LONG_BREAK_EVERY} work sessions completed`);
    Array.from(elements.roundDots.children).forEach((dot, index) => {
      dot.classList.toggle("is-complete", index < completedInRound);
    });
    document.title = `${time} · ${SESSION_COPY[state.session].name} — pomo`;
  }

  function getAudioContext() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!state.audioContext) state.audioContext = new AudioContextConstructor();
    return state.audioContext;
  }

  function playNotification() {
    if (!state.soundEnabled) return;
    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === "suspended") context.resume();
      [0, 0.22, 0.44].forEach((offset, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = context.currentTime + offset;
        oscillator.type = "sine";
        oscillator.frequency.value = [660, 784, 988][index];
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.19);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.2);
      });
    } catch (error) {
      console.warn("Could not play the session-end sound.", error);
    }
  }

  function nextSession() {
    if (state.session === "work") {
      state.completed += 1;
      state.session = state.completed % LONG_BREAK_EVERY === 0 ? "long" : "short";
    } else {
      state.session = "work";
    }
    state.remainingMs = state.config[state.session] * 60 * 1000;
    state.running = false;
    state.endTime = null;
  }

  function finishSession() {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
    state.remainingMs = 0;
    const finishedSession = state.session;
    nextSession();
    elements.announcement.textContent = `${SESSION_COPY[finishedSession].name} complete. ${SESSION_COPY[state.session].name} is ready.`;
    playNotification();
    persist();
    render();
  }

  function tick() {
    if (!state.running) return;
    const remaining = state.endTime - Date.now();
    if (remaining <= 0) {
      finishSession();
      return;
    }
    state.remainingMs = remaining;
    render();
  }

  function startTimer() {
    if (state.running) {
      state.remainingMs = Math.max(0, state.endTime - Date.now());
      state.running = false;
      state.endTime = null;
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    } else {
      if (state.remainingMs <= 0) state.remainingMs = state.config[state.session] * 60 * 1000;
      state.running = true;
      state.endTime = Date.now() + state.remainingMs;
      state.intervalId = window.setInterval(tick, 250);
      if (state.soundEnabled) {
        const context = getAudioContext();
        if (context && context.state === "suspended") context.resume();
      }
    }
    persist();
    render();
  }

  function resetTimer() {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
    state.running = false;
    state.endTime = null;
    state.remainingMs = state.config[state.session] * 60 * 1000;
    persist();
    render();
  }

  function setFormValues() {
    elements.workInput.value = String(state.config.work);
    elements.shortInput.value = String(state.config.short);
    elements.longInput.value = String(state.config.long);
    elements.tabWorkLength.textContent = `${state.config.work} min`;
    elements.tabShortLength.textContent = `${state.config.short} min`;
    elements.tabLongLength.textContent = `${state.config.long} min`;
  }

  elements.start.addEventListener("click", startTimer);
  elements.reset.addEventListener("click", resetTimer);
  elements.sessionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
      state.session = button.dataset.session;
      state.running = false;
      state.endTime = null;
      state.remainingMs = state.config[state.session] * 60 * 1000;
      elements.announcement.textContent = `${SESSION_COPY[state.session].name} selected.`;
      persist();
      render();
    });
  });
  elements.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.soundToggle.setAttribute("aria-label", state.soundEnabled ? "Turn sound off" : "Turn sound on");
    elements.soundLabel.textContent = state.soundEnabled ? "Sound on" : "Sound off";
  });
  elements.closeOffer.addEventListener("click", () => {
    elements.closeOffer.parentElement.hidden = true;
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const newConfig = {
      work: Number(elements.workInput.value),
      short: Number(elements.shortInput.value),
      long: Number(elements.longInput.value),
    };
    if (!validDuration(newConfig.work, 180)
      || !validDuration(newConfig.short, 60)
      || !validDuration(newConfig.long, 90)) {
      elements.form.reportValidity();
      return;
    }

    const currentDuration = state.config[state.session] * 60 * 1000;
    state.config = newConfig;
    if (!state.running) {
      if (state.remainingMs === currentDuration) {
        state.remainingMs = state.config[state.session] * 60 * 1000;
      } else {
        state.remainingMs = Math.min(state.remainingMs, state.config[state.session] * 60 * 1000);
      }
    } else {
      const remaining = Math.max(0, state.endTime - Date.now());
      const elapsedFraction = 1 - remaining / currentDuration;
      const adjustedRemaining = state.config[state.session] * 60 * 1000 * (1 - elapsedFraction);
      state.remainingMs = Math.max(0, adjustedRemaining);
      state.endTime = Date.now() + state.remainingMs;
    }
    elements.message.textContent = "Intervals saved for your next session.";
    setFormValues();
    persist();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.running) tick();
  });

  setFormValues();
  render();
  if (state.running) {
    state.running = false;
    state.remainingMs = Math.max(0, state.remainingMs);
    persist();
  }
})();
