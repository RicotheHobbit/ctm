import { RdDItemArme } from "./item-arme.js";
import { RdDItemCompetence } from "./item-competence.js";
import { RdDItemMeditation } from "./item-meditation.js";
import { RdDItemSort } from "./item-sort.js";
import { Misc } from "./misc.js";
import { RdDBonus } from "./rdd-bonus.js";
import { RdDCarac } from "./rdd-carac.js";
import { RdDUtility } from "./rdd-utility.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";

/**
 * tous les ajustements pouvant s'appliquer.
 * un ajustement se compose de `function(rollData, actor)` :
 * - isVisible: indique si l'ajustement sera visible (pour les cas où il peut être sélectionné)
 * - isUsed: évalue si l'ajustement indique s'il est actif ou non
 * - getLabel: un libellé texte pour l'affichage de l'ajustement
 * - getValue: une valeur numérique correspondant à un modificateur entier
 * - getDescr: une valeur textuelle pour les informations non numériques (demi-surprise, bonus de case, ...)
 */
export const referenceAjustements = {
  competence: {
    isUsed: (rollData, actor) => rollData.competence,
    getLabel: (rollData, actor) => rollData.competence?.name,
    getValue: (rollData, actor) => rollData.competence?.system?.niveau,
  },
  meditation: {
    isUsed: (rollData, actor) => rollData.meditation,
    getLabel: (rollData, actor) => 'Méditation',
    getValue: (rollData, actor) => RdDItemMeditation.calculDifficulte(rollData)
  },
  diffLibre: {
    isUsed: (rollData, actor) => rollData.diffLibre != undefined,
    getLabel: (rollData, actor) => rollData.selectedSort?.name ?? rollData.attackerRoll ? 'Imposée' : 'Libre',
    getValue: (rollData, actor) => rollData.selectedSort
      ? RdDItemSort.getDifficulte(rollData.selectedSort, rollData.diffLibre)
      : rollData.diffLibre ?? rollData.competence?.system.default_diffLibre ?? 0
  },
  diffConditions: {
    isUsed: (rollData, actor) => rollData.diffConditions != undefined,
    getLabel: (rollData, actor) => 'Conditions',
    getValue: (rollData, actor) => rollData.diffConditions
  },
  tactique: {
    isUsed: (rollData, actor) => rollData.tactique,
    getLabel: (rollData, actor) => RdDBonus.find(rollData.tactique).descr,
    getValue: (rollData, actor) => RdDBonus.find(rollData.tactique).attaque,
  },
  attaqueDefenseurSurpris: {
    isUsed: (rollData, actor) => rollData.surpriseDefenseur,
    getLabel: (rollData, actor) => RdDBonus.find(rollData.surpriseDefenseur).descr + (rollData.attackerRoll ? '' : ' défenseur'),
    getValue: (rollData, actor) => RdDBonus.find(rollData.surpriseDefenseur).attaque,
  },
  etat: {
    isUsed: (rollData, actor) => !RdDCarac.isIgnoreEtatGeneral(rollData),
    getLabel: (rollData, actor) => 'Etat général',
    getValue: (rollData, actor) => actor.getEtatGeneral({ ethylisme: rollData.forceAlcool != undefined })
  },
  malusArmure: {
    isVisible: (rollData, actor) => RdDCarac.isAgiliteOuDerivee(rollData.selectedCarac),
    isUsed: (rollData, actor) => RdDCarac.isAgiliteOuDerivee(rollData.selectedCarac),
    getLabel: (rollData, actor) => 'Malus armure',
    getValue: (rollData, actor) => actor.getMalusArmure()
  },
  encTotal: {
    isVisible: (rollData, actor) => RdDCarac.isAgiliteOuDerivee(rollData.selectedCarac) && RdDItemCompetence.isMalusEncombrementTotal(rollData.competence),
    isUsed: (rollData, actor) => RdDCarac.isAgiliteOuDerivee(rollData.selectedCarac) && RdDItemCompetence.isMalusEncombrementTotal(rollData.competence) && rollData.use.encTotal,
    getLabel: (rollData, actor) => 'Encombrement total',
    getValue: (rollData, actor) => -actor.getEncTotal()
  },
  surenc: {
    isVisible: (rollData, actor) => actor.isSurenc(),
    isUsed: (rollData, actor) => rollData.use?.surenc,
    getLabel: (rollData, actor) => 'Sur-encombrement',
    getValue: (rollData, actor) => actor.computeMalusSurEncombrement()
  },
  moral: {
    isVisible: (rollData, actor) => actor.isPersonnage() && RdDCarac.isActionPhysique(rollData.selectedCarac) && rollData.use?.moral,
    isUsed: (rollData, actor) => rollData.use?.moral,
    getLabel: (rollData, actor) => 'Appel au moral',
    getValue: (rollData, actor) => 1
  },
  moralTotal: {
    isUsed: (rollData, actor) => RdDCarac.isVolonte(rollData.selectedCarac),
    getLabel: (rollData, actor) => 'Moral',
    getValue: (rollData, actor) => actor.getMoralTotal()
  },
  astrologique: {
    isUsed: (rollData, actor) => ReglesOptionelles.isUsing("astrologie") && RdDBonus.isAjustementAstrologique(rollData),
    getLabel: (rollData, actor) => 'Astrologique',
    getValue: (rollData, actor) => actor.ajustementAstrologique()
  },
  facteurSign: {
    isUsed: (rollData, actor) => rollData.diviseurSignificative > 1,
    getLabel: (rollData, actor) => Misc.getFractionHtml(rollData.diviseurSignificative),
    getDescr: (rollData, actor) => rollData.diviseurSignificative > 1 ? `Facteur significative <span class="rdd-diviseur">&times;${Misc.getFractionHtml(rollData.diviseurSignificative)}</span>` : ''
  },
  isEcaille: {
    isVisible: (rollData, actor) => rollData.arme?.system.magique && Number(rollData.arme?.system.ecaille_efficacite) > 0,
    isUsed: (rollData, actor) => rollData.arme?.system.magique && Number(rollData.arme?.system.ecaille_efficacite) > 0,
    getLabel: (rollData, actor) => "Ecaille d'Efficacité: ",
    getValue: (rollData, actor) => Math.max(Number(rollData.arme?.system.ecaille_efficacite), 0),
  },
  finesse: {
    isUsed: (rollData, actor) => RdDBonus.isDefenseAttaqueFinesse(rollData),
    getDescr: (rollData, actor) => 'Attaque particulière en finesse',
  },
  armeParade: {
    isUsed: (rollData, actor) => RdDItemArme.needParadeSignificative(rollData.attackerRoll?.arme, rollData.arme),
    getDescr: (rollData, actor) => rollData.attackerRoll && rollData.arme ? `${RdDItemArme.getNomCategorieParade(rollData.attackerRoll?.arme)} vs ${RdDItemArme.getNomCategorieParade(rollData.arme)}` : ''
  },
  surprise: {
    isUsed: (rollData, actor) => actor.getSurprise(rollData.passeArme),
    getDescr: (rollData, actor) => RdDBonus.find(actor.getSurprise()).descr
  },
  bonusCase: {
    isUsed: (rollData, actor) => rollData.selectedSort && rollData.tmr.coord,
    getDescr: (rollData, actor) => rollData.selectedSort && rollData.tmr.coord ? `Bonus de case: ${RdDItemSort.getCaseBonus(rollData.selectedSort, rollData.tmr.coord)}%` : ''
  },
  rencontreTMR: {
    isVisible: (rollData, actor) => rollData.tmr && rollData.rencontre?.name,
    isUsed: (rollData, actor) => rollData.tmr && rollData.rencontre?.name,
    getLabel: (rollData, actor) => rollData.rencontre?.name,
    getValue: (rollData, actor) => - (rollData.rencontre?.system.force ?? 0)
  },
  ethylismeAlcool: {
    isVisible: (rollData, actor) => rollData.nbDoses != undefined,
    isUsed: (rollData, actor) => rollData.nbDoses != undefined,
    getLabel: (rollData, actor) => "Doses déjà bues: ",
    getValue: (rollData, actor) => - rollData.nbDoses,
  },
  ethylismeDoses: {
    isVisible: (rollData, actor) => rollData.nbDoses != undefined,
    isUsed: (rollData, actor) => rollData.nbDoses != undefined,
    getLabel: (rollData, actor) => "Force de l'alcool: ",
    getValue: (rollData, actor) => rollData.forceAlcool,
  },
  ethylisme:{
    isVisible: (rollData, actor) => rollData.ethylisme != undefined,
    isUsed: (rollData, actor) => rollData.ethylisme != undefined,
    getLabel: (rollData, actor) => "Ethylisme - " + RdDUtility.getNomEthylisme(rollData.ethylisme),
    getValue: (rollData, actor) => rollData.ethylisme,
  }
}

export class RollDataAjustements {

  /* -------------------------------------------- */
  static calcul(rollData, actor) {
    rollData.ajustements = {};
    for (var key in referenceAjustements) {
      const reference = referenceAjustements[key];
      rollData.ajustements[key] = {
        visible: reference.isVisible && reference.isVisible(rollData, actor),
        used: reference.isUsed(rollData, actor),
        label: reference.getLabel && reference.getLabel(rollData, actor),
        value: reference.getValue && reference.getValue(rollData, actor),
        descr: reference.getDescr && reference.getDescr(rollData, actor)
      }
    }
    rollData.finalLevel = RollDataAjustements.sum(rollData.ajustements);
  }

  /* -------------------------------------------- */
  static sum(ajustements) {
    let sum = 0;
    for (var key in ajustements) {
      if (ajustements[key].used && !ajustements[key].descr) {
        sum += parseInt(ajustements[key].value);
      }
    }
    return sum;
  }

}
