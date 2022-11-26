import { Grammar } from "./grammar.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";

export class RdDConfirm {
  /* -------------------------------------------- */
  static confirmer(options, autresActions) {
    options.bypass = options.bypass || !(options.settingConfirmer == undefined || ReglesOptionelles.isUsing(options.settingConfirmer));
    if (options.bypass) {
      options.onAction();
    }
    else {
      let buttons = {
        "action": RdDConfirm._createButtonAction(options),
        "cancel": RdDConfirm._createButtonCancel()
      };
      if (options.settingConfirmer) {
        buttons = mergeObject(RdDConfirm._createButtonActionSave(options), buttons);
      }
      if (autresActions) {
        buttons = mergeObject(autresActions, buttons);
      }
      const dialogDetails = {
        title: options.title,
        content: options.content,
        default: "cancel",
        buttons: buttons
      };
      new Dialog(dialogDetails, { width: 150 * Object.keys(buttons).length }).render(true);
    }
  }

  static _createButtonCancel() {
    return { icon: '<i class="fas fa-times"></i>', label: "Annuler" };
  }

  static _createButtonAction(options) {
    return {
      icon: '<i class="fas fa-check"></i>',
      label: options.buttonLabel,
      callback: () => options.onAction()
    };
  }

  static _createButtonActionSave(options) {
    return {
      "actionSave": {
        icon: '<i class="fas fa-user-check"></i>',
        label: "Toujours "+ options.buttonLabel.toLowerCase(),
        callback: () => {
          ReglesOptionelles.set(options.settingConfirmer, false);
          options.onAction();
        }
      }
    };
  }
}