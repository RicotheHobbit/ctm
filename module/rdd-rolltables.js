import { Grammar } from "./grammar.js";
import { SystemCompendiums } from "./settings/system-compendiums.js";

export class RdDRollTables {

  /* -------------------------------------------- */
  static async genericGetTableResult(tableName, toChat) {
    let table = RdDRollTables.getWorldTable(tableName) ?? (await RdDRollTables.getSystemTable(tableName));
    const draw = await table.draw({ displayChat: toChat, rollMode: "gmroll" });
    return draw.results.length > 0 ? draw.results[0] : undefined;
  }

  static getWorldTable(tableName) {
    return game.tables.find(table => table.name.toLowerCase() == tableName.toLowerCase());
  }

  static async getSystemTable(tableName) {
    const pack = SystemCompendiums.getPack("tables-diverses");
    const index = await pack.getIndex();
    const entry = index.find(e => e.name === tableName);
    return await pack.getDocument(entry._id);
  }

  /* -------------------------------------------- */
  static async drawItemFromRollTable(tableName, toChat = false) {
    const drawResult = await RdDRollTables.genericGetTableResult(tableName, toChat);
    const pack = game.packs.get(drawResult.documentCollection)
    return await pack.getDocument(drawResult.documentId)
  }

  /* -------------------------------------------- */
  static async drawTextFromRollTable(tableName, toChat) {
    const drawResult = await RdDRollTables.genericGetTableResult(tableName, toChat);
    return drawResult.text;
  }

  /* -------------------------------------------- */
  static async getCompetence(toChat = false) {
    if (toChat == 'liste') {
      return await SystemCompendiums.chatTableItems('competences', 'Item', 'competence', it => 1);
    }
    else {
      return await RdDRollTables.drawItemFromRollTable("Détermination aléatoire de compétence", toChat);
    }
  }

  /* -------------------------------------------- */
  static async getSouffle(toChat = false) {
    return await RdDRollTables.listOrRoll('souffles-de-dragon', 'Item', 'souffle', toChat);
  }

  /* -------------------------------------------- */
  static async getQueue(toChat = false) {
    return await RdDRollTables.listOrRoll('queues-de-dragon', 'Item', 'queue', toChat);
  }

  static async getDesirLancinant(toChat = false) {
    return await RdDRollTables.listOrRoll('queues-de-dragon', 'Item', 'queue', toChat, it => it.system.frequence,
      it => it.system.categorie == 'lancinant' );
  }

  static async getIdeeFixe(toChat = false) {
    return await RdDRollTables.listOrRoll('queues-de-dragon', 'Item', 'queue', toChat, it => it.system.frequence,
      it => it.system.categorie == 'ideefixe' );
  }

  /* -------------------------------------------- */
  static async getTeteHR(toChat = false) {
    return await RdDRollTables.listOrRoll('tetes-de-dragon-pour-haut-revants', 'Item', 'tete', toChat);
  }

  /* -------------------------------------------- */
  static async getTete(toChat = false) {
    return await RdDRollTables.listOrRoll('tetes-de-dragon-pour-tous-personnages', 'Item', 'tete', toChat);
  }

  /* -------------------------------------------- */
  static async getOmbre(toChat = false) {
    return await RdDRollTables.listOrRoll('ombres-de-thanatos', 'Item', 'ombre', toChat);
  }

  /* -------------------------------------------- */
  static async getTarot(toChat = true) {
    return await RdDRollTables.listOrRoll('tarot-draconique', 'Item', 'tarot', toChat);
  }

  /* -------------------------------------------- */
  static async listOrRoll(compendium, type, subType, toChat, itemFrequence = it => it.system.frequence, filter = it => true) {
    if (toChat == 'liste') {
      return await SystemCompendiums.chatTableItems(compendium, type, subType, itemFrequence, filter);
    }
    return await SystemCompendiums.getRandom(compendium, type, subType, toChat, itemFrequence, filter);
  }

  /* -------------------------------------------- */
  static async getMaladresse(options = { toChat: false, arme: false }) {
    return await RdDRollTables.drawTextFromRollTable(
      options.arme ? "Maladresse armé" : "Maladresses non armé",
      options.toChat);
  }

}
