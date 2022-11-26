/* Common useful functions shared between objects */

import { ChatUtility } from "./chat-utility.js";
import { RdDCombat } from "./rdd-combat.js";
import { Misc } from "./misc.js";
import { Grammar } from "./grammar.js";
import { TMRUtility } from "./tmr-utility.js";
import { DialogItemAchat } from "./dialog-item-achat.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { RdDDice } from "./rdd-dice.js";
import { RdDItem } from "./item.js";
import { Monnaie } from "./item-monnaie.js";
import { RdDPossession } from "./rdd-possession.js";
import { RdDNameGen } from "./rdd-namegen.js";
import { RdDConfirm } from "./rdd-confirm.js";
import { RdDCalendrier } from "./rdd-calendrier.js";
import { RdDCarac } from "./rdd-carac.js";

/* -------------------------------------------- */
// This table starts at 0 -> niveau -10
const carac_array = ["taille", "apparence", "constitution", "force", "agilite", "dexterite", "vue", "ouie", "odoratgout", "volonte", "intellect", "empathie", "reve", "chance", "melee", "tir", "lancer", "derobee"];
const difficultesLibres = [0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10];
const ajustementsConditions = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, +1, +2, +3, +4, +5, +6, +7, +8, +9, +10];
const ajustementsEncaissement = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, +1, +2, +3, +4, +5, +6, +7, +8, +9, +10, +11, +12, +13, +14, +15, +16, +17, +18, +19, +20, +21, +22, +23, +24, +25];

/* -------------------------------------------- */
function _buildAllSegmentsFatigue(max) {
  const cycle = [5, 2, 4, 1, 3, 0];
  let fatigue = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  for (let i = 0; i <= max; i++) {
    const ligneFatigue = duplicate(fatigue[i]);
    const caseIncrementee = cycle[i % 6];
    ligneFatigue[caseIncrementee]++;
    ligneFatigue[caseIncrementee + 6]++;
    ligneFatigue.fatigueMax = 2 * (i + 1);
    fatigue[i + 1] = ligneFatigue;
  }
  return fatigue;
}

/* -------------------------------------------- */
function _cumulSegmentsFatigue(matrix) {
  let cumulMatrix = [];
  for (let line of matrix) {
    let cumul = duplicate(line);

    for (let i = 1; i < 12; i++) {
      cumul[i] += cumul[i - 1];
    }
    cumulMatrix.push(cumul);
  }
  return cumulMatrix;
}

/* -------------------------------------------- */
const fatigueMatrix = _buildAllSegmentsFatigue(60);
const cumulFatigueMatrix = _cumulSegmentsFatigue(fatigueMatrix);

const fatigueMalus = [0, 0, 0, -1, -1, -1, -2, -3, -4, -5, -6, -7]; // Provides the malus for each segment of fatigue
const fatigueLineSize = [3, 6, 7, 8, 9, 10, 11, 12];
const fatigueLineMalus = [0, -1, -2, -3, -4, -5, -6, -7];
const fatigueMarche = {
  "aise": { "4": 1, "6": 2, "8": 3, "10": 4, "12": 6 },
  "malaise": { "4": 2, "6": 3, "8": 4, "10": 6 },
  "difficile": { "4": 3, "6": 4, "8": 6 },
  "tresdifficile": { "4": 4, "6": 6 }
}

/* -------------------------------------------- */
const definitionsBlessures = [
  { type: "legere", facteur: 2 },
  { type: "grave", facteur: 4 },
  { type: "critique", facteur: 6 }
]

/* -------------------------------------------- */
const nomEthylisme = ["Emeché", "Gris", "Pinté", "Pas frais", "Ivre", "Bu", "Complètement fait", "Ivre mort"];

/* -------------------------------------------- */
const definitionsEncaissement = {
  "mortel": [
    { minimum: undefined, maximum: 0, endurance: "0", vie: "0", eraflures: 0, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 1, maximum: 10, endurance: "1d4", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 11, maximum: 15, endurance: "1d6", vie: "0", eraflures: 0, legeres: 1, graves: 0, critiques: 0 },
    { minimum: 16, maximum: 19, endurance: "2d6", vie: "2", eraflures: 0, legeres: 0, graves: 1, critiques: 0 },
    { minimum: 20, maximum: undefined, endurance: "100", vie: "4 + @over20", eraflures: 0, legeres: 0, graves: 0, critiques: 1 },
  ],
  "non-mortel": [
    { minimum: undefined, maximum: 0, endurance: "0", vie: "0", eraflures: 0, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 1, maximum: 10, endurance: "1d4", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 11, maximum: 15, endurance: "1d6", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 16, maximum: 19, endurance: "2d6", vie: "0", eraflures: 0, legeres: 1, graves: 0, critiques: 0 },
    { minimum: 20, maximum: undefined, endurance: "100", vie: "0", eraflures: 0, legeres: 1, graves: 0, critiques: 0 },
  ],
  "cauchemar": [
    { minimum: undefined, maximum: 0, endurance: "0", vie: "0", eraflures: 0, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 1, maximum: 10, endurance: "1d4", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 11, maximum: 15, endurance: "1d6", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 16, maximum: 19, endurance: "2d6", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
    { minimum: 20, maximum: undefined, endurance: "3d6 + @over20", vie: "0", eraflures: 1, legeres: 0, graves: 0, critiques: 0 },
  ]
};

/* -------------------------------------------- */
export class RdDUtility {

  /* -------------------------------------------- */
  static async init() {
    Hooks.on("renderChatMessage", async (app, html, msg) => RdDUtility.onRenderChatMessage(app, html, msg));
    Hooks.on('renderChatLog', (log, html, chatLog) => RdDUtility.chatListeners(html));
  }

  /* -------------------------------------------- */
  static async preloadHandlebarsTemplates() {
    const templatePaths = [
      //Character Sheets
      'systems/foundryvtt-reve-de-dragon/templates/actor-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor-creature-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor-entite-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor-vehicule-sheet.html',
      // sous-parties de feuilles de personnages
      'systems/foundryvtt-reve-de-dragon/templates/actor/header-buttons.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/header-etat.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/header-compteurs.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/header-compteurs-creature.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/header-compteurs-entitee.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/header-effects.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/vue-detaillee.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/carac-main.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/carac-derivee.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/carac-creature.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/carac-entitee.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/comp-creature.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/comp-possession.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/carac-total.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/competence.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/competence-categorie.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/xp-competences.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/combat.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/blessures.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/blessure.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/maladies-poisons.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/possessions.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/taches.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/taches.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/oeuvres.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/oeuvre.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/jeux.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/alchimie.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/astrologie.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/non-haut-revant.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/haut-revant.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/dragon-queues.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/dragon-queue.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/dragon-souffles.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/dragon-tetes.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/hr-signes-draconiques.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/hr-rencontres.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/hr-sorts.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/hr-sorts-reserve.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/hr-meditations.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/hr-casestmr.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/xp-journal.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/editor-notes-mj.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/inventaire.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/inventaire-item.html',
      "systems/foundryvtt-reve-de-dragon/templates/actor/inventaire-monnaie.html",
      'systems/foundryvtt-reve-de-dragon/templates/actor/liens-animaux.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/liens-suivants.html',
      'systems/foundryvtt-reve-de-dragon/templates/actor/liens-vehicules.html',
      //Items
      'systems/foundryvtt-reve-de-dragon/templates/header-item.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-competence-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-competencecreature-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-arme-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-armure-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-objet-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-conteneur-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-sort-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-herbe-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-ingredient-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-livre-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-tache-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-potion-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-rencontre-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-queue-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-souffle-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-tarot-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-tete-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-ombre-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-monnaie-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-meditation-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-nourritureboisson-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-signedraconique-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-possession-sheet.html',
      'systems/foundryvtt-reve-de-dragon/templates/item-extraitpoetique-sheet.html',
      // partial enums
      'systems/foundryvtt-reve-de-dragon/templates/enum-caracteristiques.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-base-competence.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-aspect-tarot.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-categorie-competence.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-categorie-ingredient.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-categorie-parade.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-categorie-potion.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-categorie-vehicule.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-competence.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-herbesoin-ingredient.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-heures.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-initpremierround.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-niveau-ethylisme.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-rarete.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-categorie-queue.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-draconic.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-tmr-type.html',
      'systems/foundryvtt-reve-de-dragon/templates/enum-tmr-effet.html',
      // Partials
      'systems/foundryvtt-reve-de-dragon/templates/partial-description-overflow.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-description-sort.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-ajustements.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-diffLibre.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-diffFixe.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-diffCondition.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-surenc.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-enctotal.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-moral.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-forcer.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-roll-competences.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-select-carac.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-item-hautrevant.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-item-frequence.html',
      'systems/foundryvtt-reve-de-dragon/templates/partial-item-description.html',
      // Dialogs
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-resolution.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-competence.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-carac.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-sort.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-encaisser.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-validation-encaissement.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-meditation.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-tmr.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-alchimie.html',
      'systems/foundryvtt-reve-de-dragon/templates/dialog-astrologie-joueur.html',
      // Calendrier
      'systems/foundryvtt-reve-de-dragon/templates/calendar-template.html',
      'systems/foundryvtt-reve-de-dragon/templates/calendar-editor-template.html',
      // HUD
      'systems/foundryvtt-reve-de-dragon/templates/hud-actor-init.html',
      'systems/foundryvtt-reve-de-dragon/templates/hud-actor-attaque.html',
      // messages tchat
      'systems/foundryvtt-reve-de-dragon/templates/chat-infojet.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-description.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-info-appel-au-moral.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-info-distance.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-demande-defense.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-demande-attaque-particuliere.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-demande-attaque-etotal.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-appelchance.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-attaque.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-encaissement.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-parade.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-esquive.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-competence.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-general.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-tache.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-sort.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-alchimie.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-resultat-possession.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-actor-turn-summary.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-actor-competence-xp.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-actor-carac-xp.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-potionenchantee-chateaudormant.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-fabriquer-potion-base.html',
      'systems/foundryvtt-reve-de-dragon/templates/chat-signe-draconique-actor.html'
    ];

    Handlebars.registerHelper('upperFirst', str => Misc.upperFirst(str ?? 'Null'));
    Handlebars.registerHelper('lowerFirst', str => Misc.lowerFirst(str ?? 'Null'));
    Handlebars.registerHelper('upper', str => str?.toUpperCase() ?? 'NULL');
    Handlebars.registerHelper('le', str => Grammar.articleDetermine(str));
    Handlebars.registerHelper('apostrophe', (article, str) => Grammar.apostrophe(article, str));
    Handlebars.registerHelper('un', str => Grammar.articleIndetermine(str));
    Handlebars.registerHelper('accord', (genre, ...args) => Grammar.accord(genre, args));
    Handlebars.registerHelper('buildConteneur', (objet) => { return new Handlebars.SafeString(RdDUtility.buildConteneur(objet)); });
    Handlebars.registerHelper('buildContenu', (objet) => { return new Handlebars.SafeString(RdDUtility.buildContenu(objet, 1, true)); });
    Handlebars.registerHelper('caseTmr-label', coord => TMRUtility.getTMRLabel(coord));
    Handlebars.registerHelper('caseTmr-type', coord => TMRUtility.getTMRType(coord));
    Handlebars.registerHelper('typeTmr-name', type => TMRUtility.typeTmrName(type));
    Handlebars.registerHelper('effetRencontre-name', coord => TMRUtility.typeTmrName(coord));
    Handlebars.registerHelper('signeHeure', (key, heure)  => RdDCalendrier.getSigneAs(key, heure));
    Handlebars.registerHelper('min', (...args) => Math.min(...args.slice(0, -1)));
    Handlebars.registerHelper('regle-optionnelle', (option) => ReglesOptionelles.isUsing(option));
    Handlebars.registerHelper('trier', list => list.sort((a, b) => a.name.localeCompare(b.name)));
    Handlebars.registerHelper('filtreTriCompetences', competences => competences.filter(it => it.system.isVisible)
    .sort((a, b) => {
        if (a.name.startsWith("Survie") && b.name.startsWith("Survie")) {
          if (a.name.includes("Cité")) return -1;
          if (b.name.includes("Cité")) return 1;
          if (a.name.includes("Extérieur")) return -1;
          if (b.name.includes("Extérieur")) return 1;
          return a.name.localeCompare(b.name);
        }
        if (a.system.categorie.startsWith("melee") && b.system.categorie.startsWith("melee")) {
          if (a.name.includes("Corps")) return -1;
          if (b.name.includes("Corps")) return 1;
          if (a.name.includes("Dague")) return -1;
          if (b.name.includes("Dague")) return 1;
          if (a.name.includes("Esquive")) return -1;
          if (b.name.includes("Esquive")) return 1;
          return a.name.localeCompare(b.name);
        }
        if (a.name.startsWith("Voie") && b.name.startsWith("Voie")) {
          if (a.name.includes("Oniros")) return -1;
          if (b.name.includes("Oniros")) return 1;
          if (a.name.includes("Hypnos")) return -1;
          if (b.name.includes("Hypnos")) return 1;
          if (a.name.includes("Narcos")) return -1;
          if (b.name.includes("Narcos")) return 1;
          if (a.name.includes("Thanatos")) return -1;
          if (b.name.includes("Thanatos")) return 1;
          return a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      })
      );
    Handlebars.registerHelper('linkCompendium', (compendium, id, name) => `@Compendium[${compendium}.${id}]{${name}}`);

    return loadTemplates(templatePaths);
  }

  /* -------------------------------------------- */
  static async creerObjet(actorSheet) {
    let itemType = $(".item-type").val();
    await actorSheet.createItem('Nouveau ' + itemType, itemType);
  }

  /* -------------------------------------------- */
  static async selectObjetType(actorSheet) {
    let typeObjets = RdDItem.getTypesObjetsEquipement();
    let options = `<span class="competence-label">Selectionnez le type d'équipement</span><select class="item-type">`;
    for (let typeName of typeObjets) {
      options += `<option value="${typeName}">${typeName}</option>`
    }
    options += '</select>';
    let d = new Dialog({
      title: "Créer un équipement",
      content: options,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Créer l'objet",
          callback: () => this.creerObjet(actorSheet)
        }
      }
    });
    d.render(true);
  }

  /* -------------------------------------------- */
  static async selectTypeOeuvre(actorSheet) {
    let typeObjets = RdDItem.getTypesOeuvres();
    let options = `<span class="competence-label">Selectionnez le type d'oeuvre</span><select class="item-type">`;
    for (let typeName of typeObjets) {
      options += `<option value="${typeName}">${typeName}</option>`
    }
    options += '</select>';
    let d = new Dialog({
      title: "Créer un équipement",
      content: options,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Créer l'objet",
          callback: () => this.creerObjet(actorSheet)
        }
      }
    });
    d.render(true);
  }

  /* -------------------------------------------- */
  static buildListOptions(min, max) {
    let options = ""
    for (let i = min; i <= max; i++) {
      options += `<option value="${i}">${i}</option>`
    }
    return options;
  }

  /* -------------------------------------------- */
  static arrayOrEmpty(items) {
    if (items?.length) {
      return items;
    }
    return [];
  }

  /* -------------------------------------------- */
  static getNomEthylisme(niveauEthylisme) {
    let index = -niveauEthylisme;
    return index < 0 ? 'Aucun' : nomEthylisme[index];
  }

  /* -------------------------------------------- */
  static initAfficheContenu() { // persistent handling of conteneur show/hide
    if (!this.afficheContenu)
      this.afficheContenu = {};
  }
  /* -------------------------------------------- */
  static toggleAfficheContenu(conteneurId) {
    this.afficheContenu[conteneurId] = !this.afficheContenu[conteneurId];
  }
  /* -------------------------------------------- */
  static getAfficheContenu(conteneurId) {
    if (conteneurId)
      return this.afficheContenu[conteneurId];
    return undefined;
  }

  /* -------------------------------------------- */
  static filterItemsPerTypeForSheet(formData, itemTypes) {

    RdDUtility.filterEquipementParType(formData, itemTypes);

    formData.sorts = this.arrayOrEmpty(itemTypes['sort']);
    formData.rencontres = this.arrayOrEmpty(itemTypes['rencontre']);
    formData.casestmr = this.arrayOrEmpty(itemTypes['casetmr']);
    formData.signesdraconiques = this.arrayOrEmpty(itemTypes['signedraconique']);
    formData.queues = this.arrayOrEmpty(itemTypes['queue']);
    formData.souffles = this.arrayOrEmpty(itemTypes['souffle']);
    formData.ombres = this.arrayOrEmpty(itemTypes['ombre']);
    formData.tetes = this.arrayOrEmpty(itemTypes['tete']);
    formData.taches = this.arrayOrEmpty(itemTypes['tache']);
    formData.meditations = this.arrayOrEmpty(itemTypes['meditation']);
    formData.chants = this.arrayOrEmpty(itemTypes['chant']);
    formData.danses = this.arrayOrEmpty(itemTypes['danse']);
    formData.musiques = this.arrayOrEmpty(itemTypes['musique']);
    formData.oeuvres = this.arrayOrEmpty(itemTypes['oeuvre']);
    formData.jeux = this.arrayOrEmpty(itemTypes['jeu']);

    formData.recettescuisine = this.arrayOrEmpty(itemTypes['recettecuisine']);
    formData.recettesAlchimiques = this.arrayOrEmpty(itemTypes['recettealchimique']);
    formData.maladies = this.arrayOrEmpty(itemTypes['maladie']);
    formData.poisons = this.arrayOrEmpty(itemTypes['poison']);
    formData.possessions = this.arrayOrEmpty(itemTypes['possession']);
    formData.maladiesPoisons = formData.maladies.concat(formData.poisons);
    formData.competences = (itemTypes['competence'] ?? []).concat(itemTypes['competencecreature'] ?? []);
    formData.sortsReserve = this.arrayOrEmpty(itemTypes['sortreserve']);
  }

  static filterEquipementParType(formData, itemTypes) {
    formData.conteneurs = this.arrayOrEmpty(itemTypes['conteneur']);

    formData.materiel = this.arrayOrEmpty(itemTypes['objet']);
    formData.armes = this.arrayOrEmpty(itemTypes['arme']);
    formData.armures = this.arrayOrEmpty(itemTypes['armure']);
    formData.munitions = this.arrayOrEmpty(itemTypes['munition']);
    formData.livres = this.arrayOrEmpty(itemTypes['livre']);
    formData.potions = this.arrayOrEmpty(itemTypes['potion']);
    formData.ingredients = this.arrayOrEmpty(itemTypes['ingredient']);
    formData.herbes = this.arrayOrEmpty(itemTypes['herbe']);
    formData.monnaie = this.arrayOrEmpty(itemTypes['monnaie']);
    formData.monnaie.sort(Monnaie.triValeurDenier());
    formData.nourritureboissons = this.arrayOrEmpty(itemTypes['nourritureboisson']);
    formData.gemmes = this.arrayOrEmpty(itemTypes['gemme']);

    formData.objets = formData.conteneurs
      .concat(formData.materiel)
      .concat(formData.armes)
      .concat(formData.armures)
      .concat(formData.munitions)
      .concat(formData.livres)
      .concat(formData.potions)
      .concat(formData.ingredients)
      .concat(formData.herbes)
      .concat(formData.monnaie)
      .concat(formData.nourritureboissons)
      .concat(formData.gemmes);
  }

  /* -------------------------------------------- */
  static buildArbreDeConteneurs(conteneurs, objets) {
    let objetVersConteneur = {};
    // Attribution des objets aux conteneurs
    for (let conteneur of conteneurs) {
      conteneur.subItems = [];
      for (let id of conteneur.system.contenu ?? []) {
        let objet = objets.find(objet => (id == objet._id));
        if (objet) {
          objet.estContenu = true; // Permet de filtrer ce qui est porté dans le template
          objetVersConteneur[id] = conteneur._id;
          conteneur.subItems.push(objet);
        }
      }
    }
    for (let conteneur of conteneurs) {
      conteneur.system.encTotal = RdDUtility.calculEncContenu(conteneur, objets);
    }
    return objetVersConteneur;
  }

  /* -------------------------------------------- */
  static calculEncContenu(conteneur, objets) {
    const contenus = (conteneur.system.contenu ?? []).filter(id => id != undefined)
      .map(id => objets.find(it => (id == it.id)))
      .filter(it => it);
    let enc = Number(conteneur.system.encombrement ?? 0) * Number(conteneur.system.quantite ?? 1);
    for (let contenu of contenus) {
      if (contenu.type == 'conteneur') {
        enc += RdDUtility.calculEncContenu(contenu, objets);
      }
      else {
        enc += Number(contenu.system.encombrement ?? 0) * Number(contenu.system.quantite ?? 1)
      }
    }
    return enc
  }

  /* -------------------------------------------- */
  // Construit la liste des conteneurs de niveau 1 (c'est à dire non contenu eux-même dans un conteneur)
  static conteneursRacine(conteneurs) {
    return conteneurs.filter((conteneur, index, arr) => !conteneur.estContenu);
  }

  /* -------------------------------------------- */
  /** Construit la structure récursive des conteneurs, avec imbrication potentielle
   * 
   */
  static buildConteneur(objet, profondeur) {
    if (!profondeur) profondeur = 1;
    objet.niveau = profondeur;
    const isConteneur = objet.type == 'conteneur';
    const isOuvert = isConteneur && this.getAfficheContenu(objet._id);
    const isVide = isConteneur && objet.system.contenu.length == 0;
    const conteneur = Handlebars.partials['systems/foundryvtt-reve-de-dragon/templates/actor/inventaire-item.html']({
      item: objet,
      vide: isVide,
      ouvert: isOuvert
    });
    const contenu = isConteneur ? RdDUtility.buildContenu(objet, profondeur, isOuvert) : '';
    return conteneur + contenu;
  }

  /* -------------------------------------------- */
  static buildContenu(objet, profondeur, afficherContenu) {
    if (!profondeur) profondeur = 1;
    objet.niveau = profondeur;
    const display = afficherContenu ? 'item-display-show' : 'item-display-hide';
    //console.log("ITEM DISPLAYED", objet );
    let strContenu = `<ul class='item-list alterne-list ${display} list-item-margin${profondeur}'>`;
    for (let subItem of objet.subItems) {
      strContenu += this.buildConteneur(subItem, profondeur + 1);
    }
    return strContenu + "</ul>";
  }

  /* -------------------------------------------- */
  static getCaracArray() {
    return carac_array;
  }
  static getDifficultesLibres() {
    return difficultesLibres;
  }
  static getAjustementsConditions() {
    return ajustementsConditions;
  }
  static getAjustementsEncaissement() {
    return ajustementsEncaissement;
  }

  static getDefinitionsBlessures() {
    return definitionsBlessures;
  }

  /* -------------------------------------------- */
  static getSegmentsFatigue(maxEnd) {
    maxEnd = Math.max(maxEnd, 1);
    maxEnd = Math.min(maxEnd, fatigueMatrix.length);
    return fatigueMatrix[maxEnd];
  }

  /* -------------------------------------------- */
  static calculMalusFatigue(fatigue, maxEnd) {
    maxEnd = Math.max(maxEnd, 1);
    maxEnd = Math.min(maxEnd, cumulFatigueMatrix.length);
    let segments = cumulFatigueMatrix[maxEnd];
    for (let i = 0; i < 12; i++) {
      if (fatigue <= segments[i]) {
        return fatigueMalus[i]
      }
    }
    return -7;
  }

  /* -------------------------------------------- */
  static calculFatigueHtml(fatigue, endurance) {
    return ReglesOptionelles.isUsing("appliquer-fatigue") ? {
      malus: RdDUtility.calculMalusFatigue(fatigue, endurance),
      html: "<table class='table-fatigue'>" + RdDUtility.makeHTMLfatigueMatrix(fatigue, endurance).html() + "</table>"
    } : { malus: 0, html: '' };
  }

  /* -------------------------------------------- */
  // Build the nice (?) html table used to manage fatigue.
  // max should be the endurance max value
  static makeHTMLfatigueMatrix(fatigue, maxEndurance) {
    let segments = this.getSegmentsFatigue(maxEndurance);
    return this.makeHTMLfatigueMatrixForSegment(fatigue, segments);
  }

  /* -------------------------------------------- */
  static makeHTMLfatigueMatrixForSegment(fatigue, segments) {
    fatigue = Math.max(fatigue, 0);
    fatigue = Math.min(fatigue, segments.fatigueMax);

    let table = $("<table/>").addClass('table-fatigue');
    let segmentIdx = 0;
    let fatigueCount = 0;
    for (var line = 0; line < fatigueLineSize.length; line++) {
      let row = $("<tr/>");
      let segmentsPerLine = fatigueLineSize[line];
      row.append("<td class='fatigue-malus'>" + fatigueLineMalus[line] + "</td>");
      while (segmentIdx < segmentsPerLine) {
        let freeSize = segments[segmentIdx];
        for (let col = 0; col < 5; col++) {
          if (col < freeSize) {
            if (fatigueCount < fatigue)
              row.append("<td class='fatigue-used'>X</td>");


            else
              row.append("<td class='fatigue-free'/>");
            fatigueCount++;
          } else {
            row.append("<td class='fatigue-none'/>");
          }
        }
        row.append("<td class='fatigue-separator'/>");
        segmentIdx = segmentIdx + 1;
      }
      table.append(row);
    }
    return table;
  }

  /* -------------------------------------------- */
  static async getLocalisation(type = 'personnage') {
    let result = await RdDDice.rollTotal("1d20");
    let txt = ""
    if (type == 'personnage') {
      if (result <= 3) txt = "Jambe, genou, pied, jarret";
      else if (result <= 7) txt = "Hanche, cuisse, fesse";
      else if (result <= 9) txt = "Ventre, reins";
      else if (result <= 12) txt = "Poitrine, dos";
      else if (result <= 14) txt = "Avant-bras, main, coude";
      else if (result <= 18) txt = "Epaule, bras, omoplate";
      else if (result == 19) txt = "Tête";
      else if (result == 20) txt = "Tête (visage)";
    } else {
      if (result <= 7) txt = "Jambes/Pattes";
      else if (result <= 18) txt = "Corps";
      else if (result <= 20) txt = "Tête";
    }

    return { result: result, label: txt };
  }

  /* -------------------------------------------- */
  static async jetEncaissement(rollData, armure, options = { showDice: HIDE_DICE }) {
    let formula = "2d10";

    // Chaque dé fait au minmum la difficulté libre
    if (ReglesOptionelles.isUsing('degat-minimum-malus-libre')) {
      if (rollData.diffLibre < 0) {
        let valeurMin = Math.abs(rollData.diffLibre);
        formula += "min" + valeurMin;
      }
    }
    // Chaque dé fait au minmum la difficulté libre
    if (ReglesOptionelles.isUsing('degat-ajout-malus-libre')) {
      if (rollData.diffLibre < 0) {
        let valeurMin = Math.abs(rollData.diffLibre);
        formula += "+" + valeurMin;
      }
    }

    let roll = await RdDDice.roll(formula, options);

    // 1 dé fait au minmum la difficulté libre
    if (ReglesOptionelles.isUsing('degat-minimum-malus-libre-simple')) {
      if (rollData.diffLibre < 0) {
        let valeurMin = Math.abs(rollData.diffLibre);
        if (roll.terms[0].results[0].result < valeurMin) {
          roll.terms[0].results[0].result = valeurMin;
        } else if (roll.terms[0].results[1].result < valeurMin) {
          roll.terms[0].results[1].result = valeurMin;
        }
        roll._total = roll.terms[0].results[0].result + roll.terms[0].results[1].result;
      }
    }

    return await RdDUtility.prepareEncaissement(rollData, roll, armure);
  }
  
  /* -------------------------------------------- */
  static async prepareEncaissement(rollData, roll, armure) {
    const jetTotal = roll.total + rollData.dmg.total - armure;
    let encaissement = RdDUtility._selectEncaissement(jetTotal, rollData.dmg.mortalite);
    let over20 = Math.max(jetTotal - 20, 0);
    encaissement.dmg = rollData.dmg;
    encaissement.dmg.loc = rollData.dmg.loc ?? await RdDUtility.getLocalisation(this.type);
    encaissement.dmg.loc.label = encaissement.dmg.loc.label ?? 'Corps;';
    encaissement.roll = roll;
    encaissement.armure = armure;
    encaissement.total = jetTotal;
    encaissement.vie = await RdDUtility._evaluatePerte(encaissement.vie, over20);
    encaissement.endurance = await RdDUtility._evaluatePerte(encaissement.endurance, over20);
    encaissement.penetration = rollData.arme?.system.penetration ?? 0;
    encaissement.blessures = (
      encaissement.critiques> 0 ? "Critique":
      encaissement.graves> 0 ? "Grave":
      encaissement.legeres> 0 ? "Légère":
      encaissement.eraflures>0 ? "Contusions/Eraflures":
      'Aucune'
    );
    return encaissement;
  }

  /* -------------------------------------------- */
  static _selectEncaissement(degats, mortalite) {
    const table = definitionsEncaissement[mortalite] === undefined ? definitionsEncaissement["mortel"] : definitionsEncaissement[mortalite];
    for (let encaissement of table) {
      if ((encaissement.minimum === undefined || encaissement.minimum <= degats)
        && (encaissement.maximum === undefined || degats <= encaissement.maximum)) {
        return duplicate(encaissement);
      }
    }
    return duplicate(table[0]);
  }

  /* -------------------------------------------- */
  static async _evaluatePerte(formula, over20) {
    let perte = new Roll(formula, { over20: over20 });
    await perte.evaluate({ async: true });
    return perte.total;
  }

  /* -------------------------------------------- */
  static currentFatigueMalus(value, max) {
    if (ReglesOptionelles.isUsing("appliquer-fatigue")) {
      max = Math.max(1, Math.min(max, 60));
      value = Math.min(max * 2, Math.max(0, value));

      let fatigueTab = fatigueMatrix[max];
      let fatigueRem = value;
      for (let idx = 0; idx < fatigueTab.length; idx++) {
        fatigueRem -= fatigueTab[idx];
        if (fatigueRem <= 0) {
          return fatigueMalus[idx];
        }
      }
      return -7; // This is the max !
    }
    return 0;
  }

  /* -------------------------------------------- */
  static async responseNombreAstral(callData) {
    let actor = game.actors.get(callData.id);
    actor.ajouteNombreAstral(callData);
  }

  /* -------------------------------------------- */
  static onSocketMessage(sockmsg) {
    switch (sockmsg.msg) {
      case "msg_gm_chat_message":
        return ChatUtility.handleGMChatMessage(sockmsg.data);
      case "msg_sync_time":
        return game.system.rdd.calendrier.syncPlayerTime(sockmsg.data);
      case "msg_request_nombre_astral":
        return game.system.rdd.calendrier.requestNombreAstral(sockmsg.data);
      case "msg_response_nombre_astral":
        return RdDUtility.responseNombreAstral(sockmsg.data);
      case "msg_tmr_move":
        let actor = game.actors.get(sockmsg.data.actorId);
        if (actor.isOwner || game.user.isGM) {
          actor.refreshTMRView();
        }
        break;
    }
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {
    RdDCombat.registerChatCallbacks(html);

    // Gestion spécifique message passeurs
    html.on("click", '.tmr-passeur-coord a', event => {
      let coord = event.currentTarget.attributes['data-tmr-coord'].value;
      let actorId = event.currentTarget.attributes['data-actor-id'].value;
      let actor = game.actors.get(actorId);
      actor.tmrApp.positionnerDemiReve(coord);
    });
    // Gestion spécifique des sorts en réserve multiples (ie têtes)
    html.on("click", '.declencher-sort-reserve', event => {
      let coord = event.currentTarget.attributes['data-tmr-coord'].value;
      let sortId = event.currentTarget.attributes['data-sort-id'].value;
      let actorId = event.currentTarget.attributes['data-actor-id'].value;
      let actor = game.actors.get(actorId);
      actor.tmrApp.lancerSortEnReserve(coord, sortId);
      // TODO: supprimer le message?
    });

    // gestion bouton tchat Possession
    html.on("click", '.defense-possession', event => {
      let attackerId = event.currentTarget.attributes['data-attackerId'].value
      let defenderId = event.currentTarget.attributes['data-defenderId'].value
      let possessionId = event.currentTarget.attributes['data-possessionId'].value
      RdDPossession.onDefensePossession(attackerId, defenderId, possessionId)
    });

    // gestion bouton tchat Acheter
    html.on("click", '.button-acheter', event => {
      const venteData = DialogItemAchat.venteData(event.currentTarget);
      if (venteData) {
        DialogItemAchat.onAcheter(venteData);
      }
    });
    html.on("click", '.button-creer-acteur', event => RdDNameGen.onCreerActeur(event));

    // Gestion du bouton payer
    html.on("click", '.payer-button', event => {
      let sumdenier = event.currentTarget.attributes['data-somme-denier']?.value ?? 0;
      let quantite = event.currentTarget.attributes['data-quantite']?.value ?? 1;
      let fromActorId = event.currentTarget.attributes['data-actor-id']?.value;
      let jsondata = event.currentTarget.attributes['data-jsondata']
      let objData
      if (jsondata) {
        objData = JSON.parse(jsondata.value)
      }
      let actor = RdDUtility.getSelectedActor("Pour effectuer le paiement:");
      if (actor) {
        actor.depenserDeniers(sumdenier, objData, quantite, fromActorId);
        ChatUtility.removeChatMessageId(RdDUtility.findChatMessageId(event.currentTarget));
      }
    });
  }

  static findChatMessageId(current) {
    return RdDUtility.getChatMessageId(RdDUtility.findChatMessage(current));
  }

  static getChatMessageId(node) {
    return node?.attributes.getNamedItem('data-message-id')?.value;
  }

  static findChatMessage(current) {
    return RdDUtility.findNodeMatching(current, it => it.classList.contains('chat-message') && it.attributes.getNamedItem('data-message-id'));
  }

  static findNodeMatching(current, predicate) {
    if (current) {
      if (predicate(current)) {
        return current;
      }
      return RdDUtility.findNodeMatching(current.parentElement, predicate);
    }
    return undefined;
  }

  static getSelectedActor(msgPlayer = undefined) {
    if (canvas.tokens.controlled.length == 1) {
      let token = canvas.tokens.controlled[0];
      if (token.actor) {
        return token.actor;
      }
      if (msgPlayer != undefined) {
        msgPlayer += "<br>le token sélectionné doit être lié à un personnage";
      }
    }
    if (game.user.character) {
      return game.user.character;
    }
    if (msgPlayer != undefined) {
      msgPlayer += "<br>vous pouvez sélectionner un seul token lié à un personnage";
      msgPlayer += "<br>vous devez être connecté comme joueur avec un personnage sélectionné";
      ui.notifications.warn(msgPlayer);
      ChatMessage.create({ content: msgPlayer, whisper: [game.user] });
    }
    return undefined;
  }

  /* -------------------------------------------- */
  static createMonnaie(name, valeur_deniers, img = "", enc = 0.01) {
    let piece = {
      name: name, type: 'monnaie', img: img, _id: randomID(16),
      dasystemta: {
        quantite: 0,
        valeur_deniers: valeur_deniers,
        encombrement: enc,
        description: ""
      }
    }
    return piece;
  }

  /* -------------------------------------------- */
  static afficherDemandePayer(som1, som2) {
    som1 = (som1) ? som1.toLowerCase() : "0d";
    som2 = (som2) ? som2.toLowerCase() : "0d";
    let regExp = /(\d+)(\w+)/g;
    let p1 = regExp.exec(som1);
    regExp = /(\d+)(\w+)/g;
    let p2 = regExp.exec(som2);
    let sumd = 0;
    let sums = 0;
    if (p1[2] == 'd') sumd += Number(p1[1]);
    if (p1[2] == 's') sums += Number(p1[1]);
    if (p2[2] == 'd') sumd += Number(p2[1]);
    if (p2[2] == 's') sums += Number(p2[1]);

    let sumtotald = sumd + (sums * 100);
    let msgPayer = "La somme de " + sums + " Sols et " + sumd + " Deniers est à payer, cliquer sur le lien ci-dessous si besoin.<br>";
    msgPayer += "<a class='payer-button chat-card-button' data-somme-denier='" + sumtotald + "'>Payer</a>"
    ChatMessage.create({ content: msgPayer });
  }

  /* -------------------------------------------- */
  static chatDataSetup(content, modeOverride, isRoll = false, forceWhisper) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) { // Final force !
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }

  /* -------------------------------------------- */
  static confirmerSuppressionSubacteur(sheet, subActor, htmlToDelete) {
    RdDConfirm.confirmer({
      settingConfirmer: "confirmation-supprimer-lien-acteur",
      content: `<p>Etes vous certain de vouloir supprimer le lien vers ${subActor.name} ?</p>`,
      title: 'Confirmer la suppression',
      buttonLabel: 'Supprimer le lien',
      onAction: () => {
        console.log('Delete : ', subActor.id);
        sheet.actor.removeSubacteur(subActor.id);
        RdDUtility.slideOnDelete(sheet, htmlToDelete);
      }
    })
  }

  /* -------------------------------------------- */
  static async confirmerSuppressionItem(sheet, item, htmlToDelete) {
    const itemId = item.id;
    const confirmationSuppression = {
      settingConfirmer: "confirmation-supprimer-" + item.getItemGroup(),
      content: `<p>Etes vous certain de vouloir supprimer: ${item.name}?</p>`,
      title: `Supprimer ${item.name}`,
      buttonLabel: "Supprimer",
      onAction: () => {
        console.log('Delete : ', itemId);
        sheet.actor.deleteEmbeddedDocuments('Item', [itemId], { renderSheet: false });
        RdDUtility.slideOnDelete(sheet, htmlToDelete);
      }
    };
    if (item.isConteneurNonVide()) {
      confirmationSuppression.content += `<p>Ce conteneur n'est pas vide. Que voulez vous supprimer?</p>`;
      confirmationSuppression.settingConfirmer = undefined;
      RdDConfirm.confirmer(confirmationSuppression,
        {
          'deleteall': {
            icon: '<i class="fas fa-check"></i>',
            label: "Supprimer conteneur et contenu",
            callback: () => {
              console.log("Delete : ", itemId);
              sheet.actor.deleteAllConteneur(itemId, { renderSheet: false });
              RdDUtility.slideOnDelete(sheet, htmlToDelete);
            }
          }
        });
    }
    else {
      RdDConfirm.confirmer(confirmationSuppression)
    }
  }

  static slideOnDelete(sheet, htmlToDelete) {
    return htmlToDelete.slideUp(200, () => sheet.render(false));
  }

  /* -------------------------------------------- */
  static afficherHeuresChanceMalchance(heureNaissance) {
    if (game.user.isGM) {
      let heure = game.system.rdd.calendrier.findHeure(heureNaissance);
      if (heureNaissance && heure) {
        let ajustement = game.system.rdd.calendrier.getAjustementAstrologique(heureNaissance);
        const current = game.system.rdd.calendrier.findHeure(game.system.rdd.calendrier.getCurrentHeure());
        ChatMessage.create({
          content: `A l'heure de <strong>${current.label}</strong>, le modificateur de Chance/Malchance est de <strong>${Misc.toSignedString(ajustement)}</strong> pour l'heure de naissance <strong>${heure.label}</strong>.`,
          whisper: ChatMessage.getWhisperRecipients("GM")
        });
      }
      else if (heureNaissance) {
        ui.notifications.warn(heureNaissance + " ne correspond pas à une heure de naissance");
      }
      else {
        ui.notifications.warn("Pas d'heure de naissance selectionnée");
      }
    } else {
      ui.notifications.warn("Vous n'avez pas accès à cette commande");
    }
  }

  /*-------------------------------------------- */
  static checkThanatosXP(compName) {
    if (compName.includes('Thanatos')) {
      let message = "Vous avez mis des points d'Expérience dans la Voie de Thanatos !<br>Vous devez réduire manuellement d'un même montant d'XP une autre compétence Draconique.";
      ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients(game.user.name),
        content: message
      });
    }
  }

  /*-------------------------------------------- */
  static async onRenderChatMessage(app, html, msg) {
    // TODO 
    //console.log(app, html, msg);
  }

}
