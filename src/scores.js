/** In-memory high-score store for Flappy Bird. */

const MAX_SCORES = 10;

/** @type {{ name: string, score: number, at: string }[]} */
let scores = [];

function listScores() {
  return scores.slice(0, MAX_SCORES);
}

/**
 * @param {string} name
 * @param {number} score
 */
function addScore(name, score) {
  const cleanName = String(name || "Player")
    .trim()
    .slice(0, 16)
    .replace(/[<>&"']/g, "") || "Player";
  const n = Math.max(0, Math.floor(Number(score) || 0));
  scores.push({
    name: cleanName,
    score: n,
    at: new Date().toISOString(),
  });
  scores.sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
  scores = scores.slice(0, MAX_SCORES);
  return listScores();
}

module.exports = { listScores, addScore };
