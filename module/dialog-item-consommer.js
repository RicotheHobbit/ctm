import { Misc } from "./misc.js";

export class DialogConsommer extends Dialog {

  static async create(actor, item, onActionItem = async ()=>{}) {
    const consommerData = DialogConsommer.prepareData(actor, item);
    const html = await renderTemplate('systems/foundryvtt-ctm/templates/dialog-item-consommer.html', consommerData);
    return new DialogConsommer(actor, item, consommerData, html, onActionItem)
  }

  constructor(actor, item, consommerData, html, onActionItem = async ()=>{}) {
    const options = { classes: ["dialogconsommer"], width: 350, height: 'fit-content', 'z-index': 99999 };
    let conf = {
      title: consommerData.title,
      content: html,
      default: consommerData.buttonName,
      buttons: {
        [consommerData.buttonName]: {
          label: consommerData.buttonName, callback: async it => {
            await this.onConsommer(it);
            await onActionItem();}
        }
      }
    };

    super(conf, options);

    this.actor = actor;
    this.item = item;
    this.consommerData = consommerData;
  }

  async onConsommer(event) {
    await $(".se-forcer").change();
    await $(".consommer-doses").change();
    await this.actor.consommer(this.item, this.consommerData.choix);
  }

  /* -------------------------------------------- */
  static prepareData(actor, item) {
    item = duplicate(item);
    let consommerData = {
      item: item,
      cuisine: actor.getCompetence('cuisine'),
      choix: {
        doses: 1,
        seForcer: false,
      }
    }
    switch (item.type) {
      case 'nourritureboisson':
        consommerData.title = item.system.boisson ? `${item.name}: boire une dose` : `${item.name}: manger une portion`;
        consommerData.buttonName = item.system.boisson ? "Boire" : "Manger";
        break;
      case 'potion':
        consommerData.title = `${item.name}: boire la potion`;
        consommerData.buttonName = "Boire";
        break;
    }
    DialogConsommer.calculDoses(consommerData, consommerData.choix.doses)
    return consommerData;
  }

  static calculDoses(consommer) {
    const doses = consommer.choix.doses;
    consommer.totalSust = Misc.keepDecimals(doses * (consommer.item.system.sust ?? 0), 2);
    consommer.totalDesaltere = consommer.item.system.boisson
      ? Misc.keepDecimals(doses * (consommer.item.system.desaltere ?? 0), 2)
      : 0;
  }


  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".se-forcer").change(event => this.setSeForcer(event));
    html.find(".consommer-doses").change(event => this.selectDoses(event));
  }


  setSeForcer(event) {
    this.consommerData.choix.seForcer = event.currentTarget.checked;
  }

  selectDoses(event) {
    this.consommerData.choix.doses = Number(event.currentTarget.value);
    DialogConsommer.calculDoses(this.consommerData);
    $(".total-sust").text(this.consommerData.totalSust);
    $(".total-desaltere").text(this.consommerData.totalDesaltere);
  }
}