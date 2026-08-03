/**
 * Backend local (fallback) — stocke les données dans localStorage et
 * applique exactement les mêmes règles que le backend distant (Engine).
 *
 * Sert à :
 *  1. tester/démontrer l'app immédiatement, sans déployer quoi que ce soit ;
 *  2. servir de spécification de référence pour Code.gs (Apps Script), qui
 *     réplique les mêmes opérations sur Google Sheets.
 *
 * Interface exposée : window.LocalStore.<action>(payload) => Promise
 * (Promise pour rester interchangeable avec l'appel réseau réel.)
 */
(function (global) {
  var DB_KEY = "levelup_local_db_v1";

  function loadDb() {
    var raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      return { users: [], workouts: [], workoutExercises: [], sets: [], personalRecords: [], declaredMaxes: [], userSkills: [], seq: 1 };
    }
    return JSON.parse(raw);
  }

  function saveDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function nextId(db) {
    var id = "id_" + db.seq;
    db.seq += 1;
    return id;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function resolve(value) {
    return Promise.resolve(JSON.parse(JSON.stringify(value)));
  }

  // ---- Users ---------------------------------------------------------
  function createUser(payload) {
    var db = loadDb();
    var existing = db.users.find(function (u) { return u.username.toLowerCase() === payload.username.toLowerCase(); });
    if (existing) return resolve(existing);
    var user = {
      id: nextId(db),
      username: payload.username,
      age: payload.age,
      sex: payload.sex,
      height_cm: payload.height_cm,
      weight_kg: payload.weight_kg,
      goal: payload.goal,
      experience_level: payload.experience_level,
      created_at: nowIso(),
      xp_total: 0,
    };
    db.users.push(user);
    saveDb(db);
    return resolve(user);
  }

  function getUserByUsername(username) {
    var db = loadDb();
    var user = db.users.find(function (u) { return u.username.toLowerCase() === username.toLowerCase(); });
    return resolve(user || null);
  }

  // ---- Cockpit / stats -------------------------------------------------
  function getSkillsMap(db, userId) {
    var map = {};
    db.userSkills.filter(function (s) { return s.user_id === userId; }).forEach(function (s) {
      map[s.skill] = s;
    });
    return map;
  }

  function upsertSkillXp(db, userId, skillKey, xpDelta) {
    if (xpDelta === 0) return;
    var existing = db.userSkills.find(function (s) { return s.user_id === userId && s.skill === skillKey; });
    if (!existing) {
      existing = { id: nextId(db), user_id: userId, skill: skillKey, xp: 0, level: 1 };
      db.userSkills.push(existing);
    }
    existing.xp = Engine.round1 ? Engine.round1(existing.xp + xpDelta) : Math.round((existing.xp + xpDelta) * 10) / 10;
    var levelInfo = Engine.levelFromTotalXp(existing.xp);
    existing.level = levelInfo.level;
  }

  function completedWorkoutsForUser(db, userId) {
    return db.workouts.filter(function (w) { return w.user_id === userId && w.status === "completed"; })
      .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  }

  function getCockpit(userId) {
    var db = loadDb();
    var user = db.users.find(function (u) { return u.id === userId; });
    if (!user) return resolve(null);
    var levelInfo = Engine.levelFromTotalXp(user.xp_total || 0);
    var skillsMap = getSkillsMap(db, userId);
    var coreStats = ["force", "volume", "endurance", "technique", "regularite"].map(function (key) {
      var s = skillsMap[key] || { xp: 0, level: 1 };
      return { key: key, xp: s.xp, level: s.level };
    });
    var muscleSkills = MUSCLE_GROUPS.map(function (mg) {
      var s = skillsMap[mg.id] || { xp: 0, level: 1 };
      return { key: mg.id, label: mg.label, xp: s.xp, level: s.level };
    });
    var completed = completedWorkoutsForUser(db, userId);
    var totalVolume = completed.reduce(function (sum, w) { return sum + (w.total_volume || 0); }, 0);
    var streak = Engine.computeStreak(completed.map(function (w) { return w.date; }));
    var recentRecords = db.personalRecords.filter(function (r) { return r.user_id === userId; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);

    return resolve({
      user: user,
      level: levelInfo.level,
      xpIntoLevel: levelInfo.xpIntoLevel,
      xpForNextLevel: levelInfo.xpForNextLevel,
      xpTotal: user.xp_total || 0,
      coreStats: coreStats,
      muscleSkills: muscleSkills,
      sessionsCount: completed.length,
      totalVolume: totalVolume,
      streak: streak,
      recentRecords: recentRecords,
    });
  }

  // ---- Workouts --------------------------------------------------------
  function startWorkout(payload) {
    var db = loadDb();
    // s'il existe déjà une séance en cours pour cet utilisateur, la reprendre
    var active = db.workouts.find(function (w) { return w.user_id === payload.user_id && w.status === "in_progress"; });
    if (active) return resolve(hydrateWorkout(db, active));
    var workout = {
      id: nextId(db),
      user_id: payload.user_id,
      name: payload.name || "",
      date: nowIso(),
      status: "in_progress",
      duration_min: 0,
      total_volume: 0,
      total_xp: 0,
    };
    db.workouts.push(workout);
    saveDb(db);
    return resolve(hydrateWorkout(db, workout));
  }

  function getActiveWorkout(userId) {
    var db = loadDb();
    var active = db.workouts.find(function (w) { return w.user_id === userId && w.status === "in_progress"; });
    if (!active) return resolve(null);
    return resolve(hydrateWorkout(db, active));
  }

  function hydrateWorkout(db, workout) {
    var exercises = db.workoutExercises.filter(function (we) { return we.workout_id === workout.id; })
      .sort(function (a, b) { return a.order - b.order; })
      .map(function (we) {
        var sets = db.sets.filter(function (s) { return s.workout_exercise_id === we.id; })
          .sort(function (a, b) { return a.set_number - b.set_number; });
        return Object.assign({}, we, { sets: sets });
      });
    return Object.assign({}, workout, { exercises: exercises });
  }

  function addExerciseToWorkout(payload) {
    var db = loadDb();
    var count = db.workoutExercises.filter(function (we) { return we.workout_id === payload.workout_id; }).length;
    var ex = getExerciseById(payload.exercise_id);
    var we = {
      id: nextId(db),
      workout_id: payload.workout_id,
      exercise_id: payload.exercise_id,
      exercise_name: ex ? ex.name : payload.exercise_id,
      muscle_group: ex ? ex.muscle_group : "",
      order: count,
    };
    db.workoutExercises.push(we);
    saveDb(db);
    return resolve(Object.assign({}, we, { sets: [] }));
  }

  function getLastPerformance(payload) {
    var db = loadDb();
    var pastWEs = db.workoutExercises.filter(function (we) {
      if (we.exercise_id !== payload.exercise_id) return false;
      var w = db.workouts.find(function (w) { return w.id === we.workout_id; });
      return w && w.user_id === payload.user_id && w.status === "completed";
    });
    if (pastWEs.length === 0) return resolve(null);
    // le plus récent
    var withDates = pastWEs.map(function (we) {
      var w = db.workouts.find(function (w) { return w.id === we.workout_id; });
      return { we: we, date: w.date };
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var latest = withDates[0];
    var sets = db.sets.filter(function (s) { return s.workout_exercise_id === latest.we.id; })
      .sort(function (a, b) { return a.set_number - b.set_number; });
    return resolve({ date: latest.date, sets: sets });
  }

  function saveSets(payload) {
    // payload: { workout_exercise_id, sets: [{set_number, weight_kg, reps, rpe, comment}] }
    var db = loadDb();
    db.sets = db.sets.filter(function (s) { return s.workout_exercise_id !== payload.workout_exercise_id; });
    payload.sets.forEach(function (s) {
      db.sets.push({
        id: nextId(db),
        workout_exercise_id: payload.workout_exercise_id,
        set_number: s.set_number,
        weight_kg: Number(s.weight_kg) || 0,
        reps: Number(s.reps) || 0,
        rpe: s.rpe || "",
        comment: s.comment || "",
        volume: Engine.setVolume(Number(s.weight_kg) || 0, Number(s.reps) || 0),
        created_at: nowIso(),
      });
    });
    saveDb(db);
    var we = db.workoutExercises.find(function (w) { return w.id === payload.workout_exercise_id; });
    return resolve(hydrateWorkoutExercise(db, we));
  }

  /**
   * Aperçu immédiat de l'XP d'un exercice pendant la saisie (avant la fin de
   * séance), en utilisant exactement la même formule que le calcul final.
   */
  function previewExerciseXp(payload) {
    var db = loadDb();
    var validSets = (payload.sets || []).filter(function (s) { return Number(s.weight_kg) > 0 && Number(s.reps) > 0; })
      .map(function (s) { return { weight_kg: Number(s.weight_kg), reps: Number(s.reps) }; });
    var prevVolumes = previousVolumesForExercise(db, payload.user_id, payload.exercise_id, payload.workout_id);
    var exXp = Engine.computeExerciseXp(validSets, prevVolumes);
    var existingRecords = existingRecordsFor(db, payload.user_id, payload.exercise_id);
    var recResult = Engine.detectRecords(validSets, existingRecords);
    return resolve({ xp: exXp.xp, breakdown: exXp.breakdown, volume: exXp.volume, potentialRecords: recResult.broken, estimated1RM: recResult.estimated1RM });
  }

  function hydrateWorkoutExercise(db, we) {
    var sets = db.sets.filter(function (s) { return s.workout_exercise_id === we.id; }).sort(function (a, b) { return a.set_number - b.set_number; });
    return Object.assign({}, we, { sets: sets });
  }

  function existingRecordsFor(db, userId, exerciseId) {
    var recs = db.personalRecords.filter(function (r) { return r.user_id === userId && r.exercise_id === exerciseId; });
    var map = {};
    recs.forEach(function (r) { map[r.type] = r.value; });
    return map;
  }

  function previousVolumesForExercise(db, userId, exerciseId, excludeWorkoutId) {
    var pastWEs = db.workoutExercises.filter(function (we) {
      if (we.exercise_id !== exerciseId || we.workout_id === excludeWorkoutId) return false;
      var w = db.workouts.find(function (w) { return w.id === we.workout_id; });
      return w && w.user_id === userId && w.status === "completed";
    });
    var withDatesSorted = pastWEs.map(function (we) {
      var w = db.workouts.find(function (w) { return w.id === we.workout_id; });
      var sets = db.sets.filter(function (s) { return s.workout_exercise_id === we.id; });
      return { date: w.date, volume: Engine.sumVolume(sets) };
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 3);
    return withDatesSorted.map(function (x) { return x.volume; });
  }

  /** Termine la séance : calcule XP, records, met à jour niveau et compétences. */
  function completeWorkout(payload) {
    var db = loadDb();
    var workout = db.workouts.find(function (w) { return w.id === payload.workout_id; });
    if (!workout) return resolve(null);
    var user = db.users.find(function (u) { return u.id === workout.user_id; });
    var exercises = db.workoutExercises.filter(function (we) { return we.workout_id === workout.id; });

    var totalExerciseXp = 0;
    var allRecordsBroken = [];
    var totalVolume = 0;
    var exerciseSummaries = [];
    var allValidSetsForStats = [];

    exercises.forEach(function (we) {
      var sets = db.sets.filter(function (s) { return s.workout_exercise_id === we.id; });
      var validSets = sets.filter(function (s) { return s.weight_kg > 0 && s.reps > 0; });
      allValidSetsForStats = allValidSetsForStats.concat(validSets);
      if (validSets.length === 0) return;

      var prevVolumes = previousVolumesForExercise(db, workout.user_id, we.exercise_id, workout.id);
      var exXp = Engine.computeExerciseXp(validSets, prevVolumes);
      totalExerciseXp += exXp.xp;
      totalVolume += exXp.volume;

      var existingRecords = existingRecordsFor(db, workout.user_id, we.exercise_id);
      var recResult = Engine.detectRecords(validSets, existingRecords);
      recResult.broken.forEach(function (b) {
        db.personalRecords.push({
          id: nextId(db), user_id: workout.user_id, exercise_id: we.exercise_id,
          exercise_name: we.exercise_name, type: b.type, value: b.value, date: nowIso(),
        });
        allRecordsBroken.push(Object.assign({}, b, { exercise_name: we.exercise_name }));
      });

      // XP de compétence : exercice + groupe musculaire
      var skillXp = Engine.skillXpFromVolume(exXp.volume);
      upsertSkillXp(db, workout.user_id, "exercise:" + we.exercise_id, skillXp);
      upsertSkillXp(db, workout.user_id, we.muscle_group, skillXp);

      exerciseSummaries.push({
        exercise_name: we.exercise_name, volume: exXp.volume, xp: exXp.xp,
        records: recResult.broken, estimated1RM: recResult.estimated1RM,
      });
    });

    var completedSessions = completedWorkoutsForUser(db, workout.user_id);
    var lastDate = completedSessions.length ? completedSessions[completedSessions.length - 1].date : null;
    var daysSinceLast = lastDate ? Engine.daysBetween(lastDate, nowIso()) : null;
    var streakDatesProjected = completedSessions.map(function (w) { return w.date; }).concat([nowIso()]);
    var projectedStreak = Engine.computeStreak(streakDatesProjected);

    var sessionXp = Engine.computeSessionXp(totalExerciseXp, allRecordsBroken.length, daysSinceLast, projectedStreak);

    // Mise à jour caractéristiques (force/volume/endurance/technique)
    var statXp = Engine.computeStatXpFromSets(allValidSetsForStats);
    upsertSkillXp(db, workout.user_id, "force", statXp.force);
    upsertSkillXp(db, workout.user_id, "volume", statXp.volume);
    upsertSkillXp(db, workout.user_id, "endurance", statXp.endurance);
    upsertSkillXp(db, workout.user_id, "technique", statXp.technique);
    var regularityXpDelta = sessionXp.breakdown.filter(function (b) { return b.label === "Régularité"; }).reduce(function (a, b) { return a + b.xp; }, 0);
    upsertSkillXp(db, workout.user_id, "regularite", regularityXpDelta);

    // Finalisation séance
    workout.status = "completed";
    workout.total_volume = Engine.round1(totalVolume);
    workout.total_xp = sessionXp.xp;

    var beforeLevel = Engine.levelFromTotalXp(user.xp_total || 0).level;
    user.xp_total = Engine.round1((user.xp_total || 0) + sessionXp.xp);
    var afterLevelInfo = Engine.levelFromTotalXp(user.xp_total);

    saveDb(db);

    return resolve({
      workout: workout,
      totalXp: sessionXp.xp,
      xpBreakdown: sessionXp.breakdown,
      exerciseSummaries: exerciseSummaries,
      recordsBroken: allRecordsBroken,
      leveledUp: afterLevelInfo.level > beforeLevel,
      newLevel: afterLevelInfo.level,
      streak: projectedStreak,
    });
  }

  // ---- Historique --------------------------------------------------------
  function getHistory(userId) {
    var db = loadDb();
    var list = completedWorkoutsForUser(db, userId).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    return resolve(list);
  }

  function getWorkoutDetail(workoutId) {
    var db = loadDb();
    var w = db.workouts.find(function (w) { return w.id === workoutId; });
    if (!w) return resolve(null);
    return resolve(hydrateWorkout(db, w));
  }

  // ---- Progression / max déclaré -----------------------------------------
  function getExerciseProgress(payload) {
    var db = loadDb();
    var pastWEs = db.workoutExercises.filter(function (we) {
      if (we.exercise_id !== payload.exercise_id) return false;
      var w = db.workouts.find(function (w) { return w.id === we.workout_id; });
      return w && w.user_id === payload.user_id && w.status === "completed";
    });
    var points = pastWEs.map(function (we) {
      var w = db.workouts.find(function (w) { return w.id === we.workout_id; });
      var sets = db.sets.filter(function (s) { return s.workout_exercise_id === we.id; });
      var best = Engine.bestSet(sets);
      return {
        date: w.date,
        volume: Engine.sumVolume(sets),
        estimated1RM: best ? Engine.estimate1RM(best.weight_kg, best.reps) : 0,
        maxWeight: sets.reduce(function (m, s) { return Math.max(m, s.weight_kg); }, 0),
      };
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    var declared = db.declaredMaxes.find(function (d) { return d.user_id === payload.user_id && d.exercise_id === payload.exercise_id; });
    var records = existingRecordsFor(db, payload.user_id, payload.exercise_id);

    return resolve({ points: points, declaredMaxKg: declared ? declared.declared_max_kg : null, records: records });
  }

  function setDeclaredMax(payload) {
    var db = loadDb();
    var existing = db.declaredMaxes.find(function (d) { return d.user_id === payload.user_id && d.exercise_id === payload.exercise_id; });
    if (existing) {
      existing.declared_max_kg = payload.declared_max_kg;
      existing.date_updated = nowIso();
    } else {
      db.declaredMaxes.push({ id: nextId(db), user_id: payload.user_id, exercise_id: payload.exercise_id, exercise_name: payload.exercise_name, declared_max_kg: payload.declared_max_kg, date_updated: nowIso() });
    }
    saveDb(db);
    return resolve({ ok: true });
  }

  function getDeclaredMaxes(userId) {
    var db = loadDb();
    var list = db.declaredMaxes.filter(function (d) { return d.user_id === userId; });
    return resolve(list);
  }

  global.LocalStore = {
    createUser: createUser,
    getUserByUsername: getUserByUsername,
    getCockpit: getCockpit,
    startWorkout: startWorkout,
    getActiveWorkout: getActiveWorkout,
    addExerciseToWorkout: addExerciseToWorkout,
    getLastPerformance: getLastPerformance,
    saveSets: saveSets,
    previewExerciseXp: previewExerciseXp,
    completeWorkout: completeWorkout,
    getHistory: getHistory,
    getWorkoutDetail: getWorkoutDetail,
    getExerciseProgress: getExerciseProgress,
    setDeclaredMax: setDeclaredMax,
    getDeclaredMaxes: getDeclaredMaxes,
  };
})(typeof window !== "undefined" ? window : globalThis);
