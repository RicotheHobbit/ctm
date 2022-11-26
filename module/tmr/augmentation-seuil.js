import { Grammar } from "../grammar.js";
import { Draconique } from "./draconique.js";
import { Misc } from "../misc.js";

export class AugmentationSeuil extends Draconique {

  constructor() {
    super();
  }

  type() { return 'tete' }
  match(item) { return Draconique.isTeteDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('augmentation du seuil de reve'); }
  manualMessage() { return false }
  async onActorCreateOwned(actor, tete) {
    const seuil = Misc.toInt(actor.system.reve.seuil.value) + 2;
    await actor.update({ "system.reve.seuil.value": seuil })
  }
}
