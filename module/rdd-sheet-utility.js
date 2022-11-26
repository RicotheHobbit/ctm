import { DialogSplitItem } from "./dialog-split-item.js";

export class RdDSheetUtility {

  static getItem(event, actor) {
    return actor.items.get(RdDSheetUtility.getItemId(event))
  }

  static getItemId(event) {
    return RdDSheetUtility.getEventItemData(event, "item-id");
  }

  static getEventItemData(event, property) {
    const node = RdDSheetUtility.getEventElement(event);
    return node?.data(property);
  }

  static getEventElement(event) {
    return $(event.currentTarget)?.parents(".item");
  }

  static prepareItemDropParameters(destItemId, actorId, dragData, objetVersConteneur) {
    const item = fromUuidSync(dragData.uuid)
    return {
      destId: destItemId,
      targetActorId: actorId,
      itemId: item.id,
      sourceActorId: item.actor?.id,
      srcId: objetVersConteneur[item.id],
      onEnleverConteneur: () => { delete objetVersConteneur[item.id]; },
      onAjouterDansConteneur: (itemId, conteneurId) => { objetVersConteneur[itemId] = conteneurId; }
    }
  }

  static async splitItem(item, actor, onSplit = () => { }) {
    const dialog = await DialogSplitItem.create(item, async (item, split) => {
      await RdDSheetUtility._onSplitItem(item, split, actor);
      onSplit();
    });
    dialog.render(true);
  }

  static async _onSplitItem(item, split, actor) {
    if (split >= 1 && split < item.system.quantite) {
      await item.diminuerQuantite(split);
      const splitItem = duplicate(item);
      // todo: ajouter dans le même conteneur?
      splitItem.system.quantite = split;
      await actor.createEmbeddedDocuments('Item', [splitItem])
    }
  }
}