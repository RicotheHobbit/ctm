import { SYSTEM_RDD } from "../constants.js";
import { Misc } from "../misc.js";

const listeReglesOptionelles = [
  { group: 'Règles de combat', name: 'recul', descr: "Appliquer le recul en cas de particulière en force ou de charge" },
  { group: 'Règles de combat', name: 'resistanceArmeParade', descr: "Faire le jet de résistance des armes lors de parades pouvant les endommager" },
  { group: 'Règles de combat', name: 'deteriorationArmure', descr: "Tenir compte de la détérioration des armures" },
  { group: 'Règles de combat', name: 'defenseurDesarme', descr: "Le défenseur peut être désarmé en parant une particulière en force ou une charge avec une arme autre qu'un bouclier" },
  { group: 'Règles de combat', name: 'categorieParade', descr: "Le défenseur doit obtenir une significative en cas de parade avec des armes de catégories différentes" },
  { group: 'Règles de combat', name: 'tripleSignificative', descr: "En cas de demi-surprise, d'attaque particulière en finesse, et de catégories d'armes différentes, le défenseur doit obtenir 1/8 des chances de succès" },
  { group: 'Règles de combat', name: 'degat-minimum-malus-libre-simple', descr: "Le malus libre d'attaque remplace une des valeurs de dés d'encaissement si elle est plus petite. Exemple : la difficulté libre de l'attaquant est de -4. Sur le jet d'encaissement, si le plus petit dé est inférieur à 4, alors il devient 4.", default: false },
  { group: 'Règles de combat', name: 'degat-minimum-malus-libre', descr: "Le malus libre d'attaque remplace une valeur de dés d'encaissement si elle est plus petite. Exemple : la difficulté libre de l'attaquant est de -4. Sur le jet d'encaissement, tout résultat inférieur à 4 devient 4.", default: false },
  { group: 'Règles de combat', name: 'degat-ajout-malus-libre', descr: "Le malus libre d'attaque s'ajoute au jet d'encaissement et aux autres bonus. Exemple : la difficulté libre de l'attaquant est de -4. Le jet d'encaissement est effectué à 2d10+4, plus les bonus de situation et d'armes.", default: false },
  { group: 'Règles de combat', name: 'validation-encaissement-gr', descr: "Le Gardien des Rêves doit valider les jets d'encaissement et peut les changer.", default: false },

  { group: 'Règles générales', name: 'astrologie', descr: "Appliquer les ajustements astrologiques aux jets de chance et aux rituels"},
  { group: 'Règles générales', name: 'afficher-prix-joueurs', descr: "Afficher le prix de l'équipement des joueurs", uniquementJoueur: true},
  { group: 'Règles générales', name: 'appliquer-fatigue', descr: "Appliquer les règles de fatigue"},
  { group: 'Règles générales', name: 'afficher-colonnes-reussite', descr: "Afficher le nombre de colonnes de réussite ou d'échec", default: false },

  { group: 'Confirmations', name: 'confirmer-combat-sans-cible',         descr: "Confirmer avant une attaque sans cible", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-tmr',                    descr: "Confirmer pour monter dans les TMR", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-refouler',               descr: "Confirmer avant de refouler", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-vider',                  descr: "Confirmer pour vider l'équipement", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-lien-acteur',  descr: "Confirmer pour détacher un animal/suivant/véhicule", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-equipement',   descr: "Confirmer la suppression des équipements", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-oeuvre',       descr: "Confirmer la suppression des oeuvres", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-connaissance', descr: "Confirmer la suppression des connaissances", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-draconique',   descr: "Confirmer la suppression des queues, souffles, têtes", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-effet',        descr: "Confirmer la suppression des effets", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-competence',   descr: "Confirmer la suppression des compétences", scope: "client"},
  { group: 'Confirmations', name: 'confirmation-supprimer-autres',       descr: "Confirmer la suppression des autres types d'Objets", scope: "client"},
];

const uniquementJoueur = listeReglesOptionelles.filter(it => it.uniquementJoueur).map(it=>it.name);

export class ReglesOptionelles extends FormApplication {
  static init() {
    for (const regle of listeReglesOptionelles) {
      const name = regle.name;
      const id = ReglesOptionelles._getIdRegle(name);
      game.settings.register(SYSTEM_RDD, id, { name: id, scope: regle.scope ?? "world", config: false, default: regle.default == undefined ? true : regle.default, type: Boolean });
    }

    game.settings.registerMenu(SYSTEM_RDD, "rdd-options-regles", {
      name: "Choisir les règles optionelles",
      label: "Règles optionelles",
      hint: "Ouvre la fenêtre de sélection des règles optionelles",
      icon: "fas fa-bars",
      type: ReglesOptionelles
    });
  }

  constructor(...args) {
    super(...args);
  }

  static _getIdRegle(name) {
    return `rdd-option-${name}`;
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      id: "regles-optionelles",
      template: "systems/ctm/templates/settings/regles-optionelles.html",
      height: 600,
      width: 450,
      minimizable: false,
      closeOnSubmit: true,
      title: "Règles optionnelles"
    });
    return options;
  }

  getData() {
    let formData = super.getData();
    const regles = listeReglesOptionelles.filter(it => game.user.isGM || it.scope == "client").map(it => {
      it = duplicate(it);
      it.id = ReglesOptionelles._getIdRegle(it.name);
      it.active = ReglesOptionelles.isSet(it.name);
      return it;
    });
    formData.regles = regles;
    formData.groups = Misc.classify(regles, it => it.group);
    return formData;
  }

  static isUsing(name) {
    if (game.user.isGM && uniquementJoueur.includes(name)) {
      return true;
    }
    return ReglesOptionelles.isSet(name);
  }

  static isSet(name) {
    return game.settings.get(SYSTEM_RDD, ReglesOptionelles._getIdRegle(name));
  }

  static set(name, value) {
    return game.settings.set(SYSTEM_RDD, ReglesOptionelles._getIdRegle(name), value ? true: false);
  }

  activateListeners(html) {
    html.find(".select-option").click((event) => {
      if (event.currentTarget.attributes.name) {
        let id = event.currentTarget.attributes.name.value;
        let isChecked = event.currentTarget.checked;
        game.settings.set(SYSTEM_RDD, id, isChecked);
      }
    });
  }

  async _updateObject(event, formData) {
    this.close();
  }
}

