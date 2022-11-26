import { ChatUtility } from "./chat-utility.js";
import { Poetique } from "./poetique.js";
import { RdDDice } from "./rdd-dice.js";
import { TMRUtility } from "./tmr-utility.js";

export class EffetsRencontre {

  static messager = async (dialog, context) => {
    dialog.setRencontreState('messager', TMRUtility.getTMRPortee(context.tmr.coord, context.rencontre.system.force));
  }
  
  static passeur = async (dialog, context) => {
    dialog.setRencontreState('passeur', TMRUtility.getTMRPortee(context.tmr.coord, context.rencontre.system.force));
  }

  static teleportation_typecase = async (dialog, context) => {
    dialog.setRencontreState('changeur', TMRUtility.getCasesType(context.tmr.type));
  }

  static rencontre_persistante = async (dialog, context) => {
    dialog.setRencontreState('persistant', []);
  }

  static reve_plus_force = async (dialog, context) => { await EffetsRencontre.$reve_plus(context.actor, context.rencontre.system.force) }
  static reve_plus_1 = async (dialog, context) => { await EffetsRencontre.$reve_plus(context.actor, 1) }
  static reve_moins_force = async (dialog, context) => { await EffetsRencontre.$reve_plus(context.actor, -context.rencontre.system.force) }
  static reve_moins_1 = async (dialog, context) => { await EffetsRencontre.$reve_plus(context.actor, -1) }
  static $reve_plus = async (actor, valeur) => { await actor.reveActuelIncDec(valeur) }

  static vie_moins_1 = async (dialog, context) => { await EffetsRencontre.$vie_plus(context.actor, -1) }
  static vie_moins_force = async (dialog, context) => { await EffetsRencontre.$vie_plus(context.actor, -context.rencontre.system.force) }
  static $vie_plus = async (actor, valeur) => { await actor.santeIncDec("vie", valeur) }
  
  static moral_plus_1 = async (dialog, context) => { await EffetsRencontre.$vie_plus(context.actor, 1) }
  static moral_moins_1 = async (dialog, context) => { await EffetsRencontre.$vie_plus(context.actor, -1) }
  static $moral_plus = async (actor, valeur) => { await actor.moralIncDec(valeur) }
  
  static end_moins_1 = async (dialog, context) => { await EffetsRencontre.$vie_plus(context.actor, -1) }
  static end_moins_force = async (dialog, context) => { await EffetsRencontre.$vie_plus(context.actor, -context.rencontre.system.force) }
  static $end_plus = async (actor, valeur) => { await actor.santeIncDec("endurance", valeur) }

  static fatigue_plus_1 = async (dialog, context) => { await EffetsRencontre.$fatigue_plus(context.actor, 1) }
  static fatigue_plus_force = async (dialog, context) => { await EffetsRencontre.$fatigue_plus(context.actor, context.rencontre.system.force) }
  static fatigue_moins_1 = async (dialog, context) => { await EffetsRencontre.$fatigue_plus(context.actor, -1) }
  static fatigue_moins_force = async (dialog, context) => { await EffetsRencontre.$fatigue_plus(context.actor, -context.rencontre.system.force) }
  static $fatigue_plus = async (actor, valeur) => { await actor.santeIncDec("fatigue", valeur) }

  static perte_chance = async (dialog, context) => {
    const perte = context.rolled.isETotal ? context.rencontre.system.force : 1;
    await context.actor.chanceActuelleIncDec("fatigue", -perte);
  }
  
  static xp_sort_force = async (dialog, context) => { 
    let competence = context.competence;
    if (competence) {
      const xpSort = Misc.toInt(competence.system.xp_sort) + context.rencontre.system.force;
      await this.updateEmbeddedDocuments("Item", [{ _id: compData._id, 'system.xp_sort': xpSort }]);
      await this.updateExperienceLog("XP Sort", xpSort, `Rencontre d'un ${context.rencontre.name} en TMR`);
    }
  }
  
  static stress_plus_1 = async (dialog, context) => {
    await context.actor.addCompteurValue('stress', 1, `Rencontre d'un ${context.rencontre.name} en TMR`);
  }

  static reinsertion = async (dialog, context) => {
    await EffetsRencontre.$reinsertion(dialog, context.actor, it => true)
  }

  static teleportation_aleatoire_typecase = async (dialog, context) => {
    await EffetsRencontre.$reinsertion(dialog, context.actor, it => it.type == context.tmr.type && it.coord != context.tmr.coord)
  }

  static demireve_rompu = async (dialog, context) => {
    dialog.close()
   }

  static sort_aleatoire = async (dialog, context) => {
    context.sortReserve = await RdDDice.rollOneOf(context.actor.itemTypes['sortreserve']);
    if (context.sortReserve) {
      context.newTMR = TMRUtility.getTMR(context.sortReserve.system.coord);
      await dialog.positionnerDemiReve(context.newTMR.coord);
      await dialog.processSortReserve(context.sortReserve);
      dialog.close();
    }
    else {
      await EffetsRencontre.$reinsertion(dialog, context.actor, it => true);
    }
  }
  
  static deplacement_aleatoire = async (dialog, context) => {
    const oldCoord = context.actor.system.reve.tmrpos.coord;
    const newTmr = await TMRUtility.deplaceTMRAleatoire(context.actor, oldCoord);
    await dialog.positionnerDemiReve(newTmr.coord)
  }

  static rdd_part_tete = async (dialog, context) => {
    mergeObject(context, {
      tete: context.rolled.isPart,
      poesie: await Poetique.getExtrait()
    })
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(context.actor.name),
      content: await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/chat-resultat-reve-de-dragon.html`, context)
    });
  }

  static rdd_echec_queue = async (dialog, context) => {
    mergeObject(context, {
      queues: [await context.actor.ajouterQueue()],
      poesie: await Poetique.getExtrait()
    })
    if (context.rolled.isETotal) {
      context.queues.push(await context.actor.ajouterQueue());
    }
    
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.name),
      content: await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/chat-resultat-reve-de-dragon.html`, context)
    });
  }
  
  static experience_particuliere = async (dialog, context) => {
    await context.actor.appliquerAjoutExperience(context)
  }

  static regain_seuil = async (dialog, context) => {
    await context.actor.regainPointDeSeuil()
   }

  static async $reinsertion(dialog, actor, filter) {
    const newTMR = await TMRUtility.getTMRAleatoire(filter);
    await actor.forcerPositionTMRInconnue(newTMR);
    await dialog.positionnerDemiReve(newTMR.coord);
  }

}
