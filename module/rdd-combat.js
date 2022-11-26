import { ChatUtility } from "./chat-utility.js";
import { ENTITE_BLURETTE, ENTITE_INCARNE, ENTITE_NONINCARNE, HIDE_DICE, SYSTEM_RDD, SYSTEM_SOCKET_ID } from "./constants.js";
import { DialogSelectTarget } from "./dialog-select-target.js";
import { Grammar } from "./grammar.js";
import { RdDItemArme } from "./item-arme.js";
import { RdDItemCompetence } from "./item-competence.js";
import { RdDItemCompetenceCreature } from "./item-competencecreature.js";
import { Misc } from "./misc.js";
import { RdDBonus } from "./rdd-bonus.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDRoll } from "./rdd-roll.js";
import { RdDRollTables } from "./rdd-rolltables.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { STATUSES } from "./settings/status-effects.js";
import { Targets } from "./targets.js";

/* -------------------------------------------- */
const premierRoundInit = [
  { pattern: 'hast', init: 5.90 },
  { pattern: 'lance', init: 5.85 },
  { pattern: 'baton', init: 5.80 },
  { pattern: 'doubledragonne', init: 5.75 },
  { pattern: 'esparlongue', init: 5.70 },
  { pattern: 'epeedragonne', init: 5.65 },
  { pattern: 'epeebatarde', init: 5.60 },
  { pattern: 'epeecyane', init: 5.55 },
  { pattern: 'epeesorde', init: 5.50 },
  { pattern: 'grandehache', init: 5.45 },
  { pattern: 'bataille', init: 5.40 },
  { pattern: 'epeegnome', init: 5.35 },
  { pattern: 'masse', init: 5.30 },
  { pattern: 'gourdin', init: 5.25 },
  { pattern: 'fleau', init: 5.20 },
  { pattern: 'dague', init: 5.15 },
  { pattern: 'autre', init: 5.10 },
];

/* -------------------------------------------- */
export class RdDCombatManager extends Combat {

  static init() {
    /* -------------------------------------------- */
    Hooks.on("getCombatTrackerEntryContext", (html, options) => {
      RdDCombatManager.pushInitiativeOptions(html, options);
    });
    Hooks.on("preDeleteCombat", (combat, html, id) => {
      combat.onPreDeleteCombat()
    });
  }

  /* -------------------------------------------- */
  cleanItemUse() {
    for (let turn of this.turns) {
      turn.actor.resetItemUse()
    }
  }

  /* -------------------------------------------- */
  async nextRound() {
    this.cleanItemUse();
    await this.finDeRound();
    return await super.nextRound();
  }

  /* -------------------------------------------- */
  async onPreDeleteCombat() {
    await this.finDeRound({ terminer: true });
  }

  /* -------------------------------------------- */
  async finDeRound(options = { terminer: false }) {
    for (let combatant of this.combatants) {
      if (combatant.actor) {
        await combatant.actor.finDeRound(options);
      }
      else {
        ui.notifications.warn(`Le combatant ${combatant.name} n'est pas associé à un acteur!`)
      }
    }
  }

  /************************************************************************************/
  async rollInitiative(ids, formula = undefined, messageOptions = {}) {
    console.log(`${game.system.title} | Combat.rollInitiative()`, ids, formula, messageOptions);

    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant._id;
    // calculate initiative
    for (let cId = 0; cId < ids.length; cId++) {
      const combatant = this.combatants.get(ids[cId]);
      let rollFormula = formula ?? RdDCombatManager.formuleInitiative(2, 10, 0, 0);
      if (!formula) {
        if (combatant.actor.type == 'creature' || combatant.actor.type == 'entite') {
          const competence = combatant.actor.items.find(it => it.system.iscombat)
          if (competence) {
            rollFormula = RdDCombatManager.formuleInitiative(2, competence.system.carac_value, competence.system.niveau, 0);
          }
        } else {
          const armeCombat = combatant.actor.itemTypes['arme'].find(it => it.system.equipe)
          const compName = (armeCombat == undefined) ? "Corps à corps" : armeCombat.system.competence;
          const competence = RdDItemCompetence.findCompetence(combatant.actor.items, compName);
          if (competence) {
            const carac = combatant.actor.system.carac[competence.system.defaut_carac].value;
            const niveau = competence.system.niveau;
            const bonusEcaille = (armeCombat?.system.magique) ? armeCombat.system.ecaille_efficacite : 0;
            rollFormula = RdDCombatManager.formuleInitiative(2, carac, niveau, bonusEcaille);
          }
        }
      }
      //console.log("Combatat", c);
      const roll = combatant.getInitiativeRoll(rollFormula);
      if (!roll.total) {
        roll.evaluate({ async: false });
      }
      if (roll.total <= 0) roll.total = 0.00;
      console.log("Compute init for", rollFormula, roll.total, combatant);
      let id = combatant._id || combatant.id;
      await this.updateEmbeddedDocuments("Combatant", [{ _id: id, initiative: roll.total }]);

      // Send a chat message
      let rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");
      let messageData = mergeObject(
        {
          speaker: {
            scene: canvas.scene._id,
            actor: combatant.actor?._id,
            token: combatant.token._id,
            alias: combatant.token.name,
            sound: CONFIG.sounds.dice,
          },
          flavor: `${combatant.token.name} a fait son jet d'Initiative (${messageOptions.initInfo})
          <br>
          `,
        },
        messageOptions
      );
      roll.toMessage(messageData, { rollMode, create: true });

      RdDCombatManager.processPremierRoundInit();
    }
    return this;
  };

  static formuleInitiative(rang, carac, niveau, bonusMalus) {
    return `${rang} +( (${RdDCombatManager.calculInitiative(niveau, carac, bonusMalus)} )/100)`;
  }

  /* -------------------------------------------- */
  static calculInitiative(niveau, caracValue, bonusEcaille = 0) {
    let base = niveau + Math.floor(caracValue / 2);
    base += bonusEcaille;
    return "1d6" + (base >= 0 ? "+" : "") + base;
  }

  /* -------------------------------------------- */
  /** Retourne une liste triée d'actions d'armes avec le split arme1 main / arme 2 main / lancer */
  static listActionsArmes(armes, competences, carac) {
    let actions = [];
    for (const arme of armes) {
      if (arme.system.equipe) {
        const dommages = arme.system.dommages.toString();
        const tableauDommages = dommages.includes("/") ? dommages.split("/") : [dommages, dommages];
        if (arme.system.unemain && arme.system.deuxmains && !dommages.includes("/")) {
          ui.notifications.info("Les dommages de l'arme à 1/2 mains " + arme.name + " ne sont pas corrects (ie sous la forme X/Y)");
        }
        console.log(">>>>", arme)
        if ((arme.system.unemain && arme.system.competence) ||
          (arme.system.competence.toLowerCase().includes("corps à corps"))) {
          actions.push(RdDCombatManager.$prepareAttaqueArme({
            arme: arme,
            infoMain: "(1 main)",
            dommagesReel: Number(tableauDommages[0]),
            competence: arme.system.competence,
            carac: carac,
            competences: competences
          }));
        }
        if (arme.system.deuxmains && arme.system.competence) {
          actions.push(RdDCombatManager.$prepareAttaqueArme({
            arme: arme,
            infoMain: "(2 mains)",
            dommagesReel: Number(tableauDommages[1]),
            competence: arme.system.competence.replace(" 1 main", " 2 mains"),
            carac: carac,
            competences: competences
          }));
        }
        if (arme.system.lancer) {
          actions.push(RdDCombatManager.$prepareAttaqueArme({
            arme: arme,
            infoMain: "(lancer)",
            dommagesReel: Number(tableauDommages[0]),
            competence: arme.system.lancer,
            carac: carac,
            competences: competences
          }));
        }
        if (arme.system.tir) {
          actions.push(RdDCombatManager.$prepareAttaqueArme({
            arme: arme,
            infoMain: "(tir)",
            dommagesReel: Number(tableauDommages[0]),
            competence: arme.system.tir,
            carac: carac,
            competences: competences
          }));
        }
      }
    }
    return actions.sort(Misc.ascending(action => action.name + (action.system.infoMain ?? '')));
  }

  static $prepareAttaqueArme(infoAttaque) {
    const comp = infoAttaque.competences.find(c => c.name == infoAttaque.competence);
    const attaque = duplicate(infoAttaque.arme);
    attaque.action = 'attaque';
    attaque.system.competence = infoAttaque.competence;
    attaque.system.dommagesReels = infoAttaque.dommagesReel;
    attaque.system.infoMain = infoAttaque.infoMain;
    attaque.system.niveau = comp.system.niveau;
    attaque.system.initiative = RdDCombatManager.calculInitiative(comp.system.niveau, infoAttaque.carac[comp.system.defaut_carac].value);
    return attaque;
  }

  static listActionsCreature(competences) {
    return competences.filter(it => RdDItemCompetenceCreature.isCompetenceAttaque(it))
      .map(it => RdDItemCompetenceCreature.armeNaturelle(it));
  }

  static listActionsPossessions(actor) {
    return RdDCombatManager._indexActions(actor.getPossessions().map(p => {
      return {
        name: p.name,
        action: 'conjurer',
        system: {
          competence: p.name,
          possessionid: p.system.possessionid,
        }
      }
    }));
  }

  /* -------------------------------------------- */
  static listActionsCombat(combatant) {
    const actor = combatant.actor;
    let actions = RdDCombatManager.listActionsPossessions(actor);
    if (actions.length > 0) {
      return actions;
    }
    if (actor.isCreature()) {
      actions = actions.concat(RdDCombatManager.listActionsCreature(actor.itemTypes['competencecreature']));
    } else {
      // Recupération des items 'arme'
      const armes = actor.itemTypes['arme'].filter(it => RdDItemArme.isArmeUtilisable(it))
        //.concat(RdDItemArme.empoignade())
        .concat(RdDItemArme.mainsNues());

      const competences = actor.itemTypes['competence'];
      actions = actions.concat(RdDCombatManager.listActionsArmes(armes, competences, actor.system.carac));

      if (actor.system.attributs.hautrevant.value) {
        actions.push({ name: "Draconic", action: 'haut-reve', system: { initOnly: true, competence: "Draconic" } });
      }
    }

    return RdDCombatManager._indexActions(actions);
  }

  static _indexActions(actions) {
    for (let index = 0; index < actions.length; index++) {
      actions[index].index = index;
    }
    return actions;
  }

  /* -------------------------------------------- */
  static processPremierRoundInit() {
    // Check if we have the whole init !
    if (Misc.isUniqueConnectedGM() && game.combat.current.round == 1) {
      let initMissing = game.combat.combatants.find(it => !it.initiative);
      if (!initMissing) { // Premier round !
        for (let combatant of game.combat.combatants) {
          let action = combatant.initiativeData?.arme;
          //console.log("Parsed !!!", combatant, initDone, game.combat.current, arme);
          if (action && action.type == "arme") {
            for (let initData of premierRoundInit) {
              if (Grammar.toLowerCaseNoAccentNoSpace(action.system.initpremierround).includes(initData.pattern)) {
                let msg = `<h4>L'initiative de ${combatant.actor.name} a été modifiée !</h4>
                      <hr>
                      <div>
                        Etant donné son ${action.name}, son initative pour ce premier round est désormais de ${initData.init}.
                      </div>`
                ChatMessage.create({ content: msg });
                game.combat.setInitiative(combatant._id, initData.init);
              }
            }
          }
        }
      }
    }
  }

  /* -------------------------------------------- */
  static incDecInit(combatantId, incDecValue) {
    const combatant = game.combat.combatants.get(combatantId);
    let initValue = combatant.initiative + incDecValue;
    game.combat.setInitiative(combatantId, initValue);
  }

  /* -------------------------------------------- */
  static pushInitiativeOptions(html, options) {
    for (let i = 0; i < options.length; i++) {
      let option = options[i];
      if (option.name == 'COMBAT.CombatantReroll') { // Replace !
        option.name = "Sélectionner l'initiative...";
        option.condition = true;
        option.icon = '<i class="far fa-question-circle"></i>';
        option.callback = target => {
          RdDCombatManager.displayInitiativeMenu(html, target.data('combatant-id'));
        }
      }
    }
    options = [
      { name: "Incrémenter initiative", condition: true, icon: '<i class="fas fa-plus"></i>', callback: target => { RdDCombatManager.incDecInit(target.data('combatant-id'), +0.01); } },
      { name: "Décrémenter initiative", condition: true, icon: '<i class="fas fa-minus"></i>', callback: target => { RdDCombatManager.incDecInit(target.data('combatant-id'), -0.01); } }
    ].concat(options);
  }
  /* -------------------------------------------- */
  static rollInitiativeAction(combatantId, action) {
    const combatant = game.combat.combatants.get(combatantId);
    if (combatant.actor == undefined) {
      ui.notifications.warn(`Le combatant ${combatant.name} n'est pas associé à un acteur, impossible de déterminer ses actions de combat!`)
      return [];
    }

    let initInfo = "";
    let initOffset = 0;
    let caracForInit = 0;
    let compNiveau = 0;
    let compData = { name: "Aucune" };
    if (combatant.actor.getSurprise() == "totale") {
      initOffset = -1; // To force 0
      initInfo = "Surprise Totale"
    } else if (combatant.actor.getSurprise() == "demi") {
      initOffset = 0;
      initInfo = "Demi Surprise"
    } else if (action.action == 'conjurer') {
      initOffset = 10;
      caracForInit = combatant.actor.getReveActuel();
      initInfo = "Possession"
    } else if (action.action == 'autre') {
      initOffset = 2;
      initInfo = "Autre Action"
    } else if (action.action == 'haut-reve') {
      initOffset = 9;
      initInfo = "Draconic"
    } else {
      compData = RdDItemCompetence.findCompetence(combatant.actor.items, action.system.competence);
      compNiveau = compData.system.niveau;
      initInfo = action.name + " / " + action.system.competence;

      if (combatant.actor.type == 'creature' || combatant.actor.type == 'entite') {
        caracForInit = compData.system.carac_value;
      } else {
        caracForInit = combatant.actor.system.carac[compData.system.defaut_carac].value;
      }
      initOffset = RdDCombatManager._baseInitOffset(compData.system.categorie, action);
    }

    let malus = combatant.actor.getEtatGeneral(); // Prise en compte état général 
    // Cas des créatures et entités vs personnages
    let rollFormula = RdDCombatManager.formuleInitiative(initOffset, caracForInit, compNiveau, malus);
    // Garder la trace de l'arme/compétence utilisée pour l'iniative
    combatant.initiativeData = { arme: action } // pour reclasser l'init au round 0
    game.combat.rollInitiative(combatantId, rollFormula, { initInfo: initInfo });
  }

  /* -------------------------------------------- */
  static _baseInitOffset(categorie, arme) {
    if (categorie == "tir") { // Offset de principe pour les armes de jet
      return 8;
    }
    if (categorie == "lancer") { // Offset de principe pour les armes de jet
      return 7;
    }
    switch (arme.system.cac) {
      case "empoignade":
        return 3;
      case "pugilat":
      case "naturelle":
        return 4;
    }
    return 5;
  }

  /* -------------------------------------------- */
  static displayInitiativeMenu(html, combatantId) {
    console.log("Combatant ; ", combatantId);
    const combatant = game.combat.combatants.get(combatantId);
    if (!(combatant?.actor)) {
      ui.notifications.warn(`Le combatant ${combatant.name ?? combatantId} n'est pas associé à un acteur, impossible de déterminer ses actions de combat!`)
      return;
    }

    let actions = RdDCombatManager.listActionsCombat(combatant);

    // Build the relevant submenu
    if (actions) {
      let menuItems = [];
      for (let action of actions) {
        menuItems.push({
          name: action.system.competence,
          icon: "<i class='fas fa-dice-d6'></i>",
          callback: target => { RdDCombatManager.rollInitiativeAction(combatantId, action) }
        });
      }
      new ContextMenu(html, ".directory-list", menuItems).render();
    }
  }

}

/* -------------------------------------------- */
export class RdDCombat {

  static init() {
    Hooks.on("updateCombat", (combat, change, options, userId) => { RdDCombat.onUpdateCombat(combat, change, options, userId) });
    Hooks.on("preDeleteCombat", (combat, options, userId) => { RdDCombat.onPreDeleteCombat(combat, options, userId); });
  }

  /* -------------------------------------------- */
  static onSocketMessage(sockmsg) {
    switch (sockmsg.msg) {
      case "msg_encaisser":
        return RdDCombat.onMsgEncaisser(sockmsg.data);
      case "msg_defense":
        return RdDCombat.onMsgDefense(sockmsg.data);
    }
  }

  /* -------------------------------------------- */
  static onUpdateCombat(combat, change, options, userId) {
    if (combat.round != 0 && combat.turns && combat.active) {
      RdDCombat.combatNouveauTour(combat);
    }
  }

  /* -------------------------------------------- */
  static onPreDeleteCombat(combat, options, userId) {
    if (Misc.isUniqueConnectedGM()) {
      combat.cleanItemUse();
      ChatUtility.removeChatMessageContaining(`<div data-combatid="${combat.id}" data-combatmessage="actor-turn-summary">`)
      game.messages.filter(m => ChatUtility.getMessageData(m, 'attacker-roll') != undefined && ChatUtility.getMessageData(m, 'defender-roll') != undefined)
        .forEach(it => it.delete());
    }
  }

  /* -------------------------------------------- */
  static combatNouveauTour(combat) {
    if (Misc.isUniqueConnectedGM()) {
      let turn = combat.turns.find(t => t.token?.id == combat.current.tokenId);
      if (turn?.actor) {
        RdDCombat.displayActorCombatStatus(combat, turn.actor);
        // TODO Playaudio for player??
      }
    }
  }

  /* -------------------------------------------- */
  static isActive() {
    return true;
  }

  /* -------------------------------------------- */
  static rddCombatTarget(target, attacker) {
    const defender = target?.actor;
    const defenderTokenId = target?.id;
    return new RdDCombat(attacker, defender, defenderTokenId, target)
  }

  /* -------------------------------------------- */
  static rddCombatForAttackerAndDefender(attackerId, defenderTokenId) {
    const attacker = game.actors.get(attackerId);
    let defender = defenderTokenId ? canvas.tokens.get(defenderTokenId)?.actor : undefined;
    let target = undefined
    if (!defenderTokenId || !defender) {
      console.warn(`RdDCombat.rddCombatForAttackerAndDefender: appel avec defenderTokenId ${defenderTokenId} incorrect, ou pas de defender correspondant`);
      target = Targets.getTarget()
      if (!target) {
        return;
      }
      defenderTokenId = target.id;
      defender = target.actor;
      if (!defenderTokenId || !defender) {
        return;
      }
    }
    return new RdDCombat(attacker, defender, defenderTokenId, target)
  }

  /* -------------------------------------------- */
  static onMsgEncaisser(msg) {
    let defender = canvas.tokens.get(msg.defenderTokenId).actor;
    if (Misc.isOwnerPlayerOrUniqueConnectedGM()) {
      let attackerRoll = msg.attackerRoll;
      let attacker = msg.attackerId ? game.actors.get(msg.attackerId) : undefined;

      defender.encaisserDommages(attackerRoll, attacker);
      const rddCombat = RdDCombat.rddCombatForAttackerAndDefender(msg.attackerId, msg.defenderTokenId);
      rddCombat?.removeChatMessageActionsPasseArme(attackerRoll.passeArme);
    }
  }

  /* -------------------------------------------- */
  static onMsgDefense(msg) {
    let defenderToken = canvas.tokens.get(msg.defenderTokenId);
    if (defenderToken && Misc.isUniqueConnectedGM()) {
      const rddCombat = RdDCombat.rddCombatForAttackerAndDefender(msg.attackerId, msg.defenderTokenId);
      rddCombat?.removeChatMessageActionsPasseArme(msg.defenderRoll.passeArme);
      rddCombat?._chatMessageDefense(msg.paramChatDefense, msg.defenderRoll);
    }
  }

  /* -------------------------------------------- */
  static _callJetDeVie(event) {
    let actorId = event.currentTarget.attributes['data-actorId'].value;
    let actor = game.actors.get(actorId);
    actor.jetVie();
  }

  /* -------------------------------------------- */
  static registerChatCallbacks(html) {
    for (let button of [
      '#parer-button',
      '#esquiver-button',
      '#particuliere-attaque',
      '#encaisser-button',
      '#appel-chance-defense',
      '#appel-destinee-defense',
      '#appel-chance-attaque',
      '#appel-destinee-attaque',
      '#echec-total-attaque',
    ]) {
      html.on("click", button, event => {
        const rddCombat = RdDCombat.rddCombatForAttackerAndDefender(
          event.currentTarget.attributes['data-attackerId']?.value,
          event.currentTarget.attributes['data-defenderTokenId']?.value);
        if (rddCombat) {
          rddCombat.onEvent(button, event);
          event.preventDefault();
        }
      });
    }
    html.on("click", '#chat-jet-vie', event => {
      event.preventDefault();
      RdDCombat._callJetDeVie(event);
    });

  }

  /* -------------------------------------------- */
  constructor(attacker, defender, defenderTokenId, target) {
    this.attacker = attacker
    this.defender = defender
    this.target = target
    this.attackerId = this.attacker.id
    this.defenderId = this.defender.id
    this.defenderTokenId = defenderTokenId
  }

  /* -------------------------------------------- */
  async onEvent(button, event) {
    const chatMessage = ChatUtility.getChatMessage(event);
    const defenderRoll = ChatUtility.getMessageData(chatMessage, 'defender-roll');
    const attackerRoll = defenderRoll?.attackerRoll ?? ChatUtility.getMessageData(chatMessage, 'attacker-roll');
    console.log('RdDCombat', attackerRoll, defenderRoll);
    const defenderTokenId = event.currentTarget.attributes['data-defenderTokenId']?.value;

    const armeParadeId = event.currentTarget.attributes['data-armeid']?.value;
    const competence = event.currentTarget.attributes['data-competence']?.value;
    const compId = event.currentTarget.attributes['data-compid']?.value;

    switch (button) {
      case '#particuliere-attaque': return await this.choixParticuliere(attackerRoll, event.currentTarget.attributes['data-mode'].value);
      case '#parer-button': return this.parade(attackerRoll, armeParadeId);
      case '#esquiver-button': return this.esquive(attackerRoll, compId, competence);
      case '#encaisser-button': return this.encaisser(attackerRoll, defenderRoll, defenderTokenId);
      case '#echec-total-attaque': return this._onEchecTotal(attackerRoll);

      case '#appel-chance-attaque': return this.attacker.rollAppelChance(
        () => this.attaqueChanceuse(attackerRoll),
        () => this._onEchecTotal(attackerRoll));
      case '#appel-chance-defense': return this.defender.rollAppelChance(
        () => this.defenseChanceuse(attackerRoll, defenderRoll),
        () => this.afficherOptionsDefense(attackerRoll, defenderRoll, { defenseChance: true }));
      case '#appel-destinee-attaque': return this.attacker.appelDestinee(
        () => this.attaqueSignificative(attackerRoll),
        () => { });
      case '#appel-destinee-defense': return this.defender.appelDestinee(
        () => this.defenseDestinee(defenderRoll),
        () => { });
    }
  }

  /* -------------------------------------------- */
  attaqueChanceuse(attackerRoll) {
    ui.notifications.info("L'attaque est rejouée grâce à la chance")
    attackerRoll.essais.attaqueChance = true;
    this.attaque(attackerRoll, attackerRoll.arme);
  }

  /* -------------------------------------------- */
  attaqueDestinee(attackerRoll) {
    ui.notifications.info('Attaque significative grâce à la destinée')
    RdDResolutionTable.significativeRequise(attackerRoll.rolled);
    this.removeChatMessageActionsPasseArme(attackerRoll.passeArme);
    this._onAttaqueNormale(attackerRoll);
  }

  /* -------------------------------------------- */
  defenseChanceuse(attackerRoll, defenderRoll) {
    ui.notifications.info("La défense est rejouée grâce à la chance")
    attackerRoll.essais.defenseChance = true;
    attackerRoll.essais.defense = false;
    this.removeChatMessageActionsPasseArme(attackerRoll.passeArme);
    this._sendMessageDefense(attackerRoll, defenderRoll, attackerRoll.essais);
  }

  /* -------------------------------------------- */
  defenseDestinee(defenderRoll) {
    if (defenderRoll) {
      ui.notifications.info('Défense significative grâce à la destinée')
      RdDResolutionTable.significativeRequise(defenderRoll.rolled);
      this.removeChatMessageActionsPasseArme(defenderRoll.passeArme);
      if (defenderRoll.arme) {
        this._onParadeNormale(defenderRoll);
      }
      else {
        this._onEsquiveNormale(defenderRoll);
      }
    }
    else {
      ui.notifications.warn("Appel à la destinée impossible, la passe d'armes est déjà terminée!")
    }
  }

  /* -------------------------------------------- */
  afficherOptionsDefense(attackerRoll, defenderRoll, essais) {
    ui.notifications.info("La chance n'est pas avec vous");
    this._sendMessageDefense(attackerRoll, defenderRoll, essais);
  }

  /* -------------------------------------------- */
  removeChatMessageActionsPasseArme(passeArme) {
    if (game.settings.get(SYSTEM_RDD, "supprimer-dialogues-combat-chat")) {
      ChatUtility.removeChatMessageContaining(`<div data-passearme="${passeArme}">`);
    }
  }

  /* -------------------------------------------- */
  static isEchec(rollData) {
    switch (rollData.ajustements.surprise.used) {
      case 'totale': return true;
      case 'demi': return !rollData.rolled.isSign;
    }
    return rollData.rolled.isEchec;
  }

  /* -------------------------------------------- */
  static isEchecTotal(rollData) {
    if (!rollData.attackerRoll && rollData.ajustements.surprise.used) {
      return rollData.rolled.isEchec && rollData.rolled.code != 'notSign';
    }
    return rollData.rolled.isETotal;
  }

  /* -------------------------------------------- */
  static isParticuliere(rollData) {
    if (!rollData.attackerRoll && rollData.ajustements.surprise.used) {
      return false;
    }
    return rollData.rolled.isPart;
  }

  /* -------------------------------------------- */
  static isReussite(rollData) {
    switch (rollData.ajustements.surprise.used) {
      case 'totale': return false;
      case 'demi': return rollData.rolled.isSign;
    }
    return rollData.rolled.isSuccess;
  }

  /* -------------------------------------------- */
  async proposerAjustementTirLancer(rollData) {
    if (['tir', 'lancer'].includes(rollData.competence.system.categorie)) {
      if (this.defender.isEntite([ENTITE_BLURETTE])) {
        ChatMessage.create({
          content: `<strong>La cible est une blurette, l'arme à distance sera perdue dans le blurêve`,
          whisper: ChatMessage.getWhisperRecipients("GM")
        })
      }
      else {
        const defenderToken = canvas.tokens.get(this.defenderTokenId);
        const dist = this.distance(_token, defenderToken)
        const isVisible = this.isVisible(_token, defenderToken)
        const portee = this._ajustementPortee(dist, rollData.arme)
        const taille = this._ajustementTaille(this.defender)
        const activite = this._ajustementMouvement(this.defender)
        const total = [portee, taille, activite].map(it => it.diff).filter(d => !Number.isNaN(d)).reduce(Misc.sum(), 0)
        ChatMessage.create({
          content: await renderTemplate('systems/foundryvtt-ctm/templates/chat-info-distance.html', {
            rollData: rollData,
            attacker: _token,
            isVisible: isVisible,
            defender: defenderToken,
            distance: dist,
            portee: portee,
            taille: taille,
            activite: activite,
            total: total
          }),
          whisper: ChatMessage.getWhisperRecipients("GM")
        })
      }
    }
  }

  isVisible(token, defenderToken) {
    return canvas.effects.visibility.testVisibility(defenderToken.center, { object: token })
  }

  distance(token, defenderToken) {
    return Number(canvas.grid.measureDistances([{ ray: new Ray(token.center, defenderToken.center) }], { gridSpaces: false })).toFixed(1);
  }

  _ajustementPortee(dist, arme) {
    if (dist <= arme.system.portee_courte) return { msg: "courte", diff: 0 };
    if (dist <= arme.system.portee_moyenne) return { msg: "moyenne", diff: -3 };
    if (dist <= arme.system.portee_extreme) return { msg: "extrême", diff: -5 };
    return { msg: "inatteignable", diff: -10 };
  }

  _ajustementTaille(actor) {
    if (actor.isVehicule()) return { msg: "véhicule", diff: 0 }
    const taille = actor.getCaracByName('TAILLE')?.value ?? 1;
    if (taille <= 1) return { msg: "souris", diff: -8 };
    if (taille <= 3) return { msg: "chat", diff: -4 };
    if (taille <= 5) return { msg: "chien", diff: -2 };
    if (taille <= 15) return { msg: "humanoïde", diff: 0 };
    if (taille <= 20) return { msg: "ogre", diff: 2 };
    return { msg: "gigantesque", diff: 4 };
  }
  _ajustementMouvement(defender) {
    if (defender.getSurprise(true)) return { msg: "immobile (surprise)", diff: 0 };
    if (game.combat?.combatants.find(it => it.actorId == defender.id)) return { msg: "en mouvement (combat)", diff: -4 };
    return { msg: "à déterminer (0 immobile, -3 actif, -4 en mouvement, -5 en zig-zag)", diff: -3 };
  }

  /* -------------------------------------------- */
  async attaque(competence, arme) {
    // const nonIncarnee = this.defender.isEntite([ENTITE_NONINCARNE])
    // const blurette = this.defender.isEntite([ENTITE_BLURETTE])
    // if (nonIncarnee || blurette) {
    //   ChatMessage.create( {
    //     content: `<strong>La cible est ${nonIncarnee ? 'non incarnée' : 'une blurette'}.
    //       Il est impossible de l'atteindre.`,
    //     whisper: ChatMessage.getWhisperRecipients("GM")})
    // }

    if (!await this.accorderEntite('avant-attaque')) {
      return;
    }
    if (arme.system.cac == 'empoignade' && this.attacker.isCombatTouche()) {
      ChatMessage.create({
        alias: this.attacker.name,
        whisper: ChatUtility.getWhisperRecipientsAndGMs(this.attacker.name),
        content: await renderTemplate('systems/foundryvtt-ctm/templates/chat-actor-perte-empoignade.html', {
          attacker: this.attacker,
          competence: competence
        })
      });
      return;
    }

    let rollData = this._prepareAttaque(competence, arme);
    console.log("RdDCombat.attaque >>>", rollData);
    if (arme) {
      this.attacker.verifierForceMin(arme);
    }
    await this.proposerAjustementTirLancer(rollData)

    const dialog = await RdDRoll.create(this.attacker, rollData,
      { html: 'systems/foundryvtt-ctm/templates/dialog-roll-competence.html' },
      {
        name: 'jet-attaque',
        label: 'Attaque: ' + (arme?.name ?? competence.name),
        callbacks: [
          this.attacker.createCallbackExperience(),
          this.attacker.createCallbackAppelAuMoral(),
          { action: r => this.removeChatMessageActionsPasseArme(r.passeArme) },
          { condition: r => arme && !RdDCombat.isParticuliere(r), action: r => this.attacker.incDecItemUse(arme._id) },
          { condition: r => (RdDCombat.isReussite(r) && !RdDCombat.isParticuliere(r)), action: r => this._onAttaqueNormale(r) },
          { condition: RdDCombat.isParticuliere, action: r => this._onAttaqueParticuliere(r) },
          { condition: RdDCombat.isEchec, action: r => this._onAttaqueEchec(r) },
          { condition: RdDCombat.isEchecTotal, action: r => this._onAttaqueEchecTotal(r) },
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  _prepareAttaque(competence, arme) {
    let rollData = {
      passeArme: randomID(16),
      mortalite: arme?.system.mortalite,
      coupsNonMortels: false,
      competence: competence,
      surprise: this.attacker.getSurprise(true),
      surpriseDefenseur: this.defender.getSurprise(true),
      targetToken: Targets.extractTokenData(this.target),
      essais: {}
    };

    if (this.attacker.isCreature()) {
      RdDItemCompetenceCreature.setRollDataCreature(rollData);
    }
    else if (arme) {
      // Usual competence
      rollData.arme = RdDItemArme.armeUneOuDeuxMains(arme, RdDItemCompetence.isArmeUneMain(competence));
    }
    else {
      // sans armes: à mains nues
      const niveau = competence.system.niveau;
      const init = RdDCombatManager.calculInitiative(niveau, this.attacker.system.carac['melee'].value);
      rollData.arme = RdDItemArme.mainsNues({ niveau: niveau, initiative: init });
    }
    return rollData;
  }

  /* -------------------------------------------- */
  async _onAttaqueParticuliere(rollData) {

    const isMeleeDiffNegative = (rollData.competence.type == 'competencecreature' || rollData.selectedCarac.label == "Mêlée") && rollData.diffLibre < 0;
    // force toujours, sauf empoignade
    // finesse seulement en mélée, pour l'empoignade, ou si la difficulté libre est de -1 minimum
    // rapidité seulement en mêlée, si l'arme le permet, et si la difficulté libre est de -1 minimum
    const isForce = !rollData.arme.system.empoignade;
    const isFinesse = rollData.arme.system.empoignade || isMeleeDiffNegative;
    const isRapide = !rollData.arme.system.empoignade && isMeleeDiffNegative && rollData.arme.system.rapide;
    // si un seul choix possible, le prendre
    if (isForce && !isFinesse && !isRapide) {
      return await this.choixParticuliere(rollData, "force");
    }
    else if (!isForce && isFinesse && !isRapide) {
      return await this.choixParticuliere(rollData, "finesse");
    }
    else if (!isForce && !isFinesse && isRapide) {
      return await this.choixParticuliere(rollData, "rapidite");
    }

    const choixParticuliere = await ChatMessage.create({
      alias: this.attacker.name,
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.attacker.name),
      content: await renderTemplate('systems/foundryvtt-ctm/templates/chat-demande-attaque-particuliere.html', {
        alias: this.attacker.name,
        attackerId: this.attackerId,
        defenderTokenId: this.defenderTokenId,
        isForce: isForce,
        isFinesse: isFinesse,
        isRapide: isRapide,
        passeArme: rollData.passeArme
      })
    });
    ChatUtility.setMessageData(choixParticuliere, 'attacker-roll', rollData);
  }

  /* -------------------------------------------- */
  async _onAttaqueNormale(attackerRoll) {
    console.log("RdDCombat.onAttaqueNormale >>>", attackerRoll);

    attackerRoll.dmg = RdDBonus.dmg(attackerRoll, this.attacker.getBonusDegat(), this.defender.isEntite());
    let defenderRoll = { attackerRoll: attackerRoll, passeArme: attackerRoll.passeArme, show: {} }
    attackerRoll.show = {
      cible: this.target ? this.defender.name : 'la cible',
      isRecul: (attackerRoll.particuliere == 'force' || attackerRoll.tactique == 'charge')
    }
    await RdDResolutionTable.displayRollData(attackerRoll, this.attacker, 'chat-resultat-attaque.html');

    if (!await this.accorderEntite('avant-defense')) {
      return;
    }

    if (this.target) {
      await this._sendMessageDefense(attackerRoll, defenderRoll);
    }
  }

  /* -------------------------------------------- */
  isPossession(attackerRoll) {
    return attackerRoll.selectedCarac.label.toLowerCase() == 'possession';
  }

  /* -------------------------------------------- */
  async _sendMessageDefense(attackerRoll, defenderRoll, essaisPrecedents = undefined) {
    console.log("RdDCombat._sendMessageDefense", attackerRoll, defenderRoll, essaisPrecedents, " / ", this.attacker, this.target, this.attackerId, attackerRoll.competence.system.categorie);

    this.removeChatMessageActionsPasseArme(attackerRoll.passeArme);
    if (essaisPrecedents) {
      mergeObject(attackerRoll.essais, essaisPrecedents, { overwrite: true });
    }

    // # utilisation esquive
    const corpsACorps = this.defender.getCompetence("Corps à corps", { onMessage: it => console.info(it, this.defender) });
    const esquives = duplicate(this.defender.getCompetences("esquive", { onMessage: it => console.info(it, this.defender) }))
    esquives.forEach(e => e.system.nbUsage = e?._id ? this.defender.getItemUse(e._id) : 0);

    const paramChatDefense = {
      passeArme: attackerRoll.passeArme,
      essais: attackerRoll.essais,
      isPossession: this.isPossession(attackerRoll),
      defender: this.defender,
      attacker: this.attacker,
      attackerId: this.attackerId,
      esquives: esquives,
      defenderTokenId: this.defenderTokenId,
      mainsNues: attackerRoll.dmg.mortalite != 'mortel' && corpsACorps,
      armes: this._filterArmesParade(this.defender, attackerRoll.competence, attackerRoll.arme),
      diffLibre: attackerRoll.ajustements?.diffLibre?.value ?? 0,
      attaqueParticuliere: attackerRoll.particuliere,
      attaqueCategorie: attackerRoll.competence.system.categorie,
      attaqueArme: attackerRoll.arme,
      surprise: this.defender.getSurprise(true),
      dmg: attackerRoll.dmg,
    };

    if (Misc.isUniqueConnectedGM()) {
      await this._chatMessageDefense(paramChatDefense, defenderRoll);
    }
    else {
      this._socketSendMessageDefense(paramChatDefense, defenderRoll);
    }
  }

  /* -------------------------------------------- */
  async _chatMessageDefense(paramDemandeDefense, defenderRoll) {
    const choixDefense = await ChatMessage.create({
      // message privé: du défenseur à lui même (et aux GMs)
      speaker: ChatMessage.getSpeaker(this.defender, canvas.tokens.get(this.defenderTokenId)),
      alias: this.attacker.name,
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.defender.name),
      content: await renderTemplate('systems/foundryvtt-ctm/templates/chat-demande-defense.html', paramDemandeDefense),
    });
    // flag pour garder les jets d'attaque/defense
    ChatUtility.setMessageData(choixDefense, 'defender-roll', defenderRoll);
  }

  /* -------------------------------------------- */
  _socketSendMessageDefense(paramChatDefense, defenderRoll) {
    // envoyer le message au destinataire
    game.socket.emit(SYSTEM_SOCKET_ID, {
      msg: "msg_defense", data: {
        attackerId: this.attacker?.id,
        defenderId: this.defender?.id,
        defenderTokenId: this.defenderTokenId,
        defenderRoll: defenderRoll,
        paramChatDefense: paramChatDefense,
        rollMode: true
      }
    });
  }

  /* -------------------------------------------- */
  _filterArmesParade(defender, competence) {
    let items = defender.items.filter(it => RdDItemArme.isArmeUtilisable(it) || RdDItemCompetenceCreature.isCompetenceParade(it))
    for (let item of items) {
      item.system.nbUsage = defender.getItemUse(item.id); // Ajout du # d'utilisation ce round  
    }
    switch (competence.system.categorie) {
      case 'tir':
      case 'lancer':
        return items.filter(item => RdDItemArme.getCategorieParade(item) == 'boucliers')
      default:
        // Le fléau ne peut être paré qu’au bouclier p115
        if (competence.name == "Fléau") {
          return items.filter(item => RdDItemArme.getCategorieParade(item) == 'boucliers')
        }
        return items.filter(item => RdDItemArme.getCategorieParade(item));
    }
  }

  /* -------------------------------------------- */
  async _onAttaqueEchecTotal(attackerRoll) {
    const choixEchecTotal = await ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(this.attacker.name),
      content: await renderTemplate('systems/foundryvtt-ctm/templates/chat-demande-attaque-etotal.html', {
        attackerId: this.attackerId,
        attacker: this.attacker,
        defenderTokenId: this.defenderTokenId,
        essais: attackerRoll.essais
      })
    });
    ChatUtility.setMessageData(choixEchecTotal, 'attacker-roll', attackerRoll);
  }

  /* -------------------------------------------- */
  async _onEchecTotal(rollData) {
    console.log("RdDCombat._onEchecTotal >>>", rollData);

    const arme = rollData.arme;
    const avecArme = !['', 'sans-armes', 'armes-naturelles'].includes(arme?.system.categorie_parade ?? '');
    const action = (rollData.attackerRoll ? (arme ? "la parade" : "l'esquive") : "l'attaque");
    ChatUtility.createChatWithRollMode(this.defender.name, {
      content: `<strong>Maladresse à ${action}!</strong> ` + await RdDRollTables.getMaladresse({ arme: avecArme })
    });
  }

  /* -------------------------------------------- */
  async _onAttaqueEchec(rollData) {
    console.log("RdDCombat.onAttaqueEchec >>>", rollData);
    await RdDResolutionTable.displayRollData(rollData, this.attacker, 'chat-resultat-attaque.html');

  }

  /* -------------------------------------------- */
  async choixParticuliere(rollData, choix) {
    console.log("RdDCombat.choixParticuliere >>>", rollData, choix);

    if (choix != "rapidite") {
      this.attacker.incDecItemUse(rollData.arme.id);
    }

    this.removeChatMessageActionsPasseArme(rollData.passeArme);
    rollData.particuliere = choix;
    await this._onAttaqueNormale(rollData);
  }

  /* -------------------------------------------- */
  async parade(attackerRoll, armeParadeId) {
    const arme = this.defender.getArmeParade(armeParadeId);
    console.log("RdDCombat.parade >>>", attackerRoll, armeParadeId, arme);
    const competence = arme?.system?.competence;
    if (competence == undefined) {
      console.error("Pas de compétence de parade associée à ", arme?.name, armeParadeId);
      return;
    }

    let rollData = this._prepareParade(attackerRoll, arme, competence);

    const dialog = await RdDRoll.create(this.defender, rollData,
      { html: 'systems/foundryvtt-ctm/templates/dialog-roll-competence.html' },
      {
        name: 'jet-parade',
        label: 'Parade: ' + (arme ? arme.name : rollData.competence.name),
        callbacks: [
          this.defender.createCallbackExperience(),
          this.defender.createCallbackAppelAuMoral(),
          { action: r => this.removeChatMessageActionsPasseArme(r.passeArme) },
          { condition: r => !RdDCombat.isParticuliere(r), action: r => this.defender.incDecItemUse(armeParadeId) },
          { condition: RdDCombat.isReussite, action: r => this._onParadeNormale(r) },
          { condition: RdDCombat.isParticuliere, action: r => this._onParadeParticuliere(r) },
          { condition: RdDCombat.isEchec, action: r => this._onParadeEchec(r) },
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  _prepareParade(attackerRoll, armeParade, competenceParade) {
    let defenderRoll = {
      passeArme: attackerRoll.passeArme,
      diffLibre: attackerRoll.diffLibre,
      attackerRoll: attackerRoll,
      competence: this.defender.getCompetence(competenceParade),
      arme: armeParade,
      surprise: this.defender.getSurprise(true),
      needParadeSignificative: ReglesOptionelles.isUsing('categorieParade') && RdDItemArme.needParadeSignificative(attackerRoll.arme, armeParade),
      needResist: RdDItemArme.needArmeResist(attackerRoll.arme, armeParade),
      carac: this.defender.system.carac,
      show: {}
    };

    if (this.defender.isCreature()) {
      RdDItemCompetenceCreature.setRollDataCreature(defenderRoll);
    }

    return defenderRoll;
  }

  /* -------------------------------------------- */
  _onParadeParticuliere(defenderRoll) {
    console.log("RdDCombat._onParadeParticuliere >>>", defenderRoll);
    if (!defenderRoll.attackerRoll.isPart) {
      // TODO: attaquant doit jouer résistance et peut être désarmé p132
      ChatUtility.createChatWithRollMode(this.defender.name, {
        content: `(à gérer) L'attaquant doit jouer résistance et peut être désarmé (p132)`
      });
    }
  }

  /* -------------------------------------------- */
  async _onParadeNormale(defenderRoll) {
    console.log("RdDCombat._onParadeNormale >>>", defenderRoll);

    await this.computeRecul(defenderRoll);
    await this.computeDeteriorationArme(defenderRoll);
    await RdDResolutionTable.displayRollData(defenderRoll, this.defender, 'chat-resultat-parade.html');
    this.removeChatMessageActionsPasseArme(defenderRoll.passeArme);
  }

  /* -------------------------------------------- */
  async _onParadeEchec(defenderRoll) {
    console.log("RdDCombat._onParadeEchec >>>", defenderRoll);

    await RdDResolutionTable.displayRollData(defenderRoll, this.defender, 'chat-resultat-parade.html');

    this.removeChatMessageActionsPasseArme(defenderRoll.passeArme);
    this._sendMessageDefense(defenderRoll.attackerRoll, defenderRoll, { defense: true });
  }

  /* -------------------------------------------- */
  async esquive(attackerRoll, compId, compName) {
    const esquive = this.defender.getCompetence(compId) ?? this.defender.getCompetence(compName)
    if (esquive == undefined) {
      ui.notifications.error(this.defender.name + " n'a pas de compétence " + compName);
      return;
    }
    console.log("RdDCombat.esquive >>>", attackerRoll, esquive);
    let rollData = this._prepareEsquive(attackerRoll, esquive);

    const dialog = await RdDRoll.create(this.defender, rollData,
      { html: 'systems/foundryvtt-ctm/templates/dialog-roll-competence.html' },
      {
        name: 'jet-esquive',
        label: 'Esquiver',
        callbacks: [
          this.defender.createCallbackExperience(),
          this.defender.createCallbackAppelAuMoral(),
          { condition: r => !RdDCombat.isParticuliere(r), action: r => this.defender.incDecItemUse(esquive._id) },
          { action: r => this.removeChatMessageActionsPasseArme(r.passeArme) },
          { condition: RdDCombat.isReussite, action: r => this._onEsquiveNormale(r) },
          { condition: RdDCombat.isParticuliere, action: r => this._onEsquiveParticuliere(r) },
          { condition: RdDCombat.isEchec, action: r => this._onEsquiveEchec(r) },
        ]
      });
    dialog.render(true);
  }

  /* -------------------------------------------- */
  _prepareEsquive(attackerRoll, competence) {
    let rollData = {
      passeArme: attackerRoll.passeArme,
      diffLibre: attackerRoll.diffLibre,
      attackerRoll: attackerRoll,
      competence: competence,
      surprise: this.defender.getSurprise(true),
      surpriseDefenseur: this.defender.getSurprise(true),
      carac: this.defender.system.carac,
      show: {}
    };

    if (this.defender.isCreature()) {
      RdDItemCompetenceCreature.setRollDataCreature(rollData);
    }
    return rollData;
  }

  /* -------------------------------------------- */
  _onEsquiveParticuliere(rollData) {
    console.log("RdDCombat._onEsquiveParticuliere >>>", rollData);
    ChatUtility.createChatWithRollMode(this.defender.name, {
      content: "<strong>Vous pouvez esquiver une deuxième fois!</strong>"
    });
  }

  /* -------------------------------------------- */
  async _onEsquiveNormale(defenderRoll) {
    console.log("RdDCombat._onEsquiveNormal >>>", defenderRoll);
    await RdDResolutionTable.displayRollData(defenderRoll, this.defender, 'chat-resultat-esquive.html');
    this.removeChatMessageActionsPasseArme(defenderRoll.passeArme);
  }

  /* -------------------------------------------- */
  async _onEsquiveEchec(defenderRoll) {
    console.log("RdDCombat._onEsquiveEchec >>>", defenderRoll);

    await RdDResolutionTable.displayRollData(defenderRoll, this.defender, 'chat-resultat-esquive.html');

    this.removeChatMessageActionsPasseArme(defenderRoll.passeArme);
    this._sendMessageDefense(defenderRoll.attackerRoll, defenderRoll, { defense: true })
  }

  /* -------------------------------------------- */
  async computeDeteriorationArme(defenderRoll) {
    if (!ReglesOptionelles.isUsing('resistanceArmeParade')) {
      return;
    }
    const attackerRoll = defenderRoll.attackerRoll;
    // Est-ce une parade normale?
    if (defenderRoll.arme && attackerRoll && !defenderRoll.rolled.isPart) {
      // Est-ce que l'attaque est une particulière en force ou une charge
      if (defenderRoll.needResist || this._isForceOuCharge(attackerRoll)) {

        defenderRoll.show = defenderRoll.show || {}

        const dmg = attackerRoll.dmg.dmgArme + attackerRoll.dmg.dmgActor;
        let arme = defenderRoll.arme;
        let resistance = Misc.toInt(arme.system.resistance);
        if (arme.system.magique) {
          defenderRoll.show.deteriorationArme = 'resiste'; // Par défaut
          if (arme.system.resistance_magique == undefined) arme.system.resistance_magique = 0; // Quick fix
          if (dmg > arme.system.resistance_magique) { // Jet uniquement si dommages supérieur à résistance magique (cf. 274)
            // Jet de résistance de l'arme de parade (p.132)
            let resistRoll = await RdDResolutionTable.rollData({
              caracValue: resistance,
              finalLevel: - dmg,
              showDice: HIDE_DICE
            });
            if (!resistRoll.rolled.isSuccess) {
              let perteResistance = (dmg - arme.system.resistance_magique)
              resistance -= perteResistance;
              defenderRoll.show.deteriorationArme = resistance <= 0 ? 'brise' : 'perte';
              defenderRoll.show.perteResistance = perteResistance;
              this.defender.updateEmbeddedDocuments('Item', [{ _id: defenderRoll.arme._id, 'system.resistance': resistance }]);
            }
          }
        } else {
          // Jet de résistance de l'arme de parade (p.132)
          let resistRoll = await RdDResolutionTable.rollData({
            caracValue: resistance,
            finalLevel: - dmg,
            showDice: HIDE_DICE
          });
          if (resistRoll.rolled.isSuccess) { // Perte de résistance
            defenderRoll.show.deteriorationArme = 'resiste';
          } else {
            resistance -= dmg;
            defenderRoll.show.deteriorationArme = resistance <= 0 ? 'brise' : 'perte';
            defenderRoll.show.perteResistance = dmg;
            this.defender.updateEmbeddedDocuments('Item', [{ _id: defenderRoll.arme._id, 'system.resistance': resistance }]);
          }
        }
        // Si l'arme de parade n'est pas un bouclier, jet de désarmement (p.132)
        if (ReglesOptionelles.isUsing('defenseurDesarme') && resistance > 0 && RdDItemArme.getCategorieParade(defenderRoll.arme) != 'boucliers') {
          let desarme = await RdDResolutionTable.rollData({
            caracValue: this.defender.getForce(),
            finalLevel: Misc.toInt(defenderRoll.competence.system.niveau) - dmg,
            showDice: HIDE_DICE
          });
          defenderRoll.show.desarme = desarme.rolled.isEchec;
        }
      }
    }
  }

  /* -------------------------------------------- */
  async computeRecul(defenderRoll) { // Calcul du recul (p. 132)
    const attackerRoll = defenderRoll.attackerRoll;
    if (ReglesOptionelles.isUsing('recul') && this._isForceOuCharge(attackerRoll)) {
      const impact = this._computeImpactRecul(attackerRoll);
      const rollRecul = await RdDResolutionTable.rollData({ caracValue: 10, finalLevel: impact });
      if (rollRecul.rolled.isSuccess) {
        defenderRoll.show.recul = 'encaisse';
      } else if (rollRecul.rolled.isETotal || this._isReculCauseChute(impact)) {
        defenderRoll.show.recul = 'chute';
        await this.defender.setEffect(STATUSES.StatusProne, true);
      }
      else {
        defenderRoll.show.recul = 'recul';
      }
    }
  }

  /* -------------------------------------------- */
  async _isReculCauseChute(impact) {
    const agilite = this.defender.getAgilite();
    const chute = await RdDResolutionTable.rollData({ caracValue: agilite, finalLevel: impact });
    return chute.rolled.isEchec;
  }

  /* -------------------------------------------- */
  _isForceOuCharge(attaque) {
    return attaque.particuliere == 'force' || attaque.tactique == 'charge';
  }

  /* -------------------------------------------- */
  _computeImpactRecul(attaque) {
    const taille = this.defender.getTaille();
    const force = this.attacker.getForce();
    const dommages = attaque.arme.system.dommagesReels ?? attaque.arme.system.dommages;
    return taille - (force + dommages);
  }

  /* -------------------------------------------- */
  async encaisser(attackerRoll, defenderRoll, defenderTokenId) {
    defenderTokenId = defenderTokenId || this.defenderTokenId;
    console.log("RdDCombat.encaisser >>>", attackerRoll, defenderTokenId);

    if (defenderRoll?.rolled && RdDCombat.isEchecTotal(defenderRoll)) {
      this._onEchecTotal(defenderRoll);
    }

    if (Misc.isOwnerPlayerOrUniqueConnectedGM(this.defender)) {
      attackerRoll.attackerId = this.attackerId;
      attackerRoll.defenderTokenId = defenderTokenId;

      await this.computeRecul(defenderRoll);
      this.defender.encaisserDommages(attackerRoll, this.attacker, defenderRoll?.show);
    }
    else { // envoi à un GM: les joueurs n'ont pas le droit de modifier les personnages qu'ils ne possèdent pas
      game.socket.emit(SYSTEM_SOCKET_ID, {
        msg: "msg_encaisser",
        data: {
          attackerId: this.attackerId,
          defenderTokenId: defenderTokenId,
          attackerRoll: attackerRoll
        }
      });
    }
    this.removeChatMessageActionsPasseArme(attackerRoll.passeArme);
  }

  /* -------------------------------------------- */
  /* retourne true si on peut continuer, false si on ne peut pas continuer */
  async accorderEntite(when = 'avant-encaissement') {
    if (when != game.settings.get(SYSTEM_RDD, "accorder-entite-cauchemar")
      || this.defender == undefined
      || !this.defender.isEntite([ENTITE_INCARNE])
      || this.defender.isEntiteAccordee(this.attacker)) {
      return true;
    }

    let rolled = await RdDResolutionTable.roll(this.attacker.getReveActuel(), - Number(this.defender.system.carac.niveau.value));

    let message = {
      content: "Jet de points actuels de rêve à " + rolled.finalLevel + RdDResolutionTable.explain(rolled) + "<br>",
      whisper: ChatMessage.getWhisperRecipients(this.attacker.name)
    };

    if (rolled.isSuccess) {
      await this.defender.setEntiteReveAccordee(this.attacker);
      message.content += this.attacker.name + " s'est accordé avec " + this.defender.name;
    }
    else {
      message.content += this.attacker.name + " n'est pas accordé avec " + this.defender.name;
    }

    ChatMessage.create(message);
    return rolled.isSuccess;
  }

  /* -------------------------------------------- */
  static async displayActorCombatStatus(combat, actor) {
    let formData = {
      combatId: combat._id,
      alias: actor.name,
      etatGeneral: actor.getEtatGeneral(),
      isSonne: actor.getSonne(),
      blessuresStatus: actor.computeResumeBlessure(),
      SConst: actor.getSConst(),
      actorId: actor.id,
      isGrave: false,
      isCritique: false
    }
    if (actor.countBlessuresNonSoigneeByName("critiques") > 0) { // Pour éviter le cumul grave + critique
      formData.isCritique = true;
    } else if (actor.countBlessuresNonSoigneeByName("graves") > 0) {
      formData.isGrave = true;
    }

    ChatUtility.createChatWithRollMode(actor.name, {
      content: await renderTemplate(`systems/foundryvtt-ctm/templates/chat-actor-turn-summary.html`, formData)
    });
  }
}
