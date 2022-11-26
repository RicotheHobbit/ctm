import { RdDItemSort } from "./item-sort.js";
import { RdDUtility } from "./rdd-utility.js";
import { RdDAlchimie } from "./rdd-alchimie.js";
import { RdDItemCompetence } from "./item-competence.js";
import { RdDHerbes } from "./rdd-herbes.js";
import { RdDGemme } from "./rdd-gemme.js";
import { HtmlUtility } from "./html-utility.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { SYSTEM_RDD } from "./constants.js";
import { RdDSheetUtility } from "./rdd-sheet-utility.js";
import { SystemCompendiums } from "./settings/system-compendiums.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class RdDItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [SYSTEM_RDD, "sheet", "item"],
      template: "systems/foundryvtt-reve-de-dragon/templates/item-sheet.html",
      width: 550,
      height: 550
    });
  }


  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    // Add "Post to chat" button
    // We previously restricted this to GM and editable items only. If you ever find this comment because it broke something: eh, sorry!
    if ("cout" in this.item.system && this.item.isVideOuNonConteneur()) {
      buttons.unshift({
        class: "vendre",
        icon: "fas fa-comments-dollar",
        onclick: ev => this.item.proposerVente()
      });
    }
    buttons.unshift({
      class: "montrer",
      icon: "fas fa-comment",
      onclick: ev => this.item.postItem()
    });
    return buttons
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetHeader = this.element.find(".sheet-header");
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - sheetHeader[0].clientHeight;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */
  async getData() {
    let formData = {
      id: this.item.id,
      title: this.item.name,
      type: this.item.type,
      img: this.item.img,
      name: this.item.name,
      system: this.item.system,
      isGM: game.user.isGM,
      actorId: this.actor?.id,
      owner: this.item.isOwner,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      isSoins: false,
      description:  await TextEditor.enrichHTML(this.object.system.description, {async: true}),
      descriptionmj:  await TextEditor.enrichHTML(this.object.system.descriptionmj, {async: true})

    }
    if (this.actor) {
      formData.isOwned = true;
      if (this.item.type == 'conteneur') {
        this.prepareConteneurData(formData);
      }
    }

    const competences = await SystemCompendiums.getCompetences(this.actor?.type);
    formData.categorieCompetences = RdDItemCompetence.getCategorieCompetences()
    if (this.item.type == 'tache' || this.item.type == 'livre' || this.item.type == 'meditation' || this.item.type == 'oeuvre') {
      formData.caracList = duplicate(game.system.model.Actor.personnage.carac)
      formData.caracList["reve-actuel"] = duplicate(game.system.model.Actor.personnage.reve.reve)
      formData.competences = competences;
    }
    if (this.item.type == 'arme') {
      formData.competences = competences.filter(it => RdDItemCompetence.isCompetenceArme(it));
    }
    if (['sort', 'sortreserve'].includes(this.item.type)) {
      formData.competences = competences.filter(it => RdDItemCompetence.isDraconic(it));
    }
    if (this.item.type == 'recettecuisine') {
      formData.ingredients = await TextEditor.enrichHTML(this.object.system.ingredients, {async: true})
    }
    if (this.item.type == 'extraitpoetique') {
      formData.extrait = await TextEditor.enrichHTML(this.object.system.extrait, {async: true})
      formData.texte = await TextEditor.enrichHTML(this.object.system.texte, {async: true})
    }
    if (this.item.type == 'recettealchimique') {
      RdDAlchimie.processManipulation(this.item, this.actor && this.actor.id);
      formData.manipulation_update = await TextEditor.enrichHTML(this.object.system.manipulation_update, {async: true})
      formData.utilisation = await TextEditor.enrichHTML(this.object.system.utilisation, {async: true})
      formData.enchantement = await TextEditor.enrichHTML(this.object.system.enchantement, {async: true})
      formData.sureffet = await TextEditor.enrichHTML(this.object.system.sureffet, {async: true})
    }
    if (this.item.type == 'gemme') {
      formData.gemmeTypeList = RdDGemme.getGemmeTypeOptionList();
      RdDGemme.calculDataDerivees(this.item);
    }
    if (this.item.type == 'potion') {
      if (this.dateUpdated) {
        formData.system.prdate = this.dateUpdated;
        this.dateUpdated = undefined;
      }
      await RdDHerbes.updatePotionData(formData);
    }
    if (formData.isOwned && this.item.type == 'herbe' && (formData.system.categorie == 'Soin' || formData.system.categorie == 'Repos')) {
      formData.isIngredientPotionBase = true;
    }
    if (this.item.type == 'sortreserve') {
      const sortId = this.item.system.sortid;
      formData.sort = formData.isOwned ? this.item.actor.items.get(sortId) : game.items.get(sortId);
    }
    formData.bonusCaseList = RdDItemSort.getBonusCaseList(formData, true);

    return formData;
  }

  /* -------------------------------------------- */
  prepareConteneurData(formData) {
    RdDUtility.filterEquipementParType(formData, this.actor.itemTypes);

    this.objetVersConteneur = RdDUtility.buildArbreDeConteneurs(formData.conteneurs, formData.objets);
    formData.subItems = formData.conteneurs.find(it => it._id == this.item.id)?.subItems;

  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (this.item.type == 'conteneur') {
      this.form.ondragstart = (event) => this._onDragStart(event);
      this.form.ondrop = (event) => this._onDrop(event);
    }

    let itemSheetDialog = this;

    HtmlUtility._showControlWhen($(".item-cout"), ReglesOptionelles.isUsing('afficher-prix-joueurs') || game.user.isGM || !this.item.isOwned);
    HtmlUtility._showControlWhen($(".item-magique"), this.item.isMagique());

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Select competence categorie
    html.find(".categorie").change(event => this._onSelectCategorie(event));

    html.find('.sheet-competence-xp').change((event) => {
      if (this.item.isCompetencePersonnage()) {
        RdDUtility.checkThanatosXP(this.item.name);
      }
    });

    html.find('.enchanteDate').change((event) => {
      let jour = Number($('#jourMois').val());
      let mois = $('#nomMois').val();
      this.dateUpdated = game.system.rdd.calendrier.getIndexFromDate(jour, mois);
    });

    html.find('.creer-tache-livre').click((event) => {
      let actorId = event.currentTarget.attributes['data-actor-id'].value;
      let actor = game.actors.get(actorId);
      actor.creerTacheDepuisLivre(this.item);
    });
    html.find('.consommer-potion').click((event) => {
      let actorId = event.currentTarget.attributes['data-actor-id'].value;
      let actor = game.actors.get(actorId);
      actor.consommerPotion(this.item);
    });
    html.find('.creer-potion-base').click((event) => {
      let actorId = event.currentTarget.attributes['data-actor-id'].value;
      let actor = game.actors.get(actorId);
      actor.dialogFabriquerPotion(this.item);
    });

    html.find('.alchimie-tache a').click((event) => {
      let actorId = event.currentTarget.attributes['data-actor-id'].value;
      let recetteId = event.currentTarget.attributes['data-recette-id'].value;
      let tacheName = event.currentTarget.attributes['data-alchimie-tache'].value;
      let tacheData = event.currentTarget.attributes['data-alchimie-data'].value;
      let actor = game.actors.get(actorId);
      if (actor) {
        actor.effectuerTacheAlchimie(recetteId, tacheName, tacheData);
      } else {
        ui.notifications.info("Impossible trouver un acteur pour réaliser cette tache Alchimique.");
      }
    });

    html.find('.item-split').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor);
      await RdDSheetUtility.splitItem(item, this.actor, async () => itemSheetDialog.render(true));
    });
    html.find('.item-edit').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor);
      item.sheet.render(true);
    });
    html.find('.item-delete').click(async event => {
      const li = RdDSheetUtility.getEventElement(event);
      const item = this.actor.getObjet(li.data("item-id"));
      RdDUtility.confirmerSuppressionItem(this, item, li);
    });
    html.find('.item-vendre').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor);
      item?.proposerVente();
    });
    html.find('.item-montrer').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor);
      item?.postItem();
    });
    html.find('.item-action').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor);
      this.actor.actionItem(item, async () => itemSheetDialog.render(true));
    });
    html.find('.conteneur-name a').click(async event => {
      RdDUtility.toggleAfficheContenu(RdDSheetUtility.getItemId(event));
      this.render(true);
    });
  }

  /* -------------------------------------------- */
  async _onSelectCategorie(event) {
    event.preventDefault();

    if (this.item.isCompetence()) {
      let level = RdDItemCompetence.getNiveauBase(event.currentTarget.value);
      this.item.system.base = level;
      $("#base").val(level);
    }
  }

  /* -------------------------------------------- */
  get template() {
    let type = this.item.type
    return `systems/foundryvtt-reve-de-dragon/templates/item-${type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // Données de bonus de cases ?
    formData['system.bonuscase'] = RdDItemSort.buildBonusCaseStringFromFormData(formData.bonusValue, formData.caseValue);

    return this.item.update(formData);
  }

  async _onDragStart(event) {
    console.log("_onDragStart", event);
    if (event.target.classList.contains("entity-link")) return;

    const itemId = event.srcElement?.attributes["data-item-id"].value;
    const item = this.actor.items.get(itemId);
    // Create drag data
    const dragData = {
      actorId: this.actor.id,
      type: "Item",
      data: item.system
    };

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onDrop(event) {
    // Try to extract the dragData
    let dragData;
    try {
      dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }

    const allowed = Hooks.call("dropActorSheetData", this.actor, this, dragData);
    if (allowed === false) return;

    // Handle different dragData types
    switch (dragData.type) {
      case "Item":
        return this._onDropItem(event, dragData);
    }
    return super._onDrop(event);
  }

  /* -------------------------------------------- */
  async _onDropItem(event, dragData) {
    if (this.actor) {
      const dropParams = RdDSheetUtility.prepareItemDropParameters(this.item.id, this.actor.id, dragData, this.objetVersConteneur);
      await this.actor.processDropItem(dropParams);
      await this.render(true);
    }
  }


}
