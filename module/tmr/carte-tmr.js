import { Draconique } from "./draconique.js";

export class CarteTmr extends Draconique {

  constructor() {
    super();
  }

  type() { return '' }
  match(item) { return false; }
  manualMessage() { return false }
  async onActorCreateOwned(actor, item) { }

  code() { return 'tmr' }
  img() { return 'systems/foundryvtt-ctm/styles/img/ui/tmp_main_r1.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.carteTmr(this.code());
  }
}
