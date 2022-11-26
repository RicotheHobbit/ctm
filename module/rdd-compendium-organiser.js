import { SYSTEM_RDD } from "./constants.js";

export class RddCompendiumOrganiser {
  static init() {
    Hooks.on('renderCompendium', async (pack, html, compendiumData) => RddCompendiumOrganiser.onRenderCompendium(pack, html, compendiumData))
  }

  static async onRenderCompendium(compendium, html, compendiumData) {
    console.log('onRenderCompendium', compendium, html, compendiumData);
    const pack = compendium.collection
    if (pack.metadata.system === SYSTEM_RDD) {
      html.find('.directory-item').each((i, element) => {
        RddCompendiumOrganiser.setEntityTypeName(pack, element);
      });
    }
  }

  static async setEntityTypeName(pack, element) {
    const label = RddCompendiumOrganiser.getEntityTypeLabel(await pack.getDocument(element.dataset.documentId));
    RddCompendiumOrganiser.insertEntityType(element, label);
  }

  static insertEntityType(element, label) {
    if (label) {
      element.children[1].insertAdjacentHTML('afterbegin', `<label class="type-compendium">${label}: </label>`);
    }
  }

  
  static getEntityTypeLabel(entity) {
    const documentName = entity?.documentName
    const type = entity?.type
    if (documentName === 'Actor' || documentName === 'Item') {
      const label = CONFIG[documentName]?.typeLabels?.[type] ?? type;
      if (game.i18n.has(label)) {
        return game.i18n.localize(label);
      }
    }
    return type;
  }

}