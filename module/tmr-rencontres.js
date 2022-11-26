import { Grammar } from "./grammar.js";
import { Misc } from "./misc.js";
import { RdDDice } from "./rdd-dice.js";
import { SystemCompendiums, SystemCompendiumTable } from "./settings/system-compendiums.js";
import { TMRUtility } from "./tmr-utility.js";


/* -------------------------------------------- */
export class TMRRencontres {

  static init() {
    const tmrRencontre = new TMRRencontres();
    game.system.rencontresTMR = tmrRencontre;
    
  }

  constructor(){
    this.table = new SystemCompendiumTable('rencontres', 'Item', 'rencontre', Misc.ascending(it => it.system.ordreTri));
  }

  /* -------------------------------------------- */
  /**
   * Retourne une recontre en fonction de la case et du tirage
   * @param {*} terrain 
   * @param {*} forcedRoll 
   */
  async rollRencontre(terrain, forcedRoll) {
    terrain = TMRUtility.findTMRLike(terrain);
    if (terrain == undefined) {
      return undefined;
    }

    if (forcedRoll && (forcedRoll <= 0 || forcedRoll > 100)) {
      forcedRoll = undefined;
    }
    const codeTerrain = Grammar.toLowerCaseNoAccent(terrain)
    const filtreMauvaise = codeTerrain == 'mauvaise' ? it => it.system.mauvaiseRencontre : it => !it.system.mauvaiseRencontre;
    const frequence = it => it.system.frequence[codeTerrain];
    const random = await this.table.getRandom(true, frequence, filtreMauvaise, forcedRoll);

    return random?.document;
  }

  async chatTable(terrain) {
    const codeTerrain = Grammar.toLowerCaseNoAccent(terrain)
    const isMauvaise = codeTerrain == 'mauvaise';
    const filtreMauvaise = isMauvaise ? it => it.system.mauvaiseRencontre : it => !it.system.mauvaiseRencontre;
    const frequence = it => it.system.frequence[codeTerrain];
    const typeName = isMauvaise ? 'Mauvaises rencontres' : `Rencontres en ${Misc.upperFirst(terrain)}`;
    await this.table.chatTable(frequence, filtreMauvaise, typeName);
    return true
  }
  /* -------------------------------------------- */
  async createRencontre(rencontre, tmr = undefined) {
    return rencontre.clone({
      'system.force': await RdDDice.rollTotal(rencontre.system.formule),
      'system.coord': tmr?.coord,
      'system.date': game.system.rdd.calendrier.getDateFromIndex(),
      'system.heure': game.system.rdd.calendrier.getCurrentHeure()
    }, { save: false });
  }

  async calculRencontre(rencontre, tmr = undefined) {
    if (rencontre.system.coord == "") {
      rencontre.system.coord = tmr?.coord;
    }
    if (rencontre.system.force == 0) {
      rencontre.system.force = await RdDDice.rollTotal(rencontre.system.formule);
    }
    if (rencontre.system.date == "") {
      rencontre.system.date = game.system.rdd.calendrier.getDateFromIndex();
    }
    if (rencontre.system.heure == "") {
      rencontre.system.heure = game.system.rdd.calendrier.getCurrentHeure();
    }
    return rencontre;
  }


  async getPresentsCite() {
    const rencontres = await SystemCompendiums.getDefaultItems('rencontres');
    return rencontres.filter(it => !it.system.mauvaiseRencontre && it.system.presentCite).map(it =>
      it.clone({ 'system.formule': "2d6" }, { save: false }));
  }

  async getReveDeDragon(force) {
    const rencontres = await SystemCompendiums.getDefaultItems('rencontres');
    const reveDeDragon = rencontres.find(it => Grammar.equalsInsensitive(it.name, 'Rêve de Dragon'));
    return reveDeDragon?.clone({ 'system.force': force }, { save: false });
  }

  /* -------------------------------------------- */
  async getRencontreAleatoire(tmr, mauvaise) {
    const codeTerrain = mauvaise ? 'mauvaise' : tmr.type;
    const filtreMauvaise = codeTerrain == 'mauvaise' ? it => it.system.mauvaiseRencontre : it => !it.system.mauvaiseRencontre;
    const frequence = it => it.system.frequence[codeTerrain];

    const row = await this.table.getRandom(false, frequence, filtreMauvaise);
    if (row) {
      row.document = this.createRencontre(row.document, tmr);
      await this.$chatRolledRencontre(row, tmr);
    }
    return row?.document;
  }


  /* -------------------------------------------- */
  async $chatRolledRencontre(row, tmr) {
    const flavorContent = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/chat-compendium-table-roll-rencontre.html',
      {
        roll: row.roll,
        rencontre: row?.document,
        percentages: (row.total == 100) ? '%' : '',
        tmr,
        isGM: game.user.isGM,
      });
    const messageData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: row.roll,
      sound: CONFIG.sounds.dice,
      content: flavorContent
    };
    ChatMessage.create(messageData, { rollMode: "gmroll" });
  }
}
