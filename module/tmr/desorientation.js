import { Grammar } from "../grammar.js";
import { Misc } from "../misc.js";
import { RdDDice } from "../rdd-dice.js";
import { TMRUtility, TMRType} from "../tmr-utility.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class Desorientation extends Draconique {
  constructor() {
    super();
  }

  type() { return 'souffle' }
  match(item) { return Draconique.isSouffleDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('desorientation'); }
  manualMessage() { return false }

  async onActorCreateOwned(actor, souffle) {
    const type = await RdDDice.rollOneOf(this._typesPossibles(actor));
    console.log("désorientation", type);
    souffle.name += ": " + TMRType[type].name;
    await this._creerCasesTmr(actor, type, souffle);
  }

  _typesPossibles(actor) {
    const dejaDesorientes = Misc.distinct(actor.items.filter(it => this.isCase(it)).map(it => it.type));
    return Object.keys(TMRType).filter(it => !dejaDesorientes.includes(it));
  }

  code() { return 'desorientation' }
  tooltip(linkData) { return `Désorientation, cette case n'existe plus !` }
  img() { return 'icons/svg/explosion.svg' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.trounoir,
        color: tmrColors.trounoir,
        alpha: 1,
        taille: tmrConstants.full,
        decallage: { x: 2, y: 2 },
      });
  }

  async _creerCasesTmr(actor, type, souffle) {
    const existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    let tmrs = TMRUtility.filterTMR(it => it.type == type && !existants.includes(it.coord));
    for (let tmr of tmrs) {
      await this.createCaseTmr(actor, 'Désorientation: ' + tmr.label, tmr, souffle.id);
    }
  }


}
