import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class PontImpraticable extends Draconique {

  constructor() {
    super();
  }

  type() { return 'souffle' }
  match(item) { return Draconique.isSouffleDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('impraticabilite des ponts'); }

  async onActorCreateOwned(actor, souffle) {
    const ponts = TMRUtility.getListTMR('pont');
    for (let tmr of ponts) {
      await this.createCaseTmr(actor, 'Pont impraticable: ' + tmr.label, tmr, souffle.id);
    }
  }

  code() { return 'pont-impraticable' }
  tooltip(linkData) { return `${this.tmrLabel(linkData)} impraticable` }
  img() { return 'systems/foundryvtt-ctm/icons/tmr/wave.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.casehumide,
        alpha: 0.6,
        taille: tmrConstants.full,
        decallage: tmrConstants.center
      });
  }

  async _creerCaseTmr(actor) {
  }

}
