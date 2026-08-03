/**
 * Bibliothèque d'exercices — donnée de référence statique (front-end).
 * Structure volontairement simple pour pouvoir ajouter des exercices
 * facilement (il suffit d'ajouter un objet au tableau EXERCISES).
 *
 * video_url : vide pour le MVP, prêt à être rempli plus tard sans
 * changement de structure.
 */
var EXERCISES = [
  // Pectoraux
  { id: "dev_couche", name: "Développé couché", muscle_group: "pectoraux", category: "pectoraux", description: "Mouvement de base pour les pectoraux, presse horizontale au banc.", main_cues: "Omoplates serrées, trajectoire de la barre en légère diagonale.", common_mistakes: "Rebond sur la poitrine, coudes trop écartés.", video_url: "" },
  { id: "dev_incline", name: "Développé incliné", muscle_group: "pectoraux", category: "pectoraux", description: "Cible le haut des pectoraux.", main_cues: "Banc 30-45°, barre descend vers le haut de la poitrine.", common_mistakes: "Inclinaison trop forte (devient un mouvement d'épaules).", video_url: "" },
  { id: "dev_decline", name: "Développé décliné", muscle_group: "pectoraux", category: "pectoraux", description: "Cible le bas des pectoraux.", main_cues: "Contrôle la descente, pieds bien calés.", common_mistakes: "Amplitude trop courte.", video_url: "" },
  { id: "dips", name: "Dips", muscle_group: "pectoraux", category: "pectoraux", description: "Poids du corps, pectoraux/triceps.", main_cues: "Buste penché en avant pour cibler les pectoraux.", common_mistakes: "Épaules qui remontent vers les oreilles.", video_url: "" },
  { id: "ecarte_halteres", name: "Écartés haltères", muscle_group: "pectoraux", category: "pectoraux", description: "Isolation des pectoraux.", main_cues: "Légère flexion des coudes maintenue tout du long.", common_mistakes: "Coudes qui se tendent complètement en haut.", video_url: "" },
  { id: "ecarte_poulie", name: "Écartés poulie", muscle_group: "pectoraux", category: "pectoraux", description: "Isolation des pectoraux, tension constante.", main_cues: "Trajectoire en arc de cercle.", common_mistakes: "Trop de poids, mouvement tiré par les épaules.", video_url: "" },

  // Dos
  { id: "tractions", name: "Tractions", muscle_group: "dos", category: "dos", description: "Poids du corps, dos et biceps.", main_cues: "Tirer les coudes vers le bas et l'arrière.", common_mistakes: "Amplitude partielle, élan.", video_url: "" },
  { id: "tirage_vertical", name: "Tirage vertical", muscle_group: "dos", category: "dos", description: "Variante machine des tractions.", main_cues: "Buste légèrement en arrière, tirer vers le haut de la poitrine.", common_mistakes: "Tirer derrière la nuque.", video_url: "" },
  { id: "rowing_barre", name: "Rowing barre", muscle_group: "dos", category: "dos", description: "Épaisseur du dos.", main_cues: "Dos plat, tirer vers le nombril.", common_mistakes: "Dos arrondi, à-coups.", video_url: "" },
  { id: "rowing_haltere", name: "Rowing haltère", muscle_group: "dos", category: "dos", description: "Travail unilatéral du dos.", main_cues: "Appui sur un banc, tirer le coude vers le plafond.", common_mistakes: "Rotation du buste.", video_url: "" },
  { id: "tirage_horizontal", name: "Tirage horizontal", muscle_group: "dos", category: "dos", description: "Épaisseur du dos, machine à poulie basse.", main_cues: "Buste stable, tirer vers l'abdomen.", common_mistakes: "Se pencher trop en arrière pour tricher.", video_url: "" },

  // Épaules
  { id: "dev_militaire", name: "Développé militaire", muscle_group: "epaules", category: "epaules", description: "Mouvement de base pour les épaules.", main_cues: "Gainage, barre part devant le menton.", common_mistakes: "Cambrer excessivement le bas du dos.", video_url: "" },
  { id: "dev_halteres", name: "Développé haltères", muscle_group: "epaules", category: "epaules", description: "Variante haltères, plus d'amplitude.", main_cues: "Coudes légèrement devant le buste.", common_mistakes: "Verrouillage brutal des coudes en haut.", video_url: "" },
  { id: "elevations_laterales", name: "Élévations latérales", muscle_group: "epaules", category: "epaules", description: "Isolation du deltoïde latéral.", main_cues: "Monter jusqu'à l'horizontale, coudes légèrement fléchis.", common_mistakes: "Utiliser l'élan du buste.", video_url: "" },
  { id: "oiseau", name: "Oiseau", muscle_group: "epaules", category: "epaules", description: "Isolation du deltoïde postérieur.", main_cues: "Buste penché, tirer les coudes vers l'extérieur.", common_mistakes: "Charge trop lourde, mouvement tronqué.", video_url: "" },

  // Biceps
  { id: "curl_barre", name: "Curl barre", muscle_group: "biceps", category: "biceps", description: "Mouvement de base biceps.", main_cues: "Coudes fixes le long du corps.", common_mistakes: "Balancer le buste pour tricher.", video_url: "" },
  { id: "curl_haltere", name: "Curl haltère", muscle_group: "biceps", category: "biceps", description: "Variante unilatérale.", main_cues: "Supination progressive en montant.", common_mistakes: "Coudes qui avancent.", video_url: "" },
  { id: "curl_marteau", name: "Curl marteau", muscle_group: "biceps", category: "biceps", description: "Cible aussi le brachial.", main_cues: "Prise neutre maintenue tout du long.", common_mistakes: "Élan du poignet.", video_url: "" },

  // Triceps
  { id: "extension_poulie", name: "Extension poulie (pushdown)", muscle_group: "triceps", category: "triceps", description: "Isolation des triceps.", main_cues: "Coudes fixes contre le corps.", common_mistakes: "Coudes qui s'écartent.", video_url: "" },
  { id: "barre_front", name: "Barre au front", muscle_group: "triceps", category: "triceps", description: "Extension triceps allongé.", main_cues: "Coudes fixes, descente contrôlée vers le front.", common_mistakes: "Coudes qui partent vers l'arrière.", video_url: "" },
  { id: "dips_triceps", name: "Dips (buste droit)", muscle_group: "triceps", category: "triceps", description: "Variante dips orientée triceps.", main_cues: "Buste vertical, coudes proches du corps.", common_mistakes: "Amplitude trop courte.", video_url: "" },

  // Jambes (quadriceps / ischio / fessiers / mollets)
  { id: "squat", name: "Squat", muscle_group: "jambes", category: "quadriceps", description: "Mouvement de base pour les jambes.", main_cues: "Genoux dans l'axe des pieds, dos gainé.", common_mistakes: "Genoux qui rentrent vers l'intérieur.", video_url: "" },
  { id: "presse", name: "Presse", muscle_group: "jambes", category: "quadriceps", description: "Variante guidée du squat.", main_cues: "Bas du dos collé au dossier.", common_mistakes: "Amplitude excessive qui décolle le bassin.", video_url: "" },
  { id: "fentes", name: "Fentes", muscle_group: "jambes", category: "quadriceps", description: "Travail unilatéral des jambes.", main_cues: "Genou avant aligné avec la cheville.", common_mistakes: "Pas trop court, genou qui dépasse la pointe du pied.", video_url: "" },
  { id: "leg_extension", name: "Leg extension", muscle_group: "jambes", category: "quadriceps", description: "Isolation quadriceps.", main_cues: "Contraction maintenue en haut du mouvement.", common_mistakes: "Charge trop lourde, mouvement brusque.", video_url: "" },
  { id: "leg_curl", name: "Leg curl", muscle_group: "jambes", category: "ischio-jambiers", description: "Isolation ischio-jambiers.", main_cues: "Bassin plaqué contre le banc/appui.", common_mistakes: "Décoller le bassin pour tricher.", video_url: "" },
  { id: "souleve_terre_jt", name: "Soulevé de terre jambes tendues", muscle_group: "jambes", category: "ischio-jambiers", description: "Ischio-jambiers et chaîne postérieure.", main_cues: "Dos plat, légère flexion des genoux, hanches vers l'arrière.", common_mistakes: "Dos qui s'arrondit.", video_url: "" },

  // Abdominaux / Full Body
  { id: "crunch", name: "Crunch", muscle_group: "abdominaux", category: "abdominaux", description: "Isolation des abdominaux.", main_cues: "Mouvement court, contrôlé.", common_mistakes: "Tirer sur la nuque.", video_url: "" },
  { id: "gainage", name: "Gainage (planche)", muscle_group: "abdominaux", category: "abdominaux", description: "Gainage statique.", main_cues: "Corps aligné tête-bassin-talons.", common_mistakes: "Bassin qui tombe ou qui monte trop.", video_url: "" },
  { id: "souleve_terre", name: "Soulevé de terre", muscle_group: "full_body", category: "full_body", description: "Mouvement polyarticulaire complet.", main_cues: "Barre proche du corps, dos plat, pousser dans le sol.", common_mistakes: "Dos qui s'arrondit, barre qui s'éloigne du corps.", video_url: "" },
  { id: "clean", name: "Clean", muscle_group: "full_body", category: "full_body", description: "Mouvement explosif complet.", main_cues: "Extension complète des hanches avant la réception.", common_mistakes: "Tirer uniquement avec les bras.", video_url: "" },
];

var MUSCLE_GROUPS = [
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos", label: "Dos" },
  { id: "epaules", label: "Épaules" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "jambes", label: "Jambes" },
  { id: "abdominaux", label: "Abdominaux" },
  { id: "full_body", label: "Full Body" },
];

function getExerciseById(id) {
  for (var i = 0; i < EXERCISES.length; i++) {
    if (EXERCISES[i].id === id) return EXERCISES[i];
  }
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { EXERCISES: EXERCISES, MUSCLE_GROUPS: MUSCLE_GROUPS, getExerciseById: getExerciseById };
}
