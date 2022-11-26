import { HIDE_DICE, SHOW_DICE } from "./constants.js";
import { RdDUtility } from "./rdd-utility.js";

/**
 * Extend the base Dialog entity by defining a custom window to perform roll.
 * @extends {Dialog}
 */
export class DialogValidationEncaissement extends Dialog {

  static async validerEncaissement(actor, rollData, armure, show, onEncaisser) {
    let encaissement = await RdDUtility.jetEncaissement(rollData, armure, { showDice: HIDE_DICE });
    const html = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/dialog-validation-encaissement.html', {
      actor: actor,
      rollData: rollData,
      encaissement: encaissement,
      show: show
    });
    const dialog = new DialogValidationEncaissement(html, actor, rollData, armure, encaissement, show, onEncaisser);
    dialog.render(true);
  }

  /* -------------------------------------------- */
  constructor(html, actor, rollData, armure, encaissement, show, onEncaisser) {
    // Common conf
    let buttons = {
      "valider": { label: "Valider", callback: html => this.validerEncaissement() },
      "annuler": { label: "Annuler", callback: html => { } },
    };

    let dialogConf = {
      title: "Validation d'encaissement",
      content: html,
      buttons: buttons,
      default: "valider"
    }

    let dialogOptions = {
      classes: ["rdddialog"],
      width: 350,
      height: 290
    }

    // Select proper roll dialog template and stuff
    super(dialogConf, dialogOptions);

    this.actor = actor
    this.rollData = rollData;
    this.armure = armure;
    this.encaissement = encaissement;
    this.show = show;
    this.onEncaisser = onEncaisser;
    this.forceDiceResult = {total: encaissement.roll.result };
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('input.encaissement-roll-result').keyup(async event => {
      this.forceDiceResult.total = event.currentTarget.value;
      this.encaissement = await RdDUtility.jetEncaissement(this.rollData, this.armure, { showDice: HIDE_DICE, forceDiceResult: this.forceDiceResult});
      $('label.encaissement-total').text(this.encaissement.total);
      $('label.encaissement-blessure').text(this.encaissement.blessures)
    });
  }

  async validerEncaissement() {
    this.encaissement = await RdDUtility.jetEncaissement(this.rollData, this.armure, { showDice: SHOW_DICE, forceDiceResult: this.forceDiceResult});
    this.onEncaisser(this.encaissement, this.show)
  }
}
