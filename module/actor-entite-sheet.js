import { RdDActorSheet } from "./actor-sheet.js";

export class RdDActorEntiteSheet extends RdDActorSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["rdd", "sheet", "actor"],
  	  template: "systems/ctm/templates/actor-entite-sheet.html",
      width: 640,
      height: 720,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "carac"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: undefined}]
    });
  }

  /* -------------------------------------------- */
  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // On competence change
    html.find('.creature-carac').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        this.actor.updateCreatureCompetence( compName, "carac_value", parseInt(event.target.value) );
      } );    
    html.find('.creature-niveau').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        this.actor.updateCreatureCompetence( compName, "niveau", parseInt(event.target.value) );
      } );    
      html.find('.creature-dommages').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        this.actor.updateCreatureCompetence( compName, "dommages", parseInt(event.target.value) );
      } );    
  }

}
