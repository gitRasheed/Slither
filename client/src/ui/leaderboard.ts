import type { SnakeView } from "../types/messages";

type LeaderboardRow = {
  row: HTMLTableRowElement;
  rank: HTMLTableCellElement;
  name: HTMLTableCellElement;
  length: HTMLTableCellElement;
};

const MAX_ROWS = 10;
const scoreFormatter = new Intl.NumberFormat("en-US");

let container: HTMLElement | null = null;
let body: HTMLTableSectionElement | null = null;
let count: HTMLElement | null = null;
const rows: LeaderboardRow[] = [];

export function initLeaderboard(): void {
  container = document.getElementById("leaderboard");
  body = document.getElementById("leaderboard-body") as HTMLTableSectionElement | null;
  count = document.getElementById("leaderboard-count");

  if (!container || !body) {
    throw new Error("Leaderboard elements not found.");
  }

  for (let i = 0; i < MAX_ROWS; i += 1) {
    const row = document.createElement("tr");
    const rank = document.createElement("td");
    const name = document.createElement("td");
    const length = document.createElement("td");
    rank.className = "lb-rank";
    name.className = "lb-name";
    length.className = "lb-length";
    row.append(rank, name, length);
    body.append(row);
    rows.push({ row, rank, name, length });
  }
}

export function setLeaderboardVisible(visible: boolean): void {
  if (!container) {
    return;
  }
  container.setAttribute("data-visible", visible ? "true" : "false");
}

export function updateLeaderboard(snakes: SnakeView[], localId?: string): void {
  if (!body) {
    return;
  }

  const sorted = [...snakes].sort((a, b) => {
    const delta = b.segments.length - a.segments.length;
    if (delta !== 0) {
      return delta;
    }
    const nameDelta = a.name.localeCompare(b.name);
    if (nameDelta !== 0) {
      return nameDelta;
    }
    return a.id.localeCompare(b.id);
  });

  const top = sorted.slice(0, MAX_ROWS);

  if (count) {
    count.textContent = `${snakes.length} players`;
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const snake = top[i];
    if (!snake) {
      row.row.style.display = "none";
      row.row.classList.remove("is-local");
      continue;
    }

    const displayName = snake.name.trim() || "anon";
    row.rank.textContent = `${i + 1}.`;
    row.name.textContent = displayName;
    row.length.textContent = scoreFormatter.format(snake.segments.length);
    row.row.style.display = "table-row";

    if (localId && snake.id === localId) {
      row.row.classList.add("is-local");
    } else {
      row.row.classList.remove("is-local");
    }
  }
}
