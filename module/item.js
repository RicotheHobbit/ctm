import { DialogItemVente } from "./dialog-item-vente.js";
import { Grammar } from "./grammar.js";
import { RdDHerbes } from "./rdd-herbes.js";
import { RdDUtility } from "./rdd-utility.js";

const typesObjetsEquipement = [
  "arme",
  "armure",
  "conteneur",
  "gemme",
  "herbe",
  "ingredient",
  "livre",
  "monnaie",
  "munition",
  "nourritureboisson",
  "objet",
  "potion",
]
const typesObjetsOeuvres = ["oeuvre", "recettecuisine", "musique", "chant", "danse", "jeu"]
const typesObjetsDraconiques = ["queue", "ombre", "souffle", "tete", "signedraconique", "sortreserve", "rencontre"]
const typesObjetsConnaissance = ["meditation", "recettealchimique", "sort"]
const typesObjetsEffet = ["possession", "poison", "maladie"]
const typesObjetsCompetence = ["competence", "competencecreature"]
const encBrin = 0.00005; // un brin = 1 décigramme = 1/10g = 1/10000kg = 1/20000 enc
const encPepin = 0.0007; /* un pépin de gemme = 1/10 cm3 = 1/1000 l = 3.5/1000 kg = 7/2000 kg = 7/1000 enc
densité 3.5 (~2.3 à 4, parfois plus) -- https://www.juwelo.fr/guide-des-pierres/faits-et-chiffres/ 
   */

export const defaultItemImg = {
  competence: "systems/foundryvtt-reve-de-dragon/icons/competence_defaut.webp",
  competencecreature: "systems/foundryvtt-reve-de-dragon/icons/competence_defaut.webp",
  arme: "systems/foundryvtt-reve-de-dragon/icons/armes_armures/epee_gnome.webp",
  armure: "systems/foundryvtt-reve-de-dragon/icons/armes_armures/armure_plaques.webp",
  conteneur: "systems/foundryvtt-reve-de-dragon/icons/objets/sac_a_dos.webp",
  sort: "systems/foundryvtt-reve-de-dragon/icons/competence_oniros.webp",
  herbe: "systems/foundryvtt-reve-de-dragon/icons/botanique/Endorlotte.webp",
  ingredient: "systems/foundryvtt-reve-de-dragon/icons/objets/sable_poudre.webp",
  livre: "systems/foundryvtt-reve-de-dragon/icons/objets/livre.webp",
  potion: "systems/foundryvtt-reve-de-dragon/icons/objets/liqueur_de_bagdol.webp",
  rencontre: "systems/foundryvtt-reve-de-dragon/icons/tete_dragon.webp",
  queue: "systems/foundryvtt-reve-de-dragon/icons/queue_dragon.webp",
  ombre: "systems/foundryvtt-reve-de-dragon/icons/queue_dragon.webp",
  souffle: "systems/foundryvtt-reve-de-dragon/icons/souffle_dragon.webp",
  tete: "systems/foundryvtt-reve-de-dragon/icons/tete_dragon.webp",
  meditation: "systems/foundryvtt-reve-de-dragon/icons/meditations_ecrits/meditation_alchimie.webp",
  recettealchimique: "systems/foundryvtt-reve-de-dragon/icons/competence_alchimie.webp",
  chant: "systems/foundryvtt-reve-de-dragon/icons/arts/chant_0.webp",
  danse: "systems/foundryvtt-reve-de-dragon/icons/arts/danse_0.webp",
  jeu: "systems/foundryvtt-reve-de-dragon/icons/arts/jeux_petasse.webp",
  recettecuisine: "systems/foundryvtt-reve-de-dragon/icons/arts/recette_cuisine_1.webp",
  musique: "systems/foundryvtt-reve-de-dragon/icons/arts/chant_0.webp",
  maladie: "systems/foundryvtt-reve-de-dragon/icons/maladies_venins/maladie.webp",
  poison: "systems/foundryvtt-reve-de-dragon/icons/maladies_venins/venin.webp",
  oeuvre: "systems/foundryvtt-reve-de-dragon/icons/competence_comedie.webp",
  nourritureboisson: "systems/foundryvtt-reve-de-dragon/icons/objets/provision_crue.webp",
  signedraconique: "systems/foundryvtt-reve-de-dragon/icons/tmr/signe_draconique.webp",
  gemme: "systems/foundryvtt-reve-de-dragon/icons/gemmes/almaze.webp",
  possession: "systems/foundryvtt-reve-de-dragon/icons/entites/possession2.webp",
  sortreserve: "systems/foundryvtt-reve-de-dragon/icons/competence_oniros.webp",
  extraitpoetique: "systems/foundryvtt-reve-de-dragon/icons/competence_ecriture.webp",
  tarot: "systems/foundryvtt-reve-de-dragon/icons/tarots/dos-tarot.webp",
}

/* -------------------------------------------- */
export class RdDItem extends Item {

  static getDefaultImg(itemType) {
    return defaultItemImg[itemType];
  }


  constructor(itemData, context) {
    if (!itemData.img) {
      itemData.img = RdDItem.getDefaultImg(itemData.type);
    }  
    super(itemData, context);
  }  

  static getTypesObjetsEquipement() {
    return typesObjetsEquipement
  }

  static getTypesOeuvres() {
    return typesObjetsOeuvres
  }

  isCompetencePersonnage() {
    return this.type == 'competence'
  }
  isCompetence() {
    return typesObjetsCompetence.includes(this.type)
  }
  isEquipement() {
    return typesObjetsEquipement.includes(this.type)
  }
  isOeuvre() {
    return typesObjetsOeuvres.includes(this.type)
  }
  isDraconique() {
    return typesObjetsDraconiques.includes(this.type)
  }
  isEffet() {
    return typesObjetsEffet.includes(this.type)
  }
  isConnaissance() {
    return typesObjetsConnaissance.includes(this.type)
  }
  isConteneur() {
    return this.type == 'conteneur';
  }

  getItemGroup() {
    if (this.isEquipement()) return "equipement";
    if (this.isOeuvre()) return "oeuvre";
    if (this.isDraconique()) return "draconique";
    if (this.isConnaissance()) return "connaissance";
    if (this.isEffet()) return "effet";
    if (this.isCompetence()) return "competence";
    return "autres";
  }

  isConteneurNonVide() {
    return this.isConteneur() && (this.system.contenu?.length ?? 0) > 0;
  }

  isConteneurVide() {
    return this.isConteneur() && (this.system.contenu?.length ?? 0) == 0;
  }

  isVideOuNonConteneur() {
    return !this.isConteneur() || (this.system.contenu?.length ?? 0) == 0;
  }

  isAlcool() {
    return this.type == 'nourritureboisson' && this.system.boisson && this.system.alcoolise;
  }
  isHerbeAPotion() {
    return this.type == 'herbe' && (this.system.categorie == 'Soin' || this.system.categorie == 'Repos');
  }
  isPotion() {
    return this.type == 'potion';
  }
  isCristalAlchimique() {
    return this.type == 'objet' && Grammar.toLowerCaseNoAccent(this.name) == 'cristal alchimique' && this.system.quantite > 0;
  }

  isMagique() {
    return this.system.magique
  }

  getQuantite() {
    return Math.round(this.isConteneur() ? 1 : (this.system.quantite ?? 0))
  }

  getEncTotal() {
    return this.getEnc() * this.getQuantite();
  }  

  getEnc() {
    switch (this.type) {
      case 'herbe':
        return encBrin;
      case 'gemme':
        return encPepin * this.system.taille;
    }
    return Math.max(this.system.encombrement ?? 0, 0);
  }

  prixTotalDeniers() {
    return this.getQuantite() * this.valeurDeniers()
  }

  valeurDeniers() {
    return Math.max(Math.round(this.system.cout ? (this.system.cout * 100) : (this.system.valeur_deniers ?? 0)), 0) 
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.isEquipement()) {
      this.system.encTotal = this.getEncTotal();
      if (this.isPotion()) {
        this.prepareDataPotion()
      }
      this.system.actionPrincipale = this.getActionPrincipale({ warnIfNot: false });
    }
  }

  prepareDataPotion() {
    const categorie = Grammar.toLowerCaseNoAccent(this.system.categorie);
    this.system.magique = categorie.includes('enchante');
    if (this.system.magique) {
      if (categorie.includes('soin') || categorie.includes('repos')) {
        // TODO: utiliser calculPointsRepos / calculPointsGuerison
        this.system.puissance = RdDHerbes.calculPuissancePotion(this);
      }
    }
  }

  getActionPrincipale(options = { warnIfNot: true }) {
    const warn = options.warnIfNot;
    switch (this.type) {
      case 'nourritureboisson': return this._actionOrWarnQuantiteZero(this.system.boisson ? 'Boire' : 'Manger', warn);
      case 'potion': return this._actionOrWarnQuantiteZero('Boire', warn);
      case 'livre': return this._actionOrWarnQuantiteZero('Lire', warn);
      case 'conteneur': return 'Ouvrir';
      case 'herbe':  return this.isHerbeAPotion() ? this._actionOrWarnQuantiteZero('Décoction', warn) : undefined;
      case 'queue': case 'ombre': return this.system.refoulement>0 ? 'Refouler' : undefined;
    }
    return undefined;
  }

  _actionOrWarnQuantiteZero(actionName, warn){
    if ((this.system.quantite ?? 0) <= 0) {
      if (warn) {
        ui.notifications.warn(`Vous n'avez plus de ${this.name}.`);
      }
      return undefined;
    }
    else {
      return actionName;
    }
  }

  async diminuerQuantite(nombre, options = { diminuerQuantite: true, supprimerSiZero: false }) {
    if (options.diminuerQuantite == false) return;
    await this.quantiteIncDec(-nombre, options);
  }

  async quantiteIncDec(nombre, options = { diminuerQuantite: true, supprimerSiZero: false }) {
    const quantite = Number(this.system.quantite ?? -1);
    if (quantite >= 0) {
      const reste = Math.max(quantite + Number(nombre), 0);

      if (reste == 0) {
        if (options.supprimerSiZero) {
          ui.notifications.notify(`${this.name} supprimé de votre équipement`);
          await this.delete();
        }
        else {
          ui.notifications.notify(`Il ne vous reste plus de ${this.name}, vous pouvez le supprimer de votre équipement, ou trouver un moyen de vous en procurer.`);
          await this.update({ "system.quantite": 0 });
        }
      }
      else {
        await this.update({ "system.quantite": reste });
      }
    }
  }

  /* -------------------------------------------- */
  // détermine si deux équipements sont similaires: de même type, et avec les même champs hormis la quantité
  isEquipementEmpilable(other) {
    if (!other || !this.isEquipement()) {
      return [false, undefined];
    }

    if (this.system.quantite == undefined) {
      return [false, `Impossible de regrouper des ${this.type}, ils ne sont pas empilables`];
    } 
    else if (this.type != other.type) {
      return [false, `Impossible de regrouper des ${this.type} avec des ${other.type}`];
    }
    else if (this.name != other.name) {
      return [false, `Impossible de regrouper ${this.name} avec ${other.name}`];
    }
    else {
      const differences = Object.entries(this.system)
        .filter(([key, value]) => !['quantite', 'cout', 'encTotal'].includes(key) && value != other.system[key]);
      if (differences.length > 0) {
        let message = `Impossible de regrouper les ${this.type} ${this.name}: `;
        for (const [key, value] of differences) {
          message += `<br>${key}: ${value} vs ${other.system[key]}`;
        }
        return [false, message];
      }
    }
    return [true, undefined];
  }

  async proposerVente() {
    console.log(this);
    if (this.isConteneurNonVide()) {
      ui.notifications.warn(`Votre ${this.name} n'est pas vide, pas possible de le proposer`);
      return;
    }
    await DialogItemVente.display(this, async (vente) =>  {
      vente["properties"] = this.getProprietes();
      if (vente.isOwned) {
        if (vente.quantiteNbLots * vente.tailleLot > vente.quantiteMax) {
          ui.notifications.warn(`Vous avez ${vente.quantiteMax} ${vente.item.name}, ce n'est pas suffisant pour vendre ${vente.quantiteNbLots} de ${vente.tailleLot}`)
          return;
        }
      }
      vente.jsondata = JSON.stringify(vente.item);
  
      console.log(vente);
      let html = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/chat-vente-item.html', vente);
      ChatMessage.create(RdDUtility.chatDataSetup(html));
    });
  }

  /* -------------------------------------------- */
  getProprietes() {
    return this[`_${this.type}ChatData`]();
  }

  /* -------------------------------------------- */
  async postItem(modeOverride) {
    console.log(this);
    let chatData = duplicate(this);
    chatData["properties"] = this.getProprietes();
    if (this.actor) {
      chatData.actor = { id: this.actor.id };
    }
    // JSON object for easy creation
    chatData.jsondata = JSON.stringify(
      {
        compendium: "postedItem",
        payload: chatData,
      });

    renderTemplate('systems/foundryvtt-reve-de-dragon/templates/post-item.html', chatData).then(html => {
      let chatOptions = RdDUtility.chatDataSetup(html, modeOverride);
      ChatMessage.create(chatOptions)
    });
  }

  static propertyIfDefined(name, val, condition = (it) => true) {
    return condition ? [`<b>${name}</b>: ${val}`] : [];
  }

  /* -------------------------------------------- */
  _objetChatData() {
    return [].concat(
      RdDItem.propertyIfDefined('Résistance', this.system.resistance, this.system.resistance),
      RdDItem.propertyIfDefined('Qualité', this.system.qualite, this.system.qualite),
      RdDItem.propertyIfDefined('Encombrement', this.system.encombrement),
    );
  }

  /* -------------------------------------------- */
  _nourritureboissonChatData() {
    return [].concat(
      RdDItem.propertyIfDefined('Sustentation', this.system.sust, this.system.sust > 0),
      RdDItem.propertyIfDefined('Désaltère', this.system.desaltere, this.system.boisson),
      RdDItem.propertyIfDefined('Force alcool', this.system.force, this.system.boisson && this.system.alcoolise),
      RdDItem.propertyIfDefined('Exotisme', this.system.exotisme, this.system.exotisme < 0),
      RdDItem.propertyIfDefined('Qualité', this.system.qualite, this.system.qualite),
      RdDItem.propertyIfDefined('Encombrement', this.system.encombrement),
    );
  }
  /* -------------------------------------------- */
  _armeChatData() {
    return [
      `<b>Compétence</b>: ${this.system.competence}`,
      `<b>Dommages</b>: ${this.system.dommages}`,
      `<b>Force minimum</b>: ${this.system.force}`,
      `<b>Resistance</b>: ${this.system.resistance}`,
      `<b>Encombrement</b>: ${this.system.encombrement}`
    ]
  }
  /* -------------------------------------------- */
  _conteneurChatData() {
    return [
      `<b>Capacité</b>: ${this.system.capacite} Enc.`,
      `<b>Encombrement</b>: ${this.system.encombrement}`
    ]
  }
  /* -------------------------------------------- */
  _munitionChatData() {
    return [
      `<b>Encombrement</b>: ${this.system.encombrement}`
    ]
  }
  /* -------------------------------------------- */
  _armureChatData() {
    return [
      `<b>Protection</b>: ${this.system.protection}`,
      `<b>Détérioration</b>: ${this.system.deterioration}`,
      `<b>Malus armure</b>: ${this.system.malus}`,
      `<b>Encombrement</b>: ${this.system.encombrement}`
    ]
  }
  /* -------------------------------------------- */
  _competenceChatData() {
    return [
      `<b>Catégorie</b>: ${this.system.categorie}`,
      `<b>Niveau</b>: ${this.system.niveau}`,
      `<b>Caractéristique par défaut</b>: ${this.system.carac_defaut}`,
      `<b>XP</b>: ${this.system.xp}`
    ]
  }
  /* -------------------------------------------- */
  _competencecreatureChatData() {
    return [
      `<b>Catégorie</b>: ${this.system.categorie}`,
      `<b>Niveau</b>: ${this.system.niveau}`,
      `<b>Caractéristique</b>: ${this.system.carac_value}`,
      `<b>XP</b>: ${this.system.xp}`
    ]
  }
  /* -------------------------------------------- */
  _sortChatData() {
    return [
      `<b>Draconic</b>: ${this.system.draconic}`,
      `<b>Difficulté</b>: ${this.system.difficulte}`,
      `<b>Case TMR</b>: ${this.system.caseTMR}`,
      `<b>Points de Rêve</b>: ${this.system.ptreve}`
    ]
  }
  /* -------------------------------------------- */
  _herbeChatData() {
    return [
      `<b>Milieu</b>: ${this.system.milieu}`,
      `<b>Rareté</b>: ${this.system.rarete}`,
      `<b>Catégorie</b>: ${this.system.categorie}`,
    ]
  }
  /* -------------------------------------------- */
  _ingredientChatData() {
    return [
      `<b>Milieu</b>: ${this.system.milieu}`,
      `<b>Rareté</b>: ${this.system.rarete}`,
      `<b>Catégorie</b>: ${this.system.categorie}`,
    ]
  }
  /* -------------------------------------------- */
  _tacheChatData() {
    return [
      `<b>Caractéristique</b>: ${this.system.carac}`,
      `<b>Compétence</b>: ${this.system.competence}`,
      `<b>Périodicité</b>: ${this.system.periodicite}`,
      `<b>Fatigue</b>: ${this.system.fatigue}`,
      `<b>Difficulté</b>: ${this.system.difficulte}`
    ].concat([
      this.system.cacher_points_de_tache ? [] :`<b>Points de Tâche</b>: ${this.system.points_de_tache}`
    ]).concat([
      `<b>Points de Tâche atteints</b>: ${this.system.points_de_tache_courant}`]
    );
  }
  /* -------------------------------------------- */
  _livreChatData() {
    return [
      `<b>Compétence</b>: ${this.system.competence}`,
      `<b>Auteur</b>: ${this.system.auteur}`,
      `<b>Difficulté</b>: ${this.system.difficulte}`,
      `<b>Points de Tâche</b>: ${this.system.points_de_tache}`,
      `<b>Encombrement</b>: ${this.system.encombrement}`
    ]
  }
  /* -------------------------------------------- */
  _potionChatData() {
    return [
      `<b>Rareté</b>: ${this.system.rarete}`,
      `<b>Catégorie</b>: ${this.system.categorie}`,
      `<b>Encombrement</b>: ${this.system.encombrement}`,
    ]
  }
  /* -------------------------------------------- */
  _queueChatData() {
    return [
      `<b>Refoulement</b>: ${this.system.refoulement}`
    ]
  }
  /* -------------------------------------------- */
  _ombreChatData() {
    return [
      `<b>Refoulement</b>: ${this.system.refoulement}`
    ]
  }
  /* -------------------------------------------- */
  _souffleChatData() {
    return [];
  }
  /* -------------------------------------------- */
  _teteChatData() {
    return [];
  }
  /* -------------------------------------------- */
  _tarotChatData() {
    return [
      `<b>Concept</b>: ${this.system.concept}`,
      `<b>Aspect</b>: ${this.system.aspect}`,
    ]
  }
  /* -------------------------------------------- */
  _nombreastralChatData() {
    return [
      `<b>Valeur</b>: ${this.system.value}`,
      `<b>Jour</b>: ${this.system.jourlabel}`,
    ]
  }
  /* -------------------------------------------- */
  _monnaieChatData() {
    return [
      `<b>Valeur en Deniers</b>: ${this.system.valeur_deniers}`,
      `<b>Encombrement</b>: ${this.system.encombrement}`
    ]
  }
  /* -------------------------------------------- */
  _meditationChatData() {
    return [
      `<b>Thème</b>: ${this.system.theme}`,
      `<b>Compétence</b>: ${this.system.competence}`,
      `<b>Support</b>: ${this.system.support}`,
      `<b>Heure</b>: ${this.system.heure}`,
      `<b>Purification</b>: ${this.system.purification}`,
      `<b>Vêture</b>: ${this.system.veture}`,
      `<b>Comportement</b>: ${this.system.comportement}`,
      `<b>Case TMR</b>: ${this.system.tmr}`
    ]
  }
  /* -------------------------------------------- */
  _rencontreChatData() {
    if (this.system.coord) {
      return [
        `<b>Force</b>: ${this.system.force}`,
        `<b>Coordonnées</b>: ${this.system.coord}`,
      ]
    }
    return [
      `<b>Force</b>: ${this.system.force}`,
      `<b>Refoulement</b>: ${this.system.refoulement}`,
      `<b>Présent de cités</b>: ${this.system.presentCite}`,
    ]
  }
  /* -------------------------------------------- */
  _casetmrChatData() {
    return [
      `<b>Coordonnée</b>: ${this.system.coord}`,
      `<b>Spécificité</b>: ${this.system.specific}`
    ]
  }
  /* -------------------------------------------- */
  _maladieChatData() {
    if (!this.system.identifie) {
      return [`<b>Inconnue</b>`]
    }
    let properties = [
        `<b>Malignité</b>: ${this.system.malignite}`,
        `<b>Périodicité</b>: ${this.system.periodicite}`,
        `<b>Dommages</b>: ${this.system.dommages}`
      ]
    if (this.system.remedesconnus) {
      properties.push(`<b>Remedes</b>: ${this.system.remedes}`)
    }
    return properties;
  }

  /* -------------------------------------------- */
  _poisonChatData() {
    return this._maladieChatData();
  }

  /* -------------------------------------------- */
  _gemmeChatData() {
    return [
      `<b>Pureté</b>: ${this.system.purete}`,
      `<b>Taille</b>: ${this.system.taille}`,
      `<b>Inertie</b>: ${this.system.inertie}`,
      `<b>Enchantabilité</b>: ${this.system.enchantabilite}`,
      `<b>Prix</b>: ${this.system.cout}`,
    ]
  }


}
