import { Misc } from "./misc.js";

export class RdDHotbar {

  static async addToHotbar(item, slot) {
    let command = `game.system.rdd.RdDHotbar.rollMacro("${item.name}", "${item.type}");`;
    let macro = game.macros.contents.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
      macro = await Macro.create({
        name: item.name,
        type: "script",
        img: item.img,
        command: command
      }, { displaySheet: false })
    }
    await game.user.assignHotbarMacro(macro, slot);
  }

  /**
   * Create a macro when dropping an entity on the hotbar
   * Item      - open roll dialog for item
   * Actor     - open actor sheet
   * Journal   - open journal sheet
   */
  static initDropbar() {

    Hooks.on("hotbarDrop", (bar, documentData, slot) => {

      // Create item macro if rollable item - weapon, spell, prayer, trait, or skill
      if (documentData.type == "Item") {
        let item = fromUuidSync(documentData.uuid)
        if (item == undefined) {
          item = this.actor.items.get(documentData.uuid)
        }
        console.log("DROP", documentData, item)
        if (!item || (item.type != "arme" && item.type != "competence")) {
          return true
        }
        this.addToHotbar(item, slot)
        return false
      }

      return true
    })
  }

  /** Roll macro */
  static rollMacro(itemName, itemType, bypassData) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);

    let item = actor?.items.find(it => it.name === itemName && it.type == itemType) ?? undefined;
    if (!item) {
      return ui.notifications.warn(`Impossible de trouver l'objet de cette macro`);
    }

    // Trigger the item roll
    switch (item.type) {
      case "arme":
        return actor.rollArme(item);
      case "competence":
        return actor.rollCompetence(itemName);
    }
  }

}
