import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class SortReserve extends Draconique {

  constructor() {
    super();
  }

  type() { return '' }
  match(item) { return false; }
  manualMessage() { return false }
  async onActorCreateOwned(actor, item) { }

  code() { return 'sortreserve' }
  tooltip(sort) { return `${sort.name}, r${sort.system.ptreve}` }
  img() { return 'systems/ctm/icons/tmr/scroll.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.sort,
      alpha: 0.5,
      decallage: tmrConstants.right
    });
  }
}
