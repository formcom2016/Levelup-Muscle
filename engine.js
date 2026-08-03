/**
 * Level Up — Moteur de règles (tonnage, 1RM, XP, niveaux, records).
 *
 * Ce fichier est volontairement écrit dans un sous-ensemble de JS compatible
 * à la fois avec :
 *  - le navigateur (chargé en <script> classique, expose `window.Engine`)
 *  - Google Apps Script (copier ce fichier tel quel dans Engine.gs : les
 *    fonctions deviennent globales et sont utilisables depuis Code.gs)
 *  - Node.js (pour les tests, via module.exports)
 *
 * Toutes les règles de jeu (XP, niveaux, records) sont centralisées ici.
 * Modifier le comportement du jeu = modifier ce seul fichier.
 */

// ---------------------------------------------------------------------------
// Constantes du système XP (modifiables librement)
// ---------------------------------------------------------------------------
var XP_RULES = {
  SET_LOGGED: 10, // par série valide enregistrée (charge>0 et reps>0)
  EXERCISE_COMPLETED: 30, // par exercice terminé (>=1 série)
  EXERCISE_VOLUME_UP_BONUS: 20, // volume de l'exercice > moyenne des 3 dernières fois
  SESSION_COMPLETED: 100, // par séance terminée
  RECORD_BONUS: 50, // par type de record battu
  RECORD_BONUS_CAP_PER_SESSION: 150, // plafond de bonus records par séance
  STREAK_CONTINUED: 20, // séance dans les 3 jours suivant la précédente
  STREAK_MILESTONES: { 7: 100, 14: 200, 30: 500 }, // paliers de jours consécutifs
  STREAK_BREAK_DAYS: 3, // au-delà de X jours sans séance, le streak est rompu
};

// Caractéristiques dérivées des séries (pondérations, modifiables)
var STAT_RULES = {
  VOLUME_DIVISOR: 50, // volume/50 => xp "Volume"
  FORCE_MAX_REPS_FOR_HEAVY: 6, // reps <= 6 => xp "Force"
  FORCE_WEIGHT_DIVISOR: 5, // charge/5 => xp "Force"
  ENDURANCE_MIN_REPS: 12, // reps >= 12 => xp "Endurance"
  ENDURANCE_REPS_MULTIPLIER: 0.5,
  TECHNIQUE_XP_PER_RPE_LOGGED: 5, // xp "Technique" si RPE renseigné
  SKILL_VOLUME_DIVISOR: 50, // volume/50 => xp de compétence (exercice / groupe musculaire)
};

// Courbe de niveau : XP cumulé nécessaire pour atteindre le niveau N+1 depuis N
function xpToReachNextLevel(currentLevel) {
  return 100 + (currentLevel - 1) * 50;
}

/**
 * Calcule (level, xpIntoLevel, xpForNextLevel) à partir d'un total d'XP cumulé.
 */
function levelFromTotalXp(totalXp) {
  var level = 1;
  var xpRemaining = totalXp;
  var needed = xpToReachNextLevel(level);
  while (xpRemaining >= needed) {
    xpRemaining -= needed;
    level += 1;
    needed = xpToReachNextLevel(level);
  }
  return { level: level, xpIntoLevel: xpRemaining, xpForNextLevel: needed, totalXp: totalXp };
}

// ---------------------------------------------------------------------------
// Calculs de performance
// ---------------------------------------------------------------------------

function setVolume(weightKg, reps) {
  return round1(weightKg * reps);
}

function sumVolume(sets) {
  var total = 0;
  for (var i = 0; i < sets.length; i++) {
    total += setVolume(sets[i].weight_kg, sets[i].reps);
  }
  return round1(total);
}

/** Formule d'Epley — à présenter systématiquement comme une ESTIMATION. */
function estimate1RM(weightKg, reps) {
  if (reps <= 0) return 0;
  return round1(weightKg * (1 + reps / 30));
}

function bestSet(sets) {
  // "Meilleure série" = celle avec le 1RM estimé le plus élevé
  var best = null;
  var bestOneRm = -1;
  for (var i = 0; i < sets.length; i++) {
    var oneRm = estimate1RM(sets[i].weight_kg, sets[i].reps);
    if (oneRm > bestOneRm) {
      bestOneRm = oneRm;
      best = sets[i];
    }
  }
  return best;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Détection de records personnels
// existingRecords: map type -> value (valeurs actuelles connues pour l'exercice)
// Retourne la liste des types battus + nouvelle valeur.
// ---------------------------------------------------------------------------
function detectRecords(sets, existingRecords) {
  existingRecords = existingRecords || {};
  var broken = [];

  var maxWeight = 0;
  var bestOneRmVal = 0;
  var maxRepsAtBestWeight = 0;
  for (var i = 0; i < sets.length; i++) {
    var s = sets[i];
    if (s.weight_kg > maxWeight) maxWeight = s.weight_kg;
    var oneRm = estimate1RM(s.weight_kg, s.reps);
    if (oneRm > bestOneRmVal) bestOneRmVal = oneRm;
  }
  var sessionVolume = sumVolume(sets);

  if (maxWeight > (existingRecords.max_weight || 0)) {
    broken.push({ type: "max_weight", value: maxWeight });
  }
  if (bestOneRmVal > (existingRecords.estimated_1rm || 0)) {
    broken.push({ type: "estimated_1rm", value: bestOneRmVal });
  }
  if (sessionVolume > (existingRecords.session_volume || 0)) {
    broken.push({ type: "session_volume", value: sessionVolume });
  }
  var cumulative = (existingRecords.exercise_total_volume || 0) + sessionVolume;
  if (cumulative > (existingRecords.exercise_total_volume || 0)) {
    // le tonnage cumulé progresse par définition à chaque séance ; on ne le
    // compte comme "record" que la toute première fois (valeur initiale 0)
    if (!existingRecords.exercise_total_volume) {
      broken.push({ type: "exercise_total_volume", value: cumulative });
    }
  }

  return { broken: broken, sessionVolume: sessionVolume, maxWeight: maxWeight, estimated1RM: bestOneRmVal, cumulativeVolume: cumulative };
}

// ---------------------------------------------------------------------------
// Calcul de l'XP d'un exercice validé pendant une séance
// ---------------------------------------------------------------------------
function computeExerciseXp(sets, previousVolumesForExercise) {
  var validSets = sets.filter(function (s) { return s.weight_kg > 0 && s.reps > 0; });
  var xp = 0;
  var breakdown = [];

  var setXp = validSets.length * XP_RULES.SET_LOGGED;
  if (setXp > 0) { xp += setXp; breakdown.push({ label: validSets.length + " série(s) enregistrée(s)", xp: setXp }); }

  if (validSets.length > 0) {
    xp += XP_RULES.EXERCISE_COMPLETED;
    breakdown.push({ label: "Exercice terminé", xp: XP_RULES.EXERCISE_COMPLETED });
  }

  var currentVolume = sumVolume(validSets);
  if (previousVolumesForExercise && previousVolumesForExercise.length > 0) {
    var avgPrev = previousVolumesForExercise.reduce(function (a, b) { return a + b; }, 0) / previousVolumesForExercise.length;
    if (currentVolume > avgPrev) {
      xp += XP_RULES.EXERCISE_VOLUME_UP_BONUS;
      breakdown.push({ label: "Volume en hausse vs moyenne récente", xp: XP_RULES.EXERCISE_VOLUME_UP_BONUS });
    }
  }

  return { xp: xp, breakdown: breakdown, volume: currentVolume, validSetsCount: validSets.length };
}

/**
 * XP total d'une séance terminée : somme XP des exercices + bonus séance +
 * bonus records (plafonné) + bonus régularité.
 */
function computeSessionXp(exerciseXpTotal, recordsBrokenCount, daysSinceLastSession, currentStreakDays) {
  var xp = exerciseXpTotal + XP_RULES.SESSION_COMPLETED;
  var breakdown = [{ label: "Séance terminée", xp: XP_RULES.SESSION_COMPLETED }];

  var recordBonus = Math.min(recordsBrokenCount * XP_RULES.RECORD_BONUS, XP_RULES.RECORD_BONUS_CAP_PER_SESSION);
  if (recordBonus > 0) {
    xp += recordBonus;
    breakdown.push({ label: recordsBrokenCount + " record(s) personnel(s) battu(s)", xp: recordBonus });
  }

  var streakBonus = 0;
  if (daysSinceLastSession !== null && daysSinceLastSession <= XP_RULES.STREAK_BREAK_DAYS) {
    streakBonus += XP_RULES.STREAK_CONTINUED;
  }
  if (currentStreakDays && XP_RULES.STREAK_MILESTONES[currentStreakDays]) {
    streakBonus += XP_RULES.STREAK_MILESTONES[currentStreakDays];
  }
  if (streakBonus > 0) {
    xp += streakBonus;
    breakdown.push({ label: "Régularité", xp: streakBonus });
  }

  return { xp: xp, breakdown: breakdown };
}

// ---------------------------------------------------------------------------
// XP de caractéristiques (Force / Volume / Endurance / Technique / Régularité)
// et de compétences (groupe musculaire / exercice), à partir d'un lot de séries.
// ---------------------------------------------------------------------------
function computeStatXpFromSets(sets) {
  var stats = { force: 0, volume: 0, endurance: 0, technique: 0 };
  for (var i = 0; i < sets.length; i++) {
    var s = sets[i];
    if (!(s.weight_kg > 0 && s.reps > 0)) continue;
    var vol = setVolume(s.weight_kg, s.reps);
    stats.volume += vol / STAT_RULES.VOLUME_DIVISOR;
    if (s.reps <= STAT_RULES.FORCE_MAX_REPS_FOR_HEAVY) {
      stats.force += s.weight_kg / STAT_RULES.FORCE_WEIGHT_DIVISOR;
    }
    if (s.reps >= STAT_RULES.ENDURANCE_MIN_REPS) {
      stats.endurance += s.reps * STAT_RULES.ENDURANCE_REPS_MULTIPLIER;
    }
    if (s.rpe !== undefined && s.rpe !== null && s.rpe !== "") {
      stats.technique += STAT_RULES.TECHNIQUE_XP_PER_RPE_LOGGED;
    }
  }
  stats.force = round1(stats.force);
  stats.volume = round1(stats.volume);
  stats.endurance = round1(stats.endurance);
  stats.technique = round1(stats.technique);
  return stats;
}

function skillXpFromVolume(volume) {
  return round1(volume / STAT_RULES.SKILL_VOLUME_DIVISOR);
}

// ---------------------------------------------------------------------------
// Progression vers un max déclaré
// ---------------------------------------------------------------------------
function progressTowardDeclaredMax(currentEstimated1RM, declaredMaxKg) {
  if (!declaredMaxKg || declaredMaxKg <= 0) return null;
  return round1((currentEstimated1RM / declaredMaxKg) * 100);
}

// ---------------------------------------------------------------------------
// Streak (régularité)
// ---------------------------------------------------------------------------
function daysBetween(dateIsoA, dateIsoB) {
  var a = new Date(dateIsoA);
  var b = new Date(dateIsoB);
  var ms = Math.abs(b.getTime() - a.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * sessionDatesIsoSorted: dates ISO des séances terminées, triées croissant.
 * Retourne le streak courant (jours consécutifs d'entraînement en respectant
 * un écart max de STREAK_BREAK_DAYS entre deux séances).
 */
function computeStreak(sessionDatesIsoSorted) {
  if (!sessionDatesIsoSorted || sessionDatesIsoSorted.length === 0) return 0;
  var streakSessions = 1;
  for (var i = sessionDatesIsoSorted.length - 1; i > 0; i--) {
    var gap = daysBetween(sessionDatesIsoSorted[i - 1], sessionDatesIsoSorted[i]);
    if (gap <= XP_RULES.STREAK_BREAK_DAYS) {
      streakSessions += 1;
    } else {
      break;
    }
  }
  return streakSessions;
}

var Engine = {
  XP_RULES: XP_RULES,
  STAT_RULES: STAT_RULES,
  xpToReachNextLevel: xpToReachNextLevel,
  levelFromTotalXp: levelFromTotalXp,
  round1: round1,
  setVolume: setVolume,
  sumVolume: sumVolume,
  estimate1RM: estimate1RM,
  bestSet: bestSet,
  detectRecords: detectRecords,
  computeExerciseXp: computeExerciseXp,
  computeSessionXp: computeSessionXp,
  computeStatXpFromSets: computeStatXpFromSets,
  skillXpFromVolume: skillXpFromVolume,
  progressTowardDeclaredMax: progressTowardDeclaredMax,
  daysBetween: daysBetween,
  computeStreak: computeStreak,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Engine;
}
if (typeof window !== "undefined") {
  window.Engine = Engine;
}
