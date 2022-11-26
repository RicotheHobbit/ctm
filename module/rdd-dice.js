import { ChatUtility } from "./chat-utility.js";
import { HIDE_DICE, SHOW_DICE } from "./constants.js";
import { Misc } from "./misc.js";

function img(src) {
  return `<img src="${src}" class="dice-img" />`
}

function iconHeure(heure) {
  if (heure < 10) {
    heure = '0' + heure;
  }
  return `systems/foundryvtt-reve-de-dragon/icons/heures/hd${heure}.webp`
}
const imagesHeures = [1, 2, 3, 4, 5, 6, 7, 9, 9, 10, 11, 12].map(it => iconHeure(it));

const imgSigneDragon = img(imagesHeures[4]);

/** De pour les jets de rencontre */
export class DeTMR extends Die {
  /** @override */
  static DENOMINATION = "t";

  static diceSoNiceData(system) {
    return {
      type: "dt",
      font: "HeuresDraconiques",
      fontScale: 0.7,
      labels: ['1', '2', '3', '4', '5', '6', 'd', '0'],
      system: system
    }
  }

  constructor(termData) {
    termData.faces = 8;
    super(termData);
  }

  async evaluate() {
    super.evaluate();
    this.explode("x=8");
    return this;
  }

  get total() {
    return this.values.filter(it => it != 8).reduce(Misc.sum(), 0);
  }

  getResultLabel(diceTerm) {
    switch (diceTerm.result) {
      case 7: return imgSigneDragon;
    }
    return diceTerm.result.toString();
  }
}

/** DeDraconique pour le D8 sans limite avec 8=>0 */
export class DeDraconique extends Die {
  static DENOMINATION = "r";

  static diceSoNiceData(system) {
    return {
      type: "dr",
      font: "HeuresDraconiques",
      fontScale: 0.7,
      labels: ['1', '2', '3', '4', '5', '6', 'd', '0'],
      system: system
    }
  }

  constructor(termData) {
    termData.faces = 8;
    super(termData);
  }

  async evaluate() {
    super.evaluate();
    this.explode("x=7");
    return this;
  }

  get total() {
    return this.values.filter(it => it != 8).reduce(Misc.sum(), 0);
  }

  getResultLabel(diceTerm) {
    switch (diceTerm.result) {
      case 7: return imgSigneDragon;
      case 8: return '0';
    }
    return diceTerm.result.toString();
  }
}

/** De 12 avec les heures */
export class DeHeure extends Die {

  /** @override */
  static DENOMINATION = "h";

  static diceSoNiceData(system) {
    return {
      type: "dh",
      font: "HeuresDraconiques",
      labels: ['v', 'i', 'f', 'o', 'd', 'e', 'l', 's', 'p', 'a', 'r', 'c'],
      system: system
    }
  }

  constructor(termData) {
    termData.faces = 12;
    super(termData);
  }

  getResultLabel(diceTerm) {
    return img(imagesHeures[diceTerm.result - 1]);
  }
}

export class RdDDice {
  static init() {
    CONFIG.Dice.terms[DeTMR.DENOMINATION] = DeTMR;
    CONFIG.Dice.terms[DeDraconique.DENOMINATION] = DeDraconique;
    CONFIG.Dice.terms[DeHeure.DENOMINATION] = DeHeure;
  }

  static onReady() {
    if (game.modules.get("dice-so-nice")?.active) {
      if (game.settings.get("core", "noCanvas")) {
        ui.notifications.warn("Dice So Nice! n'affichera pas de dés car vous avez coché l'option de Foundry 'Scène de jeu désactivé' 'Disable Game Canvas' ");
      }
    }
  }

  static async rollTotal(formula, options = { showDice: HIDE_DICE }) {
    return (await RdDDice.roll(formula, options)).total;
  }

  static async roll(formula, options = { showDice: SHOW_DICE, rollMode: undefined }) {
    const roll = new Roll(RdDDice._formulaOrFake(formula, options));
    await roll.evaluate({ async: true });
    await this.showDiceSoNice(roll, options);
    return roll;
  }

  static async rollOneOf(array) {
    if (array == undefined || array.length == 0) {
      return undefined;
    }
    const roll = await RdDDice.rollTotal(`1d${array.length}`);
    return array[roll - 1];
  }

  static diceSoNiceReady(dice3d) {
    for (const system of Object.keys(dice3d.DiceFactory.systems)) {
      dice3d.addDicePreset(DeTMR.diceSoNiceData(system));
      dice3d.addDicePreset(DeDraconique.diceSoNiceData(system));
      dice3d.addDicePreset(DeHeure.diceSoNiceData(system));
    }
  }

  /* -------------------------------------------- */
  static async showDiceSoNice(roll, options) {
    if (options.showDice == HIDE_DICE || !game.modules.get("dice-so-nice")?.active || !game.dice3d) {
      return;
    }
    
    let { whisper, blind } = RdDDice._getWhisperBlind(options);
    if (options.forceDiceResult?.total) {
      let terms = await RdDDice._getForcedTerms(options);
      if (terms) {
        await game.dice3d.show({ throws: [{ dice: terms }] })
        return;
      }
    }
    await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
  }

  static _formulaOrFake(formula, options) {
    if (options?.forceDiceResult?.total) {
      options.forceDiceResult.formula = formula;
      return options.forceDiceResult.total.toString()
    }
    return formula;
  }

  static async _getForcedTerms(options) {
    const total = options.forceDiceResult.total;
    switch (options.forceDiceResult.formula) {
      case '1d100':
        return terms1d100(total);
      case "2d10":
        return await terms2d10(total);
    }
    return undefined;

    function terms1d100(total) {
      const unites = total % 10;
      const dizaines = Math.floor(total / 10);
      return [{
        resultLabel: dizaines * 10,
        d100Result: total,
        result: dizaines,
        type: "d100",
        vectors: [],
        options: {}
      },
      {
        resultLabel: unites,
        d100Result: total,
        result: unites,
        type: "d10",
        vectors: [],
        options: {}
      }];
    }

    async function terms2d10(total) {
      if (total>20 || total<2) { return undefined }
      let first = await RdDDice.d10();
      let second = Math.min(total-first, 10);
      first = Math.max(first, total-second);
      return [{
        resultLabel:first,
        result: first,
        type: "d10",
        vectors: [],
        options: {}
      },
      {
        resultLabel: second,
        result: second,
        type: "d10",
        vectors: [],
        options: {}
      }];
    }
  }

  static async d10() {
    let roll = new Roll('1d10');
    await roll.evaluate({ async: true });
    return roll.total;
  }

  static _getWhisperBlind(options) {
    let whisper = undefined;
    let blind = false;
    let rollMode = options.rollMode ?? game.settings.get("core", "rollMode");
    switch (rollMode) {
      case "blindroll": //GM only
        blind = true;
      case "gmroll": //GM + rolling player
        whisper = ChatUtility.getUsers(user => user.isGM);
        break;
      case "roll": //everybody
        whisper = ChatUtility.getUsers(user => user.active);
        break;
      case "selfroll":
        whisper = [game.user.id];
        break;
    }
    return { whisper, blind };
  }
}