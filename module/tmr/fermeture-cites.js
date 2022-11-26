import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class FermetureCites extends Draconique {

  constructor() {
    super();
  }

  type() { return 'souffle' }
  match(item) { return Draconique.isSouffleDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('fermeture des cites'); }
  manualMessage() { return false }
  async onActorCreateOwned(actor, souffle) { await this._fermerLesCites(actor, souffle); }

  code() { return 'fermeture' }
  tooltip(linkData) { return `La ${this.tmrLabel(linkData)} est fermée` }
  img() { return 'icons/svg/door-closed.svg' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.conquete,
        color: tmrColors.souffle,
        alpha: 0.9,
        taille: tmrConstants.full,
        decallage: { x: 2, y: 0 }
      });
  }

  async _fermerLesCites(actor, souffle) {
    let existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    let ouvertes = TMRUtility.filterTMR(it => it.type == 'cite' && !existants.includes(it.coord));
    for (let tmr of ouvertes) {
      await this.createCaseTmr(actor, 'Fermeture: ' + tmr.label, tmr, souffle.id);
    }
  }
}
