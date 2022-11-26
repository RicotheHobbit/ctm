import { ChatUtility } from "../chat-utility.js";
import { Grammar } from "../grammar.js";
import { Misc } from "../misc.js";
import { RdDRollTables } from "../rdd-rolltables.js";
import { TMRUtility } from "../tmr-utility.js";
import { tmrConstants, tmrColors, tmrTokenZIndex } from "../tmr-constants.js";
import { Draconique } from "./draconique.js";

export class UrgenceDraconique extends Draconique {

  constructor() {
    super();
  }

  type() { return 'queue' }
  match(item) { return Draconique.isQueueDragon(item) && Grammar.toLowerCaseNoAccent(item.name).includes('urgence draconique'); }
  manualMessage() { return false }
  async onActorCreateOwned(actor, queue) {
    const coordSortsReserve = (actor.system.reve.reserve?.list.map(it => it.coord)) ?? [];
    if (coordSortsReserve.length == 0) {
      // La queue se transforme en idée fixe
      const ideeFixe = await RdDRollTables.getIdeeFixe();
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(game.user.name),
        content: `En l'absence de sorts en réserve, l'urgence draconique de ${actor.name} se transforme en ${ideeFixe.name}`
      });
      await actor.createEmbeddedDocuments('Item', [ideeFixe]);
      await actor.deleteEmbeddedDocuments('Item', [queue.id]);
      return;
    }
    else {
      const demiReve = actor.getDemiReve();
      coordSortsReserve.sort(Misc.ascending(t => TMRUtility.distanceCoordTMR(t, demiReve)));
      const tmr = TMRUtility.getTMR(coordSortsReserve[0]);
      await this.createCaseTmr(actor, 'Urgence draconique: ' + tmr.label, tmr, queue.id);
    }
  }

  async onActorDeleteCaseTmr(actor, casetmr) {
    await actor.deleteEmbeddedDocuments('Item', [casetmr.system.sourceid]);
  }

  code() { return 'urgence' }
  tooltip(linkData) { return `Urgence draconique!` }
  img() { return 'systems/foundryvtt-ctm/icons/tmr/pelerin.webp' }

  createSprite(pixiTMR) {
    return pixiTMR.sprite(this.code(),
      {
        zIndex: tmrTokenZIndex.conquete,
        color: tmrColors.queues,
        taille: tmrConstants.full,
        decallage: { x: 2, y: 0 }
      });
  }
}
