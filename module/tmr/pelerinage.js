import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class Pelerinage extends Draconique {

  constructor() {
    super();
  }

  type() { return 'queue' }
  match(item) { return Draconique.isQueueDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('pelerinage'); }
  manualMessage() { return false }

  async onActorCreateOwned(actor, queue) { 
    let tmr = await TMRUtility.getTMRAleatoire();
    await this.createCaseTmr(actor, 'Pèlerinage: ' + tmr.label, tmr, queue.id);
  }
  
  
  code() { return 'pelerinage' }
  tooltip(linkData) { return `Votre pèlerinage en ${this.tmrLabel(linkData)}` }
  img() { return 'systems/foundryvtt-ctm/icons/tmr/pelerin.webp' }
  
  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.conquete,
      alpha: 1,
      taille: tmrConstants.full,
      decallage: tmrConstants.center
    });
  }
  
  async onActorDeleteCaseTmr(actor, casetmr) {
    await actor.deleteEmbeddedDocuments('Item', [casetmr.system.sourceid]);
  }

}
