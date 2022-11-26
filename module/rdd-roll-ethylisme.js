import { Misc } from "./misc.js";

/**
 * Extend the base Dialog entity by defining a custom window to perform roll.
 * @extends {Dialog}
 */
export class RdDRollDialogEthylisme extends Dialog {

  /* -------------------------------------------- */
  constructor(html, rollData, actor, onRoll) {
    // Common conf
    let dialogConf = {
      title: "Test d'éthylisme",
      content: html,
      default: "rollButton",
      buttons: { "rollButton": { label: "Test d'éthylisme", callback: html => this.onButton(html) } }
    };
    let dialogOptions = { classes: ["rdddialog"], width: 400, height: 'fit-content', 'z-index': 99999 }
    super(dialogConf, dialogOptions)

    //console.log("ETH", rollData);
    this.onRoll = onRoll;
    this.rollData = rollData;
    this.actor = actor;
  }

  async onButton(html) {
    this.onRoll(this.rollData);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    this.bringToTop(); // Ensure top level
    // Get the rollData stuff
    var rollData = this.rollData;
    var dialog = this;

    // Setup everything onload
    $(function () {
      $("#forceAlcool").val(Misc.toInt(rollData.forceAlcool));
      dialog.updateRollResult();
    });

    // Update !
    html.find('#forceAlcool').change((event) => {
      rollData.forceAlcool = Misc.toInt(event.currentTarget.value); // Update the selected bonus/malus
      dialog.updateRollResult();
    });
  }
  async updateRollResult() {
    
    // Mise à jour valeurs
    $("#roll-param").text(this.rollData.vie + " / " + Misc.toSignedString(Number(this.rollData.etat) + Number(this.rollData.forceAlcool) + this.rollData.diffNbDoses));
    $(".table-resolution").remove();
  }

}
