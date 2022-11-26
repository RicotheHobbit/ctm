import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class DemiReve extends Draconique {

  constructor() {
    super();
  }

  type() { return '' }
  match(item) { return false; }
  manualMessage() { return false }
  async onActorCreateOwned(actor, item) { }

  code() { return 'demi-reve' }
  tooltip(actor) { return `Demi-rêve ${actor.name}` }
  img() { return 'icons/svg/sun.svg' }

  createSprite(pixiTMR) {
    const sprite = pixiTMR.sprite(this.code(), {
      color: tmrColors.demireve,
      zIndex: tmrTokenZIndex.demireve,
      taille: (tmrConstants.full * 0.7)
    });
    pixiTMR.animate(pixiApp => pixiApp.ticker.add((delta) => sprite.rotation -= 0.01 * delta));
    return sprite;
  }
}
