import { Grammar } from "../grammar.js";
import { RdDDice } from "../rdd-dice.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";

import { Draconique } from "./draconique.js";

export class Conquete extends Draconique {

  constructor() {
    super();
  }

  type() { return 'queue' }
  match(item) { return Draconique.isQueueDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('conquete'); }
  manualMessage() { return false }
  async onActorCreateOwned(actor, item) { await this._creerConquete(actor, item); }

  code() { return 'conquete' }
  tooltip(linkData) { return `${this.tmrLabel(linkData)}: doit être conquis` }
  img() { return 'icons/svg/combat.svg' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.conquete,
        color: tmrColors.queues,
        taille: tmrConstants.full,
        decallage: { x: 2, y: 0 }
      });
  }

  async _creerConquete(actor, queue) {
    let existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    let possibles = TMRUtility.filterTMR(tmr => !TMRUtility.isCaseHumide(tmr) && !existants.includes(tmr.coord));
    let conquete = await RdDDice.rollOneOf(possibles);
    await this.createCaseTmr(actor, 'Conquête: ' + conquete.label, conquete, queue.id);
  }

  async onActorDeleteCaseTmr(actor, casetmr) {
    await actor.deleteEmbeddedDocuments('Item', [casetmr.system.sourceid]);
  }

}
