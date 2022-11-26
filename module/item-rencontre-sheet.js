import { RdDRencontre } from "./item-rencontre.js";

/**
 * Item sheet pour configurer les rencontres
 * @extends {ItemSheet}
 */
export class RdDRencontreItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rdd", "sheet", "item"],
      template: "systems/ctm/templates/item-rencontre-sheet.html",
      width: 500,
      height: 500,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "carac" }]
    });
  }

  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons.unshift({ class: "post", icon: "fas fa-comment", onclick: ev => this.item.postItem() });
    return buttons;
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetHeader = this.element.find(".sheet-header");
    const sheetBody = this.element.find(".sheet-body");
    sheetBody.css("height", position.height - sheetHeader[0].clientHeight)
    return position;
  }


  /* -------------------------------------------- */
  async getData() {
    const formData = duplicate(this.item);
    mergeObject(formData, {
      title: formData.name,
      isGM: game.user.isGM,
      owner: this.actor?.isOwner,
      isOwned: this.actor ? true : false,
      actorId: this.actor?.id,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      effets: {
        succes: {
          liste: RdDRencontre.getEffetsSucces(),
          select: RdDRencontre.mapEffets(this.item.system.succes.effets)
        },
        echec: {
          liste: RdDRencontre.getEffetsEchec(),
          select: RdDRencontre.mapEffets(this.item.system.echec.effets)
        }
      }
    });
    return formData;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;
    html.find("a.effet-add").click(event => this.onAddEffet(event));
    html.find("a.effet-delete").click(event => this.onDeleteEffet(event));
  }

  async onAddEffet(event) {
    const resultat = $(event.currentTarget)?.data("effet-resultat");
    const keyEffets = `system.${resultat}.effets`;

    const code = $(event.currentTarget)?.data("effet-code");
    const liste = RdDRencontre.getListeEffets(this.item, resultat);
    liste.push(code);

    await this._updateEffetsRencontre(keyEffets, liste);
  }

  async onDeleteEffet(event) {
    const resultat = $(event.currentTarget)?.data("effet-resultat");
    const keyEffets = `system.${resultat}.effets`;
    
    const pos = $(event.currentTarget)?.data("effet-pos");
    const liste = RdDRencontre.getListeEffets(this.item, resultat);
    liste.splice(pos, 1);
    
    await this._updateEffetsRencontre(keyEffets, liste);
  }
  
  async _updateEffetsRencontre(key, liste) {
    const updates = {};
    updates[key] = liste;
    this.item.update(updates);
  }

  get template() {
  /* -------------------------------------------- */
    return `systems/ctm/templates/item-rencontre-sheet.html`;
  }

  get title() {
    return `Rencontre: ${this.object.name}`;
  }
}
