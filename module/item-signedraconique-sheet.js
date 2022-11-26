import { SYSTEM_RDD } from "./constants.js";
import { RdDItemSigneDraconique } from "./item-signedraconique.js";
import { TMRUtility } from "./tmr-utility.js";

/**
 * Item sheet pour signes draconiques
 * @extends {ItemSheet}
 */
export class RdDSigneDraconiqueItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [SYSTEM_RDD, "sheet", "item"],
      template: "systems/foundryvtt-ctm/templates/item-signedraconique-sheet.html",
      width: 550,
      height: 550
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
    this.tmrs = TMRUtility.buildSelectionTypesTMR(this.item.system.typesTMR);
    mergeObject(formData, {
      tmrs: this.tmrs,
      title: formData.name,
      isGM: game.user.isGM,
      owner: this.actor?.isOwner,
      isOwned: this.actor ? true : false,
      actorId: this.actor?.id,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
    });
    return formData;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    html.find(".signe-aleatoire").click(event => this.setSigneAleatoire());
    html.find("input.select-tmr").change((event) => this.onSelectTmr(event));
    html.find(".signe-xp-sort").change((event) => this.onValeurXpSort(event.currentTarget.attributes['data-typereussite']?.value, Number(event.currentTarget.value)));
  }

  async setSigneAleatoire() {
    const newSigne = await RdDItemSigneDraconique.randomSigneDraconique();
    this.item.update(newSigne);
  }

  async onSelectTmr(event) {
    const tmrName = $(event.currentTarget)?.data("tmr-name");
    const onTmr = this.tmrs.find(it => it.name == tmrName);
    if (onTmr){
      onTmr.selected = event.currentTarget.checked;
    }

    this.item.update({ 'system.typesTMR': TMRUtility.buildListTypesTMRSelection(this.tmrs) });
  }

  async onValeurXpSort(event) {
    const codeReussite = event.currentTarget.attributes['data-typereussite']?.value ?? 0;
    const xp = Number(event.currentTarget.value);
    const oldValeur = this.item.system.valeur;
    const newValeur = RdDItemSigneDraconique.calculValeursXpSort(codeReussite, xp, oldValeur);
    await this.item.update({ 'system.valeur': newValeur });
  }

  /* -------------------------------------------- */
  get template() {
    return `systems/foundryvtt-ctm/templates/item-signedraconique-sheet.html`;
  }

  get title() {
    return `Signe draconique: ${this.object.name}`;
  }
}
