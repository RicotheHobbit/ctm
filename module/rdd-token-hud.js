/* -------------------------------------------- */
import { HtmlUtility } from "./html-utility.js";
import { Misc } from "./misc.js";
import { RdDCombatManager } from "./rdd-combat.js";

/* -------------------------------------------- */
export class RdDTokenHud {

  static init() {
    // Integration du TokenHUD
    Hooks.on('renderTokenHUD', (app, html, token) => { RdDTokenHud.addTokenHudExtensions(app, html, token._id) });
  }

  /* -------------------------------------------- */
  static async removeExtensionHud(app, html, tokenId) {
    html.find('.control-icon.rdd-combat').remove();
    html.find('.control-icon.rdd-initiative').remove();
  }

  /* -------------------------------------------- */
  static async addExtensionHud(app, html, tokenId) {

    let token = canvas.tokens.get(tokenId);
    let actor = token.actor;
    let combatant = game.combat.combatants.find(c => c.tokenId == tokenId);
    if (! (combatant?.actor) ) {
        ui.notifications.warn(`Le combatant ${token.name} n'est pas associé à un acteur, impossible de déterminer ses actions de combat!`)
        return;
    }
    app.hasExtension = true;

    let actionsCombat = RdDCombatManager.listActionsCombat(combatant);
    const hudData = {
      combatant: combatant,
      actions: actionsCombat,
      commandes: [
        { name: "Autre action", command: 'autre' },
        { name: 'Initiative +1', command: 'inc', value: 0.01 }, 
        { name: 'Initiative -1', command: 'dec', value: -0.01 }]
    };

    const controlIconCombat = html.find('.control-icon[data-action=combat]');
    // initiative
    await RdDTokenHud._configureSubMenu(controlIconCombat,
      'systems/foundryvtt-reve-de-dragon/templates/hud-actor-init.html',
      hudData,
      (event) => {
        let initCommand = event.currentTarget.attributes['data-command']?.value;
        let combatantId = event.currentTarget.attributes['data-combatant-id']?.value;
        if (initCommand) {
          RdDTokenHud._initiativeCommand(initCommand, combatantId);
        } else {
          let index = event.currentTarget.attributes['data-action-index'].value;
          let action = actionsCombat[index];
          RdDCombatManager.rollInitiativeAction(combatantId, action);
        } 
      });

    const controlIconTarget = html.find('.control-icon[data-action=target]');
    // combat
    await RdDTokenHud._configureSubMenu(controlIconTarget, 'systems/foundryvtt-reve-de-dragon/templates/hud-actor-attaque.html', hudData,
      (event) => {
        const actionIndex = event.currentTarget.attributes['data-action-index']?.value;
        const action = actionsCombat[actionIndex];
        if (action.action == 'conjurer') {
          actor.conjurerPossession(actor.getPossession(action.system.possessionid));
        }
        else {
          actor.rollArme(action);
        }
      });
  }

  static _initiativeCommand(initCommand, combatantId) {
    switch (initCommand) {
      case 'inc': return RdDCombatManager.incDecInit(combatantId, 0.01);
      case 'dec': return RdDCombatManager.incDecInit(combatantId, -0.01);
      case 'autre': return RdDCombatManager.rollInitiativeAction(combatantId, 
        { name: "Autre action", action: 'autre', system: { initOnly: true, competence: "Autre action" } });
    }
  }

  /* -------------------------------------------- */
  static async addTokenHudExtensions(app, html, tokenId) {
    const controlIconCombat  = html.find('.control-icon[data-action=combat]');
    controlIconCombat.click(event => {
      if (event.currentTarget.className.includes('active')) {
        RdDTokenHud.removeExtensionHud(app, html, tokenId);
      } else {
        setTimeout(function () { RdDTokenHud.addExtensionHud(app, html, tokenId) }, 200);
      }
    });

    if (controlIconCombat.length>0 && controlIconCombat[0].className.includes('active')) {
      RdDTokenHud.addExtensionHud(app, html, tokenId);
    }
  }

  /* -------------------------------------------- */
  static async _configureSubMenu(insertionPoint, template, hudData, onMenuItem) {
    const hud = $(await renderTemplate(template, hudData));
    const list = hud.find('div.rdd-hud-list');
    
    RdDTokenHud._toggleHudListActive(hud, list);
    
    hud.find('img.rdd-hud-togglebutton').click(event => RdDTokenHud._toggleHudListActive(hud, list));
    list.find('.rdd-hud-menu').click(onMenuItem);

    insertionPoint.after(hud);
  }

  static _toggleHudListActive(hud, list) {
    hud.toggleClass('active');
    HtmlUtility._showControlWhen(list, hud.hasClass('active'));
  }
}