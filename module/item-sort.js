/* -------------------------------------------- */
import { Misc } from "./misc.js";
import { TMRUtility } from "./tmr-utility.js";

/* -------------------------------------------- */
export class RdDItemSort extends Item {

  /* -------------------------------------------- */
  static isDifficulteVariable(sort) {
    return sort && (sort.system.difficulte.toLowerCase() == "variable");
  }

  /* -------------------------------------------- */
  static isCoutVariable(sort) {
    return sort && (sort.system.ptreve.toLowerCase() == "variable" || sort.system.ptreve.indexOf("+") >= 0);
  }
 
  /* -------------------------------------------- */
  static setCoutReveReel(sort){
    if (sort) {
      sort.system.ptreve_reel = this.isCoutVariable(sort) ? 1 : sort.system.ptreve;
    }
  }

  /* -------------------------------------------- */
  static getDifficulte(sort, variable) {
    if (sort && !RdDItemSort.isDifficulteVariable(sort)) {
       return Misc.toInt(sort.system.difficulte);
    }
    return variable;
  }

  /* -------------------------------------------- */
  static buildBonusCaseList( caseBonusString, newCase ) {
      if (caseBonusString == undefined) {
        return [];
      }
      let bonusCaseList = [];
      let bonusCaseArray = caseBonusString == undefined ? [] : caseBonusString.split(',');
      for( let bonusCase of bonusCaseArray) {
        let bonusSplit = bonusCase.split(':');
        bonusCaseList.push( { case: bonusSplit[0], bonus: bonusSplit[1] } );
      }
      if ( newCase )
        bonusCaseList.push( {case: "Nouvelle", bonus: 0} );
      return bonusCaseList;
    }
    
  /* -------------------------------------------- */
  /**
   * Retourne une liste de bonus/case pour un item-sheet
  * @param {} item 
  */
  static getBonusCaseList( item, newCase = false ) {
    // Gestion spéciale case bonus
    if ( item.type == 'sort') {
      return this.buildBonusCaseList(item.system.bonuscase, newCase );
    }
    return undefined;
  }
    
  /* -------------------------------------------- */
  /** Met à jour les données de formulaire 
   * si static des bonus de cases sont présents 
   * */
  static buildBonusCaseStringFromFormData( bonuses, cases ) {
    if ( bonuses ) {
      let list = [];
      let caseCheck = {};
      for (let i=0; i<bonuses.length; i++) {
        let coord = cases[i]?.toUpperCase() || 'A1';
        let bonus = bonuses[i] || 0;
        if ( TMRUtility.verifyTMRCoord( coord ) && bonus > 0 && caseCheck[coord] == undefined ) {
          caseCheck[coord] = bonus;
          list.push( coord+":"+bonus );
        }
      }
      return list.toString();
    }
    return undefined;
  }
  
  /* -------------------------------------------- */
  static incrementBonusCase( actor, sort, coord ) {
      let bonusCaseList = this.buildBonusCaseList(sort.system.bonuscase, false);
      //console.log("ITEMSORT", sort, bonusCaseList);
      
      let found = false;
      let StringList = []; 
      for( let bc of bonusCaseList) {
        if (bc.case == coord) { // Case existante
          found = true;
          bc.bonus = Number(bc.bonus) + 1;
        }
        StringList.push( bc.case+':'+bc.bonus );
      }
      if ( !found) { //Nouvelle case, bonus de 1
        StringList.push(coord+':1');
      }
  
      // Sauvegarde/update
      let bonuscase = StringList.toString();
      //console.log("Bonus cae :", bonuscase);
      actor.updateEmbeddedDocuments('Item', [{ _id: sort._id, 'system.bonuscase': bonuscase }] );
  }
  
  /* -------------------------------------------- */
  static getCaseBonus( sort, coord) {
    let bonusCaseList = this.buildBonusCaseList(sort.system.bonuscase, false);
    for( let bc of bonusCaseList) {
      if (bc.case == coord) { // Case existante
        return Number(bc.bonus);
      }
    }
    return 0;
  }

}