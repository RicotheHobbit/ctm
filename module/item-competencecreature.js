
import { RdDCombatManager } from "./rdd-combat.js";

/* -------------------------------------------- */
export class RdDItemCompetenceCreature extends Item {

  /* -------------------------------------------- */
  static setRollDataCreature(rollData) {
    rollData.competence = rollData.competence
    rollData.carac = { "carac_creature": { label: rollData.competence.name, value: rollData.competence.system.carac_value } }
    rollData.competence.system.defaut_carac = "carac_creature"
    rollData.competence.system.categorie = "creature"
    rollData.selectedCarac =  rollData.carac.carac_creature
    if (rollData.competence.system.iscombat) {
      rollData.arme = RdDItemCompetenceCreature.armeNaturelle(rollData.competence);
    }
  }

  /* -------------------------------------------- */
  static armeNaturelle(competencecreature) {
    if (RdDItemCompetenceCreature.isCompetenceAttaque(competencecreature)) {
      // si c'est un Item compétence: cloner pour ne pas modifier lma compétence
      let arme = (competencecreature instanceof Item) ? competencecreature.clone():  competencecreature;
      mergeObject(arme.system,
        {
          competence: arme.name,
          initiative: RdDCombatManager.calculInitiative(competencecreature.system.niveau, competencecreature.system.carac_value),
          niveau: competencecreature.system.niveau,
          equipe: true,
          resistance: 100,
          dommagesReels: arme.system.dommages,
          penetration: 0,
          force: 0,
          rapide: true,
          cac: competencecreature.system.isnaturelle ? "naturelle" : "",
          action: 'attaque'
        });
      return arme;
    }
    console.error("RdDItemCompetenceCreature.toActionArme(", competencecreature, ") : impossible de transformer l'Item en arme");
    return undefined;
  }

  /* -------------------------------------------- */
  static isCompetenceAttaque(item) {
    return item.type == 'competencecreature' && item.system.iscombat;
  }
  
  /* -------------------------------------------- */
  static isCompetenceParade(item) {
    return item.type == 'competencecreature' && item.system.categorie_parade !== "";
  }
}  
