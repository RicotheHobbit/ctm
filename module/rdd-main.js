/**
 * RdD system
 * Author: LeRatierBretonnien
 * Software License: GNU GPLv3
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { SYSTEM_RDD, SYSTEM_SOCKET_ID } from "./constants.js";
import { RdDActor } from "./actor.js";
import { RdDItemSheet } from "./item-sheet.js";
import { RdDActorSheet } from "./actor-sheet.js";
import { RdDActorCreatureSheet } from "./actor-creature-sheet.js";
import { RdDActorVehiculeSheet } from "./actor-vehicule-sheet.js";
import { RdDActorEntiteSheet } from "./actor-entite-sheet.js";
import { RdDUtility } from "./rdd-utility.js";
import { TMRUtility } from "./tmr-utility.js";
import { RdDCalendrier } from "./rdd-calendrier.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDTokenHud } from "./rdd-token-hud.js";
import { RdDCommands } from "./rdd-commands.js";
import { RdDCombatManager, RdDCombat } from "./rdd-combat.js";
import { ChatUtility } from "./chat-utility.js";
import { StatusEffects } from "./settings/status-effects.js";
import { RddCompendiumOrganiser } from "./rdd-compendium-organiser.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { RdDHotbar } from "./rdd-hotbar-drop.js"
import { EffetsDraconiques } from "./tmr/effets-draconiques.js";
import { RdDHerbes } from "./rdd-herbes.js";
import { RdDItem } from "./item.js";
import { RdDDice } from "./rdd-dice.js";
import { RdDPossession } from "./rdd-possession.js";
import { RdDSigneDraconiqueItemSheet } from "./item-signedraconique-sheet.js";
import { Misc } from "./misc.js";
import { Migrations } from './migrations.js';
import { DialogChronologie } from "./dialog-chronologie.js";
import { SystemCompendiums } from "./settings/system-compendiums.js";
import { RdDRencontreItemSheet } from "./item-rencontre-sheet.js";
import { TMRRencontres } from "./tmr-rencontres.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */



/************************************************************************************/
Hooks.once("init", async function () {
  console.log(`Initializing Reve de Dragon System`);

  // preload handlebars templates
  RdDUtility.preloadHandlebarsTemplates();
  // Create useful storage space
  game.system.rdd = {
    TMRUtility,
    RdDUtility,
    RdDHotbar,
    RdDPossession,
  }

  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "accorder-entite-cauchemar", {
    name: "Accorder le rêve aux entités",
    hint: "A quel moment les personnages doivent accorder leur rêve aux entités de cauchemar",
    scope: "world",
    config: true,
    type: String,
    choices: {           // If choices are defined, the resulting setting will be a select menu
      "avant-attaque": "Avant l'attaque",
      "avant-defense": "Avant la défense",
      "avant-encaissement": "Avant l'encaissement",
    },
    default: "avant-encaissement"
  });

  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "calendrier", {
    name: "calendrier",
    scope: "world",
    config: false,
    default: RdDCalendrier.createCalendrierInitial(),
    type: Object
  });

  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "migration-png-webp-1.5.34", {
    name: "calendrier",
    scope: "world",
    config: false,
    default: false,
    type: Boolean
  });

  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "liste-nombre-astral", {
    name: "liste-nombre-astral",
    scope: "world",
    config: false,
    default: [],
    type: Object
  });

  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "calendrier-pos", {
    name: "calendrierPos",
    scope: "client",
    config: false,
    default: RdDCalendrier.createCalendrierPos(),
    type: Object
  });


  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "supprimer-dialogues-combat-chat", {
    name: "Supprimer les dialogues de combat",
    hint: "Si désactivée, tous les dialogues de combat sont conservés dans la conversation",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "activer-sons-audio", {
    name: "Activer les bruitages intégrés",
    hint: "Si activé, certaines actions en jeu déclenchent un son d'ambiance",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  /* -------------------------------------------- */
  game.settings.register(SYSTEM_RDD, "appliquer-famine-soif", {
    name: "Notifier de la famine et la soif pour",
    hint: "Indique si les cas de famine et de soif seront indiqués durant Château Dormant",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "aucun": "ni la famine, ni la soif",
      "famine": "seulement la famine",
      "famine-soif": "la famine et la soif",
    },
    default: "aucun"
  });

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1+(1d6/10)",
    decimals: 2
  };

  /* -------------------------------------------- */
  game.socket.on(SYSTEM_SOCKET_ID, async (sockmsg) => {
    console.log(">>>>> MSG RECV", sockmsg);
    try {
      RdDUtility.onSocketMessage(sockmsg);
      RdDCombat.onSocketMessage(sockmsg);
      ChatUtility.onSocketMessage(sockmsg);
      RdDActor.onSocketMessage(sockmsg);
    } catch(e) {
      console.error('game.socket.on(SYSTEM_SOCKET_ID) Exception: ', sockmsg,' => ', e)
    }
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Actor.documentClass = RdDActor;
  CONFIG.Item.documentClass = RdDItem;
  CONFIG.RDD = {
    resolutionTable: RdDResolutionTable.resolutionTable,
    carac_array: RdDUtility.getCaracArray(),
    ajustementsConditions: RdDUtility.getAjustementsConditions(),
    difficultesLibres: RdDUtility.getDifficultesLibres()
  }

  /* -------------------------------------------- */
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(SYSTEM_RDD, RdDActorSheet, { types: ["personnage"], makeDefault: true });
  Actors.registerSheet(SYSTEM_RDD, RdDActorCreatureSheet, { types: ["creature"], makeDefault: true });
  Actors.registerSheet(SYSTEM_RDD, RdDActorVehiculeSheet, { types: ["vehicule"], makeDefault: true });
  Actors.registerSheet(SYSTEM_RDD, RdDActorEntiteSheet, { types: ["entite"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(SYSTEM_RDD, RdDSigneDraconiqueItemSheet, {
    label: "Signe draconique",
    types: ["signedraconique"],
    makeDefault: true
  });
  Items.registerSheet(SYSTEM_RDD, RdDRencontreItemSheet, {
    label: "Rencontre",
    types: ["rencontre"],
    makeDefault: true
  });
  Items.registerSheet(SYSTEM_RDD, RdDItemSheet, {
    types: [
      "competence", "competencecreature",
      "recettealchimique", "musique", "chant", "danse", "jeu", "recettecuisine", "oeuvre",
      "objet", "arme", "armure", "conteneur", "herbe", "ingredient", "livre", "potion", "munition",
      "monnaie", "nourritureboisson", "gemme",
      "meditation", "queue", "ombre", "souffle", "tete", "casetmr", "sort", "sortreserve",
      "nombreastral", "tache", "maladie", "poison", "possession",
      "tarot", "extraitpoetique"
  ], makeDefault: true
  });
  CONFIG.Combat.documentClass = RdDCombatManager;

  // préparation des différents modules
  SystemCompendiums.init();
  DialogChronologie.init();
  ReglesOptionelles.init();
  RdDUtility.init();
  RdDDice.init();
  RdDCommands.init();
  RdDCombat.init();
  RdDCombatManager.init();
  RdDTokenHud.init();
  RdDActor.init();
  RddCompendiumOrganiser.init();
  EffetsDraconiques.init()
  TMRUtility.init();
  RdDHotbar.initDropbar();
  RdDPossession.init();
  TMRRencontres.init();
});

/* -------------------------------------------- */
function messageDeBienvenue() {
  if (game.user.isGM) {
    ChatUtility.removeChatMessageContaining('<div id="message-bienvenue-rdd">');
    ChatMessage.create({
      user: game.user.id,
      content: `<div id="message-bienvenue-rdd"><span class="rdd-roll-part">Bienvenue dans le Rêve des Dragons !</span>
      <br>Vous trouverez quelques informations pour démarrer dans ce document : @Compendium[foundryvtt-reve-de-dragon.rappel-des-regles.7uGrUHGdPu0EmIu2]{Documentation MJ/Joueurs}
      <br>La commande <code>/aide</code> dans le chat permet de voir les commandes spécifiques à Rêve de Dragon.</div>
      ` });
  }
}

/* -------------------------------------------- */
// Register world usage statistics
function registerUsageCount( registerKey ) {
  if ( game.user.isGM ) {
    game.settings.register("world", "world-key", {
      name: "Unique world key",
      scope: "world",
      config: false,
      default: "NONE",
      type: String
    });

    let worldKey = game.settings.get("world", "world-key")
    if ( worldKey == undefined || worldKey == "" ) {
      worldKey = randomID(32)
      game.settings.set("world", "world-key", worldKey )
    }
    let regURL = `https://www.uberwald.me/fvtt_appcount/count.php?name="${registerKey}"&worldKey="${worldKey}"&version="${game.release.generation}.${game.release.build}"&system="${game.system.id}"&systemversion="${game.system.version}"`
    $.ajax(regURL)
    /* -------------------------------------------- */
  }
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", async function () {
  await migrationPngWebp_1_5_34()
  if (Misc.isUniqueConnectedGM()) {
    new Migrations().migrate();
  }

  StatusEffects.onReady();
  RdDHerbes.initializeHerbes();
  RdDDice.onReady();
  /* -------------------------------------------- */
  /* Affiche/Init le calendrier */
  let calendrier = new RdDCalendrier();
  let templatePath = "systems/foundryvtt-reve-de-dragon/templates/calendar-template.html";
  let templateData = {};
  renderTemplate(templatePath, templateData).then(html => {
    calendrier.render(true);
  });
  game.system.rdd.calendrier = calendrier; // Reference;

  // Avertissement si joueur sans personnage
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info("Attention ! Vous n'êtes connecté à aucun personnage !");
    ChatMessage.create({
      content: "<b>ATTENTION</b> Le joueur " + game.user.name + " n'est connecté à aucun personnage !",
      user: game.user.id
    });
  }
  if (Misc.isUniqueConnectedGM()) {
    messageDeBienvenue();
    registerUsageCount( SYSTEM_RDD );
  }
});

async function migrationPngWebp_1_5_34() {
  if (!game.settings.get(SYSTEM_RDD, "migration-png-webp-1.5.34")) {
    const regexOldPngJpg = /(systems\/foundryvtt-reve-de-dragon\/icons\/.*)\.(png|jpg)/;
    const replaceWithWebp = '$1.webp';
    function convertImgToWebp(img) {
      return img.replace(regexOldPngJpg, replaceWithWebp);
    }
    function prepareDocumentsImgUpdate(documents) {
      return documents.filter(it => it.img && it.img.match(regexOldPngJpg))
        .map(it => {
          return { _id: it.id, img: convertImgToWebp(it.img) }
        });
    }
    const itemsUpdates = prepareDocumentsImgUpdate(game.items);
    const actorsUpdates = prepareDocumentsImgUpdate(game.actors);
    //Migrate system png to webp
    await Item.updateDocuments(itemsUpdates);
    await Actor.updateDocuments(actorsUpdates);
    game.actors.forEach(actor => {
      if (actor.token?.img && actor.token.img.match(regexOldPngJpg)) {
        actor.update({ "token.img": convertImgToWebp(actor.token.img) });
      }
      const actorItemsToUpdate = prepareDocumentsImgUpdate(actor.items);
      actor.updateEmbeddedDocuments('Item', actorItemsToUpdate);
    });
    game.settings.set(SYSTEM_RDD, "migration-png-webp-1.5.34", true)
  }

  // CSS patch for v9
  if (game.version) {
    let sidebar = document.getElementById("sidebar");
    sidebar.style.width = "min-content";
  }

}

/* -------------------------------------------- */
/*  Dice-so-nice ready                          */
/* -------------------------------------------- */
Hooks.once('diceSoNiceReady', (dice3d) => RdDDice.diceSoNiceReady(dice3d));

/* -------------------------------------------- */
/*  Foundry VTT chat message                    */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == '/') {
    let regExp = /(\S+)/g;
    let commands = content.match(regExp);
    if (game.system.rdd.commands.processChatCommand(commands, content, msg)) {
      return false;
    }
  }
  return true;
});

