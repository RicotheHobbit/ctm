import { Grammar } from "../grammar.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class QueteEaux extends Draconique {
  constructor() {
    super();
  }

  type() { return 'tete' }
  match(item) { return Draconique.isTeteDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes("quete des eaux"); }
  manualMessage() { return "Vous devrez re-configurer votre Quête des Eaux une fois un lac ou marais vaincu" }
  async onActorCreateOwned(actor, tete) {
    await this.createCaseTmr(actor, "Quête des eaux à déterminer", { coord: 'A0' }, tete.id);
  }

  code() { return 'maitrisee' }
  tooltip(linkData) { return `Quête des eaux, le ${this.tmrLabel(linkData)} est maîtrisé` }
  img() { return 'icons/svg/bridge.svg' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.casehumide + 1,
      color: tmrColors.tetes,
      decallage: tmrConstants.topRight
    });
  }
}
