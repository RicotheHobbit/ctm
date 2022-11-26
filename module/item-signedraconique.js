import { defaultItemImg } from "./item.js";
import { Misc } from "./misc.js";
import { RdDDice } from "./rdd-dice.js";
import { RdDRollTables } from "./rdd-rolltables.js";
import { TMRType, TMRUtility } from "./tmr-utility.js";

const tableSignesIndicatifs = [
  { rarete: "Très facile", difficulte: 0, xp: 6, nbCases: 14 },
  { rarete: "Facile", difficulte: -2, xp: 10, nbCases: 10 },
  { rarete: "Moyen", difficulte: -3, xp: 15, nbCases: 7 },
  { rarete: "Difficile", difficulte: -5, xp: 20, nbCases: 4 },
  { rarete: "Ardu", difficulte: -8, xp: 30, nbCases: 1 }

]

const DIFFICULTE_LECTURE_SIGNE_MANQUE = +11;

export class RdDItemSigneDraconique {

  static prepareSigneDraconiqueMeditation(meditation, rolled) {
    return {
      name: "de la " + meditation.name,
      type: "signedraconique",
      img: meditation.img,
      system: {
        typesTMR: [TMRUtility.typeTmrName(meditation.system.tmr)],
        difficulte: rolled.isSuccess ? RdDItemSigneDraconique.getDiffSigneMeditation(rolled.code) : DIFFICULTE_LECTURE_SIGNE_MANQUE,
        ephemere: true,
        duree: "1 round",
        valeur: rolled.isSuccess ? { "norm": 3, "sign": 5, "part": 10 } : { "norm": 0, "sign": 0, "part": 0 }
      }
    };
  }

  static getDiffSigneMeditation(code) {
    switch (code) {
      case "norm": return -7;
      case "sign": return -3;
      case "part": return 0;
    }
    return undefined;
  }

  static getXpSortSigneDraconique(code, signe) {
    return Misc.toInt(signe.system.valeur[code] ?? 0);
  }

  static calculValeursXpSort(qualite, valeur, avant) {
    switch (qualite) {
      case "norm":
        return {
          norm: valeur,
          sign: Math.max(valeur, avant.sign),
          part: Math.max(valeur, avant.part)
        }
      case "sign":
        return {
          norm: Math.min(valeur, avant.norm),
          sign: valeur,
          part: Math.max(valeur, avant.part)
        }
      case "part":
        return {
          norm: Math.min(valeur, avant.norm),
          sign: Math.min(valeur, avant.sign),
          part: valeur
        }
    }
  }

  static async randomSigneDraconique(options = { ephemere: undefined }) {
    let modele = await RdDDice.rollOneOf(tableSignesIndicatifs);
    return {
      name: await RdDItemSigneDraconique.randomSigneDescription(),
      type: "signedraconique",
      img: defaultItemImg.signedraconique,
      system: {
        typesTMR: await RdDItemSigneDraconique.randomTmrs(modele.nbCases),
        ephemere: options?.ephemere == undefined ? RdDDice.rollTotal("1d2") == 2 : options.ephemere,
        duree: "1 round",
        difficulte: modele.difficulte,
        valeur: { norm: modele.xp, sign: modele.xp, part: Math.floor(modele.xp * 1.5) },
      }
    };
  }

  static async randomTmrs(nbTmr = undefined) {
    let tmrs = Object.values(TMRType)
      .map(value => TMRUtility.typeTmrName(value.name));
    let keep = nbTmr ?? (await RdDDice.rollTotal("1d" + TMRType.length) + 1);
    for (let i = tmrs.length; i > keep; i--) {
      tmrs.splice(await RdDDice.rollTotal("1d" + i), 1);
    }
    return tmrs;
  }

  static async randomSigneDescription() {
    return await RdDRollTables.drawTextFromRollTable("Signes draconiques", false);
  }

}