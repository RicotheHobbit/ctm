import { ChatUtility } from "../chat-utility.js";
import { Grammar } from "../grammar.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class PresentCites extends Draconique {

  constructor() {
    super();
  }

  type() { return 'tete' }
  match(item) { return Draconique.isTeteDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('present des cites'); }
  manualMessage() { return false }
  async onActorCreateOwned(actor, tete) { await this._ajouterPresents(actor, tete); }

  code() { return 'present-cites' }
  tooltip(linkData) { return `La ${this.tmrLabel(linkData)} a un présent` }
  img() { return 'systems/ctm/icons/tmr/gift.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.tetes,
        alpha: 0.9,
        taille: tmrConstants.third,
        decallage: tmrConstants.topRight
      });
  }

  async _ajouterPresents(actor, tete) {
    let existants = actor.items.filter(it => this.isCase(it)).map(it => it.system.coord);
    if (existants.length > 0) {
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(game.user.name),
        content: "Vous avez encore des présents dans des cités, vous devrez tirer une autre tête pour remplacer celle ci!"
      })
    }
    else {
      let cites = TMRUtility.filterTMR(it => it.type == 'cite');
      for (let tmr of cites) {
        await this.createCaseTmr(actor, 'Présent: ' + tmr.label, tmr, tete.id);
      }
    }
  }

  async choisirUnPresent(casetmr, onChoixPresent) {
    const presents = await game.system.rencontresTMR.getPresentsCite()
    const buttons = {};
    presents.forEach(r =>  buttons['present'+r.id] = { icon: '<i class="fas fa-check"></i>', label: r.name, callback: async () => onChoixPresent(r) });
    let d = new Dialog({
      title: "Présent des cités",
      content: `La ${this.tmrLabel(casetmr)} vous offre un présent, faites votre choix`,
      buttons: buttons
    });
    d.render(true);
  }

  async ouvrirLePresent(actor, casetmr) {
    await actor.deleteEmbeddedDocuments('Item', [casetmr.id]);
  }
}
