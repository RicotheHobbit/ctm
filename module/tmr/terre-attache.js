import { Grammar } from "../grammar.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class TerreAttache extends Draconique {
  constructor() {
    super();
  }

  type() { return 'tete' }
  match(item) { return Draconique.isTeteDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes("terre d'attache"); }
  manualMessage() { return "Vous pouvez re-configurer votre Terre d'Attache" }

  async onActorCreateOwned(actor, tete) {
    await this.createCaseTmr(actor, "Terre d'attache à déterminer", { coord: 'A0' }, tete.id);
  }

  code() { return 'attache' }
  tooltip(linkData) { return `Terre d'attache en ${this.tmrLabel(linkData)} !` }
  img() { return 'icons/svg/anchor.svg' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.tetes,
      color: tmrColors.tetes,
      decallage: tmrConstants.topLeft
    });
  }

}
