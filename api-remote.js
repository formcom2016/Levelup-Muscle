/**
 * Backend distant — appelle le Web App Google Apps Script (voir gas/Code.gs).
 * Même interface que LocalStore (local-store.js) pour que app.js puisse
 * utiliser l'un ou l'autre de façon transparente.
 *
 * Note technique : on envoie du texte brut (pas de header Content-Type
 * application/json) pour éviter le pré-vol CORS (OPTIONS) qu'Apps Script
 * ne gère pas nativement. Le corps est du JSON stringifié, lu côté
 * serveur via e.postData.contents.
 */
(function (global) {
  function call(action, payload) {
    return fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify({ action: action, payload: payload || {} }),
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json && json.error) throw new Error(json.error);
        return json.data;
      });
  }

  global.ApiRemote = {
    createUser: function (payload) { return call("createUser", payload); },
    getUserByUsername: function (username) { return call("getUserByUsername", { username: username }); },
    getCockpit: function (userId) { return call("getCockpit", { user_id: userId }); },
    startWorkout: function (payload) { return call("startWorkout", payload); },
    getActiveWorkout: function (userId) { return call("getActiveWorkout", { user_id: userId }); },
    addExerciseToWorkout: function (payload) { return call("addExerciseToWorkout", payload); },
    getLastPerformance: function (payload) { return call("getLastPerformance", payload); },
    saveSets: function (payload) { return call("saveSets", payload); },
    previewExerciseXp: function (payload) { return call("previewExerciseXp", payload); },
    completeWorkout: function (payload) { return call("completeWorkout", payload); },
    getHistory: function (userId) { return call("getHistory", { user_id: userId }); },
    getWorkoutDetail: function (workoutId) { return call("getWorkoutDetail", { workout_id: workoutId }); },
    getExerciseProgress: function (payload) { return call("getExerciseProgress", payload); },
    setDeclaredMax: function (payload) { return call("setDeclaredMax", payload); },
    getDeclaredMaxes: function (userId) { return call("getDeclaredMaxes", { user_id: userId }); },
  };
})(typeof window !== "undefined" ? window : globalThis);
