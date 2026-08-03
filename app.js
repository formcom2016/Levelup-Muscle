/**
 * Level Up — app.js
 * UI vanilla JS, sans framework. Rendu par re-génération de #main à chaque
 * changement d'écran/état (simple et suffisant pour la taille du MVP).
 */
(function () {
  var $main = document.getElementById("main");
  var $bottomnav = document.getElementById("bottomnav");
  var $topbarMode = document.getElementById("topbar-mode");

  var MUSCLE_LABELS = {};
  MUSCLE_GROUPS.forEach(function (m) { MUSCLE_LABELS[m.id] = m.label; });

  var STAT_LABELS = { force: "Force", volume: "Volume", endurance: "Endurance", technique: "Technique", regularite: "Régularité" };

  var State = {
    screen: "loading",
    user: null,
    cockpit: null,
    activeWorkout: null,
    seanceView: "idle", // idle | picker | logging | recap
    pickerFilter: "all",
    loggingWorkoutExercise: null, // { id, exercise_id, exercise_name, sets: [...] }
    lastPerformance: null,
    xpPreview: null,
    recap: null,
    statsExerciseId: null,
    statsData: null,
    historyList: null,
    historyDetail: null,
  };

  // -------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------
  function boot() {
    $topbarMode.textContent = CONFIG.API_URL ? "Connecté" : "Mode local";
    $topbarMode.className = "mode-pill" + (CONFIG.API_URL ? " online" : "");

    var savedId = localStorage.getItem("levelup_user_id");
    var savedName = localStorage.getItem("levelup_username");
    if (savedId && savedName) {
      State.user = { id: savedId, username: savedName };
      goToCockpit();
    } else {
      State.screen = "onboarding";
      render();
    }
  }

  function showToast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  // -------------------------------------------------------------------
  // Router / render
  // -------------------------------------------------------------------
  function render() {
    $bottomnav.classList.toggle("hidden", State.screen === "onboarding" || State.screen === "loading");
    Array.prototype.forEach.call(document.querySelectorAll(".nav-btn"), function (btn) {
      btn.classList.toggle("active", btn.dataset.screen === State.screen);
    });

    var html = "";
    switch (State.screen) {
      case "loading": html = "<p>Chargement…</p>"; break;
      case "onboarding": html = renderOnboarding(); break;
      case "cockpit": html = renderCockpit(); break;
      case "seance": html = renderSeance(); break;
      case "stats": html = renderStats(); break;
      case "historique": html = renderHistorique(); break;
      case "profil": html = renderProfil(); break;
    }
    $main.innerHTML = html;
    bindScreenEvents();
  }

  document.querySelectorAll(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var screen = btn.dataset.screen;
      if (screen === "cockpit") return goToCockpit();
      if (screen === "seance") return goToSeance();
      if (screen === "stats") return goToStats();
      if (screen === "historique") return goToHistorique();
      if (screen === "profil") { State.screen = "profil"; render(); }
    });
  });

  // -------------------------------------------------------------------
  // Onboarding — création du personnage
  // -------------------------------------------------------------------
  function renderOnboarding() {
    return (
      '<div class="card">' +
      "<h1>Crée ton personnage</h1>" +
      "<p>Level Up transforme tes séances en progression de personnage. Renseigne quelques infos pour démarrer — pas de programme imposé, tu gardes le contrôle.</p>" +
      '<form id="onboarding-form">' +
      '<div class="field"><label>Prénom ou pseudo</label><input required name="username" placeholder="Ex. Khaled" /></div>' +
      '<div class="field"><label>Âge</label><input required type="number" min="12" max="90" name="age" placeholder="25" /></div>' +
      '<div class="field"><label>Sexe</label><select name="sex"><option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre / préfère ne pas dire</option></select></div>' +
      '<div class="field"><label>Taille (cm)</label><input required type="number" min="120" max="230" name="height_cm" placeholder="178" /></div>' +
      '<div class="field"><label>Poids (kg)</label><input required type="number" min="30" max="250" step="0.1" name="weight_kg" placeholder="75" /></div>' +
      '<div class="field"><label>Niveau</label><div class="chip-group" data-group="experience_level">' +
      chip("experience_level", "debutant", "Débutant", true) + chip("experience_level", "intermediaire", "Intermédiaire") + chip("experience_level", "confirme", "Confirmé") +
      "</div></div>" +
      '<div class="field"><label>Objectif</label><div class="chip-group" data-group="goal">' +
      chip("goal", "prise_muscle", "Prise de muscle", true) + chip("goal", "force", "Force") + chip("goal", "perte_gras", "Perte de gras") + chip("goal", "remise_forme", "Remise en forme") +
      "</div></div>" +
      '<button type="submit" class="btn btn-primary">Créer mon personnage</button>' +
      "</form></div>"
    );
  }

  function chip(group, value, label, selected) {
    return '<div class="chip' + (selected ? " selected" : "") + '" data-chip-group="' + group + '" data-chip-value="' + value + '">' + label + "</div>";
  }

  function bindOnboarding() {
    var form = document.getElementById("onboarding-form");
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll(".chip"), function (chipEl) {
      chipEl.addEventListener("click", function () {
        var group = chipEl.dataset.chipGroup;
        Array.prototype.forEach.call(form.querySelectorAll('[data-chip-group="' + group + '"]'), function (c) { c.classList.remove("selected"); });
        chipEl.classList.add("selected");
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var experience = form.querySelector('[data-chip-group="experience_level"].selected').dataset.chipValue;
      var goal = form.querySelector('[data-chip-group="goal"].selected').dataset.chipValue;
      var payload = {
        username: fd.get("username").trim(),
        age: Number(fd.get("age")),
        sex: fd.get("sex"),
        height_cm: Number(fd.get("height_cm")),
        weight_kg: Number(fd.get("weight_kg")),
        experience_level: experience,
        goal: goal,
      };
      DB.createUser(payload).then(function (user) {
        localStorage.setItem("levelup_user_id", user.id);
        localStorage.setItem("levelup_username", user.username);
        State.user = { id: user.id, username: user.username };
        showToast("Personnage créé — Niveau 1, 0/100 XP");
        goToCockpit();
      });
    });
  }

  // -------------------------------------------------------------------
  // Cockpit
  // -------------------------------------------------------------------
  function goToCockpit() {
    State.screen = "cockpit";
    render();
    DB.getCockpit(State.user.id).then(function (data) {
      State.cockpit = data;
      if (State.screen === "cockpit") render();
    });
  }

  function renderCockpit() {
    var c = State.cockpit;
    if (!c) return "<p>Chargement du cockpit…</p>";
    var xpPct = Math.min(100, Math.round((c.xpIntoLevel / c.xpForNextLevel) * 100));

    var statsHtml = c.coreStats.map(function (s) {
      return '<div class="stat-tile"><div class="label">' + STAT_LABELS[s.key] + '</div><div class="value">Lv.' + s.level + "</div></div>";
    }).join("");

    var skillsHtml = c.muscleSkills.map(function (s) {
      return '<div class="skill-row"><span class="skill-name">' + s.label + '</span><span class="skill-level">Niveau ' + s.level + "</span></div>";
    }).join("");

    var recordsHtml = c.recentRecords.length
      ? c.recentRecords.map(function (r) { return '<div class="record-item"><span>🏆 ' + r.exercise_name + " — " + recordLabel(r.type, r.value) + '</span></div>'; }).join("")
      : '<p style="margin:0">Pas encore de record. Termine une séance pour en débloquer.</p>';

    return (
      '<div class="card">' +
      '<div class="character-header">' +
      '<div class="avatar-badge">' + initials(c.user.username) + "</div>" +
      "<div><div class=\"character-name\">" + c.user.username + '</div><div class="character-level">NIVEAU ' + c.level + "</div></div>" +
      "</div>" +
      '<div class="xp-bar-track"><div class="xp-bar-fill" style="width:' + xpPct + '%"></div></div>' +
      '<div class="xp-label">' + c.xpIntoLevel + " / " + c.xpForNextLevel + " XP</div>" +
      "</div>" +

      '<div class="card"><div class="card-title">Caractéristiques</div><div class="stat-grid">' + statsHtml + "</div></div>" +

      '<div class="card"><div class="card-title">Compétences musculaires</div>' + skillsHtml + "</div>" +

      '<div class="card"><div class="card-title">Résumé</div><div class="kpi-grid">' +
      '<div class="kpi"><div class="num">' + c.sessionsCount + '</div><div class="lbl">Séances</div></div>' +
      '<div class="kpi"><div class="num">' + formatKg(c.totalVolume) + '</div><div class="lbl">Tonnage</div></div>' +
      '<div class="kpi"><div class="num">' + c.streak + '</div><div class="lbl">Streak</div></div>' +
      '<div class="kpi"><div class="num">' + c.xpTotal + '</div><div class="lbl">XP total</div></div>' +
      "</div></div>" +

      '<div class="card"><div class="card-title">Derniers records</div>' + recordsHtml + "</div>" +

      '<button class="btn btn-primary" id="btn-goto-seance">⚔️ Nouvelle séance</button>'
    );
  }

  function recordLabel(type, value) {
    var labels = {
      max_weight: "charge max " + value + " kg",
      estimated_1rm: "1RM est. " + value + " kg",
      session_volume: "tonnage séance " + formatKg(value),
      exercise_total_volume: "tonnage cumulé " + formatKg(value),
    };
    return labels[type] || type + " : " + value;
  }

  function initials(name) {
    return (name || "?").trim().slice(0, 2).toUpperCase();
  }
  function formatKg(v) {
    return Math.round(v).toLocaleString("fr-FR") + " kg";
  }

  // -------------------------------------------------------------------
  // Séance
  // -------------------------------------------------------------------
  function goToSeance() {
    State.screen = "seance";
    State.seanceView = "idle";
    render();
    DB.getActiveWorkout(State.user.id).then(function (w) {
      State.activeWorkout = w;
      if (State.screen === "seance") render();
    });
  }

  function renderSeance() {
    if (State.seanceView === "recap") return renderRecap();
    if (State.seanceView === "picker") return renderExercisePicker();
    if (State.seanceView === "logging") return renderExerciseLogging();

    if (!State.activeWorkout) {
      return (
        '<div class="card">' +
        "<h1>Nouvelle séance</h1>" +
        "<p>Donne-lui un nom si tu veux (Push, Legs, Ma séance du lundi…) ou lance-toi directement.</p>" +
        '<form id="start-workout-form">' +
        '<div class="field"><label>Nom (optionnel)</label><input name="name" placeholder="Ex. Push" /></div>' +
        '<button type="submit" class="btn btn-primary">Démarrer la séance</button>' +
        "</form></div>"
      );
    }

    var w = State.activeWorkout;
    var exercisesHtml = w.exercises.length
      ? w.exercises.map(function (we) {
          var done = we.sets && we.sets.some(function (s) { return s.weight_kg > 0 && s.reps > 0; });
          var setsSummary = we.sets && we.sets.length ? we.sets.map(function (s) { return s.weight_kg + "kg×" + s.reps; }).join(" · ") : "Aucune série";
          return (
            '<div class="exercise-row" data-open-exercise="' + we.id + '">' +
            "<div><div class=\"name\">" + we.exercise_name + '</div><div class="meta">' + setsSummary + "</div></div>" +
            (done ? '<span class="status-done">✓ fait</span>' : '<span class="meta">à faire</span>') +
            "</div>"
          );
        }).join("")
      : '<p>Aucun exercice pour l\'instant.</p>';

    return (
      '<div class="card">' +
      "<h2>" + (w.name || "Séance en cours") + "</h2>" +
      "<p>Démarrée à " + new Date(w.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) + "</p>" +
      exercisesHtml +
      '<button class="btn btn-secondary" id="btn-add-exercise" style="margin-bottom:10px">+ Ajouter un exercice</button>' +
      (w.exercises.length ? '<button class="btn btn-primary" id="btn-finish-workout">Terminer la séance</button>' : "") +
      "</div>"
    );
  }

  function renderExercisePicker() {
    var groups = {};
    EXERCISES.forEach(function (ex) {
      if (State.pickerFilter !== "all" && ex.muscle_group !== State.pickerFilter) return;
      groups[ex.muscle_group] = groups[ex.muscle_group] || [];
      groups[ex.muscle_group].push(ex);
    });

    var tabsHtml = '<div class="tabs">' + chip2("all", "Tous", State.pickerFilter === "all") +
      MUSCLE_GROUPS.map(function (mg) { return chip2(mg.id, mg.label, State.pickerFilter === mg.id); }).join("") + "</div>";

    var blocksHtml = Object.keys(groups).map(function (mgId) {
      var items = groups[mgId].map(function (ex) {
        return '<div class="exercise-pick-item" data-pick-exercise="' + ex.id + '"><span>' + ex.name + "</span><span>+</span></div>";
      }).join("");
      return '<div class="muscle-group-block"><div class="mg-title">' + MUSCLE_LABELS[mgId] + "</div>" + items + "</div>";
    }).join("");

    return (
      '<button class="back-link" id="btn-back-to-seance">← Retour</button>' +
      "<h2>Ajouter un exercice</h2>" +
      tabsHtml +
      '<div class="card">' + (blocksHtml || "<p>Aucun exercice dans cette catégorie.</p>") + "</div>"
    );
  }

  function chip2(value, label, selected) {
    return '<div class="chip' + (selected ? " selected" : "") + '" data-picker-filter="' + value + '">' + label + "</div>";
  }

  function renderExerciseLogging() {
    var we = State.loggingWorkoutExercise;
    if (!we) return "<p>…</p>";

    var lastHtml = "";
    if (State.lastPerformance && State.lastPerformance.sets && State.lastPerformance.sets.length) {
      lastHtml =
        '<div class="last-time-box"><div class="lt-title">Dernière séance (' + new Date(State.lastPerformance.date).toLocaleDateString("fr-FR") + ")</div>" +
        State.lastPerformance.sets.map(function (s) { return s.weight_kg + " kg × " + s.reps; }).join(" · ") +
        "</div>";
    }

    var rowsHtml = we.sets.map(function (s, i) {
      return (
        '<div class="set-row" data-set-index="' + i + '">' +
        '<div class="set-num">' + (i + 1) + "</div>" +
        '<div class="stepper" data-field="weight_kg"><button data-step="-2.5">−</button><input type="number" inputmode="decimal" step="0.5" value="' + s.weight_kg + '" /><button data-step="2.5">+</button></div>' +
        '<div class="stepper" data-field="reps"><button data-step="-1">−</button><input type="number" inputmode="numeric" value="' + s.reps + '" /><button data-step="1">+</button></div>' +
        '<button class="set-remove" data-remove-set="' + i + '">✕</button>' +
        "</div>"
      );
    }).join("");

    var xpPreviewHtml = "";
    if (State.xpPreview) {
      xpPreviewHtml = '<div class="xp-toast"><div class="big">+' + State.xpPreview.xp + " XP</div>" +
        (State.xpPreview.potentialRecords && State.xpPreview.potentialRecords.length
          ? '<div style="color:var(--gold);font-weight:700;margin-top:4px">🏆 Nouveau record en vue !</div>' : "") +
        '<div style="font-size:12px;color:var(--text-dim);margin-top:4px">1RM estimé : ' + State.xpPreview.estimated1RM + " kg (estimation)</div></div>";
    }

    return (
      '<button class="back-link" id="btn-back-to-seance">← Retour à la séance</button>' +
      "<h1>" + we.exercise_name.toUpperCase() + "</h1>" +
      lastHtml +
      xpPreviewHtml +
      '<div class="card">' +
      '<div class="card-title">Séries</div>' +
      rowsHtml +
      '<button class="btn btn-ghost" id="btn-add-set" style="margin-bottom:14px">+ Ajouter une série</button>' +
      '<div class="btn-row"><button class="btn btn-secondary" id="btn-preview-xp">Aperçu XP</button><button class="btn btn-primary" id="btn-validate-exercise">Valider l\'exercice</button></div>' +
      "</div>"
    );
  }

  function renderRecap() {
    var r = State.recap;
    if (!r) return "<p>…</p>";
    var recordsHtml = r.recordsBroken.length
      ? r.recordsBroken.map(function (rec) { return '<div class="record-flash">🏆 NOUVEAU RECORD<br/><strong>' + rec.exercise_name + "</strong><br/>" + recordLabel(rec.type, rec.value) + "</div>"; }).join("")
      : "";
    return (
      '<div class="card" style="text-align:center">' +
      "<h1>Séance terminée !</h1>" +
      '<p>Excellent travail 💪</p>' +
      '<div class="xp-toast"><div class="big">+' + r.totalXp + " XP</div>" +
      (r.leveledUp ? '<div style="color:var(--gold);font-weight:800;margin-top:6px">⭐ NIVEAU ' + r.newLevel + " ATTEINT !</div>" : "") +
      "</div>" +
      recordsHtml +
      '<div class="kpi-grid" style="margin:14px 0">' +
      '<div class="kpi"><div class="num">' + formatKg(r.workout.total_volume) + '</div><div class="lbl">Tonnage</div></div>' +
      '<div class="kpi"><div class="num">' + r.exerciseSummaries.length + '</div><div class="lbl">Exercices</div></div>' +
      '<div class="kpi"><div class="num">' + r.streak + '</div><div class="lbl">Streak</div></div>' +
      "</div>" +
      '<button class="btn btn-primary" id="btn-recap-cockpit">Voir ma progression</button>' +
      "</div>"
    );
  }

  function bindSeanceEvents() {
    var startForm = document.getElementById("start-workout-form");
    if (startForm) {
      startForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = new FormData(startForm).get("name");
        DB.startWorkout({ user_id: State.user.id, name: name }).then(function (w) {
          State.activeWorkout = w;
          render();
        });
      });
    }

    var btnAddExercise = document.getElementById("btn-add-exercise");
    if (btnAddExercise) btnAddExercise.addEventListener("click", function () { State.seanceView = "picker"; render(); });

    var btnBack = document.getElementById("btn-back-to-seance");
    if (btnBack) btnBack.addEventListener("click", function () {
      State.seanceView = "idle";
      State.xpPreview = null;
      DB.getActiveWorkout(State.user.id).then(function (w) { State.activeWorkout = w; render(); });
    });

    var btnFinish = document.getElementById("btn-finish-workout");
    if (btnFinish) btnFinish.addEventListener("click", function () {
      btnFinish.disabled = true;
      btnFinish.textContent = "Calcul en cours…";
      DB.completeWorkout({ workout_id: State.activeWorkout.id }).then(function (result) {
        State.recap = result;
        State.activeWorkout = null;
        State.seanceView = "recap";
        render();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-open-exercise]"), function (el) {
      el.addEventListener("click", function () { openExerciseLogging(el.dataset.openExercise); });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-picker-filter]"), function (el) {
      el.addEventListener("click", function () { State.pickerFilter = el.dataset.pickerFilter; render(); });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-pick-exercise]"), function (el) {
      el.addEventListener("click", function () {
        var exerciseId = el.dataset.pickExercise;
        DB.addExerciseToWorkout({ workout_id: State.activeWorkout.id, exercise_id: exerciseId }).then(function (we) {
          openExerciseLogging(we.id, we);
        });
      });
    });

    bindLoggingEvents();

    var btnRecapCockpit = document.getElementById("btn-recap-cockpit");
    if (btnRecapCockpit) btnRecapCockpit.addEventListener("click", function () { goToCockpit(); });
  }

  function openExerciseLogging(workoutExerciseId, weFromPicker) {
    var we = weFromPicker;
    if (!we) we = State.activeWorkout.exercises.find(function (x) { return x.id === workoutExerciseId; });
    if (!we.sets || we.sets.length === 0) {
      we = Object.assign({}, we, { sets: [{ weight_kg: 0, reps: 0 }] });
    }
    State.loggingWorkoutExercise = we;
    State.seanceView = "logging";
    State.xpPreview = null;
    render();
    DB.getLastPerformance({ user_id: State.user.id, exercise_id: we.exercise_id }).then(function (perf) {
      State.lastPerformance = perf;
      if (State.seanceView === "logging") render();
    });
  }

  function bindLoggingEvents() {
    var we = State.loggingWorkoutExercise;
    if (!we || State.seanceView !== "logging") return;

    Array.prototype.forEach.call(document.querySelectorAll(".set-row"), function (rowEl) {
      var idx = Number(rowEl.dataset.setIndex);
      Array.prototype.forEach.call(rowEl.querySelectorAll(".stepper"), function (stepperEl) {
        var field = stepperEl.dataset.field;
        var input = stepperEl.querySelector("input");
        input.addEventListener("change", function () {
          we.sets[idx][field] = Number(input.value) || 0;
          State.xpPreview = null;
        });
        Array.prototype.forEach.call(stepperEl.querySelectorAll("button"), function (btn) {
          btn.addEventListener("click", function () {
            var step = Number(btn.dataset.step);
            var current = we.sets[idx][field] || 0;
            var next = Math.max(0, round1(current + step));
            we.sets[idx][field] = next;
            input.value = next;
            State.xpPreview = null;
          });
        });
      });
      var removeBtn = rowEl.querySelector("[data-remove-set]");
      removeBtn.addEventListener("click", function () {
        if (we.sets.length <= 1) return;
        we.sets.splice(idx, 1);
        render();
      });
    });

    var addSetBtn = document.getElementById("btn-add-set");
    if (addSetBtn) addSetBtn.addEventListener("click", function () {
      var last = we.sets[we.sets.length - 1];
      we.sets.push({ weight_kg: last ? last.weight_kg : 0, reps: last ? last.reps : 0 });
      render();
    });

    var previewBtn = document.getElementById("btn-preview-xp");
    if (previewBtn) previewBtn.addEventListener("click", function () {
      DB.previewExerciseXp({ user_id: State.user.id, exercise_id: we.exercise_id, workout_id: State.activeWorkout.id, sets: we.sets }).then(function (preview) {
        State.xpPreview = preview;
        render();
      });
    });

    var validateBtn = document.getElementById("btn-validate-exercise");
    if (validateBtn) validateBtn.addEventListener("click", function () {
      var setsPayload = we.sets.map(function (s, i) { return { set_number: i + 1, weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe || "", comment: s.comment || "" }; });
      DB.saveSets({ workout_exercise_id: we.id, sets: setsPayload }).then(function () {
        return DB.previewExerciseXp({ user_id: State.user.id, exercise_id: we.exercise_id, workout_id: State.activeWorkout.id, sets: we.sets });
      }).then(function (preview) {
        showToast("Exercice validé — +" + preview.xp + " XP");
        State.seanceView = "idle";
        State.xpPreview = null;
        DB.getActiveWorkout(State.user.id).then(function (w) { State.activeWorkout = w; render(); });
      });
    });
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  // -------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------
  function goToStats() {
    State.screen = "stats";
    if (!State.statsExerciseId) State.statsExerciseId = EXERCISES[0].id;
    render();
    loadStats();
  }

  function loadStats() {
    DB.getExerciseProgress({ user_id: State.user.id, exercise_id: State.statsExerciseId }).then(function (data) {
      State.statsData = data;
      if (State.screen === "stats") render();
    });
  }

  function renderStats() {
    var ex = getExerciseById(State.statsExerciseId);
    var optionsHtml = EXERCISES.map(function (e) { return '<option value="' + e.id + '"' + (e.id === State.statsExerciseId ? " selected" : "") + ">" + e.name + "</option>"; }).join("");

    var data = State.statsData;
    var body = "";
    if (!data) {
      body = "<p>Chargement…</p>";
    } else if (data.points.length === 0) {
      body = '<div class="empty-state"><span class="emoji">📊</span>Pas encore de données pour cet exercice.<br/>Enregistre une séance pour voir apparaître tes stats.</div>';
    } else {
      var last = data.points[data.points.length - 1];
      var declaredMax = data.declaredMaxKg;
      var progressPct = Engine.progressTowardDeclaredMax(last.estimated1RM, declaredMax);

      body =
        '<div class="card"><div class="card-title">Records</div>' +
        '<div class="kpi-grid">' +
        '<div class="kpi"><div class="num">' + (data.records.max_weight || 0) + ' kg</div><div class="lbl">Charge max</div></div>' +
        '<div class="kpi"><div class="num">' + (data.records.estimated_1rm || 0) + ' kg</div><div class="lbl">1RM estimé</div></div>' +
        '<div class="kpi"><div class="num">' + formatKg(data.records.session_volume || 0) + '</div><div class="lbl">Tonnage séance</div></div>' +
        '<div class="kpi"><div class="num">' + formatKg(data.records.exercise_total_volume || 0) + '</div><div class="lbl">Tonnage cumulé</div></div>' +
        "</div></div>" +

        '<div class="card"><div class="card-title">Max déclaré</div>' +
        '<p>Renseigne ton max connu sur cet exercice pour mesurer ta progression vers celui-ci.</p>' +
        '<div class="field"><input type="number" id="declared-max-input" placeholder="Ex. 100" value="' + (declaredMax || "") + '" /></div>' +
        '<button class="btn btn-secondary btn-sm" id="btn-save-declared-max">Enregistrer mon max</button>' +
        (declaredMax ? '<div style="margin-top:12px"><div class="xp-label" style="text-align:left">Progression : ' + progressPct + '% du max déclaré (1RM estimé ' + last.estimated1RM + ' / ' + declaredMax + ' kg)</div><div class="progress-bar-mini"><div class="fill" style="width:' + Math.min(100, progressPct) + '%"></div></div></div>' : "") +
        "</div>" +

        '<div class="card"><div class="card-title">1RM estimé — évolution</div><canvas class="chart" id="chart-1rm"></canvas></div>' +
        '<div class="card"><div class="card-title">Tonnage par séance — évolution</div><canvas class="chart" id="chart-volume"></canvas></div>';
    }

    return (
      '<h1>Stats</h1>' +
      '<div class="field"><select id="stats-exercise-select">' + optionsHtml + "</select></div>" +
      body
    );
  }

  function bindStatsEvents() {
    var select = document.getElementById("stats-exercise-select");
    if (select) select.addEventListener("change", function () {
      State.statsExerciseId = select.value;
      State.statsData = null;
      render();
      loadStats();
    });

    var saveMaxBtn = document.getElementById("btn-save-declared-max");
    if (saveMaxBtn) saveMaxBtn.addEventListener("click", function () {
      var val = Number(document.getElementById("declared-max-input").value);
      if (!val || val <= 0) return;
      var ex = getExerciseById(State.statsExerciseId);
      DB.setDeclaredMax({ user_id: State.user.id, exercise_id: State.statsExerciseId, exercise_name: ex.name, declared_max_kg: val }).then(function () {
        showToast("Max déclaré enregistré");
        loadStats();
      });
    });

    if (State.statsData && State.statsData.points.length) {
      drawLineChart(document.getElementById("chart-1rm"), State.statsData.points.map(function (p) { return { x: p.date, y: p.estimated1RM }; }), "#00e5a0");
      drawLineChart(document.getElementById("chart-volume"), State.statsData.points.map(function (p) { return { x: p.date, y: p.volume }; }), "#4f8cff");
    }
  }

  /** Mini graphique en courbe, sans dépendance externe. */
  function drawLineChart(canvas, points, color) {
    if (!canvas || points.length === 0) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 300;
    var h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    var pad = 24;
    var ys = points.map(function (p) { return p.y; });
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    if (minY === maxY) { minY -= 1; maxY += 1; }

    function xAt(i) { return pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2); }
    function yAt(val) { return h - pad - ((val - minY) / (maxY - minY)) * (h - pad * 2); }

    ctx.strokeStyle = "#2a2f47";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach(function (p, i) {
      var x = xAt(i), y = yAt(p.y);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = color;
    points.forEach(function (p, i) {
      var x = xAt(i), y = yAt(p.y);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = "#9aa0c3";
    ctx.font = "11px sans-serif";
    ctx.fillText(String(Math.round(maxY)), 2, yAt(maxY) + 4);
    ctx.fillText(String(Math.round(minY)), 2, yAt(minY) + 4);
  }

  // -------------------------------------------------------------------
  // Historique
  // -------------------------------------------------------------------
  function goToHistorique() {
    State.screen = "historique";
    State.historyDetail = null;
    render();
    DB.getHistory(State.user.id).then(function (list) {
      State.historyList = list;
      if (State.screen === "historique" && !State.historyDetail) render();
    });
  }

  function renderHistorique() {
    if (State.historyDetail) return renderHistoryDetail();
    if (!State.historyList) return "<p>Chargement…</p>";
    if (State.historyList.length === 0) {
      return '<h1>Historique</h1><div class="empty-state"><span class="emoji">📖</span>Pas encore de séance enregistrée.</div>';
    }
    var itemsHtml = State.historyList.map(function (w) {
      return (
        '<div class="history-item" data-open-history="' + w.id + '">' +
        '<div><div class="date">' + new Date(w.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" }) + '</div><div class="name">' + (w.name || "Séance") + " · " + formatKg(w.total_volume) + "</div></div>" +
        '<div class="right"><div class="xp">+' + w.total_xp + " XP</div></div>" +
        "</div>"
      );
    }).join("");
    return '<h1>Historique</h1><div class="card">' + itemsHtml + "</div>";
  }

  function renderHistoryDetail() {
    var w = State.historyDetail;
    var exHtml = w.exercises.map(function (we) {
      var setsHtml = we.sets.map(function (s) { return '<div class="meta">' + s.weight_kg + " kg × " + s.reps + (s.rpe ? " · RPE " + s.rpe : "") + "</div>"; }).join("");
      return '<div class="exercise-row" style="cursor:default"><div><div class="name">' + we.exercise_name + "</div>" + setsHtml + "</div></div>";
    }).join("");
    return (
      '<button class="back-link" id="btn-back-history">← Retour à l\'historique</button>' +
      "<h2>" + (w.name || "Séance") + " — " + new Date(w.date).toLocaleDateString("fr-FR") + "</h2>" +
      '<div class="kpi-grid" style="margin-bottom:14px">' +
      '<div class="kpi"><div class="num">' + formatKg(w.total_volume) + '</div><div class="lbl">Tonnage</div></div>' +
      '<div class="kpi"><div class="num">' + w.total_xp + '</div><div class="lbl">XP</div></div>' +
      '<div class="kpi"><div class="num">' + w.exercises.length + '</div><div class="lbl">Exercices</div></div>' +
      "</div>" +
      exHtml
    );
  }

  function bindHistoriqueEvents() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-open-history]"), function (el) {
      el.addEventListener("click", function () {
        DB.getWorkoutDetail(el.dataset.openHistory).then(function (detail) {
          State.historyDetail = detail;
          render();
        });
      });
    });
    var back = document.getElementById("btn-back-history");
    if (back) back.addEventListener("click", function () { State.historyDetail = null; render(); });
  }

  // -------------------------------------------------------------------
  // Profil
  // -------------------------------------------------------------------
  function renderProfil() {
    var u = (State.cockpit && State.cockpit.user) || State.user;
    return (
      '<div class="card">' +
      '<div class="character-header"><div class="avatar-badge">' + initials(u.username) + '</div><div><div class="character-name">' + u.username + "</div></div></div>" +
      (u.age ? '<p>Âge : ' + u.age + " ans</p>" : "") +
      (u.height_cm ? "<p>Taille : " + u.height_cm + " cm</p>" : "") +
      (u.weight_kg ? "<p>Poids : " + u.weight_kg + " kg</p>" : "") +
      (u.goal ? "<p>Objectif : " + labelGoal(u.goal) + "</p>" : "") +
      (u.experience_level ? "<p>Niveau déclaré : " + labelExperience(u.experience_level) + "</p>" : "") +
      "</div>" +
      '<div class="card"><div class="card-title">Backend</div><p>Mode actuel : ' + (CONFIG.API_URL ? "connecté à Google Sheets" : "local (données stockées uniquement sur cet appareil/navigateur)") + "</p></div>" +
      '<button class="btn btn-ghost" id="btn-switch-user">Changer de profil / se déconnecter</button>'
    );
  }

  function labelGoal(g) {
    return { prise_muscle: "Prise de muscle", force: "Force", perte_gras: "Perte de gras", remise_forme: "Remise en forme" }[g] || g;
  }
  function labelExperience(e) {
    return { debutant: "Débutant", intermediaire: "Intermédiaire", confirme: "Confirmé" }[e] || e;
  }

  function bindProfilEvents() {
    var btn = document.getElementById("btn-switch-user");
    if (btn) btn.addEventListener("click", function () {
      localStorage.removeItem("levelup_user_id");
      localStorage.removeItem("levelup_username");
      State.user = null;
      State.cockpit = null;
      State.screen = "onboarding";
      render();
    });
  }

  // -------------------------------------------------------------------
  function bindScreenEvents() {
    if (State.screen === "onboarding") bindOnboarding();
    if (State.screen === "seance") bindSeanceEvents();
    if (State.screen === "stats") bindStatsEvents();
    if (State.screen === "historique") bindHistoriqueEvents();
    if (State.screen === "profil") bindProfilEvents();
  }

  boot();
})();
