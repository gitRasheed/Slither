export type GamePhase = "signup" | "playing" | "dead";

let phase: GamePhase = "signup";
let username: string | null = null;

export function getPhase(): GamePhase {
  return phase;
}

export function setPhase(next: GamePhase): void {
  phase = next;
}

export function setUsername(name: string): void {
  username = name;
}

export function getUsername(): string | null {
  return username;
}
