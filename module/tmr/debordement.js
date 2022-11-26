import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class Debordement extends Draconique {

  constructor() {
    super();
  }

  type() { return 'souffle' }
  match(item) { return Draconique.isSouffleDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('debordement'); }
  manualMessage() { return false }
  async onActorCreateOwned(actor, souffle) {
    const existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    const tmr = await TMRUtility.getTMRAleatoire(it => !(TMRUtility.isCaseHumide(it) || existants.includes(it.coord)));
    await this.createCaseTmr(actor, 'Debordement: ' + tmr.label, tmr, souffle.id);
  }

  code() { return 'debordement' }
  tooltip(linkData) { return `Débordement en ${this.tmrLabel(linkData)}` }
  img() { return 'systems/ctm/icons/tmr/wave.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.casehumide,
      alpha: 0.6,
      taille: tmrConstants.full,
      decallage: tmrConstants.center
    });
  }

}
