import { RdDUtility } from "./rdd-utility.js";
import { RdDActorSheet } from "./actor-sheet.js";

/* -------------------------------------------- */
export class RdDActorVehiculeSheet extends RdDActorSheet {

  /** @override */
  static get defaultOptions() {
    RdDUtility.initAfficheContenu();

    return mergeObject(super.defaultOptions, {
      classes: ["rdd", "sheet", "actor"],
      template: "systems/foundryvtt-reve-de-dragon/templates/actor-vehicule-sheet.html",
      width: 640,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "carac" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: undefined }]
    });
  }


}
