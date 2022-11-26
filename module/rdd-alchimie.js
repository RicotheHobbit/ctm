/* -------------------------------------------- */
import { Misc } from "./misc.js";

const matchOperations = new RegExp(/@(\w*){([\w\-]+)}/ig);
const matchOperationTerms = new RegExp(/@(\w*){([\w\-]+)}/i);
/* -------------------------------------------- */
export class RdDAlchimie {

  /* -------------------------------------------- */
  static processManipulation(recette, actorId = undefined) {
    //console.log("CALLED", recette, recette.isOwned, actorId );
    let manip = recette.system.manipulation;
    let matchArray = manip.match(matchOperations);
    if (matchArray) {
      for (let matchStr of matchArray) {
        let result = matchStr.match(matchOperationTerms);
        //console.log("RESULT ", result);
        if (result[1] && result[2]) {
          let commande = Misc.upperFirst(result[1]);
          let replacement = this[`_alchimie${commande}`](recette, result[2], actorId);
          manip = manip.replace(result[0], replacement);
        }
      }
    }
    recette.system.manipulation_update = manip;
  }

  /* -------------------------------------------- */
  static _alchimieCouleur(recette, couleurs, actorId) {
    if (actorId) {
      return `<span class="alchimie-tache"><a data-recette-id="${recette._id}" data-actor-id="${actorId}" data-alchimie-tache="couleur" data-alchimie-data="${couleurs}">couleur ${couleurs}</a></span>`;
    } else {
      return `<span class="alchimie-tache">couleur ${couleurs} </span>`;
    }
  }

  /* -------------------------------------------- */
  static _alchimieConsistance(recette, consistances, actorId) {
    if (actorId) {
      return `<span class="alchimie-tache"><a data-recette-id="${recette._id}" data-actor-id="${actorId}" data-alchimie-tache="consistance" data-alchimie-data="${consistances}">consistance ${consistances}</a></span>`;
    } else {
      return `<span class="alchimie-tache">consistance ${consistances} </span>`;
    }
  }

  /* -------------------------------------------- */
  static getDifficulte(aspects) {
    let elements = aspects.split('-');
    let composantes = elements.length;
    let distincts = Object.keys(Misc.classifyFirst(elements, it => it)).length;
    if (distincts == 1) {
      composantes--;
    }
    return Math.min(0, -composantes);
  }

  static getCaracTache(tache) {
    switch (tache) {
      case "consistance": return 'dexterite';
      case "couleur": return 'vue';
    }
    return 'intellect';
  }

}
