import { Grammar } from "../grammar.js";
import { RdDDice } from "../rdd-dice.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class Periple extends Draconique {

  constructor() {
    super();
  }

  type() { return 'souffle' }
  match(item) { return Draconique.isSouffleDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('periple'); }
  manualMessage() { return false }

  async onActorCreateOwned(actor, souffle) {
    let terrain = (await RdDDice.rollTotal("1d2")) == 1 ? 'sanctuaire' : 'necropole';
    let tmrs = TMRUtility.getListTMR(terrain);
    for (let tmr of tmrs) {
      await this.createCaseTmr(actor, 'Périple: ' + tmr.label, tmr, souffle.id);
    }
  }


  code() { return 'periple' }
  tooltip(linkData) { return `Votre Périple passe par ${this.tmrLabel(linkData)}` }
  img() { return 'systems/foundryvtt-reve-de-dragon/icons/tmr/pelerin.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(), {
      zIndex: tmrTokenZIndex.conquete,
      alpha: 1,
      taille: tmrConstants.full,
      decallage: tmrConstants.center
    });
  }
  getDifficulte(tmr) {
    switch (tmr.type) {
      case 'sanctuaire': return -3;
      case 'necropole': return -5;
    }
    return 0;
  }
}