type OverlayHandlers = {
  onSubmitName: (name: string) => void;
  onRespawn: () => void;
};

let signupScreen: HTMLElement | null = null;
let deathScreen: HTMLElement | null = null;
let signupForm: HTMLFormElement | null = null;
let signupInput: HTMLInputElement | null = null;
let signupError: HTMLElement | null = null;
let deathScore: HTMLElement | null = null;
let deathKiller: HTMLElement | null = null;
let respawnButton: HTMLButtonElement | null = null;
let deathActive = false;
let handlers: OverlayHandlers | null = null;

const isValidName = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 16;
};

const setVisible = (element: HTMLElement | null, visible: boolean): void => {
  if (!element) {
    return;
  }
  element.setAttribute("data-visible", visible ? "true" : "false");
};

export function initOverlays(nextHandlers: OverlayHandlers): void {
  handlers = nextHandlers;
  signupScreen = document.getElementById("signup-screen");
  deathScreen = document.getElementById("death-screen");
  signupForm = document.getElementById("signup-form") as HTMLFormElement | null;
  signupInput = document.getElementById("signup-name") as HTMLInputElement | null;
  signupError = document.getElementById("signup-error");
  deathScore = document.getElementById("death-score");
  deathKiller = document.getElementById("death-killer");
  respawnButton = document.getElementById("respawn-button") as HTMLButtonElement | null;

  if (!signupScreen || !deathScreen || !signupForm || !signupInput || !signupError) {
    throw new Error("Overlay elements not found.");
  }

  if (!deathScore || !deathKiller || !respawnButton) {
    throw new Error("Death overlay elements not found.");
  }

  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!handlers) {
      return;
    }
    const raw = signupInput?.value ?? "";
    if (!isValidName(raw)) {
      setSignupError("Enter a name (1-16 chars).", true);
      return;
    }
    setSignupError("", false);
    handlers.onSubmitName(raw.trim());
  });

  respawnButton.addEventListener("click", () => {
    handlers?.onRespawn();
  });

  window.addEventListener("keydown", (event) => {
    if (!deathActive) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      handlers?.onRespawn();
    }
  });
}

export function setSignupVisible(visible: boolean): void {
  setVisible(signupScreen, visible);
  if (visible) {
    signupInput?.focus();
  }
}

export function setSignupError(message: string, show = true): void {
  if (!signupError) {
    return;
  }
  signupError.textContent = show ? message : "";
}

export function setSignupName(value: string): void {
  if (signupInput) {
    signupInput.value = value;
  }
}

export function setDeathVisible(visible: boolean): void {
  deathActive = visible;
  setVisible(deathScreen, visible);
}

export function setDeathStats(stats: { score: number; killerId?: string }): void {
  if (deathScore) {
    deathScore.textContent = String(stats.score);
  }

  if (deathKiller) {
    if (stats.killerId) {
      deathKiller.style.display = "block";
      deathKiller.textContent = `Killed by ${stats.killerId}`;
    } else {
      deathKiller.style.display = "none";
      deathKiller.textContent = "";
    }
  }
}

export function setRespawnEnabled(enabled: boolean): void {
  if (respawnButton) {
    respawnButton.disabled = !enabled;
  }
}
