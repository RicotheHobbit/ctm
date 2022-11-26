/* -------------------------------------------- */
import { RdDCombat } from "./rdd-combat.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDRoll } from "./rdd-roll.js";
import { RdDItemCompetenceCreature } from "./item-competencecreature.js";
import { Targets } from "./targets.js";

/* -------------------------------------------- */
/* On part du principe qu'une entité démarre tjs 
une possession via le MJ (ie un joueur ne controle pas une entité)
Donc la compétence Possession ne peut être démarrée que par le MJ.
*/

/* -------------------------------------------- */
export class RdDPossession {

  /* -------------------------------------------- */
  static init() {
  }

  /* -------------------------------------------- */
  static searchPossessionFromEntite(attacker, defender) {
    let poss = attacker.items.find(poss => poss.type == 'possession' && poss.system.possedeid == defender.id);
    if (!poss) {
      poss = defender.items.find(poss => poss.type == 'possession' && poss.system.possedeid == defender.id);
    }
    return poss && duplicate(poss) || undefined;
  }

  /* -------------------------------------------- */
  static async onAttaquePossession(target, attacker, competence, suitePossession = undefined) {
    const defender = target.actor;
    const fromEntite = RdDPossession.searchPossessionFromEntite(attacker, defender);
    const isNouvelle = !suitePossession && ! fromEntite;
    const possession = (suitePossession ?? fromEntite ?? (await RdDPossession.createPossession(attacker, defender)));
    
    RdDPossession.$updateEtatPossession(possession)

    let rollData = {
      mode: "possession",
      isECNIDefender: false,
      competence: competence,
      possession: possession,
      attacker: attacker,
      defender: defender,
      targetToken: Targets.extractTokenData(target)
    };
    if (attacker.isCreature()) {
      RdDItemCompetenceCreature.setRollDataCreature(rollData)
    }
    
    await RdDPossession.$rollAttaquePossession(attacker, rollData, isNouvelle);
  }
  
  /* -------------------------------------------- */
  static async onConjurerPossession(attacker, competence, possession) {
    possession = duplicate(possession);
    RdDPossession.$updateEtatPossession(possession)
    let rollData = {
      mode: "possession",
      isECNIDefender: true,
      competence: competence,
      possession: possession,
      attacker: attacker,
      defender: game.actors.get(possession.system.possesseurid)
    };
    await RdDPossession.$rollAttaquePossession(attacker, rollData);
  }

  /* -------------------------------------------- */
  static async onDefensePossession(attackerId, defenderId, possessionId) {
    let attacker = game.actors.get(attackerId)
    let possession = attacker?.getPossession(possessionId)
    defenderId = defenderId ?? possession?.system.possesseurid ?? undefined
    let defender = game.actors.get(defenderId)
    possession = possession ?? defender?.getPossession(possessionId) ?? undefined;

    if (!possession) {
      ui.notifications.warn("Une erreur s'est produite : Aucune possession trouvée !!")
      return
    }
    possession = duplicate(possession)
    // Update for draconic roll
    let rollData = {
      mode: "conjuration",
      isECNIDefender: defender.type == "entite",
      possession: possession,
      attacker: attacker,
      defender: defender,
      competence: defender.getDraconicOuPossession(),
      selectedCarac: defender.system.carac.reve,
      forceCarac: { 'reve-actuel': { label: "Rêve Actuel", value: defender.getReveActuel() } }
    }
    rollData.competence.system.defaut_carac = 'reve-actuel'

    await RdDPossession.$rollDefensePossession(defender, rollData);
  }

  /* -------------------------------------------- */
  static async $rollAttaquePossession(attacker, rollData, isNouvelle = false) {
    const dialog = await RdDRoll.create(attacker, rollData,
      { html: 'systems/foundryvtt-ctm/templates/dialog-roll-competence.html' },
      {
        name: 'jet-possession',
        label: rollData.isECNIDefender ? 'Conjurer la possession' : 'Possession',
        callbacks: [
          { condition: r => (r.rolled.isSuccess), action: async (r) => await RdDPossession.$onRollPossession(r, true, isNouvelle) },
          { condition: r => (r.rolled.isEchec), action: async (r) => await RdDPossession.$onRollPossession(r, false, isNouvelle) },
        ]
      });
      dialog.render(true);
  }

  /* -------------------------------------------- */
  static async $onRollPossession(rollData, isSuccess, isNouvelle = false) {
    rollData.possession.isSuccess = isSuccess;
    RdDPossession.$updateEtatPossession(rollData.possession);
    if (isNouvelle) {
      // Creer la possession sur le defenseur
      rollData.defender.createEmbeddedDocuments('Item', [rollData.possession.toObject()])
    }
    await RdDResolutionTable.displayRollData(rollData, rollData.attacker, 'chat-resultat-possession.html');
  }

  /* -------------------------------------------- */
  static async $rollDefensePossession(defender, rollData) {
    const dialog = await RdDRoll.create(defender, rollData,
      { html: 'systems/foundryvtt-ctm/templates/dialog-roll-defense-possession.html' },
      {
        name: 'conjurer',
        label: 'Conjurer une Possession',
        callbacks: [
          { action: async (r) => await RdDPossession.$onRollConjuration(r) }
        ]  
      }  
    );  
    dialog.render(true);
  }  

  /* -------------------------------------------- */
  static async $onRollConjuration(rollData) {
    let actor = game.actors.get(rollData.possession.system.possedeid)
    if (!rollData.rolled.isSuccess) {
      if (rollData.isECNIDefender) {
        rollData.possession.system.compteur--
      } else {
        rollData.possession.system.compteur++
      }
      let update = { _id: rollData.possession._id, "system.compteur": rollData.possession.system.compteur }
      await actor.updateEmbeddedDocuments('Item', [update])
    }

    RdDPossession.$updateEtatPossession(rollData.possession)

    await RdDResolutionTable.displayRollData(rollData,rollData.defender, 'chat-resultat-possession.html')
    if (rollData.possession.isPosseder || rollData.possession.isConjurer) {
      // conjuration
      actor.deleteEmbeddedDocuments("Item", [rollData.possession._id])
    }
  }

  /* -------------------------------------------- */
  static $updateEtatPossession(possession) {
    possession.ptsConjuration = 0
    possession.ptsPossession = 0
    console.log("Possession", possession)
    if (possession.system.compteur > 0) {
      possession.ptsPossession = possession.system.compteur
    }
    if (possession.system.compteur < 0) {
      possession.ptsConjuration = Math.abs(possession.system.compteur)
    }
    possession.isPosseder = false
    possession.isConjurer = false
    if (possession.ptsPossession >= 2) {
      possession.isPosseder = true
    }
    if (possession.ptsConjuration >= 2) {
      possession.isConjurer = true
    }
  }

  /* -------------------------------------------- */
  static async createPossession(attacker, defender) {
    return await Item.create({
        name: "Possession en cours de " + attacker.name, type: 'possession',
        img: "systems/foundryvtt-ctm/icons/entites/possession2.webp",
        system: { description: "", typepossession: attacker.name, possede: false, possessionid: randomID(16), possesseurid: attacker.id, possedeid: defender.id, date: 0, compteur: 0 }
      },
      {
        temporary: true
      })
  }

}