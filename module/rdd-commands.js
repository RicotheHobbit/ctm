/* -------------------------------------------- */

import { DialogChronologie } from "./dialog-chronologie.js";
import { DialogCreateSigneDraconique } from "./dialog-create-signedraconique.js";
import { DialogStress } from "./dialog-stress.js";
import { RdDItemCompetence } from "./item-competence.js";
import { Misc } from "./misc.js";
import { RdDCarac } from "./rdd-carac.js";
import { RdDDice } from "./rdd-dice.js";
import { RdDMeteo } from "./rdd-meteo.js";
import { RdDNameGen } from "./rdd-namegen.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDRollResolutionTable } from "./rdd-roll-resolution-table.js";
import { RdDRollTables } from "./rdd-rolltables.js";
import { RdDUtility } from "./rdd-utility.js";
import { TMRUtility } from "./tmr-utility.js";

const rddRollNumeric = /^(\d+)\s*([\+\-]?\d+)?\s*(s)?/;

/* -------------------------------------------- */
export class RdDCommands {

  static init() {
    if (!game.system.rdd.commands) {
      const rddCommands = new RdDCommands();
      rddCommands.registerCommand({ path: ["/aide"], func: (content, msg, params) => rddCommands.help(msg), descr: "Affiche l'aide pour toutes les commandes" });
      rddCommands.registerCommand({ path: ["/help"], func: (content, msg, params) => rddCommands.help(msg), descr: "Affiche l'aide pour toutes les commandes" });

      rddCommands.registerCommand({ path: ["/liste", "comp"], func: (content, msg, params) => RdDRollTables.getCompetence('liste'), descr: "Affiche la liste des compétences" });

      rddCommands.registerCommand({ path: ["/table", "queue"], func: (content, msg, params) => RdDRollTables.getQueue('liste'), descr: "Affiche la table des Queues de Dragon" });
      rddCommands.registerCommand({ path: ["/table", "ombre"], func: (content, msg, params) => RdDRollTables.getOmbre('liste'), descr: "Affiche la table des Ombres de Thanatos" });
      rddCommands.registerCommand({ path: ["/table", "tetehr"], func: (content, msg, params) => RdDRollTables.getTeteHR('liste'), descr: "Affiche la table des Têtes de Dragon pour Hauts Revants" });
      rddCommands.registerCommand({ path: ["/table", "tete"], func: (content, msg, params) => RdDRollTables.getTete('liste'), descr: "Affiche la table des Tête de Dragon pour tous" });
      rddCommands.registerCommand({ path: ["/table", "souffle"], func: (content, msg, params) => RdDRollTables.getSouffle('liste'), descr: "Affiche la table des Souffles de Dragon" });
      rddCommands.registerCommand({ path: ["/table", "tarot"], func: (content, msg, params) => RdDRollTables.getTarot('liste'), descr: "Affiche la table les cartes du Tarot Draconique" });
      rddCommands.registerCommand({ path: ["/table", "ideefixe"], func: (content, msg, params) => RdDRollTables.getIdeeFixe('liste'), descr: "Affiche la table des Idées fixes" });
      rddCommands.registerCommand({ path: ["/table", "desir"], func: (content, msg, params) => RdDRollTables.getDesirLancinant('liste'), descr: "Affiche la table des Désirs Lancinants" });
      rddCommands.registerCommand({
        path: ["/table", "rencontre"], func: (content, msg, params) => rddCommands.tableRencontres(msg, params),
        descr: `Affiche la table des Rencontres
          <br><strong>/table rencontre deso</strong> affiche la table des rencontres en Désolation
          <br><strong>/table rencontre mauvaise</strong> affiche la table des mauvaises rencontres` });

      rddCommands.registerCommand({ path: ["/tirer", "comp"], func: (content, msg, params) => RdDRollTables.getCompetence('chat'), descr: "Tire une compétence au hasard" });
      rddCommands.registerCommand({ path: ["/tirer", "queue"], func: (content, msg, params) => RdDRollTables.getQueue('chat'), descr: "Tire une Queue de Dragon" });
      rddCommands.registerCommand({ path: ["/tirer", "ombre"], func: (content, msg, params) => RdDRollTables.getOmbre('chat'), descr: "Tire une Ombre de Thanatos" });
      rddCommands.registerCommand({ path: ["/tirer", "tetehr"], func: (content, msg, params) => RdDRollTables.getTeteHR('chat'), descr: "Tire une Tête de Dragon pour Hauts Revants" });
      rddCommands.registerCommand({ path: ["/tirer", "tete"], func: (content, msg, params) => RdDRollTables.getTete('chat'), descr: "Tire une Tête de Dragon" });
      rddCommands.registerCommand({ path: ["/tirer", "souffle"], func: (content, msg, params) => RdDRollTables.getSouffle('chat'), descr: "Tire un Souffle de Dragon" });
      rddCommands.registerCommand({ path: ["/tirer", "tarot"], func: (content, msg, params) => RdDRollTables.getTarot('chat'), descr: "Tire une carte du Tarot Draconique" });
      rddCommands.registerCommand({ path: ["/tirer", "ideefixe"], func: (content, msg, params) => RdDRollTables.getIdeeFixe('chat'), descr: "Tire une Idée fixe" });
      rddCommands.registerCommand({ path: ["/tirer", "desir"], func: (content, msg, params) => RdDRollTables.getDesirLancinant('chat'), descr: "Tire un Désir Lancinant" });
      rddCommands.registerCommand({ path: ["/tirer", "rencontre"], func: (content, msg, params) => rddCommands.getRencontreTMR(params), descr: `Détermine une rencontre dans les TMR (synonyme de "/tmrr")` });

      rddCommands.registerCommand({ path: ["/meteo"], func: (content, msg, params) => rddCommands.getMeteo(msg, params), descr: "Propose une météo marine" });
      rddCommands.registerCommand({ path: ["/nom"], func: (content, msg, params) => RdDNameGen.getName(msg, params), descr: "Génère un nom aléatoire" });

      rddCommands.registerCommand({
        path: ["/tmr"], func: (content, msg, params) => rddCommands.findTMR(msg, params),
        descr: `Cherche où se trouve une case des Terres médianes
          <br><strong>/tmr sord</strong> indique que la cité Sordide est en D13
          <br><strong>/tmr foret</strong> donne la liste des TMR dont le nom contient "foret" (donc, toutes les forêts)` });
      rddCommands.registerCommand({
        path: ["/tmra"], func: (content, msg, params) => rddCommands.getTMRAleatoire(msg, params),
        descr: `Tire une case aléatoire des Terres médianes
          <br><strong>/tmra forêt</strong> détermine une 'forêt' aléatoire
          <br><strong>/tmra</strong> détermine une case aléatoire dans toutes les TMR` });
      rddCommands.registerCommand({
        path: ["/tmrr"], func: (content, msg, params) => rddCommands.getRencontreTMR(params),
        descr: `Détermine une rencontre dans les TMR
          <br><strong>/tmrr forêt</strong> détermine une rencontre aléatoire en 'forêt'
          <br><strong>/tmrr mauvaise</strong> détermine une mauvaise rencontre aléatoire
          <br><strong>/tmrr for 47</strong> détermine la rencontre en 'forêt' pour un jet de dé de 47` });

      rddCommands.registerCommand({
        path: ["/xp", "comp"], func: (content, msg, params) => rddCommands.getCoutXpComp(msg, params),
        descr: `Détermine le coût d'expérience pour augmenter une compétence. Exemples:
        <br>/xp comp -6 1: pour passer de -6 à +1
        <br>/xp comp +4: pour atteindre le niveau 4 (depuis +3)`
      });

      rddCommands.registerCommand({
        path: ["/xp", "carac"], func: (content, msg, params) => rddCommands.getCoutXpCarac(msg, params),
        descr: `Détermine le coût d'expérience pour augmenter une caractéristique. Exemples:
        <br>/xp carac 15: coût pour atteindre 15 (depuis 14)`
      });

      rddCommands.registerCommand({
        path: ["/rdd"], func: (content, msg, params) => rddCommands.rollRdd(msg, params),
        descr: `Effectue un jet de dés dans la table de résolution. Exemples:
          <br><strong>/rdd</strong> ouvre la table de résolution
          <br><strong>/rdd 10 3</strong> effectue un jet 10 à +3
          <br><strong>/rdd 15 -2</strong> effectue un jet 15 à -2
          <br><strong>/rdd 15 0 s</strong> effectue un jet 15 à 0, avec significative requise
          <br><strong>/rdd Vue Vigilance -2</strong> effectue un jet de Vue/Vigilance à -2 pour les tokens sélectionnés
          <br><strong>/rdd vol déser +2</strong> effectue un jet de Volonté/Survie en désert à +2 pour les tokens sélectionnés
          `
      });
      rddCommands.registerCommand({ path: ["/ddr"], func: (content, msg, params) => rddCommands.rollDeDraconique(msg), descr: "Lance un Dé Draconique" });

      rddCommands.registerCommand({
        path: ["/payer"], func: (content, msg, params) => RdDUtility.afficherDemandePayer(params[0], params[1]),
        descr: `Demande aux joueurs de payer un montant. Exemples:
          <br><strong>/payer 5s 10d</strong> permet d'envoyer un message pour payer 5 sols et 10 deniers
          <br><strong>/payer 10d</strong> permet d'envoyer un message pour payer 10 deniers`
      });
      rddCommands.registerCommand({
        path: ["/astro"], func: (content, msg, params) => RdDUtility.afficherHeuresChanceMalchance(Misc.join(params, ' ')),
        descr: `Affiche les heures de chance et de malchance selon l'heure de naissance donnée en argument. Exemples pour l'heure de la Lyre:
          <br><strong>/astro 7</strong>
          <br><strong>/astro Lyre</strong>
          <br><strong>/astro Lyr</strong>`
      });

      rddCommands.registerCommand({
        path: ["/signe", "+"], func: (content, msg, params) => rddCommands.creerSignesDraconiques(),
        descr: "Crée un signe draconique et l'ajoute aux haut-rêvants choisis."
      });

      rddCommands.registerCommand({
        path: ["/signe", "-"], func: (content, msg, params) => rddCommands.supprimerSignesDraconiquesEphemeres(),
        descr: "Supprime les signes draconiques éphémères"
      });

      rddCommands.registerCommand({
        path: ["/stress"], func: (content, msg, params) => rddCommands.distribuerStress(params),
        descr: `Distribue du stress aux personnages. Exemples:
          <br><strong>/stress</strong> : Ouvre une fenêtre pour donner du stress ou de l'expérience à un ensemble de personnages
          <br><strong>/stress 6</strong> : Distribue 6 points des Stress à tout les personnages joueurs, sans raison renseignée
          <br><strong>/stress 6 Tigre</strong> : Distribue 6 points des Stress à tout les personnages joueurs, à cause d'un Tigre (Vert)
          <br><strong>/stress 6 Glou Paulo</strong> : Distribue 6 points de Stress au personnage Paulon ou au personnage joueur Paulo, à cause d'un Glou`
      });

      rddCommands.registerCommand({
        path: ["/chrono"], func: (content, msg, params) => DialogChronologie.create(),
        descr: `Enregistre une entrée de chronologie dans un article de journal`
      });

      game.system.rdd.commands = rddCommands;
    }
  }
  constructor() {
    this.commandsTable = {};
  }

  /* -------------------------------------------- */
  registerCommand(command) {
    this._addCommand(this.commandsTable, command.path, '', command);
  }

  /* -------------------------------------------- */
  _addCommand(targetTable, path, fullPath, command) {
    if (!this._validateCommand(targetTable, path, command)) {
      return;
    }
    const term = path[0];
    fullPath = fullPath + term + ' '
    if (path.length == 1) {
      command.descr = `<strong>${fullPath}</strong>: ${command.descr}`;
      targetTable[term] = command;
    }
    else {
      if (!targetTable[term]) {
        targetTable[term] = { subTable: {} };
      }
      this._addCommand(targetTable[term].subTable, path.slice(1), fullPath, command)
    }
  }

  /* -------------------------------------------- */
  _validateCommand(targetTable, path, command) {
    if (path.length > 0 && path[0] && command.descr && (path.length != 1 || targetTable[path[0]] == undefined)) {
      return true;
    }
    console.warn("RdDCommands._validateCommand failed ", targetTable, path, command);
    return false;
  }


  /* -------------------------------------------- */
  /* Manage chat commands */
  processChatCommand(commandLine, content = '', msg = {}) {
    // Setup new message's visibility
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) msg["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "blindroll") msg["blind"] = true;
    msg["type"] = 0;

    let command = commandLine[0].toLowerCase();
    let params = commandLine.slice(1);

    return this.process(command, params, content, msg);
  }

  process(command, params, content, msg) {
    return this._processCommand(this.commandsTable, command, params, content, msg);
  }

  async _processCommand(commandsTable, name, params, content = '', msg = {}, path = "") {
    let command = commandsTable[name];
    path = path + name + " ";
    if (command && command.subTable) {
      if (params[0]) {
        return this._processCommand(command.subTable, params[0], params.slice(1), content, msg, path)
      }
      else {
        this.help(msg, command.subTable);
        return true;
      }
    }
    if (command && command.func) {
      const result =  await command.func(content, msg, params);
      if (result == false) {
        RdDCommands._chatAnswer(msg, command.descr);
      }
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  async help(msg) {
    this.help(msg, undefined);
  }
  async help(msg, table) {
    let commands = []
    this._buildSubTableHelp(commands, table || this.commandsTable);

    let html = await renderTemplate("systems/foundryvtt-reve-de-dragon/templates/settings/dialog-aide-commands.html", { commands: commands });
    let d = new Dialog(
      {
        title: "Commandes disponibles dans le tchat",
        content: html,
        buttons: {},
      },
      {
        width: 600, height: 600,
      });

    d.render(true);
  }

  /* -------------------------------------------- */
  static _chatAnswer(msg, content) {
    msg.whisper = [game.user.id];
    msg.content = content;
    ChatMessage.create(msg);
  }

  /* -------------------------------------------- */
  _buildSubTableHelp(list, table) {
    for (let [name, command] of Object.entries(table)) {
      if (command) {
        if (command.subTable) {
          this._buildSubTableHelp(list, command.subTable);
        } else {
          list.push(command.descr);
        }
      }
    }
    return list.sort();
  }

  /* -------------------------------------------- */
  async getRencontreTMR(params) {
    if (params.length == 1 || params.length == 2) {
      return game.system.rencontresTMR.rollRencontre(params[0], params[1])
    }
    return false;
  }

  /* -------------------------------------------- */
  async rollRdd(msg, params) {
    if (params.length == 0) {
      RdDRollResolutionTable.open();
    }
    else {
      let flatParams = Misc.join(params, ' ');
      const numericParams = flatParams.match(rddRollNumeric);
      if (numericParams) {
        const carac = Misc.toInt(numericParams[1]);
        const diff = Misc.toInt(numericParams[2] || 0);
        const significative = numericParams[3] == 's'
        await this.rollRdDNumeric(msg, carac, diff, significative);
        return;
      }

      let actors = canvas.tokens.controlled.map(it => it.actor).filter(it => it);
      if (actors && actors.length > 0) {
        let length = params.length;
        let diff = Number(params[length - 1]);
        if (Number.isInteger(Number(diff))) {
          length--;
        }
        else {
          diff = 0;
        }
        const caracName = params[0];
        let competence = length > 1 ? actors[0].getCompetence(Misc.join(params.slice(1, length), ' ')) : undefined;
        if (competence) {
          for (let actor of actors) {
            await actor.rollCaracCompetence(caracName, competence.name, diff);
          }
        }
        return;
      }
      else {
        ui.notifications.warn("Sélectionnez au moins un personnage pour lancer les dés")
      }
    }
  }

  /* -------------------------------------------- */
  async rollRdDNumeric(msg, carac, diff, significative = false) {
    let rollData = {
      caracValue: carac,
      finalLevel: diff,
      diviseurSignificative: significative ? 2 : 1,
      show: { title: "Table de résolution" }
    };
    await RdDResolutionTable.rollData(rollData);
    return RdDCommands._chatAnswer(msg, await RdDResolutionTable.buildRollDataHtml(rollData));
  }

  /* -------------------------------------------- */
  async rollDeDraconique(msg) {
    let ddr = await RdDDice.rollTotal("1dr + 7");
    return RdDCommands._chatAnswer(msg, `Lancer d'un Dé draconique: ${ddr}`);
  }

  async getTMRAleatoire(msg, params) {
    if (params.length < 2) {
      let type = params[0];
      const tmr = await TMRUtility.getTMRAleatoire(type ? (it => it.type == type) : (it => true));
      return RdDCommands._chatAnswer(msg, `Case aléatoire: ${tmr.coord} - ${tmr.label}`);
    }
    else {
      return false;
    }
  }

  async findTMR(msg, params) {
    if (params && params.length > 0) {
      const search = Misc.join(params, ' ');
      const found = TMRUtility.findTMR(search);
      if (found?.length > 0) {
        return RdDCommands._chatAnswer(msg, `Les TMRs correspondant à '${search}' sont:` + Misc.join(found.map(it => `<br>${it.coord}: ${it.label}`)));
      }
      return RdDCommands._chatAnswer(msg, 'Aucune TMR correspondant à ' + search);
    }
    return false;
  }
  async tableRencontres(msg, params) {
    if (params && params.length > 0) {
      const search = Misc.join(params, ' ');
      const solvedTerrain = TMRUtility.findTMRLike(search);
      if (solvedTerrain == undefined) {
        return RdDCommands._chatAnswer(msg, 'Aucune TMR correspondant à ' + search);
      }
      return game.system.rencontresTMR.chatTable(solvedTerrain);
    }
    return false;
  }

  /* -------------------------------------------- */
  getCoutXpComp(msg, params) {
    if (params && (params.length == 1 || params.length == 2)) {
      let to = params.length == 1 ? Number(params[0]) : Number(params[1]);
      let from = params.length == 1 ? to - 1 : Number(params[0]);
      return RdDCommands._chatAnswer(msg, `Coût pour passer une compétence de ${from} à ${to}: ${RdDItemCompetence.getDeltaXp(from, to)}`);
    }
    else {
      return false;
    }
  }

  /* -------------------------------------------- */
  getCoutXpCarac(msg, params) {
    if (params && params.length == 1) {
      let to = Number(params[0]);
      return RdDCommands._chatAnswer(msg, `Coût pour passer une caractéristique de ${to - 1} à ${to}: ${RdDCarac.getCaracXp(to)}`);
    }
    else {
      return false;
    }
  }

  async creerSignesDraconiques() {
    DialogCreateSigneDraconique.createSigneForActors();
    return true;
  }

  async supprimerSignesDraconiquesEphemeres() {
    game.actors.forEach(actor => {
      const ephemeres = actor.items.filter(item => item.type = 'signedraconique' && item.system.ephemere);
      if (ephemeres.length > 0) {
        actor.deleteEmbeddedDocuments("Item", ephemeres.map(item => item.id));
      }
    });
    return true;
  }

  async distribuerStress(params) {
    if (!game.user.isGM) {
      ui.notifications.warn("Seul le MJ est autorisé à utiliser la commande /stress");
      return false;
    }
    if (params.length < 3) {
      DialogStress.distribuerStress();
    }
    else {
      let stress = params[0]
      if (stress == undefined) {
        ui.notifications.warn("Pas de valeur de stress à distribuer!");
        return;
      }

      let motif = params.slice(1, params.length - 2);
      let name = params[params.length - 1];
      if (name == undefined) {
        for (let actor of game.actors) {
          actor.distribuerStress('stress', stress, motif);
        }
      } else {
        //console.log(stressValue, nomJoueur);
        let actor = Misc.findActor(name, game.actors.filter(it => it.hasPlayerOwner)) ?? Misc.findPlayer(name)?.character
        if (actor) {
          actor.distribuerStress('stress', stress, motif);
        }
        else {
          ui.notifications.warn(`Pas de personnage ou de joueur correspondant à ${name}!`);
        }
      }

    }
    return true;
  }
  async getMeteo(msg, params) {
    return await RdDMeteo.getMeteo();
  }

}

