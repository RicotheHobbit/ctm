import { RdDCarac } from "./rdd-carac.js";

const conditionsTactiques = [
  { type: '', descr: '', dmg: 0, attaque: 0, parade: 0, esquive: true },
  { type: 'charge', descr: 'Charge', dmg: 2, attaque: 4, parade: -4, esquive: false },
  { type: 'feinte', descr: 'Feinte', dmg: 1, attaque: 1, parade: 0, esquive: true },
  { type: 'pret', descr: 'prêt', dmg: 0, attaque: 0, parade: 0, esquive: true },
  { type: 'demi', descr: 'Demi-surprise', dmg: 1, attaque: 0, parade: 0, esquive: true },
  { type: 'totale', descr: 'Surprise totale', dmg: 10, attaque: 6, parade: 0, esquive: true },
];

/* -------------------------------------------- */
export class RdDBonus {

  /* -------------------------------------------- */
  static find(condition) {
    return conditionsTactiques.find(e => e.type == condition) || conditionsTactiques.find(e => e.type == 'pret');
  }


  static isAjustementAstrologique(rollData) {
    return RdDCarac.isChance(rollData.selectedCarac) ||
      rollData.selectedSort?.system.isrituel;
  }
  /* -------------------------------------------- */
  static isDefenseAttaqueFinesse(rollData) {
    return rollData.attackerRoll?.particuliere == 'finesse';
  }

  /* -------------------------------------------- */
  static dmg(rollData, dmgActor, isCauchemar = false) {
    let dmg = { total: 0 };
    if (rollData.arme && rollData.arme.name.toLowerCase() == "esquive") {
      // Specific case management
      ui.notifications.warn("Calcul de bonus dégats sur esquive !");
    } else {
      dmg.dmgArme = RdDBonus._dmgArme(rollData);
      dmg.penetration = RdDBonus._peneration(rollData);
      dmg.dmgTactique = RdDBonus.dmgBonus(rollData.tactique);
      dmg.dmgParticuliere = RdDBonus._dmgParticuliere(rollData);
      dmg.dmgSurprise = RdDBonus.dmgBonus(rollData.ajustements?.attaqueDefenseurSurpris.used);
      dmg.dmgActor = rollData.selectedCarac ? RdDBonus._dmgPerso(dmgActor, rollData.selectedCarac.label, dmg.dmgArme) : 0;
      dmg.total = dmg.dmgSurprise + dmg.dmgTactique + dmg.dmgArme + dmg.dmgActor + dmg.dmgParticuliere;
      dmg.mortalite = RdDBonus._calculMortalite(rollData, isCauchemar)
    }
    return dmg;
  }

  /* -------------------------------------------- */
  static description(condition) {
    return RdDBonus.find(condition).descr;
  }

  /* -------------------------------------------- */
  static dmgBonus(condition) {
    return RdDBonus.find(condition).dmg;
  }

  /* -------------------------------------------- */
  static bonusAttaque(condition) {
    return RdDBonus.find(condition).attaque;
  }

  /* -------------------------------------------- */
  static _calculMortalite(rollData, isCauchemar) {
    if (isCauchemar) {
      return "cauchemar";
    }
    return isCauchemar ? "cauchemar"
      : rollData.dmg?.mortalite
      ?? rollData.arme?.system.mortalite
      ?? "mortel";
  }

  /* -------------------------------------------- */
  static _dmgArme(rollData) {
    if ( rollData.arme) {
      let dmgBase = rollData.arme.system.dommagesReels ?? Number(rollData.arme.system.dommages ?? 0);
      //Le bonus dégats magiques ne peut pas faire dépasser le bonus de l'arme (cf p.278)
      return dmgBase + Math.min(dmgBase, rollData.arme.system.magique ? rollData.arme.system.ecaille_efficacite : 0);
    }
    return 0;
  }

  /* -------------------------------------------- */
  static _peneration(rollData) {
    return parseInt(rollData.arme?.system.penetration ?? 0);
  }

  /* -------------------------------------------- */
  static _dmgPerso(dmgActor, categorie, dmgArme) {
    switch (categorie) {
      case "Tir": return 0;
      case "Lancer": return Math.max(0, Math.min(dmgArme, dmgActor));
    }
    return dmgActor;
  }

  /* -------------------------------------------- */
  static _dmgParticuliere(rollData) {
    return rollData.particuliere == 'force' ? 5 : 0;
  }

}