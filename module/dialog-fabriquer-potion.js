import { Grammar } from "./grammar.js";
import { Misc } from "./misc.js";
import { RdDUtility } from "./rdd-utility.js";

export class DialogFabriquerPotion extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, item, dialogConfig) {
    const min = DialogFabriquerPotion.nombreBrinsMinimum(item);
    if (item.system.quantite < min) {
      ui.notifications.warn(`Vous avez ${item.system.quantite} brins de ${item.name}, il en faut au moins ${min} pour faire une potion!`);
      return;
    }
    let potionData = DialogFabriquerPotion.prepareData(actor, item);

    let conf = {
      title: `Fabriquer une potion de ${potionData.system.categorie}`,
      content: await renderTemplate(dialogConfig.html, potionData),
      default: potionData.buttonName,
    };

    let options = { classes: ["dialogfabriquerpotion"], width: 600, height: 160, 'z-index': 99999 };
    mergeObject(options, dialogConfig.options ?? {}, { overwrite: true })

    const dialog = new DialogFabriquerPotion(actor, potionData, conf, options);
    dialog.render(true);
    return dialog;
  }

  /* -------------------------------------------- */
  static prepareData(actor, item) {
    let potionData = duplicate(item)
    potionData.nbBrinsSelect = RdDUtility.buildListOptions(
      DialogFabriquerPotion.nombreBrinsMinimum(item),
      DialogFabriquerPotion.nombreBrinsOptimal(item));
    potionData.nbBrins = Math.min(potionData.system.quantite, DialogFabriquerPotion.nombreBrinsOptimal(potionData));
    potionData.herbebonus = item.system.niveau;
    potionData.buttonName = "Fabriquer";
    return potionData;
  }

  /* -------------------------------------------- */
  constructor(actor, potionData, conf, options) {
    conf.buttons = {
      [potionData.buttonName]: {
        label: potionData.buttonName, callback: it => this.onFabriquer(it)
      }
    };

    super(conf, options);

    this.actor = actor;
    this.potionData = potionData;
  }

  static nombreBrinsMinimum(herbeData) {
    switch (herbeData.system.categorie ?? '') {
      case "Soin": return 1 + Math.max(0, 12 - 2 * herbeData.system.niveau);
      case "Repos": return 1 + Math.max(0, 7 - 2 * herbeData.system.niveau);
    }
    return 1;
  }

  static nombreBrinsOptimal(herbeData) {
    switch (herbeData.system.categorie ?? '') {
      case "Soin": return 12 - herbeData.system.niveau;
      case "Repos": return 7 - herbeData.system.niveau;
    }
    return 1;
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    html.find("#nbBrins").change(event => {
      this.potionData.nbBrins = Misc.toInt(event.currentTarget.value);
      const brinsManquants = Math.max(0, DialogFabriquerPotion.nombreBrinsOptimal(this.potionData) - this.potionData.nbBrins);
      this.potionData.herbebonus = Math.max(0, this.potionData.system.niveau - brinsManquants)
    });
  }

  /* -------------------------------------------- */
  async onFabriquer(it) {
    await $("#nbBrins").change();
    this.actor.fabriquerPotion(this.potionData);
    this.close();
  }
}