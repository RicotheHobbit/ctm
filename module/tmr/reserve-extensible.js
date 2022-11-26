import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class ReserveExtensible extends Draconique {
  constructor() {
    super();
  }

  type() { return 'tete' }
  match(item) { return Draconique.isTeteDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes("reserve extensible"); }
  manualMessage() { return "Vous pouvez re-configurer votre Réserve extensible" }
  async onActorCreateOwned(actor, tete) {
    const existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    const tmr = await TMRUtility.getTMRAleatoire(it => !(it.type == 'fleuve' || existants.includes(it.system.coord)));
    await this.createCaseTmr(actor, "Nouvelle Réserve extensible", tmr, tete.id);
  }

  code() { return 'reserve_extensible' }
  tooltip(linkData) { return `Réserve extensible en ${this.tmrLabel(linkData)} !` }
  img() { return 'systems/ctm/icons/tmr/treasure-chest.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.tetes,
      alpha: 0.7,
      decallage: tmrConstants.left
    });
  }

}
