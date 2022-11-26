import { RdDActor } from "./actor.js";
import { Misc } from "./misc.js";
import { RdDDice } from "./rdd-dice.js";

const words = ['pore', 'pre', 'flor', 'lane', 'turlu', 'pin', 'a', 'alph', 'i', 'onse', 'iane', 'ane', 'zach', 'arri', 'ba', 'bo', 'bi',
  'alta', 'par', 'pir', 'zor', 'zir', 'de', 'pol', 'tran', 'no', 'la', 'al', 'pul', 'one', 'ner', 'nur', 'mac', 'mery',
  'cat', 'do', 'di', 'der', 'er', 'el', 'far', 'fer', 'go', 'guer', 'hot', 'jor', 'jar', 'ji', 'kri', 'ket', 'lor', 'hur',
  'lar', 'lir', 'lu', 'pot', 'pro', 'pra', 'pit', 'qua', 'qui', 're', 'ral', 'sal', 'sen', 'ted', 'to', 'ta', 'lars', 'ver',
  'vin', 'ov', 'wal', 'ry', 'ly', ''];

/* -------------------------------------------- */
export class RdDNameGen {

  static async getName(msg, params) {
    const html = await renderTemplate(`systems/ctm/templates/chat-command-nom.html`, {
      nom: Misc.upperFirst(await RdDDice.rollOneOf(words) + await RdDDice.rollOneOf(words))
    });
    ChatMessage.create({ content: html, whisper: ChatMessage.getWhisperRecipients("GM") });
  }

  static async onCreerActeur(event) {
    const button = event.currentTarget;
    await RdDActor.create({
        name: button.attributes['data-nom'].value,
        type: button.attributes['data-type'].value
      },
      {renderSheet: true});
  }
}