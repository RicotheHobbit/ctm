import { Misc } from "./misc.js";

export class DialogSplitItem extends Dialog {

  static async create(item, callback) {
    const splitData = {
      item: item,
      choix: { quantite: 1, max: item.system.quantite - 1 }
    };
    const html = await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/dialog-item-split.html`, splitData);
    return new DialogSplitItem(item, splitData, html, callback)
  }

  constructor(item, splitData, html, callback) {
    let options = { classes: ["dialogsplit"], width: 300, height: 160, 'z-index': 99999 };

    let conf = {
      title: "Séparer en deux",
      content: html,
      default: "separer",
      buttons: {
        "separer": {
          label: "Séparer", callback: it => {
            this.onSplit();
          }
        }
      }
    };
    
    super(conf, options);
    
    this.callback = callback;
    this.item = item;
    this.splitData = splitData;
  }

  async onSplit(){
    await $(".choix-quantite").change();
    this.callback(this.item, this.splitData.choix.quantite);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".choix-quantite").change(event => {
      this.splitData.choix.quantite = Number(event.currentTarget.value);
    });
  }

}