import { RdDUtility } from "./rdd-utility.js";
import { TMRUtility } from "./tmr-utility.js";
import { RdDRollDialogEthylisme } from "./rdd-roll-ethylisme.js";
import { RdDRoll } from "./rdd-roll.js";
import { RdDTMRDialog } from "./rdd-tmr-dialog.js";
import { Misc } from "./misc.js";
import { RdDAstrologieJoueur } from "./rdd-astrologie-joueur.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDDice } from "./rdd-dice.js";
import { RdDRollTables } from "./rdd-rolltables.js";
import { ChatUtility } from "./chat-utility.js";
import { RdDItemSort } from "./item-sort.js";
import { Grammar } from "./grammar.js";
import { RdDEncaisser } from "./rdd-roll-encaisser.js";
import { RdDCombat } from "./rdd-combat.js";
import { RdDAudio } from "./rdd-audio.js";
import { RdDItemCompetence } from "./item-competence.js";
import { RdDItemArme } from "./item-arme.js";
import { RdDAlchimie } from "./rdd-alchimie.js";
import { STATUSES, StatusEffects } from "./settings/status-effects.js";
import { RdDItemCompetenceCreature } from "./item-competencecreature.js";
import { RdDItemSigneDraconique } from "./item-signedraconique.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { EffetsDraconiques } from "./tmr/effets-draconiques.js";
import { Draconique } from "./tmr/draconique.js";
import { RdDCarac } from "./rdd-carac.js";
import { Monnaie } from "./item-monnaie.js";
import { DialogConsommer } from "./dialog-item-consommer.js";
import { DialogFabriquerPotion } from "./dialog-fabriquer-potion.js";
import { RollDataAjustements } from "./rolldata-ajustements.js";
import { RdDItem } from "./item.js";
import { RdDPossession } from "./rdd-possession.js";
import { ENTITE_BLURETTE, ENTITE_INCARNE, ENTITE_NONINCARNE, HIDE_DICE, SHOW_DICE, SYSTEM_RDD, SYSTEM_SOCKET_ID } from "./constants.js";
import { RdDConfirm } from "./rdd-confirm.js";
import { DialogValidationEncaissement } from "./dialog-validation-encaissement.js";
import { RdDRencontre } from "./item-rencontre.js";
import { SystemCompendiums } from "./settings/system-compendiums.js";
import { Targets } from "./targets.js";

const POSSESSION_SANS_DRACONIC = {
  img: 'systems/ctm/icons/entites/possession.webp',
  name: 'Sans draconic',
  system: {
    niveau: 0,
    defaut_carac: "reve",
  }
};

const PAS_DE_BLESSURE = { "active": false, "psdone": false, "scdone": false, "premiers_soins": 0, "soins_complets": 0, "jours": 0, "loc": "" };
/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class RdDActor extends Actor {
  /* -------------------------------------------- */
  static init() {
    Hooks.on("preUpdateItem", (item, change, options, id) => RdDActor.getParentActor(item)?.onPreUpdateItem(item, change, options, id));
    // TODO: replace with pre-hooks?
    Hooks.on("createItem", (item, options, id) => RdDActor.getParentActor(item)?.onCreateItem(item, options, id));
    Hooks.on("deleteItem", (item, options, id) => RdDActor.getParentActor(item)?.onDeleteItem(item, options, id));
    Hooks.on("updateActor", (actor, change, options, actorId) => actor.onUpdateActor(change, options, actorId));
  }

  static onSocketMessage(sockmsg) {
    switch (sockmsg.msg) {
      case "msg_remote_actor_call":
        return RdDActor.onRemoteActorCall(sockmsg.data, sockmsg.userId);
      case "msg_reset_nombre_astral":
        console.log("RESET ASTRAL", game.user.character);
        game.user.character.resetNombreAstral();
        return;
    }
  }

  static remoteActorCall(callData, userId = undefined) {
    userId = userId ?? Misc.firstConnectedGMId();
    if (userId == game.user.id) {
      RdDActor.onRemoteActorCall(callData, userId);
      return false;
    }
    else {
      game.socket.emit(SYSTEM_SOCKET_ID, { msg: "msg_remote_actor_call", data: callData, userId: userId });
      return true;
    }
  }

  static onRemoteActorCall(callData, userId) {
    if (userId == game.user.id) {
      const actor = game.actors.get(callData?.actorId);
      if (Misc.isOwnerPlayerOrUniqueConnectedGM(actor)) { // Seul le joueur choisi effectue l'appel: le joueur courant si propriétaire de l'actor, ou le MJ sinon
        const args = callData.args;
        console.info(`RdDActor.onRemoteActorCall: pour l'Actor ${callData.actorId}, appel de RdDActor.${callData.method}(`, ...args, ')');
        actor[callData.method](...args);
      }
    }
  }

  /* -------------------------------------------- */
  static getParentActor(document) {
    return document?.parent instanceof Actor ? document.parent : undefined
  }

  /* -------------------------------------------- */
  /**
   * Override the create() function to provide additional RdD functionality.
   *
   * This overrided create() function adds initial items
   * Namely: Basic skills, money,
   *
   * @param {Object} actorData Barebones actor template data which this function adds onto.
   * @param {Object} options   Additional options which customize the creation workflow.
   *
   */
  static async create(actorData, options) {
    // Case of compendium global import
    if (actorData instanceof Array) {
      return super.create(actorData, options);
    }

    const isPersonnage = actorData.type == "personnage";
    // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
    if (actorData.items) {
      return await super.create(actorData, options);
    }

    if (isPersonnage) {
      const competences = await SystemCompendiums.getCompetences(actorData.type);
      actorData.items = competences.map(i => i.toObject())
        .concat(Monnaie.monnaiesStandard());
    }
    else {
      actorData.items = [];
    }
    return super.create(actorData, options);
  }

  /* -------------------------------------------- */
  prepareData() {
    super.prepareData();

    // Dynamic computing fields
    this.encTotal = 0;

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    if (this.isPersonnage()) this._prepareCharacterData(this)
    if (this.isCreature()) this._prepareCreatureData(this)
    if (this.isVehicule()) this._prepareVehiculeData(this)
  }

  /* -------------------------------------------- */
  setRollWindowsOpened(flag) {
    this.rollWindowsOpened = flag;
  }

  /* -------------------------------------------- */
  isRollWindowsOpened() {
    return this.rollWindowsOpened;
  }

  /* -------------------------------------------- */
  _prepareCreatureData(actorData) {
    this.computeEncombrementTotalEtMalusArmure();
    this.computeEtatGeneral();
  }

  /* -------------------------------------------- */
  _prepareVehiculeData(actorData) {
    this.computeEncombrementTotalEtMalusArmure();
  }

  /* -------------------------------------------- */
  /**
   * Prepare Character type specific data
   */
  async _prepareCharacterData(actorData) {
    // Initialize empty items
    RdDCarac.computeCarac(actorData.system)
    this.computeIsHautRevant();
    await this.cleanupConteneurs();
    await this.computeEncombrementTotalEtMalusArmure();
    this.computeEtatGeneral();
  }

  /* -------------------------------------------- */
  async cleanupConteneurs() {
    let updates = this.listItemsData('conteneur')
      .filter(c => c.system.contenu.filter(id => this.getObjet(id) == undefined).length > 0)
      .map(c => { return { _id: c._id, 'system.contenu': c.system.contenu.filter(id => this.getObjet(id) != undefined) } });
    if (updates.length > 0) {
      await this.updateEmbeddedDocuments("Item", updates)
    }
  }

  /* -------------------------------------------- */
  isCreature() {
    return this.type == 'creature' || this.type == 'entite';
  }
  /* -------------------------------------------- */
  isPersonnage() {
    return this.type == 'personnage';
  }
  isVehicule() {
    return this.type == 'vehicule';
  }
  /* -------------------------------------------- */
  isHautRevant() {
    return this.isPersonnage() && this.system.attributs.hautrevant.value != ""
  }
  /* -------------------------------------------- */
  getFatigueActuelle() {
    if (ReglesOptionelles.isUsing("appliquer-fatigue") && this.isPersonnage()) {
      return this.system.sante.fatigue?.value;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getFatigueMax() {
    if (!this.isPersonnage()) {
      return 1;
    }
    return Misc.toInt(this.system.sante.fatigue?.max);
  }
  /* -------------------------------------------- */
  getReveActuel() {
    switch(this.type) {
      case 'personnage':
        return Misc.toInt(this.system.reve?.reve?.value ?? this.carac.reve.value);
      case 'creature':
      case 'entite':
        return Misc.toInt(this.system.carac.reve?.value)
      case 'vehicule':
      default:
         return 0;
    }
  }

  /* -------------------------------------------- */
  getChanceActuel() {
    return Misc.toInt(this.system.compteurs.chance?.value ?? 10);
  }
  /* -------------------------------------------- */
  getTaille() {
    return Misc.toInt(this.system.carac.taille?.value);
  }
  /* -------------------------------------------- */
  getForce() {
    if (this.isEntite()) {
      return Misc.toInt(this.system.carac.reve?.value);
    }
    return Misc.toInt(this.system.carac.force?.value);
  }
  /* -------------------------------------------- */
  getAgilite() {
    switch (this.type) {
      case 'personnage': return Misc.toInt(this.system.carac.agilite?.value);
      case 'creature': return Misc.toInt(this.system.carac.force?.value);
      case 'entite': return Misc.toInt(this.system.carac.reve?.value);
    }
    return 10;
  }
  /* -------------------------------------------- */
  getChance() {
    return Misc.toInt(this.system.carac.chance?.value ?? 10);
  }
  getMoralTotal() {
    return Misc.toInt(this.system.compteurs.moral?.value);
  }
  /* -------------------------------------------- */
  getBonusDegat() {
    // TODO: gérer séparation et +dom créature/entité indépendament de la compétence
    return Misc.toInt(this.system.attributs.plusdom.value);
  }
  /* -------------------------------------------- */
  getProtectionNaturelle() {
    return Misc.toInt(this.system.attributs.protection.value);
  }

  /* -------------------------------------------- */
  getEtatGeneral(options = { ethylisme: false }) {
    let etatGeneral = Misc.toInt(this.system.compteurs.etat?.value)
    if (options.ethylisme) {
      // Pour les jets d'Ethylisme, on ignore le degré d'éthylisme (p.162)
      etatGeneral -= Math.min(0, this.system.compteurs.ethylisme.value)
    }
    return etatGeneral
  }
  /* -------------------------------------------- */
  getActivePoisons() {
    return duplicate(this.items.filter(item => item.type == 'poison' && item.system.active))
  }

  /* -------------------------------------------- */
  getMalusArmure() {
    return Misc.toInt(this.system.attributs?.malusarmure?.value)
  }

  /* -------------------------------------------- */
  getEncTotal() {
    return Math.floor(this.encTotal ?? 0);
  }

  /* -------------------------------------------- */
  getCompetence(idOrName, options = {}) {
    return RdDItemCompetence.findCompetence(this.items, idOrName, options)
  }

  getCompetences(name) {
    return RdDItemCompetence.findCompetences(this.items, name)
  }

  /* -------------------------------------------- */
  getObjet(id) {
    return this.getEmbeddedDocument('Item', id);
  }

  listItemsData(type) {
    return this.itemTypes[type];
  }

  filterItems(filter) {
    return this.items.filter(filter);
  }

  getItemOfType(idOrName, type) {
    return this.items.find(it => it.id == idOrName && it.type == type)
      ?? Misc.findFirstLike(idOrName, this.items, { filter: it => it.type == type, description: type });
  }

  getMonnaie(id) {
    return this.getItemOfType(id, 'monnaie');
  }

  getTache(id) {
    return this.getItemOfType(id, 'tache');
  }
  getMeditation(id) {
    return this.getItemOfType(id, 'meditation');
  }
  getChant(id) {
    return this.getItemOfType(id, 'chant');
  }
  getDanse(id) {
    return this.getItemOfType(id, 'danse');
  }
  getMusique(id) {
    return this.getItemOfType(id, 'musique');
  }
  getOeuvre(id, type = 'oeuvre') {
    return this.getItemOfType(id, type);
  }
  getJeu(id) {
    return this.getItemOfType(id, 'jeu');
  }
  getRecetteCuisine(id) {
    return this.getItemOfType(id, 'recettecuisine');
  }
  /* -------------------------------------------- */
  getDraconicList() {
    return this.items.filter(it => it.isCompetencePersonnage() && it.system.categorie == 'draconic')
  }
  /* -------------------------------------------- */
  getBestDraconic() {
    const list = this.getDraconicList()
      .sort(Misc.descending(it => it.system.niveau))
    return duplicate(list[0])
  }

  getDraconicOuPossession() {
    const possessions = this.items.filter(it => it.type == 'competencecreature' && it.system.ispossession)
      .sort(Misc.descending(it => it.system.niveau));
    if (possessions.length > 0) {
      return duplicate(possessions[0]);
    }
    const draconics = [...this.getDraconicList().filter(it => it.system.niveau >= 0),
       POSSESSION_SANS_DRACONIC]
       .sort(Misc.descending(it => it.system.niveau));
    return duplicate(draconics[0]);
  }

  getPossession(possessionId) {
    return this.items.find(it => it.type == 'possession' && it.system.possessionid == possessionId);
  }
  getPossessions() {
    return this.items.filter(it => it.type == 'possession');
  }

  getDemiReve() {
    return this.system.reve.tmrpos.coord;
  }

  /* -------------------------------------------- */
  async verifierPotionsEnchantees() {
    let potionsEnchantees = this.filterItems(it => it.type == 'potion' && it.system.categorie.toLowerCase().includes('enchant'));
    for (let potion of potionsEnchantees) {
      if (!potion.system.prpermanent) {
        console.log(potion);
        let newPr = (potion.system.pr > 0) ? potion.system.pr - 1 : 0;
        let update = { _id: potion._id, 'system.pr': newPr };
        const updated = await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity  

        let messageData = {
          pr: newPr,
          alias: this.name,
          potionName: potion.name,
          potionImg: potion.img
        }
        ChatMessage.create({
          whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
          content: await renderTemplate(`systems/ctm/templates/chat-potionenchantee-chateaudormant.html`, messageData)
        });
      }
    }
  }

  /* -------------------------------------------- */
  getSurprise(isCombat = undefined) {
    let niveauSurprise = this.getEffects()
      .map(effect => StatusEffects.valeurSurprise(effect, isCombat))
      .reduce(Misc.sum(), 0);
    if (niveauSurprise > 1) {
      return 'totale';
    }
    if (niveauSurprise == 1) {
      return 'demi';
    }
    return '';
  }


  /* -------------------------------------------- */
  async grisReve(nGrisReve) {
    let message = {
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: `${nGrisReve} jours de gris rêve sont passés. `
    };
    for (let i = 0; i < nGrisReve; i++) {
      await this.dormir(6, { grisReve: true });
      const blessures = duplicate(this.system.blessures);
      await this._recupererBlessures(message, "legere", blessures.legeres.liste.filter(b => b.active), []);
      await this._recupererBlessures(message, "grave", blessures.graves.liste.filter(b => b.active), blessures.legeres.liste);
      await this._recupererBlessures(message, "critique", blessures.critiques.liste.filter(b => b.active), blessures.graves.liste);
      await this.update({ "system.blessures": blessures });
      await this._recupererVie(message);

      const moralActuel = Misc.toInt(this.system.compteurs.moral.value);
      if (moralActuel != 0) {
        await this.moralIncDec(-Math.sign(moralActuel));
      }
      await this._recupereChance();
      await this.transformerStress();
      this.bonusRecuperationPotion = 0; // Reset potion
    }
    ChatMessage.create(message);
    this.sheet.render(true);
  }

  /* -------------------------------------------- */
  async dormirChateauDormant() {
    let message = {
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: ""
    };

    const blessures = duplicate(this.system.blessures)
    await this._recupererBlessures(message, "legere", blessures.legeres.liste.filter(b => b.active), []);
    await this._recupererBlessures(message, "grave", blessures.graves.liste.filter(b => b.active), blessures.legeres.liste);
    await this._recupererBlessures(message, "critique", blessures.critiques.liste.filter(b => b.active), blessures.graves.liste);
    await this.update({ "system.blessures": blessures });
    await this._recupererVie(message);
    await this._jetDeMoralChateauDormant(message);
    await this._recupereChance();
    await this.transformerStress();
    await this.retourSeuilDeReve(message);
    this.bonusRecuperationPotion = 0; // Reset potion
    await this.retourSust(message);
    await this.verifierPotionsEnchantees();
    if (message.content != "") {
      message.content = `A la fin Chateau Dormant, ${message.content}<br>Un nouveau jour se lève`;
      ChatMessage.create(message);
    }
    this.sheet.render(true);
  }

  /* -------------------------------------------- */
  async _recupereChance() {
    // On ne récupère un point de chance que si aucun appel à la chance dans la journée
    if (this.getChanceActuel() < this.getChance() && !this.getFlag(SYSTEM_RDD, 'utilisationChance')) {
      await this.chanceActuelleIncDec(1);
    }
    // Nouveau jour, suppression du flag
    await this.unsetFlag(SYSTEM_RDD, 'utilisationChance');
  }

  async _jetDeMoralChateauDormant(message) {
    const jetMoral = await this._jetDeMoral('neutre');
    message.content += jetMoral.ajustement == 0 ? ' -- le moral reste stable' : ' -- le moral retourne vers 0';
  }

  /* -------------------------------------------- */
  async _recupererBlessures(message, type, liste, moindres) {
    if (!this.bonusRecuperationPotion) this.bonusRecuperationPotion = 0;
    let count = 0;
    const definitions = RdDUtility.getDefinitionsBlessures();
    let definition = definitions.find(d => d.type == type);
    for (let blessure of liste) {
      if (blessure.jours >= definition.facteur) {
        let rolled = await this._jetRecuperationConstitution(Misc.toInt(blessure.soins_complets) + this.bonusRecuperationPotion, message);
        blessure.soins_complets = 0;
        if (rolled.isSuccess && this._retrograderBlessure(type, blessure, moindres)) {
          message.content += ` -- une blessure ${type} cicatrise`;
          count++;
        }
        else if (rolled.isETotal) {
          message.content += ` -- une blessure ${type} s'infecte (temps de guérison augmenté de ${definition.facteur} jours, perte de vie)`;
          blessure.jours = 0;
          await this.santeIncDec("vie", -1);
        }
        else {
          blessure.jours++;
          message.content += ` -- une blessure ${type} reste stable`;
        }
      }
      else {
        blessure.jours++;
      }
    }
  }

  /* -------------------------------------------- */
  _retrograderBlessure(type, blessure, blessuresMoindres) {
    if (type != "legere") {
      let retrograde = blessuresMoindres.find(b => !b.active);
      if (!retrograde) {
        return false;
      }
      mergeObject(retrograde, { "active": true, "psdone": blessure.psdone, "scdone": blessure.scdone, "premiers_soins": 0, "soins_complets": 0, "jours": 0, "loc": blessure.loc });
    }
    this._supprimerBlessure(blessure);
    return true;
  }

  /* -------------------------------------------- */
  _supprimerBlessure(blessure) {
    mergeObject(blessure, PAS_DE_BLESSURE);
  }

  /* -------------------------------------------- */
  async _recupererVie(message) {
    const tData = this.system
    let blessures = [].concat(tData.blessures.legeres.liste).concat(tData.blessures.graves.liste).concat(tData.blessures.critiques.liste);
    let nbBlessures = blessures.filter(b => b.active);
    let vieManquante = tData.sante.vie.max - tData.sante.vie.value;
    if (nbBlessures == 0 && vieManquante > 0) {
      let bonusSoins = 0;
      for (let b of blessures) {
        bonusSoins = Math.max(bonusSoins, Misc.toInt(b.soins_complets));
      }
      let rolled = await this._jetRecuperationConstitution(bonusSoins, message)
      if (rolled.isSuccess) {
        const gain = Math.min(rolled.isPart ? 2 : 1, vieManquante);
        message.content += " -- récupération de vie: " + gain;
        await this.santeIncDec("vie", gain);
      }
      else if (rolled.isETotal) {
        message.content += " -- perte de vie: 1";
        await this.santeIncDec("vie", -1);
      }
      else {
        message.content += " -- vie stationnaire ";
      }
    }
  }

  /* -------------------------------------------- */
  async _jetRecuperationConstitution(bonusSoins, message = undefined) {
    const tData = this.system;
    let difficulte = Misc.toInt(bonusSoins) + Math.min(0, tData.sante.vie.value - tData.sante.vie.max);
    let rolled = await RdDResolutionTable.roll(tData.carac.constitution.value, difficulte);
    if (message) {
      message.content += RdDResolutionTable.explain(rolled).replace(/Jet :/, "Constitution :");
    }
    return rolled;
  }

  /* -------------------------------------------- */
  async remiseANeuf() {
    if (this.isEntite([ENTITE_NONINCARNE])) {
      return;
    }
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: 'Remise à neuf de ' + this.name
    });
    const updates = {
      'system.sante.endurance.value' : this.system.sante.endurance.max
    };
    if (!this.isEntite([ENTITE_INCARNE, ENTITE_BLURETTE])) {
      if (this.system.blessures) {
        updates['system.blessures.legeres.liste'] = [PAS_DE_BLESSURE, PAS_DE_BLESSURE, PAS_DE_BLESSURE, PAS_DE_BLESSURE, PAS_DE_BLESSURE];
        updates['system.blessures.graves.liste'] =  [PAS_DE_BLESSURE, PAS_DE_BLESSURE];
        updates['system.blessures.critiques.liste'] = [PAS_DE_BLESSURE];
      }
      updates['system.sante.vie.value'] = this.system.sante.vie.max;
      updates['system.sante.fatigue.value'] = 0;
      if (this.isPersonnage()) {
        updates['system.compteurs.ethylisme'] = { value:1, nb_doses: 0, jet_moral: false};
      }
    }
    await this.update(updates);
    await this.removeEffects(e => e.flags.core.statusId !== STATUSES.StatusDemiReve);
  }

  /* -------------------------------------------- */
  async dormir(heures, options = { grisReve: false }) {
    let message = {
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: ""
    };
    await this.recupereEndurance(message);
    let sep = ""
    let recuperationReve = "";
    let i = 0;
    for (; i < heures; i++) {
      await this._recupererEthylisme(message);
      await this.recupererFatigue(message);
      if (!options.grisReve) {
        let r = await this.recuperationReve(message);
        if (r >= 0) {
          recuperationReve += sep + r;
          sep = "+";
        }

        if (r >= 0 && EffetsDraconiques.isDonDoubleReve(this)) {
          r = await this.recuperationReve(message);
          if (r >= 0) {
            recuperationReve += sep + r;
          }
        }
        if (r < 0) {
          i++;// rêve de dragon pendant l'heure en cours
          break;
        }
      }
    }
    if (!options.grisReve) {
      message.content = `${this.name}: Vous dormez ${i == 0 ? 'une' : i} heure${i == 1 ? '' : 's'}. `
        + (recuperationReve == "" ? "" : `Vous récupérez ${recuperationReve} Points de rêve. `)
        + message.content;
      ChatMessage.create(message);
    }
    this.sheet.render(true);
    return i;
  }

  /* -------------------------------------------- */
  async _recupererEthylisme(message) {
    let ethylisme = duplicate(this.system.compteurs.ethylisme);
    ethylisme.nb_doses = 0;
    ethylisme.jet_moral = false;
    if (ethylisme.value < 1) {
      ethylisme.value = Math.min(ethylisme.value + 1, 1);
      if (ethylisme.value <= 0) {
        message.content += `Vous dégrisez un peu (${RdDUtility.getNomEthylisme(ethylisme.value)}). `;
      }
    }
    await this.update({ "system.compteurs.ethylisme": ethylisme });
  }

  /* -------------------------------------------- */
  async recupereEndurance(message) {
    const manquant = this._computeEnduranceMax() - this.system.sante.endurance.value;
    if (manquant > 0) {
      await this.santeIncDec("endurance", manquant);
      message.content += "Vous récuperez " + manquant + " points d'endurance. ";
    }
  }

  /* -------------------------------------------- */
  async recupererFatigue(message) {
    if (ReglesOptionelles.isUsing("appliquer-fatigue")) {
      let fatigue = this.system.sante.fatigue.value;
      const fatigueMin = this._computeFatigueMin();
      if (fatigue <= fatigueMin) {
        return;
      }
      fatigue = Math.max(fatigueMin, this._calculRecuperationSegment(fatigue));
      await this.update({ "system.sante.fatigue.value": fatigue });
      if (fatigue == 0) {
        message.content += "Vous êtes complêtement reposé. ";
      }
    }
  }

  /* -------------------------------------------- */
  _calculRecuperationSegment(actuel) {
    const segments = RdDUtility.getSegmentsFatigue(this.system.sante.endurance.max);
    let cumul = 0;
    let i;
    for (i = 0; i < 11; i++) {
      cumul += segments[i];
      let diff = cumul - actuel;
      if (diff >= 0) {
        const limit2Segments = Math.floor(segments[i] / 2);
        if (diff > limit2Segments && i > 0) {
          cumul -= segments[i - 1]; // le segment est à moins de la moitié, il est récupéré 
        }
        cumul -= segments[i];
        break;
      }
    };
    return cumul;
  }

  /* -------------------------------------------- */
  async recuperationReve(message) {
    const seuil = this.system.reve.seuil.value;
    const reveActuel = this.getReveActuel();
    if (reveActuel < seuil) {
      let deRecuperation = await RdDDice.rollTotal("1dr");
      console.log("recuperationReve", deRecuperation);
      if (deRecuperation >= 7) {
        // Rêve de Dragon !
        message.content += `Vous faites un <strong>Rêve de Dragon</strong> de ${deRecuperation} Points de rêve qui vous réveille! `;
        await this.combattreReveDeDragon(deRecuperation);
        return -1;
      }
      else {
        await this.reveActuelIncDec(deRecuperation);
        return deRecuperation;
      }
    }
    return 0;
  }

  /* -------------------------------------------- */
  async retourSeuilDeReve(message) {
    const seuil = this.system.reve.seuil.value;
    const reveActuel = this.getReveActuel();
    if (reveActuel > seuil) {
      message.content += `<br>Votre rêve redescend vers son seuil naturel (${seuil}, nouveau rêve actuel ${(reveActuel - 1)})`;
      await this.reveActuelIncDec(-1);
    }
  }

  async retourSust(message) {
    const tplData = this.system;
    const sustNeeded = tplData.attributs.sust.value;
    const sustConsomme = tplData.compteurs.sust.value;
    const eauConsomme = tplData.compteurs.eau.value;
    if (game.settings.get(SYSTEM_RDD, "appliquer-famine-soif").includes('famine') && sustConsomme < sustNeeded) {
      const perte = sustConsomme < Math.min(0.5, sustNeeded) ? 3 : (sustConsomme <= (sustNeeded / 2) ? 2 : 1);
      message.content += `<br>Vous ne vous êtes sustenté que de ${sustConsomme} pour un appétit de ${sustNeeded}, vous avez faim!
        La famine devrait vous faire ${perte} points d'endurance non récupérables, notez le cumul de côté et ajustez l'endurance`;
    }

    if (game.settings.get(SYSTEM_RDD, "appliquer-famine-soif").includes('soif') && eauConsomme < sustNeeded) {
      const perte = eauConsomme < Math.min(0.5, sustNeeded) ? 12 : (eauConsomme <= (sustNeeded / 2) ? 6 : 3);
      message.content += `<br>Vous n'avez bu que ${eauConsomme} doses de liquide pour une soif de ${sustNeeded}, vous avez soif!
        La soif devrait vous faire ${perte} points d'endurance non récupérables, notez le cumul de côté et ajustez l'endurance`;
    }
    await this.updateCompteurValue('sust', 0);
    await this.updateCompteurValue('eau', 0);
  }

  /* -------------------------------------------- */
  async combattreReveDeDragon(force) {
    let rollData = {
      actor: this,
      competence: duplicate(this.getDraconicOuPossession()),
      canClose: false,
      rencontre: await game.system.rencontresTMR.getReveDeDragon(force),
      tmr: true,
      use: { libre: false, conditions: false },
      forceCarac: { 'reve-actuel': { label: "Rêve Actuel", value: this.getReveActuel() } }
    }
    rollData.competence.system.defaut_carac = 'reve-actuel';

    const dialog = await RdDRoll.create(this, rollData,
      { html: 'systems/ctm/templates/dialog-roll-reve-de-dragon.html' },
      {
        name: 'maitrise',
        label: 'Maîtriser le Rêve de Dragon',
        callbacks: [
          { action: async r => 
            this.resultCombatReveDeDragon(r) }
        ]
      }
    );
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async resultCombatReveDeDragon(rollData) {
    const result = rollData.rolled.isSuccess
      ? rollData.rencontre.system.succes
      : rollData.rencontre.system.echec;

    RdDRencontre.appliquer(result.effets, {}, rollData)
  }

  /* -------------------------------------------- */
  async sortMisEnReserve(sort, draconic, coord, ptreve) {
    await this.createEmbeddedDocuments("Item", [{
        type: 'sortreserve',
        name: sort.name,
        img: sort.img,
        system: { sortid: sort._id, draconic: (draconic?.name ?? sort.system.draconic), ptreve: ptreve, coord: coord, heurecible: 'Vaisseau' } }],
        { renderSheet: false});
    this.currentTMR.updateTokens();
  }

  /* -------------------------------------------- */
  async updateCarac(caracName, caracValue) {
    if (caracName == "force") {
      if (Number(caracValue) > this.getTaille() + 4) {
        ui.notifications.warn("Votre FORCE doit être au maximum de TAILLE+4");
        return;
      }
    }
    if (caracName == "reve") {
      if (caracValue > Misc.toInt(this.system.reve.seuil.value)) {
        this.setPointsDeSeuil(caracValue);
      }
    }
    if (caracName == "chance") {
      if (caracValue > Misc.toInt(this.system.compteurs.chance.value)) {
        this.setPointsDeChance(caracValue);
      }
    }
    await this.update({ [`system.carac.${caracName}.value`]: caracValue });
  }

  /* -------------------------------------------- */
  async updateCaracXP(caracName, caracXP) {
    if (caracName == 'Taille') {
      return;
    }
    this.checkCaracXP(caracName);
  }

  /* -------------------------------------------- */
  async updateCaracXPAuto(caracName) {
    if (caracName == 'Taille') {
      return;
    }
    let carac = RdDActor._findCaracByName(this.system.carac, caracName);
    if (carac) {
      carac = duplicate(carac);
      let xp = Number(carac.xp);
      let value = Number(carac.value);
      while (xp >= RdDCarac.getCaracNextXp(value) && xp > 0) {
        xp -= RdDCarac.getCaracNextXp(value);
        value++;
      }
      carac.xp = xp;
      carac.value = value;
      await this.update({ [`system.carac.${caracName}`]: carac });
      this.updateExperienceLog("Carac +", xp, caracName + " passée à " + value);
    }
  }

  /* -------------------------------------------- */
  async updateCompetenceXPAuto(idOrName) {
    let competence = this.getCompetence(idOrName);
    if (competence) {
      let xp = Number(competence.system.xp);
      let niveau = Number(competence.system.niveau);
      while (xp >= RdDItemCompetence.getCompetenceNextXp(niveau) && xp > 0) {
        xp -= RdDItemCompetence.getCompetenceNextXp(niveau);
        niveau++;
      }
      await competence.update({
        "system.xp": xp,
        "system.niveau": niveau,
      });
      this.updateExperienceLog("Compétence +", xp, competence.name + " passée à " + niveau);
    }
  }

  async updateCompetenceStress(idOrName) {
    const competence = this.getCompetence(idOrName);
    if (!competence) {
      return;
    }
    const stress = this.system.compteurs.experience.value;
    const niveau = Number(competence.system.niveau);
    const xpSuivant = RdDItemCompetence.getCompetenceNextXp(niveau);
    const xpRequis = xpSuivant - competence.system.xp;
    if (stress <= 0 || niveau >= competence.system.niveau_archetype) {
      ui.notifications.info(`La compétence ne peut pas augmenter!
          stress disponible: ${stress}
          expérience requise: ${xpRequis}
          niveau : ${niveau}
          archétype : ${competence.system.niveau_archetype}`);
      return;
    }
    const xpUtilise = Math.max(0, Math.min(stress, xpRequis));
    const gainNiveau = (xpUtilise >= xpRequis || xpRequis <=0) ? 1 : 0;
    const nouveauNiveau = niveau + gainNiveau;
    const nouveauXp = gainNiveau > 0 ? Math.max(competence.system.xp - xpSuivant, 0) : (competence.system.xp + xpUtilise);
    await competence.update({
      "system.xp": nouveauXp,
      "system.niveau": nouveauNiveau,
    });
    const stressTransformeRestant = Math.max(0, stress - xpUtilise);
    await this.update({ "system.compteurs.experience.value": stressTransformeRestant });
    this.updateExperienceLog('Dépense stress', xpUtilise, `Stress en ${competence.name} ${gainNiveau ? "pour passer à " + nouveauNiveau : ""}`);
  }

  /* -------------------------------------------- */
  async updateCreatureCompetence(idOrName, fieldName, compValue) {
    let competence = this.getCompetence(idOrName);
    if (competence) {
      const update = { _id: competence.id }
      if (fieldName == "niveau")
        update['system.niveau'] = compValue;
      else if (fieldName == "dommages")
        update['system.dommages'] = compValue;
      else
        update['system.carac_value'] = compValue;
      await this.updateEmbeddedDocuments('Item', [update]); // updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  async updateCompetence(idOrName, compValue) {
    let competence = this.getCompetence(idOrName);
    if (competence) {
      let nouveauNiveau = compValue ?? RdDItemCompetence.getNiveauBase(competence.system.categorie);
      const tronc = RdDItemCompetence.getListTronc(competence.name).filter(it => {
        const comp = this.getCompetence(it);
        const niveauTr = competence ? competence.system.niveau : 0;
        return niveauTr < 0 && niveauTr < nouveauNiveau;
      });
      if (tronc.length > 0) {
        let message = "Vous avez modifié une compétence 'tronc'. Vérifiez que les compétences suivantes évoluent ensemble jusqu'au niveau 0 : ";
        for (let troncName of tronc) {
          message += "<br>" + troncName;
        }
        ChatMessage.create({
          whisper: ChatMessage.getWhisperRecipients(this.name),
          content: message
        });
      }
      const update = { _id: competence.id, 'system.niveau': nouveauNiveau };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    } else {
      console.log("Competence not found", idOrName);
    }
  }

  /* -------------------------------------------- */
  async updateCompetenceXP(idOrName, newXp) {
    let competence = this.getCompetence(idOrName);
    if (competence) {
      if (isNaN(newXp) || typeof (newXp) != 'number') newXp = 0;
      this.checkCompetenceXP(idOrName, newXp);
      const update = { _id: competence.id, 'system.xp': newXp };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
      this.updateExperienceLog("XP", newXp, "XP modifié en " + competence.name);
    } else {
      console.log("Competence not found", idOrName);
    }
    RdDUtility.checkThanatosXP(idOrName);
  }

  /* -------------------------------------------- */
  async updateCompetenceXPSort(idOrName, compValue) {
    let competence = this.getCompetence(idOrName);
    if (competence) {
      if (isNaN(compValue) || typeof (compValue) != 'number') compValue = 0;
      const update = { _id: competence.id, 'system.xp_sort': compValue };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
      this.updateExperienceLog("XP Sort", compValue, "XP modifié en sort de " + competence.name);
    } else {
      console.log("Competence not found", idOrName);
    }
  }

  /* -------------------------------------------- */
  async updateCompetenceArchetype(idOrName, compValue) {
    let competence = this.getCompetence(idOrName);
    if (competence) {
      compValue = compValue ?? 0;
      const update = { _id: competence.id, 'system.niveau_archetype': compValue };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    } else {
      console.log("Competence not found", idOrName);
    }
  }

  /* -------------------------------------------- */
  async updateExperienceLog(modeXP, valeurXP, raisonXP = 'Inconnue') {
    let d = new Date();
    let expLog = duplicate(this.system.experiencelog);
    expLog.push({
      mode: Misc.upperFirst(modeXP), valeur: valeurXP, raison: Misc.upperFirst(raisonXP),
      daterdd: game.system.rdd.calendrier.getDateFromIndex(),
      datereel: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    });
    await this.update({ [`system.experiencelog`]: expLog });
  }
  
  async deleteExperienceLog(from, count) {
    if (from >= 0 && count > 0) {
      let expLog = duplicate(this.system.experiencelog);
      expLog.splice(from, count);
      await this.update({ [`system.experiencelog`]: expLog });
    }
  }


  /* -------------------------------------------- */
  async updateCompteurValue(fieldName, fieldValue, raison = 'Inconnue') {
    await this.update({ [`system.compteurs.${fieldName}.value`]: fieldValue });
    await this.addStressExperienceLog(fieldName, fieldValue, 'forcé: ' + raison);
  }

  /* -------------------------------------------- */
  async addCompteurValue(fieldName, fieldValue, raison = 'Inconnue') {
    let oldValue = this.system.compteurs[fieldName].value;
    await this.update({ [`system.compteurs.${fieldName}.value`]: Number(oldValue) + Number(fieldValue) });
    await this.addStressExperienceLog(fieldName, fieldValue, raison);
  }

  async addStressExperienceLog(fieldName, fieldValue, raison) {
    switch (fieldName) {
      case 'stress': case 'experience':
        await this.updateExperienceLog(fieldName, fieldValue, raison);
    }
  }

  /* -------------------------------------------- */
  distribuerStress(compteur, stress, motif) {
    if (game.user.isGM && this.hasPlayerOwner && this.isPersonnage()) {
      switch (compteur) {
        case 'stress': case 'experience':
          const message = `${this.name} a reçu ${stress} points ${compteur == 'stress' ? "de stress" : "d'expérience"} (raison : ${motif})`;
          this.addCompteurValue(compteur, stress, motif);
          ui.notifications.info(message);
          game.users.players.filter(player => player.active && player.character?.id == this.id)
            .forEach(player => ChatUtility.notifyUser(player.id, 'info', message));
      }
    }
  }

  /* -------------------------------------------- */
  async updateAttributeValue(fieldName, fieldValue) {
    await this.update({ [`system.attributs.${fieldName}.value`]: fieldValue });
  }

  /* -------------------------------------------- */
  _isConteneurContenu(item, conteneur) {
    if (item?.isConteneur()) { // Si c'est un conteneur, il faut vérifier qu'on ne le déplace pas vers un sous-conteneur lui appartenant
      for (let id of item.system.contenu) {
        let subObjet = this.getObjet(id);
        if (subObjet?.id == conteneur.id) {
          return true; // Loop detected !
        }
        if (subObjet?.isConteneur()) {
          return this._isConteneurContenu(subObjet, conteneur);
        }
      }
    }
    return false;
  }

  /* -------------------------------------------- */
  getRecursiveEnc(objet) {
    if (!objet) {
      return 0;
    }
    const tplData = objet.system;
    if (objet.type != 'conteneur') {
      return Number(tplData.encombrement) * Number(tplData.quantite);
    }
    const encContenus = tplData.contenu.map(idContenu => this.getRecursiveEnc(this.getObjet(idContenu)));
    return encContenus.reduce(Misc.sum(), 0)
      + Number(tplData.encombrement) /* TODO? Number(tplData.quantite) -- on pourrait avoir plusieurs conteneurs...*/
  }

  /* -------------------------------------------- */
  buildSubConteneurObjetList(conteneurId, deleteList) {
    let conteneur = this.getObjet(conteneurId);
    if (conteneur?.type == 'conteneur') { // Si c'est un conteneur
      for (let subId of conteneur.system.contenu) {
        let subObj = this.getObjet(subId);
        if (subObj) {
          if (subObj.type == 'conteneur') {
            this.buildSubConteneurObjetList(subId, deleteList);
          }
          deleteList.push({ id: subId, conteneurId: conteneurId });
        }
      }
    }
  }

  /* -------------------------------------------- */
  async deleteAllConteneur(itemId, options) {
    let list = [];
    list.push({ id: itemId, conteneurId: undefined }); // Init list
    this.buildSubConteneurObjetList(itemId, list);
    await this.deleteEmbeddedDocuments('Item', list.map(it => it.id), options);
  }

  /* -------------------------------------------- */
  /** Supprime un item d'un conteneur, sur la base
   * de leurs ID */
  async enleverDeConteneur(item, conteneur, onEnleverDeConteneur) {
    if (conteneur?.isConteneur()) {
      item.estContenu = false;
      await this.updateEmbeddedDocuments('Item', [{
        _id: conteneur.id,
        'system.contenu': conteneur.system.contenu.filter(id => id != item.id)
      }]);
      onEnleverDeConteneur();
    }
  }
  
  /* -------------------------------------------- */
  /** Ajoute un item dans un conteneur, sur la base
   * de leurs ID */
  async ajouterDansConteneur(item, conteneur, onAjouterDansConteneur) {
    if (!conteneur) {
      // TODO: afficher
      item.estContenu = false;
    }
    else if (conteneur.isConteneur()) {
      item.estContenu = true;
      await this.updateEmbeddedDocuments('Item', [{
        _id: conteneur.id,
        'system.contenu': [...conteneur.system.contenu, item.id]
        }]);
      onAjouterDansConteneur(item.id, conteneur.id);
    }
  }

  /* -------------------------------------------- */
  /** Fonction de remise à plat de l'équipement (ie vide les champs 'contenu') */
  async nettoyerConteneurs() {
    RdDConfirm.confirmer({
      settingConfirmer: "confirmation-vider",
      content: `<p>Etes vous certain de vouloir vider tous les conteneurs ?</p>`,
      title: 'Vider les conteneurs',
      buttonLabel: 'Vider',
      onAction: async () => {
        const corrections = [];
        for (let item of this.items) {
          if (item.estContenu) {
            item.estContenu = undefined;
          }
          if (item.type == 'conteneur' && item.system.contenu.length > 0) {
            corrections.push({ _id: item.id, 'system.contenu': [] });
          }
        }
        if (corrections.length > 0) {
          await this.updateEmbeddedDocuments('Item', corrections);
        }
      }
    });
  }

  async processDropItem(params) {
    const targetActorId = this.id;
    const sourceActorId = params.sourceActorId;
    const itemId = params.itemId;
    const destId = params.destId;
    const srcId = params.srcId;
    if (sourceActorId && sourceActorId != targetActorId) {
      console.log("Moving objects", sourceActorId, targetActorId, itemId);
      this.moveItemsBetweenActors(itemId, sourceActorId);
      return false;
    }
    let result = true;
    const item = this.getObjet(itemId);
    if (item?.isEquipement() && sourceActorId == targetActorId) {
      // rangement
      if (srcId != destId && itemId != destId) { // déplacement de l'objet
        const src = this.getObjet(srcId);
        const dest = this.getObjet(destId);
        const cible = this.getContenantOrParent(dest);
        const [empilable, message] = item.isEquipementEmpilable(dest);
        if (empilable) {
          await this.regrouperEquipementsSimilaires(item, dest);
          result = false;
        }
        // changer de conteneur
        else if (!cible || this.conteneurPeutContenir(cible, item)) {
          await this.enleverDeConteneur(item, src, params.onEnleverConteneur);
          await this.ajouterDansConteneur(item, cible, params.onAjouterDansConteneur);
          if (message && !dest.isConteneur()) {
            ui.notifications.info(cible
              ? `${message}<br>${item.name} a été déplacé dans: ${cible.name}`
              : `${message}<br>${item.name} a été sorti du conteneur`);
          }
        }
      }
    }
    await this.computeEncombrementTotalEtMalusArmure();
    return result;
  }

  getContenantOrParent(dest) {
    if (!dest || dest.isConteneur()) {
      return dest;
    }
    return this.getContenant(dest);
  }

  getContenant(item) {
    return this.itemTypes['conteneur'].find(it => it.system.contenu.includes(item.id));
  }

  /* -------------------------------------------- */
  conteneurPeutContenir(dest, item) {
    if (!dest) {
      return true;
    }
    if (!dest.isConteneur()) {
      return false;
    }
    const destData = dest
    if (this._isConteneurContenu(item, dest)) {
      ui.notifications.warn(`Impossible de déplacer un conteneur parent (${item.name}) dans un de ses contenus ${destData.name} !`);
      return false; // Loop detected !
    }

    // Calculer le total actuel des contenus
    let encContenu = this.getRecursiveEnc(dest) - Number(destData.system.encombrement);
    let newEnc = this.getRecursiveEnc(item); // Calculer le total actuel du nouvel objet

    // Teste si le conteneur de destination a suffisament de capacité pour recevoir le nouvel objet
    if (Number(destData.system.capacite) < encContenu + newEnc) {
      ui.notifications.warn(
        `Le conteneur ${dest.name} a une capacité de ${destData.system.capacite}, et contient déjà ${encContenu}.
        Impossible d'y ranger: ${item.name} d'encombrement ${newEnc}!`);
      return false;
    }
    return true;

  }

  /* -------------------------------------------- */
  async moveItemsBetweenActors(itemId, sourceActorId) {
    let itemsList = []
    let sourceActor = game.actors.get(sourceActorId);
    itemsList.push({ id: itemId, conteneurId: undefined }); // Init list
    sourceActor.buildSubConteneurObjetList(itemId, itemsList); // Get itemId list

    const itemsDataToCreate = itemsList.map(it => sourceActor.getObjet(it.id))
      .map(it => duplicate(it))
      .map(it => { it.system.contenu = []; return it; });
    let newItems = await this.createEmbeddedDocuments('Item', itemsDataToCreate);

    let itemMap = this._buildMapOldNewId(itemsList, newItems);

    for (let item of itemsList) { // Second boucle pour traiter la remise en conteneurs
      // gestion conteneur/contenu
      if (item.conteneurId) { // l'Objet était dans un conteneur
        let newConteneurId = itemMap[item.conteneurId]; // Get conteneur
        let newConteneur = this.getObjet(newConteneurId);

        let newItemId = itemMap[item.id]; // Get newItem

        console.log('New conteneur filling!', newConteneur, newItemId, item);
        let contenu = duplicate(newConteneur.system.contenu);
        contenu.push(newItemId);
        await this.updateEmbeddedDocuments('Item', [{ _id: newConteneurId, 'system.contenu': contenu }]);
      }
    }
    for (let item of itemsList) {
      await sourceActor.deleteEmbeddedDocuments('Item', [item.id]);
    }
  }

  _buildMapOldNewId(itemsList, newItems) {
    let itemMap = {};
    for (let i = 0; i < itemsList.length; i++) {
      itemMap[itemsList[i].id] = newItems[i].id; // Pour garder le lien ancien / nouveau
    }
    return itemMap;
  }

  async regrouperEquipementsSimilaires(item, dest) {
    await dest.quantiteIncDec(item.system.quantite);
    await item.delete();
  }

  isSurenc() {
    return this.isPersonnage() ? (this.computeMalusSurEncombrement() < 0) : false
  }

  /* -------------------------------------------- */
  computeMalusSurEncombrement() {
    switch (this.type) {
      case 'entite': case 'vehicule':
        return 0;
    }
    return Math.min(0, this.getEncombrementMax() - Math.ceil(Number(this.getEncTotal())));
  }

  getMessageSurEncombrement() {
    return this.computeMalusSurEncombrement() < 0 ? "Sur-Encombrement!" : "";
  }

  /* -------------------------------------------- */
  getEncombrementMax() {
    switch (this.type) {
      case 'vehicule':
        return this.system.capacite_encombrement;
      case 'entite':
        return 0;
      default:
        return this.system.attributs.encombrement.value
    }
  }

  /* -------------------------------------------- */
  computeIsHautRevant() {
    if (this.isPersonnage()) {
      this.system.attributs.hautrevant.value = this.hasItemNamed('tete', 'don de haut-reve')
        ? "Haut rêvant"
        : "";
    }
  }

  hasItemNamed(type, name) {
    name = Grammar.toLowerCaseNoAccent(name);
    return this.listItemsData(type).find(it => Grammar.toLowerCaseNoAccent(it.name) == name);
  }

  /* -------------------------------------------- */
  async computeEncombrementTotalEtMalusArmure() {
    if (!this.pack) {
      await this.computeMalusArmure();
      this.encTotal = this.items.map(it => it.getEncTotal()).reduce(Misc.sum(), 0);
      if (!this.isVehicule()) {
        this.system.compteurs.surenc.value = this.computeMalusSurEncombrement();
      }
      return this.encTotal;
    }
    return 0;
  }

  /* -------------------------------------------- */
  async computeMalusArmure() {
    if (this.isPersonnage()) {
      const malusArmure = this.filterItems(it => it.type == 'armure' && it.system.equipe)
      .map(it => it.system.malus ?? 0)
      .reduce(Misc.sum(), 0);
      // Mise à jour éventuelle du malus armure
      if (this.system.attributs?.malusarmure?.value != malusArmure) {
        await this.updateAttributeValue("malusarmure", malusArmure);
      }
    }
  }

  /* -------------------------------------------- */
  computePrixTotalEquipement() {
    const deniers = this.items.filter(it => it.isEquipement())
      .map(it => it.prixTotalDeniers())
      .reduce(Misc.sum(), 0);
    return deniers / 100;
  }

  /* -------------------------------------------- */
  computeResumeBlessure(blessures = undefined) {
    blessures = blessures ?? this.system.blessures;
    if (!blessures) {
      return "Pas de blessures possibles";
    }
    let nbLegeres = this.countBlessures(blessures.legeres.liste);
    let nbGraves = this.countBlessures(blessures.graves.liste);
    let nbCritiques = this.countBlessures(blessures.critiques.liste);

    let resume = "Blessures:";
    if (nbCritiques > 0 || nbGraves > 0 || nbLegeres > 0) {
      if (nbLegeres > 0) {
        resume += " " + nbLegeres + " légère" + (nbLegeres > 1 ? "s" : "");
      }
      if (nbGraves > 0) {
        if (nbLegeres > 0)
          resume += ",";
        resume += " " + nbGraves + " grave" + (nbGraves > 1 ? "s" : "");
      }
      if (nbCritiques > 0) {
        if (nbGraves > 0 || nbLegeres > 0)
          resume += ",";
        resume += " une CRITIQUE !";
      }
      return resume;
    }
    else {
      return "Aucune blessure";
    }
  }

  /* -------------------------------------------- */
  computeEtatGeneral() {
    // Pas d'état général pour les entités forçage à 0
    if (this.type == 'entite') {
      this.system.compteurs.etat.value = 0;
      return
    }
    // Pour les autres
    let sante = this.system.sante
    let compteurs = this.system.compteurs
    let state = Math.min(sante.vie.value - sante.vie.max, 0);
    if (ReglesOptionelles.isUsing("appliquer-fatigue") && sante.fatigue) {
      state += RdDUtility.currentFatigueMalus(sante.fatigue.value, sante.endurance.max);
    }
    // Ajout de l'éthylisme
    state += Math.min(0, (compteurs.ethylisme?.value ?? 0));

    compteurs.etat.value = state;
  }

  /* -------------------------------------------- */
  async actionRefoulement(item) {
    const refoulement = item?.system.refoulement ?? 0;
    if (refoulement > 0) {
      RdDConfirm.confirmer({
        settingConfirmer: "confirmation-refouler",
        content: `<p>Prennez-vous le risque de refouler ${item.name} pour ${refoulement} points de refoulement ?</p>`,
        title: 'Confirmer la refoulement',
        buttonLabel: 'Refouler',
        onAction: async () => {
          await this.ajouterRefoulement(refoulement, `une queue ${item.name}`);
          await item.delete();
        }
      });
    }
  }
  
  /* -------------------------------------------- */
  async ajouterRefoulement(value = 1, refouler) {
    const refoulement = this.system.reve.refoulement.value + value;
    const roll = new Roll("1d20");
    await roll.evaluate({ async: true });
    await roll.toMessage({ flavor: `${this.name} refoule ${refouler} pour ${value} points de refoulement (total: ${refoulement})` });
    if (roll.total <= refoulement) {
      refoulement = 0;
      await this.ajouterSouffle({ chat: true });
    }
    await this.update({ "system.reve.refoulement.value": refoulement });
    return roll;
  }

  /* -------------------------------------------- */
  async ajouterSouffle(options = { chat: false }) {
    let souffle = await RdDRollTables.getSouffle()
    //souffle.id = undefined; //TBC
    await this.createEmbeddedDocuments('Item', [souffle]);
    if (options.chat) {
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
        content: this.name + " subit un Souffle de Dragon  : " + souffle.name
      });
    }
    return souffle;
  }

  /* -------------------------------------------- */
  async ajouterQueue(options = { chat: false }) {
    let queue;
    if (this.system.reve.reve.thanatosused) {
      queue = await RdDRollTables.getOmbre();
      await this.update({ "system.reve.reve.thanatosused": false });
    }
    else {
      queue = await RdDRollTables.getQueue();
    }
    await this.createEmbeddedDocuments('Item', [queue]);
    if (options.chat) {
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
        content: this.name + " subit une Queue de Dragon : " + queue.name
      });
    }
    return queue;
  }

  /* -------------------------------------------- */
  /* -------------------------------------------- */
  async changeTMRVisible() {
    await this.setTMRVisible(this.system.reve.tmrpos.cache ? true : false);
  }

  async setTMRVisible(newState) {
    await this.update({ 'system.reve.tmrpos.cache': !newState });
    this.notifyRefreshTMR();
  }

  isTMRCache() {
    return this.system.reve.tmrpos.cache;
  }

  notifyRefreshTMR() {
    game.socket.emit(SYSTEM_SOCKET_ID, {
      msg: "msg_tmr_move", data: {
        actorId: this._id,
        tmrPos: this.system.reve.tmrpos
      }
    });
  }


  /* -------------------------------------------- */
  async reinsertionAleatoire(raison, accessible = tmr => true) {
    const innaccessible = this.buildTMRInnaccessible();
    let tmr = await TMRUtility.getTMRAleatoire(tmr => accessible(tmr) && !innaccessible.includes(tmr.coord));
    ChatMessage.create({
      content: `${raison} : ré-insertion aléatoire.`,
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name)
    });
    await this.forcerPositionTMRInconnue(tmr);
    return tmr;
  }

  async forcerPositionTMRInconnue(tmr) {
    await this.setTMRVisible(false);
    await this.updateCoordTMR(tmr.coord);
    this.notifyRefreshTMR();
  }

  /* -------------------------------------------- */
  buildTMRInnaccessible() {
    const tmrInnaccessibles = this.filterItems(it => Draconique.isCaseTMR(it) &&
      EffetsDraconiques.isInnaccessible(it));
    return tmrInnaccessibles.map(it => it.system.coord);
  }

  /* -------------------------------------------- */
  getTMRRencontres() {
    return this.itemTypes['rencontre'];
  }

  /* -------------------------------------------- */
  async deleteTMRRencontreAtPosition() {
    const demiReve = this.getDemiReve()
    let rencontreIds = this.items.filter(it => it.type == 'rencontre' && it.system.coord == demiReve).map(it => it.id);
    if (rencontreIds.length>0) {
      await this.deleteEmbeddedDocuments('Item', rencontreIds);
    }
  }

  /* -------------------------------------------- */
  async addTMRRencontre(currentRencontre) {
    const toCreate = currentRencontre.toObject();
    console.log('actor.addTMRRencontre(', toCreate,')');
    this.createEmbeddedDocuments('Item', [toCreate]);
  }

  /* -------------------------------------------- */
  async updateCoordTMR(coord) {
    await this.update({ "system.reve.tmrpos.coord": coord });
  }

  /* -------------------------------------------- */
  async reveActuelIncDec(value) {
    let reve = Math.max(this.system.reve.reve.value + value, 0);
    await this.update({ "system.reve.reve.value": reve });
  }

  /* -------------------------------------------- */
  async regainPointDeSeuil() {
    const seuil = Misc.toInt(this.system.reve.seuil.value);
    const seuilMax = Misc.toInt(this.system.carac.reve.value)
      + 2 * EffetsDraconiques.countAugmentationSeuil(this);

    if (seuil < seuilMax) {
      await this.setPointsDeSeuil(Math.min(seuil + 1, seuilMax));
    }
  }

  /* -------------------------------------------- */
  async setPointsDeSeuil(seuil) {
    await this.update({ "system.reve.seuil.value": seuil });
  }

  /* -------------------------------------------- */
  async setPointsDeChance(chance) {
    await this.updateCompteurValue("chance", chance);
  }

  /* -------------------------------------------- */
  getSonne() {
    return this.getEffect(STATUSES.StatusStunned);
  }

  /* -------------------------------------------- */
  async finDeRound(options = { terminer: false }) {
    for (let effect of this.getEffects()) {
      if (effect.duration.type !== 'none' && (effect.duration.remaining <= 0 || options.terminer)) {
        if (effect.system.origin) {
          await effect.update({ 'disabled': true });
        }
        else {
          await effect.delete();
        }
        ChatMessage.create({ content: `${this.name} n'est plus ${Misc.lowerFirst(game.i18n.localize(effect.system.label))} !` });
      }
    }
    if (this.type == 'personnage') {
      // Gestion blessure graves : -1 pt endurance
      let nbGraves = this.countBlessuresNonSoigneeByName('graves');
      if (nbGraves > 0) {
        await this.santeIncDec("endurance", -1);
      }
    }
  }

  /* -------------------------------------------- */
  async setSonne(sonne = true) {
    if (this.isEntite()) {
      return;
    }
    if (!game.combat && sonne) {
      ui.notifications.info("Le personnage est hors combat, il ne reste donc pas sonné");
      return;
    }
    await this.setEffect(STATUSES.StatusStunned, sonne);
  }

  /* -------------------------------------------- */
  getSConst() {
    if (this.isEntite()) {
      return 0;
    }
    return RdDCarac.calculSConst(this.system.carac.constitution.value)
  }


  async ajoutXpConstitution(xp) {
    await this.update({ "system.carac.constitution.xp": Misc.toInt(this.system.carac.constitution.xp) + xp });
  }

  /* -------------------------------------------- */
  countBlessures(blessuresListe) {
    return blessuresListe.filter(b => b.active).length
  }
  /* -------------------------------------------- */
  countBlessuresByName(name) {
    return this.countBlessures(this.system.blessures[name].liste);
  }

  countBlessuresNonSoigneeByName(name) {
    if (this.system.blessures) {
      let blessures = this.system.blessures[name].liste;
      return blessures.filter(b => b.active && !b.psdone).length;
    }
    return 0;
  }

  /* -------------------------------------------- */
  async testSiSonne(endurance) {
    const result = await this._jetEndurance(endurance);
    if (result.roll.total == 1) {
      ChatMessage.create({ content: await this._gainXpConstitutionJetEndurance() });
    }
    return result;
  }

  /* -------------------------------------------- */
  async jetEndurance() {
    const endurance = this.system.sante.endurance.value;

    const result = await this._jetEndurance(this.system.sante.endurance.value)
    const message = {
      content: "Jet d'Endurance : " + result.roll.total + " / " + endurance + "<br>",
      whisper: ChatMessage.getWhisperRecipients(this.name)
    };
    if (result.sonne) {
      message.content += `${this.name} a échoué son Jet d'Endurance et devient Sonné`;
    }
    else if (result.roll.total == 1) {
      message.content += await this._gainXpConstitutionJetEndurance();
    }
    else {
      message.content += `${this.name} a réussi son Jet d'Endurance !`;
    }

    ChatMessage.create(message);
  }

  async _gainXpConstitutionJetEndurance() {
    await this.ajoutXpConstitution(1); // +1 XP !
    return `${this.name} a obtenu 1 sur son Jet d'Endurance et a gagné 1 point d'Expérience en Constitution. Ce point d'XP a été ajouté automatiquement.`;
  }

  async _jetEndurance(endurance) {
    const roll = await RdDDice.roll("1d20");
    let result = {
      roll: roll,
      sonne: roll.total > endurance || roll.total == 20 // 20 is always a failure
    }
    if (result.sonne) {
      await this.setSonne();
    }
    return result;
  }

  /* -------------------------------------------- */
  async jetVie() {
    let roll = await RdDDice.roll("1d20");
    let msgText = "Jet de Vie : " + roll.total + " / " + this.system.sante.vie.value + "<br>";
    if (roll.total <= this.system.sante.vie.value) {
      msgText += "Jet réussi, pas de perte de point de vie (prochain jet dans 1 round pour 1 critique, SC minutes pour une grave)";
      if (roll.total == 1) {
        msgText += "La durée entre 2 jets de vie est multipliée par 20 (20 rounds pour une critique, SCx20 minutes pour une grave)";
      }
    } else {
      msgText += "Jet échoué, vous perdez 1 point de vie";
      await this.santeIncDec("vie", -1);
      if (roll.total == 20) {
        msgText += "Votre personnage est mort !!!!!";
      }
    }
    const message = {
      content: msgText,
      whisper: ChatMessage.getWhisperRecipients(this.name)
    };
    ChatMessage.create(message);
  }

  /* -------------------------------------------- */
  async santeIncDec(name, inc, isCritique = false) {
    if (name == 'fatigue' && !ReglesOptionelles.isUsing("appliquer-fatigue")) {
      return;
    }
    const sante = duplicate(this.system.sante)
    let compteur = sante[name];
    if (!compteur) {
      return;
    }
    let result = {
      sonne: false,
    };

    let minValue = name == "vie" ? -this.getSConst() - 1 : 0;

    result.newValue = Math.max(minValue, Math.min(compteur.value + inc, compteur.max));
    //console.log("New value ", inc, minValue, result.newValue);
    let fatigue = 0;
    if (name == "endurance" && !this.isEntite()) {
      if (result.newValue == 0 && inc < 0 && !isCritique) { // perte endurance et endurance devient 0 (sauf critique) -> -1 vie
        sante.vie.value--;
        result.perteVie = true;
      }
      result.newValue = Math.max(0, result.newValue);
      if (inc > 0) { // le max d'endurance s'applique seulement à la récupération
        result.newValue = Math.min(result.newValue, this._computeEnduranceMax())
      }
      const perte = compteur.value - result.newValue;
      result.perte = perte;
      if (perte > 1) {
        // Peut-être sonné si 2 points d'endurance perdus d'un coup
        const testIsSonne = await this.testSiSonne(result.newValue);
        result.sonne = testIsSonne.sonne;
        result.jetEndurance = testIsSonne.roll.total;
      } else if (inc > 0) {
        await this.setSonne(false);
      }
      if (sante.fatigue && inc < 0) { // Each endurance lost -> fatigue lost
        fatigue = perte;
      }
    }
    compteur.value = result.newValue;
    // If endurance lost, then the same amount of fatigue cannot be recovered
    if (ReglesOptionelles.isUsing("appliquer-fatigue") && sante.fatigue && fatigue > 0) {
      sante.fatigue.value = Math.max(sante.fatigue.value + fatigue, this._computeFatigueMin());
    }
    await this.update({ "system.sante": sante })
    if (this.isDead()) {
      await this.setEffect(STATUSES.StatusComma, true);
    }
    return result;
  }

  isDead() {
    return !this.isEntite() && this.system.sante.vie.value < -this.getSConst()
  }

  /* -------------------------------------------- */
  _computeFatigueMin() {
    return this.system.sante.endurance.max - this.system.sante.endurance.value;
  }

  /* -------------------------------------------- */
  _computeEnduranceMax() {
    let blessures = this.system.blessures;
    let diffVie = this.system.sante.vie.max - this.system.sante.vie.value;
    let maxEndVie = this.system.sante.endurance.max - (diffVie * 2);
    let nbGraves = this.countBlessures(blessures.graves.liste);
    let nbCritiques = this.countBlessures(blessures.critiques.liste);
    let maxEndGraves = Math.floor(this.system.sante.endurance.max / (2 * nbGraves));
    let maxEndCritiques = nbCritiques > 0 ? 1 : this.system.sante.endurance.max;
    return Math.max(0, Math.min(maxEndVie, maxEndGraves, maxEndCritiques));
  }

  /* -------------------------------------------- */
  async manageBlessureFromSheet(gravite, index) {
    let listBlessures = duplicate(this.system.blessures);
    let blessure = listBlessures[gravite + "s"].liste[index];
    blessure.active = !blessure.active;
    if (!blessure.active) {
      this._supprimerBlessure(blessure);
    }
    await this.update({ 'system.blessures': listBlessures });
  }

  /* -------------------------------------------- */
  async setDataBlessureFromSheet(gravite, index, psoins, pcomplets, jours, loc, psdone, scdone) {
    let listBlessures = duplicate(this.system.blessures);
    let blessure = listBlessures[gravite + "s"].liste[index];
    blessure.psdone = psdone;
    blessure.scdone = scdone;
    blessure.premiers_soins = psoins;
    blessure.soins_complets = pcomplets;
    blessure.jours = jours;
    blessure.loc = loc;
    await this.update({ 'system.blessures': listBlessures });
  }

  /* -------------------------------------------- */
  async jetDeMoral(situation, messageReussi = undefined, messageManque = undefined) {
    const jetMoral = await this._jetDeMoral(situation);
    const finMessage = (jetMoral.succes ? messageReussi : messageManque) ?? (jetMoral.ajustement == 0 ? "Vous gardez votre moral" : jetMoral.ajustement > 0 ? "Vous gagnez du moral" : "Vous perdez du moral");
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: `${finMessage} - jet ${jetMoral.succes ? "réussi" : "manqué"} en situation ${situation} (${jetMoral.jet}/${jetMoral.difficulte}).`
    });
    return jetMoral.ajustement;
  }

  async _jetDeMoral(situation) {
    const moralActuel = Misc.toInt(this.system.compteurs.moral.value);
    const jet = await RdDDice.rollTotal("1d20");
    const difficulte = 10 + moralActuel;
    const succes = jet <= difficulte;
    const jetMoral = {
      actuel: moralActuel,
      jet: jet,
      situation: situation,
      difficulte: difficulte,
      succes: succes,
      ajustement: this._calculAjustementMoral(succes, moralActuel, situation)
    };
    await this.moralIncDec(jetMoral.ajustement);
    return jetMoral;
  }

  /* -------------------------------------------- */
  async moralIncDec(ajustementMoral) {
    if (ajustementMoral != 0) {
      let moral = Misc.toInt(this.system.compteurs.moral.value) + ajustementMoral
      if (moral > 3) { // exaltation
        const exaltation = Misc.toInt(this.system.compteurs.exaltation.value) + moral - 3;
        await this.updateCompteurValue('exaltation', exaltation);
      }
      if (moral < -3) { // dissolution
        const dissolution = Misc.toInt(this.system.compteurs.dissolution.value) + 3 - moral;
        await this.updateCompteurValue('dissolution', dissolution);
      }
      moral = Math.max(-3, Math.min(moral, 3));
      await this.updateCompteurValue('moral', moral);
    }
    return this.system.compteurs.moral.value;
  }

  /* -------------------------------------------- */
  _calculAjustementMoral(succes, moral, situation) {
    switch (situation) {
      case 'heureux': case 'heureuse': return succes ? 1 : 0;
      case 'malheureuse': case 'malheureux': return succes ? 0 : -1;
      case 'neutre':
        if (succes && moral <= 0) return 1;
        if (!succes && moral > 0) return -1;
    }
    return 0;
  }

  /* -------------------------------------------- */
  async setEthylisme(degre) {
    let ethylisme = duplicate(this.system.compteurs.ethylisme);
    ethylisme.value = degre;
    ethylisme.nb_doses = 0;
    if (degre == 1) {
      ethylisme.jet_moral = false;
    }
    await this.update({ "system.compteurs.ethylisme": ethylisme });
  }

  /* -------------------------------------------- */
  async jetEthylisme() {
    let rollData = {
      vie: this.system.sante.vie.max,
      forceAlcool: 0,
      etat: this.getEtatGeneral({ ethylisme: true }),
      diffNbDoses: -Number(this.system.compteurs.ethylisme.nb_doses || 0),
      finalLevel: 0,
      diffConditions: 0,
      ajustementsForce: CONFIG.RDD.difficultesLibres,
    }
    let html = await renderTemplate('systems/ctm/templates/dialog-roll-ethylisme.html', rollData);
    new RdDRollDialogEthylisme(html, rollData, this, r => this.saouler(r.forceAlcool)).render(true);
  }

  /* -------------------------------------------- */
  async actionItem(item, onActionItem = async () => { }) {
    if (!item.getActionPrincipale()) return;
    switch (item.type) {
      case 'nourritureboisson': return await this.actionNourritureboisson(item, onActionItem);
      case 'potion': return await this.consommerPotion(item, onActionItem);
      case 'livre': return await this.actionLire(item);
      case 'conteneur': return await item.sheet.render(true);
      case 'herbe': {
        if (item.isHerbeAPotion()) {
          return this.dialogFabriquerPotion(item);
        }
        return;
      }
      case 'queue': case 'ombre': return await this.actionRefoulement(item);
    }
  }

  async actionNourritureboisson(item, onActionItem) {
    const dialog = await DialogConsommer.create(this, item, onActionItem);
    dialog.render(true);
  }

  async actionLire(item) {
    const tache = await this.creerTacheDepuisLivre(item, { renderSheet: false });
    if (tache) {
      await this.rollTache(tache.id);
    }
  }

  /* -------------------------------------------- */
  async consommer(item, choix) {
    switch (item.type) {
      case 'nourritureboisson':
        return await this.consommerNourritureboisson(item.id, choix);
      case 'potion':
        return await this.consommerPotion(item)
    }
  }

  /* -------------------------------------------- */
  async consommerNourritureboisson(itemId, choix = { doses: 1, seForcer: false, supprimerSiZero: false}, userId = undefined) {
    if (userId != undefined && userId != game.user.id) {
      RdDActor.remoteActorCall({
        actorId: this.id,
        method: 'consommerNourritureboisson',
        args: [itemId, choix, userId]
      },
      userId)
      return;
    }
    const item = this.getObjet(itemId)
    if (item.type != 'nourritureboisson') {
      return;
    }
    if (choix.doses > item.system.quantite) {
      ui.notifications.warn(`Il n'y a pas assez de ${item.name} pour manger ${choix.doses}`)
      return;
    }
    if (!this._apprecierCuisine(item, choix.seForcer)) {
      ui.notifications.info(`${this.name} ne n'arrive pas à manger de ${item.name}`)
      return;
    }
    await this.manger(item, choix.doses, { diminuerQuantite: false });
    await this.boire(item, choix.doses, { diminuerQuantite: false });
    await item.diminuerQuantite(choix.doses, choix);
  }

  async _apprecierCuisine(item, seForcer) {
    const surmonteExotisme = await this._surmonterExotisme(item, seForcer);
    if (surmonteExotisme) {
      await this.apprecier('gout', 'cuisine', item.system.qualite, item.system.boisson ? "apprécie la boisson" : "apprécie le plat");
    }
    else if (seForcer) {
      await this.jetDeMoral('malheureux');
    }
    else {
      return false;
    }
    return true;
  }

  /* -------------------------------------------- */
  async _surmonterExotisme(item) {
    const exotisme = Math.min(item.system.exotisme, item.system.qualite, 0);
    if (exotisme < 0) {
      const rolled = await this.rollCaracCompetence('volonte', 'cuisine', exotisme, { title: `tente de surmonter l'exotisme de ${item.name}` });
      return rolled.isSuccess;
    }
    return true;
  }

  /* -------------------------------------------- */
  async apprecier(carac, compName, qualite, title) {
    const rolled = await this.rollCaracCompetence(carac, compName, qualite, { title: title, apprecier: true });
    if (rolled?.isSuccess) {
      await this.jetDeMoral('heureux');
    }
  }

  /* -------------------------------------------- */
  async manger(item, doses, options = { diminuerQuantite: true }) {
    const sust = item.system.sust
    if (sust > 0) {
      await this.updateCompteurValue('sust', Misc.keepDecimals(this.system.compteurs.sust.value + sust * doses, 1));
    }
    await item.diminuerQuantite(doses, options);
  }

  /* -------------------------------------------- */
  async boire(item, doses, options = { diminuerQuantite: true }) {
    const desaltere = item.system.desaltere;
    if (desaltere > 0) {
      await this.updateCompteurValue('eau', Misc.keepDecimals(this.system.compteurs.eau.value + desaltere * doses, 1));
    }
    if (item.isAlcool()) {
      for (let i = 0; i < doses; i++) {
        await this.saouler(item.system.force, item);
      }
    }
    await item.diminuerQuantite(doses, options);
  }

  /* -------------------------------------------- */
  async saouler(forceAlcool, alcool = undefined) {
    let ethylisme = duplicate(this.system.compteurs.ethylisme);

    const etat = this.getEtatGeneral({ ethylisme: true });
    const nbDoses = Number(this.system.compteurs.ethylisme.nb_doses || 0);
    const ethylismeData = {
      alias: this.name,
      actor: this,
      vie: this.system.sante.vie.max,
      alcool: alcool,
      jetVie: {
        forceAlcool: forceAlcool,
        nbDoses: nbDoses,
        selectedCarac: this.system.sante.vie,
        carac: this.system.carac,
        caracValue: this.system.sante.vie.max,
        finalLevel: etat + forceAlcool - nbDoses
      },
    }

    await RdDResolutionTable.rollData(ethylismeData.jetVie);
    this._appliquerExperienceRollData(ethylismeData.jetVie);
    RollDataAjustements.calcul(ethylismeData.jetVie, this);
    if (ethylismeData.jetVie.rolled.isSuccess) {
      ethylisme.nb_doses++;
    } else {
      ethylisme.value = Math.max(ethylisme.value - 1, -7);
      ethylisme.nb_doses = 0;

      let perte = await RdDDice.rollTotal("1d6");
      ethylismeData.perteEndurance = await this.santeIncDec("endurance", -perte);

      if (!ethylisme.jet_moral) {
        ethylismeData.jetMoral = await this._jetDeMoral('heureuse');
        if (ethylismeData.jetMoral.ajustement == 1) {
          ethylismeData.moralAlcool = 'heureux';
          ethylisme.jet_moral = true;
        } else if (ethylisme.value == -1) {
          ethylismeData.jetMoral.ajustement = -1;
          ethylismeData.moralAlcool = 'triste';
          ethylisme.jet_moral = true;
          await this.moralIncDec(-1);
        }
      }
      if (ethylisme.value < 0) {
        // Qui a bu boira (p 164)
        ethylismeData.jetVolonte = {
          selectedCarac: this.system.carac.volonte,
          caracValue: this.system.carac.volonte.value,
          ethylisme: ethylisme.value,
          finalLevel: ethylisme.value + this.system.compteurs.moral.value
        }
        await RdDResolutionTable.rollData(ethylismeData.jetVolonte);
        this._appliquerExperienceRollData(ethylismeData.jetVolonte);
        RollDataAjustements.calcul(ethylismeData.jetVolonte, this);
      }
    }
    ethylismeData.ajustementEthylique = ethylisme.value;
    ethylismeData.nomEthylisme = RdDUtility.getNomEthylisme(ethylisme.value);
    ethylismeData.doses = ethylisme.nb_doses;

    await this.update({ 'system.compteurs.ethylisme': ethylisme });
    await RdDResolutionTable.displayRollData(ethylismeData, this, 'chat-resultat-ethylisme.html');
  }

  /* -------------------------------------------- */
  async jetGoutCuisine() {
    console.info('Jet de Gout/Cuisine');
    return true;
  }

  /* -------------------------------------------- */
  async transformerStress() {
    const stress = Misc.toInt(this.system.compteurs.stress.value);
    if (stress <= 0) {
      return;
    }

    const stressRoll = await this._stressRoll(this.getReveActuel());

    const conversion = Math.floor(stress * stressRoll.factor / 100);
    let dissolution = Math.max(0, Misc.toInt(this.system.compteurs.dissolution.value));
    let exaltation = Math.max(0, Misc.toInt(this.system.compteurs.exaltation.value));
    const annule = Math.min(dissolution, exaltation);
    dissolution -= annule;
    exaltation -= annule;
    const perteDissolution = Math.max(0, Math.min(dissolution, conversion));

    let stressRollData = {
      alias: this.name,
      selectedCarac: this.system.carac.reve,
      rolled: stressRoll,
      stress: stress,
      perte: Math.min(conversion, stress),
      convertis: conversion - perteDissolution,
      xp: conversion - perteDissolution + exaltation,
      dissolution: dissolution,
      exaltation: exaltation
    };

    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate(`systems/ctm/templates/chat-resultat-transformer-stress.html`, stressRollData)
    });

    let compteurs = duplicate(this.system.compteurs);
    compteurs.stress.value = Math.max(stress - stressRollData.perte - 1, 0);
    compteurs.experience.value += stressRollData.xp;
    compteurs.dissolution.value = dissolution - perteDissolution;
    compteurs.exaltation.value = 0;
    await this.update({ "system.compteurs": compteurs });

    this.updateExperienceLog('XP', stressRollData.xp, "Transformation du stress");
  }

  /* -------------------------------------------- */
  async _stressRoll(reveActuel) {
    let result = await RdDResolutionTable.roll(reveActuel, 0);
    if (result.isPart) {
      result.second = await RdDResolutionTable.roll(reveActuel, 0);
    }
    result.factor = this._getFacteurStress(result);
    return result;
  }

  /* -------------------------------------------- */
  _getFacteurStress(stressRoll) {
    switch (stressRoll.code) {
      case "sign": return 75;
      case "norm": return 50;
      case "echec": return 20;
      case "epart": return 10;
      case "etotal": return 0;
      case "part":
        if (stressRoll.second.isSign) {
          stressRoll.quality = "Double Particulière";
          return 150;
        }
        return 100;
    }
    return 0;
  }

  /* -------------------------------------------- */
  createCallbackExperience() {
    return {
      condition: r => r.rolled.isPart && r.finalLevel < 0 && game.settings.get("core", "rollMode") != 'selfroll',
      action: r => this.appliquerAjoutExperience(r)
    };
  }

  /* -------------------------------------------- */
  createCallbackAppelAuMoral() { /* Si l'appel au moral est utilisé, on l'affiche dans le chat et on diminue éventuellement le moral */
    return {
      condition: r => r.use.appelAuMoral && game.settings.get("core", "rollMode") != 'selfroll',
      action: r => this._appliquerAppelMoral(r)
    };
  }

  /* -------------------------------------------- */
  async checkCaracXP(caracName, display = true) {
    let carac = RdDActor._findCaracByName(this.system.carac, caracName);
    if (carac && carac.xp > 0) {
      const niveauSuivant = Number(carac.value) + 1;
      let xpNeeded = RdDCarac.getCaracNextXp(niveauSuivant);
      if (carac.xp >= xpNeeded) {
        carac = duplicate(carac);
        carac.value = niveauSuivant;

        let checkXp = {
          alias: this.name,
          carac: caracName,
          value: niveauSuivant,
          xp: carac.xp
        }
        if (display) {
          ChatMessage.create({
            whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
            content: await renderTemplate(`systems/ctm/templates/chat-actor-carac-xp.html`, checkXp)
          });
        }
        return checkXp;
      }
    }
  }

  /* -------------------------------------------- */
  async checkCompetenceXP(compName, newXP, display = true) {
    let compData = this.getCompetence(compName);
    if (compData && newXP && newXP == compData.system.xp) { // Si édition, mais sans changement XP
      return;
    }
    newXP = (newXP) ? newXP : compData.system.xp;
    if (compData && newXP > 0) {
      let xpNeeded = RdDItemCompetence.getCompetenceNextXp(compData.system.niveau + 1);
      if (newXP >= xpNeeded) {
        let newCompData = duplicate(compData);
        newCompData.system.niveau += 1;
        newCompData.system.xp = newXP;
        let checkXp = {
          alias: this.name,
          competence: newCompData.name,
          niveau: newCompData.system.niveau,
          xp: newCompData.system.xp,
          archetype: newCompData.system.niveau_archetype,
          archetypeWarning: newCompData.system.niveau > compData.system.niveau_archetype
        }
        if (display) {
          ChatMessage.create({
            whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
            content: await renderTemplate(`systems/ctm/templates/chat-actor-competence-xp.html`, checkXp)
          });
        }
        return checkXp;
      }
    }
  }

  /* -------------------------------------------- */
  async appliquerAjoutExperience(rollData, hideChatMessage = 'show') {
    if (!this.isPersonnage()) return;
    hideChatMessage = hideChatMessage == 'hide' || (game.settings.get("core", "rollMode") != 'blindroll' && !game.user.isGM)
    let xpData = await this._appliquerExperience(rollData.rolled, rollData.selectedCarac.label, rollData.competence);
    if (xpData && !hideChatMessage) {
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
        content: await renderTemplate(`systems/ctm/templates/chat-actor-gain-xp.html`, xpData)
      });
    }
  }

  /* -------------------------------------------- */
  async _appliquerAppelMoral(rollData) {
    if (!this.isPersonnage()) return;
    if (!rollData.use.moral) return;
    if (rollData.rolled.isEchec ||
      (rollData.ajustements.diviseurSignificative && (rollData.rolled.roll * rollData.ajustements.diviseurSignificative > rollData.score))) {
      rollData.perteMoralEchec = rollData.moral <= -3 ? 'dissolution' : 'perte';
      rollData.moral = await this.moralIncDec(-1); /* L'appel au moral a échoué. Le personnage perd un point de moral */
    }
  }

  /* -------------------------------------------- */
  filterSortList(sortList, coord) {
    let tmr = TMRUtility.getTMR(coord);
    let letfilteredList = []
    for (let sort of sortList) {
      if (sort.system.caseTMR.toLowerCase().includes('variable')) {
        letfilteredList.push(sort);
      } else if (sort.system.caseTMRspeciale.toLowerCase().includes('variable')) {
        letfilteredList.push(sort);
      } else if (sort.system.caseTMR.toLowerCase() == tmr.type) {
        letfilteredList.push(sort);
      } else if (sort.system.caseTMR.toLowerCase().includes('special') && sort.system.caseTMRspeciale.toLowerCase().includes(coord.toLowerCase())) {
        letfilteredList.push(sort);
      }
    }

    return letfilteredList;
  }

  /* -------------------------------------------- */
  computeDraconicAndSortIndex(sortList) {
    let draconicList = this.getDraconicList();
    for (let sort of sortList) {
      let draconicsSort = this.getDraconicsSort(draconicList, sort).map(it => it.name);
      for (let index = 0; index < draconicList.length && sort.system.listIndex == undefined; index++) {
        if (draconicsSort.includes(draconicList[index].name)) {
          sort.system.listIndex = index;
        }
      }
    }
    return draconicList;
  }

  /* -------------------------------------------- */
  getDraconicsSort(draconicList, sort) {
    //console.log(draconicList, bestDraconic, draconic, voie);
    switch (Grammar.toLowerCaseNoAccent(sort.name)) {
      case "lecture d'aura":
      case "detection d'aura":
        return draconicList;
      case "annulation de magie":
        return draconicList.filter(it => !RdDItemCompetence.isThanatos(it));
    }
    return [RdDItemCompetence.getVoieDraconic(draconicList, sort.system.draconic)];
  }

  /* -------------------------------------------- */
  async rollUnSort(coord) {
    let sortList = duplicate(this.getSortList()); // Duplication car les pts de reve sont modifiés dans le sort
    if (!sortList || sortList.length == 0) {
      ui.notifications.info("Aucun sort disponible!");
      return;
    }
    sortList = this.filterSortList(sortList, coord);
    if (!sortList || sortList.length == 0) {
      ui.notifications.info("Aucun sort disponible pour cette case !");
      return;
    }
    if (EffetsDraconiques.isSortImpossible(this)) {
      ui.notifications.error("Une queue ou un souffle vous empèche de lancer de sort!");
      return;
    }
    if (this.currentTMR) this.currentTMR.minimize(); // Hide

    let draconicList = this.computeDraconicAndSortIndex(sortList);
    const reve = duplicate(this.system.carac.reve);
    let rollData = {
      carac: { 'reve': reve },
      forceCarac: { 'reve': reve },
      selectedCarac: reve,
      draconicList: draconicList,
      competence: draconicList[0],
      sortList: sortList,
      selectedSort: sortList[0],
      tmr: TMRUtility.getTMR(coord),
      diffLibre: RdDItemSort.getDifficulte(sortList[0], -7), // Per default at startup
      coutreve: Array(30).fill().map((item, index) => 1 + index),
    }

    const dialog = await RdDRoll.create(this, rollData,
      {
        html: 'systems/ctm/templates/dialog-roll-sort.html',
        close: html => { this.currentTMR.maximize() } // Re-display TMR
      },
      {
        name: 'lancer-un-sort',
        label: 'Lancer un sort',
        callbacks: [
          this.createCallbackExperience(),
          { action: r => this._rollUnSortResult(r) }
        ]
      }
    );
    dialog.render(true);
  }

  /* -------------------------------------------- */
  isMauvaiseRencontre() { // Gestion queue/souffle 'Mauvaise Rencontre en Perpective'
    let addMsg = "";
    let rencSpecial = EffetsDraconiques.mauvaiseRencontre(this);
    if (rencSpecial) {
      if (rencSpecial.type != 'souffle') {
        this.deleteEmbeddedDocuments('Item', [rencSpecial.id]); // Suppression dans la liste des queues
        addMsg = " La queue a été supprimée de votre fiche automatiquement";
      } else {
        addMsg = " Vous devez gérer manuellement le décompte de mauvaises rencontres.";
      }
      ChatMessage.create({
        content: "Vous êtes sous le coup d'une Mauvaise Rencontre en Persective." + addMsg,
        whisper: ChatMessage.getWhisperRecipients(this.name)
      });
    }
    return rencSpecial;
  }

  /* -------------------------------------------- */
  getTMRFatigue() { // Pour l'instant uniquement Inertie Draconique
    let countInertieDraconique = EffetsDraconiques.countInertieDraconique(this);
    if (countInertieDraconique > 0) {
      ChatMessage.create({
        content: `Vous êtes sous le coup d'Inertie Draconique : vous perdrez ${countInertieDraconique + 1} cases de Fatigue par déplacement au lieu d'une.`,
        whisper: ChatMessage.getWhisperRecipients(this.name)
      });
    }
    return countInertieDraconique + 1;
  }

  /* -------------------------------------------- */
  async checkSoufflePeage(tmr) {
    if ((tmr.type == 'pont' || tmr.type == 'cite') && EffetsDraconiques.isPeage(this)) {
      await this.reveActuelIncDec(-1);
      ChatMessage.create({
        content: "Vous êtes sous le coup d'un Péage : l'entrée sur cette case vous a coûté 1 Point de Rêve (déduit automatiquement).",
        whisper: ChatMessage.getWhisperRecipients(this.name)
      });
    }
  }

  /* -------------------------------------------- */
  async _rollUnSortResult(rollData) {
    let rolled = rollData.rolled;
    let selectedSort = rollData.selectedSort;

    rollData.isSortReserve = rollData.mettreEnReserve && !selectedSort.system.isrituel;
    rollData.show = {}
    rollData.depenseReve = Number(selectedSort.system.ptreve_reel);

    if (rollData.competence.name.includes('Thanatos')) { // Si Thanatos
      await this.update({ "system.reve.reve.thanatosused": true });
    }
    let reveActuel = this.system.reve.reve.value;
    if (rolled.isSuccess) { // Réussite du sort !
      if (rolled.isPart) {
        rollData.depenseReve = Math.max(Math.floor(rollData.depenseReve / 2), 1);
      }
      if (rollData.isSortReserve) {
        rollData.depenseReve++;
      }
      if (reveActuel > rollData.depenseReve) {
        // Incrémenter/gére le bonus de case
        RdDItemSort.incrementBonusCase(this, selectedSort, rollData.tmr.coord);

        if (rollData.isSortReserve) {
          await this.sortMisEnReserve(selectedSort, rollData.competence, rollData.tmr.coord, Number(selectedSort.system.ptreve_reel));
        }
      }
      else {
        rollData.depenseReve = 0;
        rollData.show.reveInsuffisant = true;
        mergeObject(rollData.rolled, RdDResolutionTable.getResultat("echec"), { overwrite: true });
      }
    } else {
      if (rolled.isETotal) { // Echec total !
        rollData.depenseReve = Math.min(reveActuel, Math.floor(rollData.depenseReve * 1.5))
        // TODO: mise en réserve d'un échec total...
        // await dialog mse en réserve, pour traitement échec total
      } else {
        rollData.depenseReve = 0
      }
    }

    reveActuel = Math.max(reveActuel - rollData.depenseReve, 0);
    await this.update({ "system.reve.reve.value": reveActuel });

    if (rollData.isSortReserve) {
      this.currentTMR.maximize(); // Re-display TMR
    } else {
      this.currentTMR.close(); // Close TMR !
    }
    // Final chat message
    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-sort.html');

    if (reveActuel == 0) { // 0 points de reve
      ChatMessage.create({ content: this.name + " est réduit à 0 Points de Rêve, et tombe endormi !" });
      closeTMR = true;
    }
  }

  /* -------------------------------------------- */
  async rollCarac(caracName) {
    let rollData = {
      selectedCarac: this.getCaracByName(caracName),
      competences: this.itemTypes['competence']
    };

    const dialog = await RdDRoll.create(this, rollData,
      { html: 'systems/ctm/templates/dialog-roll-carac.html' },
      {
        name: 'jet-' + caracName,
        label: 'Jet ' + Grammar.apostrophe('de', rollData.selectedCarac.label),
        callbacks: [
          this.createCallbackExperience(),
          this.createCallbackAppelAuMoral(),
          { action: r => this._onRollCaracResult(r) }
        ]
      }
    );
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async _onRollCaracResult(rollData) {
    // Final chat message
    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-general.html');
  }

  async rollCaracCompetence(caracName, compName, diff, options = { title: "", apprecier: false }) {
    const carac = this.getCaracByName(caracName);
    if (!carac) {
      ui.notifications.warn(`${this.name} n'a pas de caractéristique correspondant à ${caracName}`)
      return;
    }
    const competence = this.getCompetence(compName);
    if (options.apprecier && competence) {
      const minQualite = Math.max(0, competence.system.niveau);
      if (diff <= minQualite) {
        ui.notifications.info(`${this.name} a un niveau ${competence.system.niveau} en ${competence.name}, trop élevé pour apprécier la qualité de ${diff}`)
        return;
      }
    }
    let rollData = {
      alias: this.name,
      caracValue: Number(carac.value),
      selectedCarac: carac,
      competence: competence,
      diffLibre: diff,
      show: { title: options?.title ?? '' }
    };
    RollDataAjustements.calcul(rollData, this);
    await RdDResolutionTable.rollData(rollData);
    this._appliquerExperienceRollData(rollData);
    await RdDResolutionTable.displayRollData(rollData, this)
    return rollData.rolled;
  }

  /* -------------------------------------------- */
  _appliquerExperienceRollData(rollData) {
    const callback = this.createCallbackExperience();
    if (callback.condition(rollData)) {
      callback.action(rollData);
    }
  }

  /* -------------------------------------------- */
  async rollCompetence(idOrName, options = {tryTarget: true}) {
    let rollData = {
      carac: this.system.carac,
      competence: this.getCompetence(idOrName)
    }
    if (rollData.competence.type == 'competencecreature') {
      if (rollData.competence.system.iscombat && options.tryTarget && Targets.hasTargets()) {
        Targets.selectOneToken(target => {
            if (rollData.competence.system.ispossession) {
              RdDPossession.onAttaquePossession(target, this, rollData.competence)
            }
            else {
              const arme = RdDItemCompetenceCreature.armeNaturelle(rollData.competence)
              RdDCombat.rddCombatTarget(target, this).attaque(competence, arme)
            }
          });
        return;
      }
      // Transformer la competence de créature
      RdDItemCompetenceCreature.setRollDataCreature(rollData)
    }
    console.log("rollCompetence !!!", rollData);
    const dialog = await RdDRoll.create(this, rollData,
      { html: 'systems/ctm/templates/dialog-roll-competence.html' },
      {
        name: 'jet-competence',
        label: 'Jet ' + Grammar.apostrophe('de', rollData.competence.name),
        callbacks: [
          this.createCallbackExperience(),
          this.createCallbackAppelAuMoral(),
          { action: r => this.$onRollCompetence(r) }
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async $onRollCompetence(rollData) {
    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-competence.html')
  }

  /* -------------------------------------------- */
  async creerTacheDepuisLivre(item, options = { renderSheet: true }) {
    const nomTache = "Lire " + item.name;
    const filterTacheLecture = it => it.type == 'tache' && it.name == nomTache;
    let tachesExistantes = this.filterItems(filterTacheLecture);
    if (tachesExistantes.length == 0) {
      const tache = {
        name: nomTache, type: 'tache',
        system: {
          carac: 'intellect',
          competence: 'Ecriture',
          difficulte: item.system.difficulte,
          periodicite: "60 minutes",
          fatigue: 2,
          points_de_tache: item.system.points_de_tache,
          points_de_tache_courant: 0,
          description: "Lecture du livre " + item.name + " - XP : " + item.system.xp + " - Compétences : " + item.system.competence
        }
      }
      await this.createEmbeddedDocuments('Item', [tache], options);
      tachesExistantes = this.filterItems(filterTacheLecture);
    }
    return tachesExistantes.length > 0 ? tachesExistantes[0] : undefined;
  }

  /* -------------------------------------------- */
  async rollTache(id) {
    const tacheData = this.getTache(id)
    const compData = this.getCompetence(tacheData.system.competence)
    compData.system.defaut_carac = tacheData.system.carac; // Patch !

    let rollData = {
      competence: compData,
      tache: tacheData,
      diffLibre: tacheData.system.difficulte,
      diffConditions: 0,
      use: { libre: false, conditions: true },
      carac: {}
    };
    rollData.carac[tacheData.system.carac] = duplicate(this.system.carac[tacheData.system.carac]); // Single carac

    console.log("rollTache !!!", rollData);

    const dialog = await RdDRoll.create(this, rollData,
      { html: 'systems/ctm/templates/dialog-roll-competence.html' },
      {
        name: 'jet-competence',
        label: 'Jet de Tâche ' + tacheData.name,
        callbacks: [
          this.createCallbackExperience(),
          this.createCallbackAppelAuMoral(),
          { action: r => this._tacheResult(r) }
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async _tacheResult(rollData) {
    // Mise à jour de la tache
    rollData.appliquerFatigue = ReglesOptionelles.isUsing("appliquer-fatigue");
    rollData.tache = duplicate(rollData.tache);
    rollData.tache.system.points_de_tache_courant += rollData.rolled.ptTache;
    if (rollData.rolled.isETotal) {
      rollData.tache.system.difficulte--;
    }
    if (rollData.rolled.isSuccess) {
      rollData.tache.system.nb_jet_succes++;
    } else {
      rollData.tache.system.nb_jet_echec++;
    }
    rollData.tache.system.tentatives = rollData.tache.system.nb_jet_succes + rollData.tache.system.nb_jet_echec;

    this.updateEmbeddedDocuments('Item', [rollData.tache]);
    this.santeIncDec("fatigue", rollData.tache.system.fatigue);

    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-tache.html');
  }

  /* -------------------------------------------- */
  async _rollArt(artData, selected, oeuvre, callBackResult = r => this._resultArt(r)) {
    mergeObject(artData,
      {
        oeuvre: oeuvre,
        art: oeuvre.type,
        competence: duplicate(this.getCompetence(artData.compName ?? oeuvre.system.competence ?? artData.art)),
        diffLibre: - (oeuvre.system.niveau ?? 0),
        diffConditions: 0,
        use: { libre: false, conditions: true },
        selectedCarac: duplicate(this.system.carac[selected])
      },
      { overwrite: false });
    artData.competence.system.defaut_carac = selected;
    if (!artData.forceCarac) {
      artData.forceCarac = {};
      artData.forceCarac[selected] = duplicate(this.system.carac[selected]);
    }
    console.log("rollArt !!!", artData);

    const dialog = await RdDRoll.create(this, artData,
      { html: `systems/ctm/templates/dialog-roll-${oeuvre.type}.html` },
      {
        name: `jet-${artData.art}`,
        label: `${artData.verbe} ${oeuvre.name}`,
        callbacks: [
          this.createCallbackExperience(),
          this.createCallbackAppelAuMoral(),
          { action: r => callBackResult(r) }
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async _resultArt(artData) {
    const baseQualite = (artData.rolled.isSuccess ? artData.oeuvre.system.niveau : artData.competence.system.niveau);
    artData.qualiteFinale = Math.min(baseQualite, artData.oeuvre.system.niveau) + artData.rolled.ptQualite;

    await RdDResolutionTable.displayRollData(artData, this.name, `chat-resultat-${artData.art}.html`);
  }

  /* -------------------------------------------- */
  async rollChant(id) {
    const artData = { art: 'chant', verbe: 'Chanter' };
    const oeuvre = duplicate(this.getChant(id));
    await this._rollArt(artData, "ouie", oeuvre);
  }

  /* -------------------------------------------- */
  async rollDanse(id) {
    const artData = { art: 'danse', verbe: 'Danser', forceCarac: {} };
    const oeuvre = duplicate(this.getItemOfType(id, artData.art));
    if (oeuvre.system.agilite) {
      artData.forceCarac['agilite'] = duplicate(this.system.carac.agilite);
    }
    if (oeuvre.system.apparence) {
      artData.forceCarac['apparence'] = duplicate(this.system.carac.apparence);
    }
    const selectedCarac = this._getCaracDanse(oeuvre);
    await this._rollArt(artData, selectedCarac, oeuvre);
  }

  /* -------------------------------------------- */
  _getCaracDanse(oeuvre) {
    if (oeuvre.system.agilite) { return "agilite"; }
    else if (oeuvre.system.apparence) { return "apparence"; }
    const compData = this.getCompetence(oeuvre.system.competence);
    return compData.system.defaut_carac;
  }

  /* -------------------------------------------- */
  async rollMusique(id) {
    const artData = { art: 'musique', verbe: 'Jouer' };
    const oeuvre = this.getItemOfType(id, artData.art);
    await this._rollArt(artData, "ouie", oeuvre);
  }

  /* -------------------------------------------- */
  async rollRecetteCuisine(id) {
    const oeuvre = this.getRecetteCuisine(id);
    const artData = {
      verbe: 'Cuisiner',
      compName: 'cuisine',
      proportions: 1,
      ajouterEquipement: false
    };
    await this._rollArt(artData, 'odoratgout', oeuvre, r => this._resultRecetteCuisine(r));
  }

  /* -------------------------------------------- */
  async _resultRecetteCuisine(artData) {
    const baseQualite = (artData.rolled.isSuccess ? artData.oeuvre.system.niveau : artData.competence.system.niveau);
    const sust = artData.oeuvre.system.sust * artData.proportions;
    artData.qualiteFinale = Math.min(baseQualite, artData.oeuvre.system.niveau) + artData.rolled.ptQualite;
    artData.exotismeFinal = Math.min(Math.min(artData.qualiteFinale, artData.oeuvre.system.exotisme ?? 0), 0);
    //console.log("OEUVRE", artData.art, artData)
    const platCuisine = {
      name: artData.oeuvre.name,
      type: 'nourritureboisson',
      img: 'systems/ctm/icons/objets/provision_cuite.webp',
      system: {
        "description": artData.oeuvre.system.description,
        "sust": Math.min(sust, 1),
        "qualite": artData.qualiteFinale,
        "exotisme": artData.exotismeFinal,
        "encombrement": 0.1,
        "quantite": Math.max(1, Math.floor(sust)),
        "cout": Math.max(artData.qualiteFinale) * 0.01
      }
    };
    if (artData.ajouterEquipement) {
      await this.createEmbeddedDocuments('Item', [platCuisine]);
      ui.notifications.info(`${platCuisine.system.quantite} rations de ${platCuisine.name} ont été ajoutés à votre équipement`);
    }
    artData.platCuisine = platCuisine;
    await RdDResolutionTable.displayRollData(artData, this.name, `chat-resultat-${artData.art}.html`);
  }

  /* -------------------------------------------- */
  async rollJeu(id) {
    const oeuvre = this.getJeu(id);

    const listCarac = oeuvre.system.caraccomp.toLowerCase().split(/[.,:\/-]/).map(it => it.trim());
    const carac = listCarac.length > 0 ? listCarac[0] : 'chance'
    const artData = {
      art: 'jeu', verbe: 'Jeu',
      use: { libre: true, conditions: true, },
      competence: duplicate(this.getCompetence('jeu')),
      forceCarac: {}
    };
    listCarac.forEach(c => artData.forceCarac[c] = this.system.carac[c]);
    artData.competence.system.niveauReel = artData.competence.system.niveau;
    artData.competence.system.niveau = Math.max(artData.competence.system.niveau, oeuvre.system.base);
    await this._rollArt(artData, carac, oeuvre);
  }

  async rollOeuvre(id) {
    const artData = { art: 'oeuvre', verbe: 'Interpréter' }
    const oeuvre = duplicate(this.getItemOfType(id, artData.art))
    await this._rollArt(artData, oeuvre.system.default_carac, oeuvre)
  }

  /* -------------------------------------------- */
  async rollMeditation(id) {
    const meditation = duplicate(this.getMeditation(id));
    const competence = duplicate(this.getCompetence(meditation.system.competence));
    competence.system.defaut_carac = "intellect"; // Meditation = toujours avec intellect
    let meditationData = {
      competence: competence,
      meditation: meditation,
      conditionMeditation: { isHeure: false, isVeture: false, isComportement: false, isPurification: false },
      diffConditions: 0,
      use: { libre: false, conditions: true, },
      carac: { "intellect": this.system.carac.intellect }
    };

    const dialog = await RdDRoll.create(this, meditationData,
      { html: 'systems/ctm/templates/dialog-roll-meditation.html' },
      {
        name: 'jet-meditation',
        label: "Jet de méditation",
        callbacks: [
          this.createCallbackExperience(),
          { condition: r => r.rolled.isEPart, action: r => this._meditationEPart(r) },
          { action: r => this._meditationResult(r) }
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async _meditationResult(meditationRoll) {
    this.santeIncDec("fatigue", 2);

    if (meditationRoll.rolled.isSuccess) {
      await this.createEmbeddedDocuments("Item", [RdDItemSigneDraconique.prepareSigneDraconiqueMeditation(meditationRoll.meditation, meditationRoll.rolled)]);
    }

    await RdDResolutionTable.displayRollData(meditationRoll, this.name, 'chat-resultat-meditation.html');
  }

  /* -------------------------------------------- */
  _meditationEPart(meditationRoll) {
    this.updateEmbeddedDocuments('Item', [{ _id: meditationRoll.meditation._id, 'system.malus': meditationRoll.meditation.system.malus - 1 }]);
  }


  /* -------------------------------------------- */
  _getSignesDraconiques(coord) {
    const type = TMRUtility.getTMRType(coord);
    return this.listItemsData("signedraconique").filter(it => it.system.typesTMR.includes(type));
  }

  /* -------------------------------------------- */
  isResonanceSigneDraconique(coord) {
    return this._getSignesDraconiques(coord).length > 0;
  }

  /* -------------------------------------------- */
  async rollLireSigneDraconique(coord) {
    if (!this.isHautRevant()) {
      ui.notifications.info("Seul un haut rêvant peut lire un signe draconique!");
      return;
    }
    let signes = this._getSignesDraconiques(coord);
    if (signes.length == 0) {
      ui.notifications.info(`Aucun signe draconiques en ${coord} !`);
      return;
    }
    if (this.currentTMR) this.currentTMR.minimize(); // Hide

    let draconicList = this.getDraconicList()
      .map(draconic => {
        let draconicLecture = duplicate(draconic);
        draconicLecture.system.defaut_carac = "intellect";
        return draconicLecture;
      });

    const intellect = this.system.carac.intellect;
    let rollData = {
      carac: { 'intellect': intellect },
      selectedCarac: intellect,
      competence: draconicList[0],
      draconicList: draconicList,
      signe: signes[0],
      signes: signes,
      tmr: TMRUtility.getTMR(coord),
      diffLibre: signes[0].system.difficulte,
    }

    const dialog = await RdDRoll.create(this, rollData,
      {
        html: 'systems/ctm/templates/dialog-roll-signedraconique.html',
        close: html => { this.currentTMR.maximize() } // Re-display TMR
      },
      {
        name: 'lire-signe-draconique',
        label: 'Lire le signe draconique',
        callbacks: [
          this.createCallbackExperience(),
          { action: r => this._rollLireSigneDraconique(r) }
        ]
      }
    );
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async _rollLireSigneDraconique(rollData) {
    const compData = rollData.competence;
    if (!RdDItemCompetence.isDraconic(compData)) {
      ui.notifications.error(`La compétence ${compData.name} n'est pas une compétence draconique`);
      return;
    }
    rollData.xpSort = RdDItemSigneDraconique.getXpSortSigneDraconique(rollData.rolled.code, rollData.signe);
    if (rollData.xpSort > 0) {
      await this.updateEmbeddedDocuments("Item", [{ _id: compData._id, 'system.xp_sort': Misc.toInt(compData.system.xp_sort) + rollData.xpSort }]);
      await this.updateExperienceLog("XP Sort", rollData.xpSort, "Signe draconique en " + rollData.competence.name);
    }
    await this.deleteEmbeddedDocuments("Item", [rollData.signe._id]);
    await RdDResolutionTable.displayRollData(rollData, this.name, 'chat-resultat-lecture-signedraconique.html');
    this.currentTMR.close();
  }

  /* -------------------------------------------- */
  async rollAppelChance(onSuccess = () => { }, onEchec = () => { }) {
    // Stocke si utilisation de la chance
    let rollData = { selectedCarac: this.getCaracByName('chance-actuelle'), surprise: '' };
    const dialog = await RdDRoll.create(this, rollData,
      { html: 'systems/ctm/templates/dialog-roll-carac.html' },
      {
        name: 'appelChance',
        label: 'Appel à la chance',
        callbacks: [
          this.createCallbackExperience(),
          { action: r => this._appelChanceResult(r, onSuccess, onEchec) },
        ]
      }
    );
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async _appelChanceResult(rollData, onSuccess = () => { }, onEchec = () => { }) {
    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-appelchance.html')
    if (rollData.rolled.isSuccess) {
      await this.setFlag(SYSTEM_RDD, 'utilisationChance', true);
      await this.chanceActuelleIncDec(-1);
      onSuccess();
    }
    else {
      onEchec();
    }
  }

  /* -------------------------------------------- */
  async chanceActuelleIncDec(value) {
    const chance = Math.min(this.getChance(), Math.max(this.getChanceActuel() + value, 0));
    await this.updateCompteurValue("chance", chance);
  }

  /* -------------------------------------------- */
  async appelDestinee(onSuccess = () => { }, onEchec = () => { }) {
    let destinee = this.system.compteurs.destinee?.value ?? 0;
    if (destinee > 0) {
      ChatMessage.create({ content: `<span class="rdd-roll-part">${this.name} a fait appel à la Destinée !</span>` });
      destinee--;
      await this.updateCompteurValue("destinee", destinee);
      onSuccess();
    }
    else {
      onEchec();
    }
  }

  /* -------------------------------------------- */
  getHeureNaissance() {
    if (this.isCreature()) {
      return 0;
    }
    return this.system.heure;
  }

  /* -------------------------------------------- */
  ajustementAstrologique() {
    if (this.isCreature()) {
      return 0;
    }
    // selon l'heure de naissance...
    return game.system.rdd.calendrier.getAjustementAstrologique(this.system.heure, this.name)
  }
  /* -------------------------------------------- */
  checkDesirLancinant() {
    let queue = this.filterItems(it => it.type == 'queue' || it.type == 'ombre')
      .filter(it => it.system.categorie == 'lancinant');
    return (queue.length > 0);
  }

  /* -------------------------------------------- */
  async _appliquerExperience(rolled, caracName, competence) {
    if (!this.isPersonnage()) return;
    // Pas d'XP
    if (!rolled.isPart || rolled.finalLevel >= 0) {
      return undefined;
    }
    if (this.checkDesirLancinant()) {
      // Cas de désir lancinant, pas d'expérience sur particulière
      ChatMessage.create({
        content: `Vous souffrez au moins d'un Désir Lancinant, vous ne pouvez pas gagner d'expérience sur une Particulière tant que le désir n'est pas assouvi`,
        whisper: ChatMessage.getWhisperRecipients(this.name)
      });
      return undefined;
    }
    if (caracName == 'Vie') caracName = 'constitution';
    if (caracName == 'derobee') caracName = 'agilite';
    if (caracName == 'reve-actuel') caracName = 'reve';

    let xp = Math.abs(rolled.finalLevel);
    // impair: arrondi inférieur en carac
    let xpCarac = competence ? Math.floor(xp / 2) : Math.max(Math.floor(xp / 2), 1);

    let xpData = {
      alias: this.name,
      caracName: caracName, xpCarac: xpCarac,
      competence: competence, xpCompetence: competence ? xp - xpCarac : 0
    };

    await this._xpCompetence(xpData);
    await this._xpCarac(xpData);
    return xpData;
  }

  /* -------------------------------------------- */
  async _xpCompetence(xpData) {
    if (xpData.competence) {
      const newXp = Misc.toInt(xpData.competence.system.xp) + xpData.xpCompetence;
      let update = { _id: xpData.competence._id, 'system.xp': newXp };
      await this.updateEmbeddedDocuments('Item', [update]);
      xpData.checkComp = await this.checkCompetenceXP(xpData.competence.name, undefined, false);
      this.updateExperienceLog("XP", xpData.xpCompetence, "XP gagné en " + xpData.competence.name);
    }
  }

  /* -------------------------------------------- */
  async _xpCarac(xpData) {
    if (xpData.xpCarac > 0) {
      let carac = duplicate(this.system.carac);
      let selectedCarac = RdDActor._findCaracByName(carac, xpData.caracName);
      if (!selectedCarac.derivee) {
        selectedCarac.xp = Misc.toInt(selectedCarac.xp) + xpData.xpCarac;
        await this.update({ "system.carac": carac });
        xpData.checkCarac = await this.checkCaracXP(selectedCarac.label, false);
        this.updateExperienceLog("XP", xpData.xpCarac, "XP gagné en " + xpData.caracName);
      } else {
        xpData.caracRepartitionManuelle = true;
      }
    }
  }

  /* -------------------------------------------- */
  async resetNombreAstral() {
    let toDelete = this.listItemsData('nombreastral');
    const deletions = toDelete.map(it => it._id);
    await this.deleteEmbeddedDocuments("Item", deletions);
  }

  /* -------------------------------------------- */
  async ajouteNombreAstral(callData) {
    // Gestion expérience (si existante)
    callData.competence = this.getCompetence("astrologie")
    callData.selectedCarac = this.system.carac["vue"];
    this.appliquerAjoutExperience(callData, 'hide');

    // Ajout du nombre astral
    const item = {
      name: "Nombre Astral", type: "nombreastral", system:
        { value: callData.nbAstral, istrue: callData.isvalid, jourindex: Number(callData.date), jourlabel: game.system.rdd.calendrier.getDateFromIndex(Number(callData.date)) }
    };
    await this.createEmbeddedDocuments("Item", [item]);

    // Suppression des anciens nombres astraux
    let toDelete = this.listItemsData('nombreastral').filter(it => it.system.jourindex < game.system.rdd.calendrier.getCurrentDayIndex());
    const deletions = toDelete.map(it => it._id);
    await this.deleteEmbeddedDocuments("Item", deletions);

    // Affichage Dialog
    this.astrologieNombresAstraux();
  }

  /* -------------------------------------------- */
  async astrologieNombresAstraux() {
    // Afficher l'interface spéciale
    const astrologieDialog = await RdDAstrologieJoueur.create(this, {});
    astrologieDialog.render(true);
  }

  /* -------------------------------------------- */
  getCaracByName(name) {
    switch (Grammar.toLowerCaseNoAccent(name)) {
      case 'reve-actuel': case 'reve actuel':
        return {
          label: 'Rêve actuel',
          value: this.getReveActuel(),
          type: "number"
        };
      case 'chance-actuelle': case 'chance-actuelle':
        return {
          label: 'Chance actuelle',
          value: this.getChanceActuel(),
          type: "number"
        };
    }
    return RdDActor._findCaracByName(this.system.carac, name);
  }

  /* -------------------------------------------- */
  static _findCaracByName(carac, name) {
    name = Grammar.toLowerCaseNoAccent(name);
    switch (name) {
      case 'reve-actuel': case 'reve actuel':
        return carac.reve;
      case 'chance-actuelle': case 'chance actuelle':
        return carac.chance;
    }

    const caracList = Object.entries(carac);
    let entry = Misc.findFirstLike(name, caracList, { mapper: it => it[0], description: 'caractéristique' });
    if (!entry || entry.length ==0) {
      entry = Misc.findFirstLike(name, caracList, { mapper: it => it[1].label, description: 'caractéristique' });
    }
    return entry && entry.length > 0 ? carac[entry[0]] : undefined;
  }

  /* -------------------------------------------- */
  getSortList() {
    return this.listItemsData("sort");
  }

  /* -------------------------------------------- */
  countMonteeLaborieuse() { // Return +1 par queue/ombre/souffle Montée Laborieuse présente
    let countMonteeLaborieuse = EffetsDraconiques.countMonteeLaborieuse(this);
    if (countMonteeLaborieuse > 0) {
      ChatMessage.create({
        content: `Vous êtes sous le coup d'une Montée Laborieuse : vos montées en TMR coûtent ${countMonteeLaborieuse} Point de Rêve de plus.`,
        whisper: ChatMessage.getWhisperRecipients(this.name)
      });
    }
    return countMonteeLaborieuse;
  }

  /* -------------------------------------------- */
  refreshTMRView() {
    if (this.currentTMR) {
      this.currentTMR.externalRefresh();
    }
  }

  /* -------------------------------------------- */
  async displayTMR(mode = "normal") {
    if (this.tmrApp) {
      ui.notifications.warn("Vous êtes déja dans les TMR....");
      return
    }
    if (mode != 'visu' &&  this.getEffect(STATUSES.StatusDemiReve)) {
      ui.notifications.warn("Le joueur ou le MJ est déja dans les Terres Médianes avec ce personnage ! Visualisation uniquement");
      mode = "visu"; // bascule le mode en visu automatiquement
    }
    RdDConfirm.confirmer({
      bypass: mode == 'visu',
      settingConfirmer: "confirmation-tmr",
      content: `<p>Voulez vous monter dans les TMR en mode ${mode}?</p>`,
      title: 'Confirmer la montée dans les TMR',
      buttonLabel: 'Monter dans les TMR',
      onAction: async () => await this._doDisplayTMR(mode)
    });
  }

  async _doDisplayTMR(mode) {
    let isRapide = mode == "rapide";
    if (mode != "visu") {
      let minReveValue = (isRapide && !EffetsDraconiques.isDeplacementAccelere(this) ? 3 : 2) + this.countMonteeLaborieuse();
      if (this.getReveActuel() < minReveValue) {
        ChatMessage.create({
          content: `Vous n'avez les ${minReveValue} Points de Reve nécessaires pour monter dans les Terres Médianes`,
          whisper: ChatMessage.getWhisperRecipients(this.name)
        });
        return;
      }
      await this.setEffect(STATUSES.StatusDemiReve, true);
    }

    const fatigue = this.system.sante.fatigue.value;
    const endurance = this.system.sante.endurance.max;
    let tmrFormData = {
      mode: mode,
      fatigue: RdDUtility.calculFatigueHtml(fatigue, endurance),
      draconic: this.getDraconicList(),
      sort: this.getSortList(),
      signes: this.listItemsData("signedraconique"),
      caracReve: this.system.carac.reve.value,
      pointsReve: this.getReveActuel(),
      isRapide: isRapide,
      isGM: game.user.isGM,
      hasPlayerOwner: this.hasPlayerOwner
    }

    this.currentTMR = await RdDTMRDialog.create(this, tmrFormData);
    this.currentTMR.render(true);
  }

  /* -------------------------------------------- */
  rollArme(arme) {
    if (!Targets.hasTargets()) {
      RdDConfirm.confirmer({
        settingConfirmer: "confirmer-combat-sans-cible",
        content: `<p>Voulez vous faire un jet de compétence ${arme.system.competence} sans choisir de cible valide?
                  <br>Tous les jets de combats devront être gérés à la main
                  </p>`,
        title: 'Ne pas utiliser les automatisation de combat',
        buttonLabel: "Pas d'automatisation",
        onAction: async () => {
          this.rollCompetence(arme.system.competence, {tryTarget: false})
        }
      });
      return;
    }
    Targets.selectOneToken(target => {
      if (Targets.isTargetEntite(target)){
        ui.notifications.warn(`Vous ne pouvez pas attaquer une entité non incarnée avec votre ${arme.name}!!!!`);
        return;
      }
  
      
      const competence = this.getCompetence(arme.system.competence)
      if (competence.system.ispossession) {
        return RdDPossession.onAttaquePossession(target, this, competence);
      }
      RdDCombat.rddCombatTarget(target, this).attaque(competence, arme);
    })

  }

  /* -------------------------------------------- */
  conjurerPossession(possession) {
    // TODO: choix de la compétence de draconic ou de possession
    let draconic = this.getDraconicOuPossession();
    RdDPossession.onConjurerPossession(this, draconic, possession)
  }

  /* -------------------------------------------- */
  getArmeParade(armeParadeId) {
    const item = armeParadeId ? this.getEmbeddedDocument('Item', armeParadeId) : undefined;
    return RdDItemArme.getArme(item);
  }

  /* -------------------------------------------- */
  verifierForceMin(item) {
    if (item.type == 'arme' && item.system.force > this.system.carac.force.value) {
      ChatMessage.create({
        content: `<strong>${this.name} s'est équipé(e) de l'arme ${item.name}, mais n'a pas une force suffisante pour l'utiliser normalement </strong>
                  (${item.system.force} nécessaire pour une Force de ${this.system.carac.force.value})`
      });
    }
  }

  /* -------------------------------------------- */
  async equiperObjet(itemID) {
    let item = this.getEmbeddedDocument('Item', itemID);
    if (item?.system) {
      const isEquipe = !item.system.equipe;
      let update = { _id: item.id, "system.equipe": isEquipe };
      await this.updateEmbeddedDocuments('Item', [update]);
      this.computeEncombrementTotalEtMalusArmure(); // Mise à jour encombrement
      if (isEquipe)
        this.verifierForceMin(item);
    }
  }

  /* -------------------------------------------- */
  async computeArmure(attackerRoll) {
    let dmg = (attackerRoll.dmg.dmgArme ?? 0) + (attackerRoll.dmg.dmgActor ?? 0);
    let armeData = attackerRoll.arme;
    let protection = 0;
    const armures = this.items.filter(it => it.type == "armure" && it.system.equipe);
    for (const armure of armures) {
      protection += await RdDDice.rollTotal(armure.system.protection.toString());
      if (dmg > 0) {
        this._deteriorerArmure(armure, dmg);
        dmg = 0;
      }
    }
    const penetration = Misc.toInt(armeData?.system.penetration ?? 0);
    protection = Math.max(protection - penetration, 0);
    protection += this.getProtectionNaturelle();
    // Gestion des cas particuliers sur la fenêtre d'encaissement
    if (attackerRoll.dmg.encaisserSpecial == "noarmure") {
      protection = 0;
    }
    if (attackerRoll.dmg.encaisserSpecial == "chute") {
      protection = Math.min(protection, 2);
    }
    console.log("Final protect", protection, attackerRoll);
    return protection;
  }

  /* -------------------------------------------- */
  _deteriorerArmure(armure, dmg) {
    armure = duplicate(armure);
    if (!ReglesOptionelles.isUsing('deteriorationArmure') || armure.system.protection == '0') {
      return;
    }
    armure.system.deterioration = (armure.system.deterioration ?? 0) + dmg;
    if (armure.system.deterioration >= 10) {
      armure.system.deterioration -= 10;
      let res = /(\d+)?d(\d+)(\-\d+)?/.exec(armure.system.protection);
      if (res) {
        let malus = Misc.toInt(res[3]) - 1;
        let armure = Misc.toInt(res[2]);
        if (armure + malus <= 0) {
          armure.system.protection = 0;
        } else {
          armure.system.protection = '' + (res[1] ?? '1') + 'd' + armure + malus;
        }
      }
      else if (/\d+/.exec(armure.system.protection)) {
        armure.system.protection = "1d" + armure.system.protection;
      }
      else {
        ui.notifications.warn(`La valeur d'armure de votre ${armure.name} est incorrecte`);
      }
      ChatMessage.create({ content: "Votre armure s'est détériorée, elle protège maintenant de " + armure.system.protection });
    }
    this.updateEmbeddedDocuments('Item', [armure]);
  }

  /* -------------------------------------------- */
  async encaisser() {
    let dialogData = { ajustementsEncaissement: RdDUtility.getAjustementsEncaissement() };
    let html = await renderTemplate('systems/ctm/templates/dialog-roll-encaisser.html', dialogData);
    new RdDEncaisser(html, this).render(true);
  }

  /* -------------------------------------------- */
  async encaisserDommages(rollData, attacker = undefined, show = undefined) {
    if (attacker && !await attacker.accorder(this, 'avant-encaissement')) {
      return;
    }
    this.validerEncaissement(rollData, show);
  }

  async validerEncaissement(rollData, show) {
    if (ReglesOptionelles.isUsing('validation-encaissement-gr') && !game.user.isGM) {
        RdDActor.remoteActorCall({
          actorId: this.id,
          method: 'validerEncaissement',
          args: [rollData, show]
        });
        return;
    }
    const armure = await this.computeArmure(rollData);
    if (ReglesOptionelles.isUsing('validation-encaissement-gr')) {
      DialogValidationEncaissement.validerEncaissement(this, rollData, armure, show, (encaissement, show) => this._appliquerEncaissement(encaissement, show));
    }
    else {
      let encaissement = await RdDUtility.jetEncaissement(rollData, armure, { showDice: SHOW_DICE });
      await this._appliquerEncaissement(encaissement, show)
    }
  }

  async _appliquerEncaissement(encaissement, show) {
    let santeOrig = duplicate(this.system.sante);

    this.ajouterBlessure(encaissement); // Will upate the result table
    const perteVie = this.isEntite()
      ? { newValue: 0 }
      : await this.santeIncDec("vie", -encaissement.vie);
    const perteEndurance = await this.santeIncDec("endurance", -encaissement.endurance, encaissement.critiques > 0);

    this.computeEtatGeneral();

    mergeObject(encaissement, {
      alias: this.name,
      hasPlayerOwner: this.hasPlayerOwner,
      resteEndurance: this.system.sante.endurance.value,
      sonne: perteEndurance.sonne,
      jetEndurance: perteEndurance.jetEndurance,
      endurance: santeOrig.endurance.value - perteEndurance.newValue,
      vie: this.isEntite() ? 0 : (santeOrig.vie.value - perteVie.newValue),
      show: show ?? {}
    });

    await ChatUtility.createChatWithRollMode(this.name, {
      roll: encaissement.roll,
      content: await renderTemplate('systems/ctm/templates/chat-resultat-encaissement.html', encaissement)
    });

    if (!encaissement.hasPlayerOwner && encaissement.endurance != 0) {
      encaissement = duplicate(encaissement);
      encaissement.isGM = true;
      ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients("GM"),
        content: await renderTemplate('systems/ctm/templates/chat-resultat-encaissement.html', encaissement)
      });
    }
  }

  /* -------------------------------------------- */
  ajouterBlessure(encaissement) {
    if (this.type == 'entite') return; // Une entité n'a pas de blessures
    if (encaissement.legeres + encaissement.graves + encaissement.critiques == 0) return;

    const endActuelle = Number(this.system.sante.endurance.value);
    let blessures = duplicate(this.system.blessures);

    let count = encaissement.legeres;
    // Manage blessures
    while (count > 0) {
      let legere = blessures.legeres.liste.find(it => !it.active);
      if (legere) {
        this._setBlessure(legere, encaissement);
        count--;
      }
      else {
        encaissement.graves += count;
        encaissement.legeres -= count;
        break;
      }
    }

    count = encaissement.graves;
    while (count > 0) {
      let grave = blessures.graves.liste.find(it => !it.active);
      if (grave) {
        this._setBlessure(grave, encaissement);
        count--;
      }
      else {
        encaissement.critiques += count;
        encaissement.graves -= count;
        encaissement.endurance = endActuelle;
        encaissement.vie = 4;
        break;
      }
    }

    count = encaissement.critiques;
    while (count > 0) {
      let critique = blessures.critiques.liste[0];
      if (!critique.active) {
        this._setBlessure(critique, encaissement);
        count--;
      } else {
        // TODO: status effect dead
        this.setEffect(STATUSES.StatusComma, true);
        ChatMessage.create({
          content: `<img class="chat-icon" src="icons/svg/skull.svg" alt="charge" />
          <strong>${this.name} vient de succomber à une seconde blessure critique ! Que les Dragons gardent son Archétype en paix !</strong>`
        });
        encaissement.critiques -= count;
        encaissement.mort = true;
        break;
      }
    }

    encaissement.endurance = Math.max(encaissement.endurance, -endActuelle);
    this.update({ "system.blessures": blessures });
  }

  /* -------------------------------------------- */
  _setBlessure(blessure, encaissement) {
    blessure.active = true;
    blessure.psdone = false;
    blessure.scdone = false;
    blessure.loc = encaissement.locName;
  }

  /* -------------------------------------------- */
  /** @override */
  getRollData() {
    const rollData = super.getRollData();
    return rollData;
  }

  /* -------------------------------------------- */
  async resetItemUse() {
    await this.unsetFlag(SYSTEM_RDD, 'itemUse');
    await this.setFlag(SYSTEM_RDD, 'itemUse', {});
  }

  /* -------------------------------------------- */
  async incDecItemUse(itemId, inc = 1) {
    let itemUse = duplicate(this.getFlag(SYSTEM_RDD, 'itemUse') ?? {});
    itemUse[itemId] = (itemUse[itemId] ?? 0) + inc;
    await this.setFlag(SYSTEM_RDD, 'itemUse', itemUse);
    console.log("ITEM USE INC", inc, itemUse);
  }

  /* -------------------------------------------- */
  getItemUse(itemId) {
    let itemUse = this.getFlag(SYSTEM_RDD, 'itemUse') ?? {};
    console.log("ITEM USE GET", itemUse);
    return itemUse[itemId] ?? 0;
  }

  /* -------------------------------------------- */
  /* -- entites -- */
  /* retourne true si on peut continuer, false si on ne peut pas continuer */
  async targetEntiteNonAccordee(target, when = 'avant-encaissement') {
    if (target) {
      return !await this.accorder(target.actor, when);
    }
    return false;
  }

  /* -------------------------------------------- */
  async accorder(entite, when = 'avant-encaissement') {
    if (when != game.settings.get(SYSTEM_RDD, "accorder-entite-cauchemar")
      || !entite.isEntite([ENTITE_INCARNE])
      || entite.isEntiteAccordee(this)) {
      return true;
    }
    const tplData = this.system;
    let rolled = await RdDResolutionTable.roll(this.getReveActuel(), - Number(entite.system.carac.niveau.value));
    const rollData = {
      alias: this.name,
      rolled: rolled,
      entite: entite.name,
      selectedCarac: tplData.carac.reve
    };

    if (rolled.isSuccess) {
      await entite.setEntiteReveAccordee(this);
    }

    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-accorder-cauchemar.html');
    if (rolled.isPart) {
      await this.appliquerAjoutExperience(rollData, true);
    }
    return rolled.isSuccess;
  }

  /* -------------------------------------------- */
  isEntite(typeentite = []) {
    return this.type == 'entite' && (typeentite.length == 0 || typeentite.includes(this.system.definition.typeentite));
  }

  /* -------------------------------------------- */
  isEntiteAccordee(attaquant) {
    if (!this.isEntite([ENTITE_INCARNE])) { return true; }
    let resonnance = this.system.sante.resonnance;
    return (resonnance.actors.find(it => it == attaquant.id));
  }

  /* -------------------------------------------- */
  async setEntiteReveAccordee(attaquant) {
    if (!this.isEntite([ENTITE_INCARNE])) {
      ui.notifications.error("Impossible de s'accorder à " + this.name + ": ce n'est pas une entite de cauchemer/rêve");
      return;
    }
    let resonnance = duplicate(this.system.sante.resonnance);
    if (resonnance.actors.find(it => it == attaquant.id)) {
      // déjà accordé
      return;
    }
    resonnance.actors.push(attaquant.id);
    await this.update({ "system.sante.resonnance": resonnance });
    return;
  }

  /* -------------------------------------------- */
  getFortune() {
    return this.itemTypes['monnaie']
      .map(m => Number(m.system.valeur_deniers) * Number(m.system.quantite))
      .reduce(Misc.sum(), 0);
  }

  /* -------------------------------------------- */
  async depenserDeniers(depense, dataObj = undefined, quantite = 1, toActorId) {
    depense = Number(depense);
    let fortune = this.getFortune();
    console.log("depenserDeniers", game.user.character, depense, fortune);
    let msg = "";
    if (depense == 0) {
      if (dataObj) {
        dataObj.payload.system.cout = depense / 100; // Mise à jour du prix en sols , avec le prix acheté
        dataObj.payload.system.quantite = quantite;
        await this.createEmbeddedDocuments('Item', [dataObj.payload]);
        msg += `<br>L'objet <strong>${dataObj.payload.name}</strong> a été ajouté gratuitement à votre inventaire.`;
      }
    }
    else {
      if (fortune >= depense) {
        const toActor = game.actors.get(toActorId)
        await toActor?.ajouterDeniers(depense, this.id);
        await Monnaie.optimiser(this, fortune - depense);
        msg = `Vous avez payé <strong>${depense} Deniers</strong>${toActor ? " à " + toActor.name : ''}, qui ont été soustraits de votre argent.`;
        RdDAudio.PlayContextAudio("argent"); // Petit son

        if (dataObj) {
          dataObj.payload.system.cout = depense / 100; // Mise à jour du prix en sols , avec le prix acheté
          dataObj.payload.system.quantite = quantite;
          await this.createEmbeddedDocuments('Item', [dataObj.payload]);
          msg += `<br>Et l'objet <strong>${dataObj.payload.name}</strong> a été ajouté à votre inventaire.`;
        }
      } else {
        msg = "Vous n'avez pas assez d'argent pour payer cette somme !";
      }
    }

    let message = {
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: msg
    };
    ChatMessage.create(message);
  }

  async depenser(depense) {
    let reste = this.getFortune() - Number.parseInt(depense);
    if (reste >= 0) {
      await Monnaie.optimiser(this, reste);
    }
    return reste;
  }

  async ajouterDeniers(gain, fromActorId = undefined) {
    gain = Number.parseInt(gain);
    if (gain < 0) {
      ui.notifications.error(`Impossible d'ajouter un gain de ${gain} <0`);
      return;
    }
    if (gain == 0) {
      return;
    }
    if (fromActorId && !game.user.isGM) {
      RdDActor.remoteActorCall({
        userId: Misc.connectedGMOrUser(),
        actorId: this.id,
        method: 'ajouterDeniers', args: [gain, fromActorId]
      });
    }
    else {
      const fromActor = game.actors.get(fromActorId)
      await Monnaie.optimiser(this, gain + this.getFortune());

      RdDAudio.PlayContextAudio("argent"); // Petit son
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
        content: `Vous avez reçu <strong>${gain} Deniers</strong> ${fromActor ? " de " + fromActor.name : ''}, qui ont été ajoutés à votre argent.`
      });
    }
  }

  /* -------------------------------------------- */
  async monnaieIncDec(id, value) {
    let monnaie = this.getMonnaie(id);
    if (monnaie) {
      const quantite = Math.max(0, monnaie.system.quantite + value);
      await this.updateEmbeddedDocuments('Item', [{ _id: monnaie.id, 'system.quantite': quantite }]);
    }
  }

  /* -------------------------------------------- */
  async achatVente(achat) {
    if (achat.vendeurId == achat.acheteurId) {
      ui.notifications.info("Inutile de se vendre à soi-même");
      return;
    }
    if (!Misc.isUniqueConnectedGM()) {
      RdDActor.remoteActorCall({
        actorId: achat.vendeurId ?? achat.acheteurId,
        method: 'achatVente',
        args: [achat]
      });
      return;
    }
    const acheteur = achat.acheteurId ? game.actors.get(achat.acheteurId) : undefined;
    const vendeur = achat.vendeurId ? game.actors.get(achat.vendeurId) : undefined;
    const vente = achat.vente;
    const itemId = vente.item._id;
    const isItemEmpilable = "quantite" in vente.item.system;

    const coutDeniers = Math.floor((achat.prixTotal ?? 0) * 100);
    achat.quantiteTotal = (achat.choix.nombreLots ?? 1) * (vente.tailleLot);
    if (acheteur) {
      let resteAcheteur = await acheteur.depenser(coutDeniers);
      if (resteAcheteur < 0) {
        ChatUtility.notifyUser(achat.userId, 'warn', `Vous n'avez pas assez d'argent pour payer ${Math.ceil(coutDeniers / 100)} sols !`);
        return;
      }
    }
    const itemVendu = vendeur?.getObjet(itemId);
    if (itemVendu) {
      if (isItemEmpilable ? (itemVendu.system.quantite < achat.quantiteTotal) : (achat.choix.nombreLots != 1)) {
        await acheteur?.ajouterDeniers(coutDeniers);
        ChatUtility.notifyUser(achat.userId, 'warn', `Le vendeur n'a plus assez de ${vente.item.name} !`);
        return;
      }
      vendeur.ajouterDeniers(coutDeniers);
      let resteQuantite = (itemVendu.system.quantite ?? 1) - achat.quantiteTotal;
      if (resteQuantite == 0) {
        vendeur.deleteEmbeddedDocuments("Item", [itemId])
      }
      else {
        vendeur.updateEmbeddedDocuments("Item", [{ _id: itemId, 'system.quantite': resteQuantite }]);
      }
    }
    if (acheteur) {
      const achatData = {
        type: vente.item.type,
        img: vente.item.img,
        name: vente.item.name,
        system: mergeObject(vente.item.system, { quantite: isItemEmpilable ? achat.quantiteTotal : undefined }),
      }
      let listeAchat = isItemEmpilable ? [achatData] : Array.from({ length: achat.quantiteTotal }, (_, i) => achatData)
      let items = await acheteur.createEmbeddedDocuments("Item", listeAchat);
      if (achat.choix.consommer && vente.item.type == 'nourritureboisson') {
        achat.choix.doses = achat.choix.nombreLots;
        await acheteur.consommerNourritureboisson(items[0].id, achat.choix, vente.actingUserId);
      }
    }
    if (coutDeniers > 0) {
      RdDAudio.PlayContextAudio("argent");
    }
    const chatAchatItem = duplicate(vente);
    chatAchatItem.quantiteTotal = achat.quantiteTotal;
    ChatMessage.create({
      user: achat.userId,
      speaker: { alias: (acheteur ?? vendeur).name },
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate('systems/ctm/templates/chat-achat-item.html', chatAchatItem)
    });

    if (!vente.quantiteIllimite) {
      if (vente.quantiteNbLots <= achat.choix.nombreLots) {
        ChatUtility.removeChatMessageId(achat.chatMessageIdVente);
      }
      else {
        vente["properties"] = new RdDItem(vente.item).getProprietes();
        vente.quantiteNbLots -= achat.choix.nombreLots;
        vente.jsondata = JSON.stringify(vente.item);
        const messageVente = game.messages.get(achat.chatMessageIdVente);
        messageVente.update({ content: await renderTemplate('systems/ctm/templates/chat-vente-item.html', vente) });
        messageVente.render(true);
      }
    }
  }

  /* -------------------------------------------- */
  async effectuerTacheAlchimie(recetteId, tacheAlchimie, texteTache) {
    let recetteData = this.getItemOfType(recetteId, 'recettealchimique');
    if (recetteData) {
      if (tacheAlchimie != "couleur" && tacheAlchimie != "consistance") {
        ui.notifications.warn(`L'étape alchimique ${tacheAlchimie} - ${texteTache} est inconnue`);
        return;
      }

      const sansCristal = tacheAlchimie == "couleur" && this.items.filter(it => it.isCristalAlchimique()).length == 0;
      const caracTache = RdDAlchimie.getCaracTache(tacheAlchimie);
      const alchimieData = this.getCompetence("alchimie");

      let rollData = {
        recette: recetteData,
        carac: { [caracTache]: this.system.carac[caracTache] },
        selectedCarac: this.system.carac[caracTache],
        competence: alchimieData,
        diffLibre: RdDAlchimie.getDifficulte(texteTache),
        diffConditions: sansCristal ? -4 : 0,
        alchimie: {
          tache: Misc.upperFirst(tacheAlchimie),
          texte: texteTache,
          sansCristal: sansCristal
        }
      }
      rollData.competence.system.defaut_carac = caracTache;

      const dialog = await RdDRoll.create(this, rollData,
        { html: 'systems/ctm/templates/dialog-roll-alchimie.html' },
        {
          name: 'tache-alchimique',
          label: 'Tache Alchimique',
          callbacks: [
            this.createCallbackExperience(),
            this.createCallbackAppelAuMoral(),
            { action: async r => await this._alchimieResult(r, false) }
          ]
        }
      );
      dialog.render(true);
    }
  }

  isCristalAlchimique(it) {
    return it.type == 'objet' && Grammar.toLowerCaseNoAccent(it.name) == 'cristal alchimique' && it.system.quantite > 0;
  }

  /* -------------------------------------------- */
  async _alchimieResult(rollData) {
    await RdDResolutionTable.displayRollData(rollData, this, 'chat-resultat-alchimie.html');
  }

  /* -------------------------------------------- */
  listeVehicules() {
    const listeVehichules = this.system.subacteurs?.vehicules ?? [];
    return this._buildActorLinksList(listeVehichules, vehicle => RdDActor._vehicleData(vehicle));
  }

  /* -------------------------------------------- */
  listeSuivants() {
    return this._buildActorLinksList(this.system.subacteurs?.suivants ?? []);
  }

  /* -------------------------------------------- */
  listeMontures() {
    return this._buildActorLinksList(this.system.subacteurs?.montures ?? []);
  }

  /* -------------------------------------------- */
  _buildActorLinksList(links, actorTransformation = it => RdDActor._buildActorData(it)) {
    return links.map(link => game.actors.get(link.id))
      .filter(it => it != undefined)
      .map(actorTransformation);
  }

  /* -------------------------------------------- */
  static _vehicleData(vehicle) {
    return {
      id: vehicle.id,
      name: vehicle.name,
      img: vehicle.img,
      system: {
        categorie: vehicle.system.categorie,
        etat: vehicle.system.etat
      }
    };
  }

  /* -------------------------------------------- */
  static _buildActorData(it) {
    return { id: it.id, name: it.name, img: it.img };
  }

  /* -------------------------------------------- */
  async pushSubacteur(actor, dataArray, dataPath, dataName) {
    let alreadyPresent = dataArray.find(attached => attached.id == actor._id);
    if (!alreadyPresent) {
      let newArray = duplicate(dataArray);
      newArray.push({ id: actor._id });
      await this.update({ [dataPath]: newArray });
    } else {
      ui.notifications.warn(dataName + " est déja attaché à ce Personnage.");
    }
  }

  /* -------------------------------------------- */
  addSubActeur(subActor) {
    if(subActor?.id == this.id){
      ui.notifications.warn("Vous ne pouvez pas attacher un acteur à lui même")
    }
    else if (!subActor?.isOwner) {
      ui.notifications.warn("Vous n'avez pas les droits sur l'acteur que vous attachez.")
    }
    else {
      if (subActor.type == 'vehicule') {
        this.pushSubacteur(subActor, this.system.subacteurs.vehicules, 'system.subacteurs.vehicules', 'Ce Véhicule');
      } else if (subActor.type == 'creature') {
        this.pushSubacteur(subActor, this.system.subacteurs.montures, 'system.subacteurs.montures', 'Cette Monture');
      } else if (subActor.type == 'personnage') {
        this.pushSubacteur(subActor, this.system.subacteurs.suivants, 'system.subacteurs.suivants', 'Ce Suivant');
      }
    }
  }

  /* -------------------------------------------- */
  async removeSubacteur(actorId) {
    let newVehicules = this.system.subacteurs.vehicules.filter(function (obj, index, arr) { return obj.id != actorId });
    let newSuivants = this.system.subacteurs.suivants.filter(function (obj, index, arr) { return obj.id != actorId });
    let newMontures = this.system.subacteurs.montures.filter(function (obj, index, arr) { return obj.id != actorId });
    await this.update({ 'system.subacteurs.vehicules': newVehicules }, { renderSheet: false });
    await this.update({ 'system.subacteurs.suivants': newSuivants }, { renderSheet: false });
    await this.update({ 'system.subacteurs.montures': newMontures }, { renderSheet: false });
  }

  /* -------------------------------------------- */
  async buildPotionGuerisonList(pointsGuerison) {
    let pointsGuerisonInitial = pointsGuerison;
    let myData = this.system;
    const blessures = duplicate(myData.blessures);
    let guerisonData = { list: [], pointsConsommes: 0 }

    console.log(blessures);
    for (let critique of blessures.critiques.liste) {
      if (critique.active && pointsGuerison >= 6) {
        pointsGuerison -= 6;
        critique.active = false;
        guerisonData.list.push("1 Blessure Critique (6 points)");
      }
    }
    for (let grave of blessures.graves.liste) {
      if (grave.active && pointsGuerison >= 4) {
        pointsGuerison -= 4;
        grave.active = false;
        guerisonData.list.push("1 Blessure Grave (4 points)");
      }
    }
    for (let legere of blessures.legeres.liste) {
      if (legere.active && pointsGuerison >= 2) {
        pointsGuerison -= 2;
        legere.active = false;
        guerisonData.list.push("1 Blessure Légère (2 points)");
      }
    }
    await this.update({ "system.blessures": blessures });

    let pvManquants = myData.sante.vie.max - myData.sante.vie.value;
    let pvSoignees = Math.min(pvManquants, Math.floor(pointsGuerison / 2));
    pointsGuerison -= pvSoignees * 2;
    guerisonData.list.push(pvSoignees + " Points de Vie soignés");
    await this.santeIncDec('vie', +pvSoignees, false);
    guerisonData.pointsConsommes = pointsGuerisonInitial - pointsGuerison;

    return guerisonData;
  }

  /* -------------------------------------------- */
  async consommerPotionSoin(potionData) {
    potionData.alias = this.name;
    potionData.supprimer = true;

    if (potionData.system.magique) {
      // Gestion de la résistance:
      potionData.rolled = await RdDResolutionTable.roll(this.getReveActuel(), -8);
      if (potionData.rolled.isEchec) {
        await this.reveActuelIncDec(-1);
        potionData.guerisonData = await this.buildPotionGuerisonList(potionData.system.puissance);
        potionData.guerisonMinutes = potionData.guerisonData.pointsConsommes * 5;
      }
    }
    if (!potionData.system.magique || potionData.rolled.isSuccess) {
      this.bonusRecuperationPotion = potionData.system.herbeBonus;
    }
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate(`systems/ctm/templates/chat-consommer-potion-soin.html`, potionData)
    });
  }

  /* -------------------------------------------- */
  async consommerPotionRepos(potionData) {
    potionData.alias = this.name;
    potionData.supprimer = true;

    if (potionData.system.magique) {
      // Gestion de la résistance:
      potionData.rolled = await RdDResolutionTable.roll(this.getReveActuel(), -8);
      if (potionData.rolled.isEchec) {
        await this.reveActuelIncDec(-1);
        let fatigueActuelle = this.getFatigueActuelle();
        potionData.caseFatigueReel = Math.min(fatigueActuelle, potionData.system.puissance);
        potionData.guerisonDureeUnite = (potionData.system.reposalchimique) ? "rounds" : "minutes";
        potionData.guerisonDureeValue = (potionData.system.reposalchimique) ? potionData.caseFatigueReel : potionData.caseFatigueReel * 5;
        potionData.aphasiePermanente = false;
        if (potionData.system.reposalchimique) {
          let chanceAphasie = await RdDDice.rollTotal("1d100");
          if (chanceAphasie <= potionData.system.pr) {
            potionData.aphasiePermanente = true;
          }
        }
        await this.santeIncDec("fatigue", -potionData.caseFatigueReel);
      }
    }
    if (!potionData.system.magique || potionData.rolled.isSuccess) {
      this.bonusRepos = potionData.system.herbeBonus;
    }
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate(`systems/ctm/templates/chat-consommer-potion-repos.html`, potionData)
    });
  }
  /* -------------------------------------------- */
  dialogFabriquerPotion(herbe) {
    DialogFabriquerPotion.create(this, herbe, {
      html: 'systems/ctm/templates/dialog-fabriquer-potion-base.html',
    }, []);
  }

  /* -------------------------------------------- */
  async fabriquerPotion(herbeData) {
    let newPotion = {
      name: `Potion de ${herbeData.system.categorie} (${herbeData.name})`, type: 'potion',
      img: "systems/ctm/icons/objets/fiole_verre.webp",
      system: {
        quantite: 1, cout: 0, encombrement: 0.1,
        categorie: herbeData.system.categorie,
        herbe: herbeData.name,
        rarete: herbeData.system.rarete,
        herbebrins: herbeData.nbBrins,
        herbebonus: herbeData.herbebonus,
        description: ""
      }
    }
    await this.createEmbeddedDocuments('Item', [newPotion], { renderSheet: true });

    let newQuantite = herbeData.system.quantite - herbeData.nbBrins;
    let messageData = {
      alias: this.name,
      nbBrinsReste: newQuantite,
      potion: newPotion,
      herbe: herbeData
    }
    this.diminuerQuantiteObjet(herbeData._id, herbeData.nbBrins);

    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate(`systems/ctm/templates/chat-fabriquer-potion-base.html`, messageData)
    });
  }

  /* -------------------------------------------- */
  async diminuerQuantiteObjet(id, nb, options = { supprimerSiZero: false }) {
    const item = this.getObjet(id);
    if (item) {
      await item.diminuerQuantite(nb, options);
    }
  }

  /* -------------------------------------------- */
  async consommerPotionGenerique(potionData) {
    potionData.alias = this.name;

    if (potionData.system.magique) {
      // Gestion de la résistance:
      potionData.rolled = await RdDResolutionTable.roll(this.getReveActuel(), -8);
      if (potionData.rolled.isEchec) {
        await this.reveActuelIncDec(-1);
      }
    }
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate(`systems/ctm/templates/chat-consommer-potion-generique.html`, potionData)
    });
  }

  /* -------------------------------------------- */
  async consommerPotion(potion, onActionItem = async () => { }) {
    const potionData = potion

    if (potionData.system.categorie.includes('Soin')) {
      this.consommerPotionSoin(potionData);
    } else if (potionData.system.categorie.includes('Repos')) {
      this.consommerPotionRepos(potionData);
    } else {
      this.consommerPotionGenerique(potionData);
    }
    await this.diminuerQuantiteObjet(potion.id, 1, { supprimerSiZero: potionData.supprimer });
    await onActionItem()
  }

  /* -------------------------------------------- */
  async onUpdateActor(update, options, actorId) {
    const updatedEndurance = update?.system?.sante?.endurance
    if (updatedEndurance && options.diff) {
      await this.setEffect(STATUSES.StatusUnconscious, updatedEndurance.value == 0)
    }
  }

  /* -------------------------------------------- */
  getEffects(filter = e => true) {
    return this.getEmbeddedCollection("ActiveEffect").filter(filter);
  }

  /* -------------------------------------------- */
  getEffect(statusId) {
    return this.getEmbeddedCollection("ActiveEffect").find(it => it.flags?.core?.statusId == statusId);
  }

  /* -------------------------------------------- */
  async setEffect(statusId, status) {
    if (this.isEntite() || this.isVehicule()) {
      return;
    }
    console.log("setEffect", statusId, status)
    const effect = this.getEffect(statusId);
    if (!status && effect){
      await this.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
    }
    if (status && !effect ) {
      await this.createEmbeddedDocuments("ActiveEffect", [StatusEffects.status(statusId)]);
    }
  }

  async removeEffect(statusId) {
    const effect = this.getEffect(statusId);
    if (effect) {
      await this.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
    }
  }

  /* -------------------------------------------- */
  async removeEffects(filter = e => true) {
    if (game.user.isGM) {
      const ids = this.getEffects(filter).map(it => it.id);
      await this.deleteEmbeddedDocuments('ActiveEffect', ids);
    }
  }

  /* -------------------------------------------- */
  async onPreUpdateItem(item, change, options, id) {
    if (item.isCompetencePersonnage() && item.system.defaut_carac && item.system.xp) {
      await this.checkCompetenceXP(item.name, item.system.xp);
    }
  }

  /* -------------------------------------------- */
  async onCreateItem(item, options, id) {
    switch (item.type) {
      case 'tete':
      case 'queue':
      case 'ombre':
      case 'souffle':
        await this.onCreateOwnedDraconique(item, options, id);
        break;
    }
  }

  async onDeleteItem(item, options, id) {
    switch (item.type) {
      case 'tete':
      case 'queue':
      case 'ombre':
      case 'souffle':
        await this.onDeleteOwnedDraconique(item, options, id);
        break;
      case 'casetmr':
        await this.onDeleteOwnedCaseTmr(item, options, id);
        break;
    }
  }

  /* -------------------------------------------- */
  async onCreateOwnedDraconique(item, options, id) {
    if (Misc.isUniqueConnectedGM()) {
      let draconique = Draconique.all().find(it => it.match(item));
      if (draconique) {
        draconique.onActorCreateOwned(this, item)
        this.notifyGestionTeteSouffleQueue(item, draconique.manualMessage());
      }
    }
  }

  /* -------------------------------------------- */
  async onDeleteOwnedDraconique(item, options, id) {
    if (Misc.isUniqueConnectedGM()) {
      let draconique = Draconique.all().find(it => it.match(item));
      if (draconique) {
        draconique.onActorDeleteOwned(this, item)
      }
    }
  }

  /* -------------------------------------------- */
  async onDeleteOwnedCaseTmr(item, options, id) {
    if (Misc.isUniqueConnectedGM()) {
      let draconique = Draconique.all().find(it => it.isCase(item));
      if (draconique) {
        draconique.onActorDeleteCaseTmr(this, item)
      }
    }
  }

  /* -------------------------------------------- */
  notifyGestionTeteSouffleQueue(item, manualMessage = true) {
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: `${this.name} a reçu un/une ${item.type}: ${item.name}, qui ${manualMessage ? "n'est pas" : "est"} géré(e) automatiquement. ${manualMessage ? manualMessage : ''}`
    });
  }
}

