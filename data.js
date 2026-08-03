/**
 * Façade DB — choisit automatiquement le backend local ou distant selon
 * CONFIG.API_URL. Le reste de l'app (app.js) n'appelle que `DB.xxx()`.
 */
var DB = (function () {
  var backend = CONFIG.API_URL ? window.ApiRemote : window.LocalStore;
  return backend;
})();
