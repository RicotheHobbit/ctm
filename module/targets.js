import { ENTITE_NONINCARNE } from "./constants.js";
import { DialogSelectTarget } from "./dialog-select-target.js";

export class Targets {
  static listTargets() {
    return Array.from(game.user.targets);
  }

  static hasTargets() {
    return Targets.listTargets().length > 0;
  }

  static extractTokenData(target) {
    if (!target) {
      return undefined
    }
    return { id: target.id, name: target.document.name, img: target.document.texture.src ?? target.actor.img ?? 'icons/svg/mystery-man.svg' };
  }

  static isTargetEntite(target) {
    return target?.actor.type == 'entite' && target?.actor.system.definition.typeentite == ENTITE_NONINCARNE;
  }

  static async selectOneToken(onSelectTarget = target => { }) {
    const targets = Targets.listTargets();
    switch (targets.length) {
      case 0: return;
      case 1:
        onSelectTarget(targets[0]);
        return;
      default:
        {
          const tokens = targets.map(it => Targets.extractTokenData(it))
          const html = await renderTemplate("systems/foundryvtt-reve-de-dragon/templates/dialog-select-target.html", {
            tokens: tokens
          });
          new DialogSelectTarget(html, onSelectTarget, targets).render(true);
        }
    }
  }

  static getTarget() {
    const targets = Targets.listTargets();
    switch (targets.length) {
      case 1:
        return targets[0];
      case 0:
        ui.notifications.warn("Vous devez choisir une cible à attaquer!");
        break;
      default:
        ui.notifications.warn("Vous devez choisir une cible (et <strong>une seule</strong>) à attaquer!");
        return;
    }
  }

}