import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class TrouNoir extends Draconique {
  constructor() {
    super();
  }

  type() { return 'souffle' }
  match(item) { return Draconique.isSouffleDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('trou noir'); }
  manualMessage() { return false }

  async onActorCreateOwned(actor, souffle) {
    const existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    const tmr = await TMRUtility.getTMRAleatoire(it => !(TMRUtility.isCaseHumide(it) || existants.includes(it.system.coord)));
    await this.createCaseTmr(actor, 'Trou noir: ' + tmr.label, tmr, souffle.id);
  }

  code() { return 'trounoir' }
  tooltip(linkData) { return `Trou noir en ${this.tmrLabel(linkData)} !` }
  img() { return 'icons/svg/explosion.svg' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.trounoir,
        color: tmrColors.trounoir,
        alpha: 1, taille:
          tmrConstants.full,
        decallage: { x: 2, y: 2 },
      });
  }

}
