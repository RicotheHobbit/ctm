import { Grammar } from "./grammar.js";
import { Misc } from "./misc.js";

const tableCaracDerivee = {
  // xp: coût pour passer du niveau inférieur à ce niveau
  1: { xp: 3, poids: "moins de 1kg", plusdom: -5, sconst: 0.5, sust: 0.1 },
  2: { xp: 3, poids: "1-5", plusdom: -4, sconst: 0.5, sust: 0.3 },
  3: { xp: 4, poids: "6-10", plusdom: -3, sconst: 1, sust: 0.5, beaute: 'hideux' },
  4: { xp: 4, poids: "11-20", plusdom: -3, sconst: 1, sust: 1, beaute: 'repoussant' },
  5: { xp: 5, poids: "21-30", plusdom: -2, sconst: 1, sust: 1, beaute: 'franchement très laid' },
  6: { xp: 5, poids: "31-40", plusdom: -1, sconst: 2, sust: 2, beaute: 'laid' },
  7: { xp: 6, poids: "41-50", plusdom: -1, sconst: 2, sust: 2, beaute: 'très désavantagé' },
  8: { xp: 6, poids: "51-60", plusdom: 0, sconst: 2, sust: 2, beaute: 'désavantagé' },
  9: { xp: 7, poids: "61-65", plusdom: 0, sconst: 3, sust: 2, beaute: 'pas terrible' },
  10: { xp: 7, poids: "66-70", plusdom: 0, sconst: 3, sust: 3, beaute: 'commun' },
  11: { xp: 8, poids: "71-75", plusdom: 0, sconst: 3, sust: 3, beaute: 'pas mal' },
  12: { xp: 8, poids: "76-80", plusdom: +1, sconst: 4, sust: 3, beaute: 'avantagé' },
  13: { xp: 9, poids: "81-90", plusdom: +1, sconst: 4, sust: 3, beaute: 'mignon' },
  14: { xp: 9, poids: "91-100", plusdom: +2, sconst: 4, sust: 4, beaute: 'beau' },
  15: { xp: 10, poids: "101-110", plusdom: +2, sconst: 5, sust: 4, beaute: 'très beau' },
  16: { xp: 20, poids: "111-120", plusdom: +3, sconst: 5, sust: 4, beaute: 'éblouissant' },
  17: { xp: 30, poids: "121-131", plusdom: +3, sconst: 5, sust: 5 },
  18: { xp: 40, poids: "131-141", plusdom: +4, sconst: 6, sust: 5 },
  19: { xp: 50, poids: "141-150", plusdom: +4, sconst: 6, sust: 5 },
  20: { xp: 60, poids: "151-160", plusdom: +4, sconst: 6, sust: 6 },
  21: { xp: 70, poids: "161-180", plusdom: +5, sconst: 7, sust: 6 },
  22: { xp: 80, poids: "181-200", plusdom: +5, sconst: 7, sust: 7 },
  23: { xp: 90, poids: "201-300", plusdom: +6, sconst: 7, sust: 8 },
  24: { xp: 100, poids: "301-400", plusdom: +6, sconst: 8, sust: 9 },
  25: { xp: 110, poids: "401-500", plusdom: +7, sconst: 8, sust: 10 },
  26: { xp: 120, poids: "501-600", plusdom: +7, sconst: 8, sust: 11 },
  27: { xp: 130, poids: "601-700", plusdom: +8, sconst: 9, sust: 12 },
  28: { xp: 140, poids: "701-800", plusdom: +8, sconst: 9, sust: 13 },
  29: { xp: 150, poids: "801-900", plusdom: +9, sconst: 9, sust: 14 },
  30: { xp: 160, poids: "901-1000", plusdom: +9, sconst: 10, sust: 15 },
  31: { xp: 170, poids: "1001-1500", plusdom: +10, sconst: 10, sust: 16 },
  32: { xp: 180, poids: "1501-2000", plusdom: +11, sconst: 10, sust: 17 }
};

export class RdDCarac {

  static isAgiliteOuDerivee(selectedCarac) {
    return selectedCarac?.label.match(/(Agilité|Dérobée)/);
  }
  static isVolonte(selectedCarac) {
    return selectedCarac?.label == 'Volonté';
  }
  static isChance(selectedCarac) {
    return selectedCarac?.label?.toLowerCase()?.match(/chance( actuelle)?/);
  }
  static isReve(selectedCarac) {
    return selectedCarac?.label?.toLowerCase()?.match(/r(e|ê)ve(( |-)actuel)?/);
  }

  static isActionPhysique(selectedCarac) {
    return !selectedCarac ||
      selectedCarac?.label.match(/(Apparence|Force|Agilité|Dextérité|Vue|Ouïe|Odorat-Goût|Empathie|Dérobée|Mêlée|Tir|Lancer)/);
  }

  static isIgnoreEtatGeneral(rollData) {
    const selectedCarac = rollData.selectedCarac;
    return !selectedCarac ||
      rollData.ethylisme ||
      RdDCarac.isChance(selectedCarac) ||
      (RdDCarac.isReve(selectedCarac) && !rollData.competence);
  }


  static computeTotal(carac, beaute = undefined) {
    const total = Object.values(carac ?? {}).filter(c => !c.derivee)
      .map(it => parseInt(it.value))
      .reduce(Misc.sum(), 0);
    const beauteSuperieur10 = Math.max((beaute ?? 10) - 10, 0);
    return total + beauteSuperieur10;
  }

  static levelUp(it) {
    it.xpNext = RdDCarac.getCaracNextXp(it.value);
    it.isLevelUp = (it.xp >= it.xpNext);
  }

  /* -------------------------------------------- */
  static calculSConst(constitution) {
    return Number(tableCaracDerivee[Number(constitution)].sconst);
  }

  /* -------------------------------------------- */
  static getCaracNextXp(value) {
    const nextValue = Number(value) + 1;
    // xp est le coût pour atteindre cette valeur, on regarde donc le coût de la valeur+1
    return RdDCarac.getCaracXp(nextValue);
  }

  static getCaracXp(targetValue) {
    return tableCaracDerivee[targetValue]?.xp ?? 200;
  }


  /**
   * L’appel à la chance n’est possible que pour recommencer les jets d’actions physiques :
   * tous les jets de combat, de FORCE, d’AGILITÉ, de DEXTÉRITÉ, de Dérobée, d’APPARENCE,
   * ainsi que de Perception active et volontaire.
   */
  static isActionPhysique(selectedCarac) {
    return Grammar.toLowerCaseNoAccent(selectedCarac?.label)?.match(/(apparence|force|agilite|dexterite|vue|ouie|odorat|empathie|melee|tir|lancer|derobee)/);
  }

  /* -------------------------------------------- */
  static computeCarac(system) {
    system.carac.force.value = Math.min(system.carac.force.value, parseInt(system.carac.taille.value) + 4);

    system.carac.derobee.value = Math.floor(parseInt(((21 - system.carac.taille.value)) + parseInt(system.carac.agilite.value)) / 2);
    let bonusDomKey = Math.floor((parseInt(system.carac.force.value) + parseInt(system.carac.taille.value)) / 2);
    bonusDomKey = Math.min(Math.max(bonusDomKey, 0), 32); // Clamp de securite

    let tailleData = tableCaracDerivee[bonusDomKey];
    system.attributs.plusdom.value = tailleData.plusdom;

    system.attributs.sconst.value = RdDCarac.calculSConst(system.carac.constitution.value);
    system.attributs.sust.value = tableCaracDerivee[Number(system.carac.taille.value)].sust;

    system.attributs.encombrement.value = (parseInt(system.carac.force.value) + parseInt(system.carac.taille.value)) / 2;
    system.carac.melee.value = Math.floor((parseInt(system.carac.force.value) + parseInt(system.carac.agilite.value)) / 2);
    system.carac.tir.value = Math.floor((parseInt(system.carac.vue.value) + parseInt(system.carac.dexterite.value)) / 2);
    system.carac.lancer.value = Math.floor((parseInt(system.carac.tir.value) + parseInt(system.carac.force.value)) / 2);

    system.sante.vie.max = Math.ceil((parseInt(system.carac.taille.value) + parseInt(system.carac.constitution.value)) / 2);

    system.sante.vie.value = Math.min(system.sante.vie.value, system.sante.vie.max)
    system.sante.endurance.max = Math.max(parseInt(system.carac.taille.value) + parseInt(system.carac.constitution.value), parseInt(system.sante.vie.max) + parseInt(system.carac.volonte.value));
    system.sante.endurance.value = Math.min(system.sante.endurance.value, system.sante.endurance.max);
    system.sante.fatigue.max = system.sante.endurance.max * 2;
    system.sante.fatigue.value = Math.min(system.sante.fatigue.value, system.sante.fatigue.max);

    //Compteurs
    system.reve.reve.max = system.carac.reve.value;
    system.compteurs.chance.max = system.carac.chance.value;
  }


}
