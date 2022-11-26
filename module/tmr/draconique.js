import { Misc } from "../misc.js";
import { TMRUtility } from "../tmr-utility.js";
import { PixiTMR } from "./pixi-tmr.js";

const registeredEffects = [
]

/**
 * Définition des informations d'une "draconique" (queue, ombre, tête, souffle) qui influence les TMR
 */
export class Draconique {
  static isCaseTMR(item) { return item.type == 'casetmr'; }
  static isQueueDragon(item) { return item.type == 'queue' || item.type == 'ombre'; }
  static isSouffleDragon(item) { return item.type == 'souffle'; }
  static isTeteDragon(item) { return item.type == 'tete'; }
  static isQueueSouffle(item) { return Draconique.isQueueDragon(item) || Draconique.isSouffleDragon(item); }

  tmrLabel(linkData) { return TMRUtility.getTMRLabel(linkData.system.coord); }

  static register(draconique) {
    registeredEffects[draconique.code()] = draconique;
    if (draconique.img()) {
      PixiTMR.register(draconique.code(), draconique.img())
    }
    return draconique;
  }

  static all() {
    return Object.values(registeredEffects);
  }

  static get(code) {
    return registeredEffects[code];
  }

  /**
   * @param item un Item quelconque
   * @returns true si l'item correspond
   */
  match(item) {
    return Draconique.isQueueDragon(item) || Draconique.isSouffleDragon(item) || Draconique.isTeteDragon(item);
  }

  /**
   * @returns un message à afficher si la draconique doit être gérée manuellement.
   */
  manualMessage() {
    return false;
  }

  /**
   * Méthode responsable de gérer une draconique (par exemple, ajouter des casetmr pour la fermeture des cités).
   * @param actor auquel la draconique est ajoutée
   */
  async onActorCreateOwned(actor, item) {
    return false;
  }

  async onActorDeleteOwned(actor, item) {
    this.deleteCasesTmr(actor, item);
    return false;
  }

  async onActorDeleteCaseTmr(actor, casetmr) {
    return false;
  }
  /**
   * @return le code interne utilisé pour les casetmr correpondant
   */
  code() { return undefined }

  /**
   * @param {*} linkData données associées au token pixi (une casetmr, un sort en réserve, une rencontre en attente)
   * @returns un tooltip à afficher au dessus du token
   */
  tooltip(linkData) { return undefined }

  /**
   * @param {*} img l'url du fichier image à utiliser pour le token. Si indéfini (et si createSprite n'est pas surchargé),
   *  un disque est utilisé.
   */
  img() { return undefined }

  /**
   * factory d'élément graphique PIXI correpsondant à l'objet draconique
   * @param {*} pixiTMR instance de PixiTMR qui gère les tooltips, les méthodes de création de sprite standard, les clicks.
   */
  token(pixiTMR, linkData, coordTMR, type = undefined) {
    const token = {
      sprite: this.createSprite(pixiTMR),
      coordTMR: coordTMR
    };
    token[type ?? this.code()] = linkData;
    pixiTMR.addTooltip(token.sprite, this.tooltip(linkData));
    return token;
  }

  /**
   * factory d'élément graphique PIXI correpsondant à l'objet draconique
   * @param {*} pixiTMR instance de PixiTMR qui gère les tooltips, les méthodes de création de sprite standard, les clicks.
   */
  createSprite(pixiTMR) {
    if (this.img()) {
      return pixiTMR.sprite(this.code());
    }
    else {
      return pixiTMR.circle()
    }
  }

  /**
   * 
   * @param {*} item un item à tester
   * @param {*} coord les coordonnées d'une case. Si undefined toute case du type correspondra, 
   */
  isCase(item, coord = undefined) {
    return Draconique.isCaseTMR(item) && item.system.specific == this.code() && (coord ? item.system.coord == coord : true);
  }
  
  find(list, coord = undefined) {
    return list.find(c => this.isCase(c, coord));
  }
  
  async createCaseTmr(actor, label, tmr, sourceId = undefined) {
    const casetmrData = {
      name: label, type: 'casetmr', img: this.img(),
      system: { coord: tmr.coord, specific: this.code(), sourceid: sourceId }
    };
    await actor.createEmbeddedDocuments('Item', [casetmrData]);
  }
  
  async deleteCasesTmr(actor, draconique) {
    let caseTmrs = actor.items.filter(it => this.isCaseForSource(it, draconique));
    await actor.deleteEmbeddedDocuments('Item', caseTmrs.map(it => it.id));
  }
  
  isCaseForSource(item, draconique) {
    return Draconique.isCaseTMR(item) && item.system.specific == this.code() && item.system.sourceid == draconique.id;
  }

  async onVisiteSupprimer(actor, tmr, onRemoveToken) {
    let existants = actor.items.filter(it => this.isCase(it, tmr.coord));
    await actor.deleteEmbeddedDocuments('Item', existants.map(it => it.id));
    for (let casetmr of existants) {
      onRemoveToken(tmr, casetmr);
    }
  }
}