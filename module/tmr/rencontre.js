import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class Rencontre extends Draconique {

  constructor() {
    super();
  }

  type() { return '' }
  match(item) { return false; }
  manualMessage() { return false }
  async onActorCreateOwned(actor, item) { }

  code() { return 'rencontre' }
  tooltip(rencontre) { return `${rencontre.name} de force ${rencontre.system.force}` }
  img() { return 'systems/foundryvtt-ctm/icons/heures/hd06.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.rencontre,
      color: tmrColors.rencontre,
      taille: tmrConstants.full,
      decallage: { x: 2, y: 2 }
    });
  }
}
