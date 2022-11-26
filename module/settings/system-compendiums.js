import { HIDE_DICE, SYSTEM_RDD } from "../constants.js";
import { RdDItem } from "../item.js";
import { Misc } from "../misc.js";
import { RdDDice } from "../rdd-dice.js";

const COMPENDIUM_SETTING_PREFIX = 'compendium-';

const CONFIGURABLE_COMPENDIUMS = {
  'tables-diverses': { label: "Tables aléatoires", type: "RollTable" },
  'competences': { label: "Compétences", type: "Item" },
  'extrait-poetique': { label: "Extraits poetiques", type: "Item" },
  'queues-de-dragon': { label: "Queues de dragon", type: "Item" },
  'ombres-de-thanatos': { label: "Ombres de Thanatos", type: "Item" },
  'souffles-de-dragon': { label: "Souffles de Dragon", type: "Item" },
  'tarot-draconique': { label: "Tarots draconiques", type: "Item" },
  'rencontres': { label: "Rencontres dans les TMR", type: "Item" },
  'tetes-de-dragon-pour-haut-revants': { label: "Têtes de dragons (haut-rêvant)", type: "Item" },
  'tetes-de-dragon-pour-tous-personnages': { label: "Têtes de dragons (tous)", type: "Item" },
}

export class SystemCompendiums extends FormApplication {
  static init() {
    Object.keys(CONFIGURABLE_COMPENDIUMS).forEach(compendium => {
      const definition = CONFIGURABLE_COMPENDIUMS[compendium];
      mergeObject(definition, {
        compendium: compendium,
        default: SystemCompendiums._getDefaultCompendium(compendium),
        setting: SystemCompendiums._getSettingCompendium(compendium)
      });

      game.settings.register(SYSTEM_RDD, definition.setting, {
        name: definition.label,
        default: definition.default,
        scope: "world",
        config: false,
        type: String
      });
    });

    game.settings.registerMenu(SYSTEM_RDD, "compendium-settings", {
      name: "Choisir les compendiums système",
      label: "Compendiums système",
      hint: "Ouvre la fenêtre de sélection des compendiums système",
      icon: "fas fa-bars",
      type: SystemCompendiums
    })
  }

  static getPack(compendium) {
    return game.packs.get(SystemCompendiums.getCompendium(compendium));
  }

  static async getContent(compendium, docType) {
    const pack = SystemCompendiums.getPack(compendium);
    if (pack.metadata.type == docType) {
      return await pack.getDocuments();
    }
    return [];
  }

  static async getCompetences(actorType) {
    switch (actorType ?? 'personnage') {
      case 'personnage': return await SystemCompendiums.getWorldOrCompendiumItems('competence', 'competences');
      case 'creature': return await SystemCompendiums.getWorldOrCompendiumItems('competencecreature', 'competences-creatures');
      case 'entite': return await SystemCompendiums.getWorldOrCompendiumItems('competencecreature', 'competences-entites');
      case 'vehicule': return [];
    }
  }

  /* -------------------------------------------- */
  static async getWorldOrCompendiumItems(itemType, compendium) {
    let items = game.items.filter(it => it.type == itemType);
    if (compendium) {
      const ids = items.map(it => it.id);
      const names = items.map(it => it.name.toLowerCase());
      const compendiumItems = await SystemCompendiums.getItems(compendium);
      items = items.concat(compendiumItems
        .filter(it => it.type == itemType)
        .filter(it => !ids.includes(it.id))
        .filter(it => !names.includes(it.name.toLowerCase())));
    }
    return items;
  }

  static async getItems(compendium, itemType = undefined) {
    const items = await SystemCompendiums.getContent(compendium, 'Item');
    return (itemType ? items.filter(it => it.type == itemType) : items);
  }

  static async buildTable(compendium, itemFrequence, filter, type = 'Item', sorting = undefined) {
    let elements = await SystemCompendiums.getContent(compendium, type);
    elements = elements.filter(filter).filter(it => itemFrequence(it) > 0)
    if (sorting) {
      elements = elements.sort(sorting);
    }
    let max = 0;
    const table = elements
      .map(it => {
        const frequence = itemFrequence(it)
        let row = { document: it, frequence: frequence, min: max + 1, max: max + frequence }
        max += frequence;
        return row;
      });
    table.forEach(it => it.total = max);
    return table;
  }

  static async getRandom(compendium, type, subType, toChat = true, itemFrequence = it => it.system.frequence, filter = it => true) {
    const table = new SystemCompendiumTable(compendium, type, subType);
    return await table.getRandom(toChat, itemFrequence, filter);
  }
  static async chatTableItems(compendium, type, subType, itemFrequence = it => it.system.frequence, filter = it => true) {
    const table = new SystemCompendiumTable(compendium, type, subType, itemFrequence);
    await table.chatTable(itemFrequence, filter);
  }

  static async getDefaultItems(compendium) {
    const pack = game.packs.get(SystemCompendiums._getDefaultCompendium(compendium));
    if (pack.metadata.type == 'Item') {
      return await pack.getDocuments();
    }
    return [];
  }

  static getCompendium(compendium) {
    const setting = CONFIGURABLE_COMPENDIUMS[compendium]?.setting;
    return setting ? game.settings.get(SYSTEM_RDD, setting) : SystemCompendiums._getDefaultCompendium(compendium);
  }

  static _getSettingCompendium(compendium) {
    return COMPENDIUM_SETTING_PREFIX + compendium;
  }

  static _getDefaultCompendium(compendium) {
    return `${SYSTEM_RDD}.${compendium}`;
  }

  constructor(...args) {
    super(...args);
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      id: "system-compendiums",
      template: "systems/foundryvtt-reve-de-dragon/templates/settings/system-compendiums.html",
      height: 'fit-content',
      width: 600,
      minimizable: false,
      closeOnSubmit: true,
      title: "Compendiums système"
    });
    return options;
  }

  getData() {
    const systemCompendiums = Object.values(CONFIGURABLE_COMPENDIUMS)
      .map(it => mergeObject(it, { value: SystemCompendiums.getCompendium(it.compendium) }));
    const availableCompendiums = game.packs.map(pack => {
      return {
        name: pack.collection,
        path: pack.collection.replace('.', " / "),
        type: pack.metadata.type
      }
    });
    return mergeObject(super.getData(), {
      systemCompendiums: systemCompendiums,
      availableCompendiums: availableCompendiums
    });
  }

  activateListeners(html) {
    html.find("select.system-compendium-setting").change((event) => {
      const compendium = $(event.currentTarget).data('compendium')
      const value = $(event.currentTarget).val();
      const systemCompendium = CONFIGURABLE_COMPENDIUMS[compendium];

      game.settings.set(SYSTEM_RDD, systemCompendium.setting, value);
    });
  }
}

export class SystemCompendiumTable {

  constructor(compendium, type, subType, sorting = undefined) {
    this.compendium = compendium;
    this.type = type;
    this.subType = subType;
    this.compendium = compendium;
    this.sourceCompendium = SystemCompendiums.getCompendium(compendium);
    this.sorting = sorting
  }

  typeName() {
    return game.i18n.localize(`${this.type.toUpperCase()}.Type${Misc.upperFirst(this.subType)}`);
  }
  applyType(filter) {
    return it => it.type == this.subType && filter(it);
  }

  async getRandom(toChat = true, itemFrequence = it => it.system.frequence, filter = it => true, forcedRoll = undefined) {
    const table = await this.$buildTable(itemFrequence, filter);
    if (table.length == 0) {
      ui.notifications.warn(`Aucun ${this.typeName()} dans ${this.sourceCompendium}`);
      return undefined;
    }
    const row = await this.$selectRow(table, forcedRoll);
    if (row && toChat) {
      await this.$chatRolledResult(row);
    }
    return row;
  }

  async chatTable(itemFrequence = it => it.system.frequence, filter = it => true, typeName = undefined) {
    const table = await this.$buildTable(itemFrequence, filter);
    await this.$chatSystemCompendiumTable(table, typeName);
  }

  async $buildTable(itemFrequence, filter) {
    return await SystemCompendiums.buildTable(this.compendium, itemFrequence, this.applyType(filter), this.type, this.sorting);
  }

  /* -------------------------------------------- */
  async $selectRow(table, forcedRoll = undefined) {
    if (table.length == 0) {
      return undefined
    }
    const total = table[0].total;
    const formula = `1d${total}`;
    if (forcedRoll == undefined && (forcedRoll > total || forcedRoll <= 0)) {
      ui.notifications.warn(`Jet de rencontre ${forcedRoll} en dehors de la table [1..${total}], le jet est relancé`);
      forcedRoll = undefined;
    }
    const roll = forcedRoll ? { total: forcedRoll, formula } : await RdDDice.roll(formula, { showDice: HIDE_DICE });
    const row = table.find(it => it.min <= roll.total && roll.total <= it.max);
    row.roll = roll;
    return row;
  }

  /* -------------------------------------------- */
  async $chatRolledResult(row) {
    const percentages = (row.total == 100) ? '%' : ''
    const flavorContent = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/chat-compendium-table-roll.html', {
      roll: row.roll,
      document: row?.document,
      percentages,
      typeName: this.typeName(),
      sourceCompendium: this.sourceCompendium,
      isGM: game.user.isGM,
    });
    const messageData = {
      // flavor: flavorContent,
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: row.roll,
      sound: CONFIG.sounds.dice,
      content: flavorContent
    };
    ChatMessage.create(messageData, { rollMode: "gmroll" });
  }

  /* -------------------------------------------- */
  async $chatSystemCompendiumTable(table, typeName) {
    const flavorContent = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/chat-compendium-table.html', {
      img: RdDItem.getDefaultImg(this.subType),
      typeName: typeName ?? this.typeName(),
      sourceCompendium: this.sourceCompendium,
      table,
      isGM: game.user.isGM,
    });
    ChatMessage.create({
      user: game.user.id,
      whisper: game.user.id,
      content: flavorContent
    }, { rollMode: "gmroll" });
  }


}
