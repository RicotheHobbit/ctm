import { RdDDice } from "./rdd-dice.js";
import { SystemCompendiums } from "./settings/system-compendiums.js";

export class Poetique {
  static async getExtrait() {
    const items = await SystemCompendiums.getItems('extrait-poetique', 'extraitpoetique')
    const selected = await RdDDice.rollOneOf(items);
    return {
      reference: selected?.name,
      extrait: selected?.system.extrait
    }
  }
}
