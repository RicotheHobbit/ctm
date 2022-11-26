import { RdDUtility } from "./rdd-utility.js";
import { HtmlUtility } from "./html-utility.js";
import { RdDItemArme } from "./item-arme.js";
import { RdDItemCompetence } from "./item-competence.js";
import { RdDBonus } from "./rdd-bonus.js";
import { Misc } from "./misc.js";
import { RdDCombatManager } from "./rdd-combat.js";
import { RdDCarac } from "./rdd-carac.js";
import { DialogSplitItem } from "./dialog-split-item.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { DialogRepos } from "./dialog-repos.js";
import { RdDSheetUtility } from "./rdd-sheet-utility.js";
import { STATUSES } from "./settings/status-effects.js";

/* -------------------------------------------- */
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class RdDActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    RdDUtility.initAfficheContenu();
    return mergeObject(super.defaultOptions, {
      classes: ["rdd", "sheet", "actor"],
      template: "systems/foundryvtt-reve-de-dragon/templates/actor-sheet.html",
      width: 640,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "carac" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: undefined }],
      showCompNiveauBase: false,
      vueDetaillee: false
    });
  }

  /* -------------------------------------------- */
  async getData() {
    this.timerRecherche = undefined;

    let formData = {
      title: this.title,
      id: this.actor.id,
      type: this.actor.type,
      img: this.actor.img,
      name: this.actor.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: foundry.utils.deepClone(this.actor.system),
      effects: this.actor.effects.map(e => foundry.utils.deepClone(e)),
      limited: this.actor.limited,
      options: this.options,
      owner: this.actor.isOwner,
      description: await TextEditor.enrichHTML(this.object.system.description, {async: true}),
      biographie: await TextEditor.enrichHTML(this.object.system.biographie, {async: true}),
      notes: await TextEditor.enrichHTML(this.object.system.notes, {async: true}),
      notesmj: await TextEditor.enrichHTML(this.object.system.notesmj, {async: true}),
      calc: {
        encTotal: await this.actor.computeEncombrementTotalEtMalusArmure(),
        prixTotalEquipement: this.actor.computePrixTotalEquipement(),
        surprise: RdDBonus.find(this.actor.getSurprise(false)).descr,
        resumeBlessures: this.actor.computeResumeBlessure(this.actor.system.blessures),
        caracTotal: RdDCarac.computeTotal(this.actor.system.carac, this.actor.system.beaute),
        surEncombrementMessage: this.actor.getMessageSurEncombrement(),
      },
    }
    formData.options.isGM =  game.user.isGM;

    RdDUtility.filterItemsPerTypeForSheet(formData, this.actor.itemTypes);
    this.objetVersConteneur = RdDUtility.buildArbreDeConteneurs(formData.conteneurs, formData.objets);
    formData.conteneurs = RdDUtility.conteneursRacine(formData.conteneurs);

    if (formData.type == 'personnage') {
      formData.byCateg = Misc.classify(formData.competences, it => it.system.categorie)
      formData.calc.comptageArchetype =  RdDItemCompetence.computeResumeArchetype(formData.competences);
      formData.calc.competenceXPTotal= RdDItemCompetence.computeTotalXP(formData.competences);
      formData.calc.fatigue= RdDUtility.calculFatigueHtml(formData.system.sante.fatigue.value, formData.system.sante.endurance.max);

      formData.competences.forEach(item => {
        item.system.isVisible = this.options.recherche
        ? RdDItemCompetence.nomContientTexte(item, this.options.recherche.text)
        : (!this.options.showCompNiveauBase || !RdDItemCompetence.isNiveauBase(item));
        RdDItemCompetence.levelUp(item, formData.system.compteurs.experience.value);
      });

      Object.values(formData.system.carac).forEach(c => {
        RdDCarac.levelUp(c);
      });

      // toujours avoir une liste d'armes (pour mettre esquive et corps à corps)
      formData.combat = duplicate(formData.armes ?? []);
      RdDItemArme.computeNiveauArmes(formData.combat, formData.competences);
      RdDItemArme.ajoutCorpsACorps(formData.combat, formData.competences, formData.system.carac);
      formData.esquives = this.actor.getCompetences("Esquive");
      formData.combat = RdDCombatManager.listActionsArmes(formData.combat, formData.competences, formData.system.carac);

      this.armesList = formData.combat;

      // Common data
      formData.ajustementsConditions = CONFIG.RDD.ajustementsConditions;
      formData.difficultesLibres = CONFIG.RDD.difficultesLibres;

      formData.hautreve = {
        isDemiReve: this.actor.getEffect(STATUSES.StatusDemiReve),
        cacheTMR: this.actor.isTMRCache()
      }

      formData.subacteurs = {
        vehicules: this.actor.listeVehicules(),
        montures: this.actor.listeMontures(),
        suivants: this.actor.listeSuivants()
      }
      if (this.actor.getBestDraconic().system.niveau > -11 && !this.actor.isHautRevant()) {
        ui.notifications.error(`${this.actor.name} a des compétences draconiques, mais pas le don de Haut-Rêve!
          <br>Ajoutez-lui la tête "Don de Haut-Rêve" pour lui permettre d'utiliser ses compétences et d'accéder aux terres médianes du rêve`);
      }
    }
    return formData;
  }

  isCompetenceAffichable(competence) {
    return !this.options.showCompNiveauBase || !RdDItemCompetence.isNiveauBase(competence);
  }

  /* -------------------------------------------- */
  async _onDropActor(event, dragData) {
    const dropActor = fromUuidSync(dragData.uuid);
    this.actor.addSubActeur(dropActor);
    super._onDropActor(event, dragData);
  }

  /* -------------------------------------------- */
  async _onDropItem(event, dragData) {
    const destItemId = $(event.target)?.closest('.item').attr('data-item-id')
    const dropParams = RdDSheetUtility.prepareItemDropParameters(destItemId, this.actor.id, dragData, this.objetVersConteneur)
    const callSuper = await this.actor.processDropItem(dropParams)
    if (callSuper) {
      await super._onDropItem(event, dragData)
    }
  }

  /* -------------------------------------------- */
  async createItem(name, type) {
    await this.actor.createEmbeddedDocuments('Item', [{ name: name, type: type }], { renderSheet: true });
  }

  /* -------------------------------------------- */
  async createEmptyTache() {
    await this.createItem('Nouvelle tache', 'tache');
  }

  /* -------------------------------------------- */  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    HtmlUtility._showControlWhen($(".appliquerFatigue"), ReglesOptionelles.isUsing("appliquer-fatigue"));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.item-split').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor);
      RdDSheetUtility.splitItem(item, this.actor);
    });
    html.find('.item-edit').click(async event => {
      const item = RdDSheetUtility.getItem(event, this.actor)
      item.sheet.render(true)
    })
    html.find('.display-label a').click(async event => {
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
      const item = RdDSheetUtility.getItem(event, this.actor)
      this.actor.actionItem(item);
    });
    html.find('.subacteur-delete').click(async event => {
      const li = RdDSheetUtility.getEventElement(event);
      const actorId = li.data("actor-id");
      if (actorId) {
        const subActor = game.actors.get(actorId);
        RdDUtility.confirmerSuppressionSubacteur(this, subActor, li);
      }
    });
    html.find('.experiencelog-delete').click(async event => {
      const li = $(event.currentTarget)?.parents(".experiencelog");
      const key = Number(li.data("key") ?? -1);
      await this.actor.deleteExperienceLog(key, 1);
    });
    html.find('.experiencelog-delete-previous').click(async event => {
      const li = $(event.currentTarget)?.parents(".experiencelog");
      const key = Number(li.data("key") ?? -1);
      await this.actor.deleteExperienceLog(0, key + 1);
    });
    html.find('.encaisser-direct').click(async event => {
      this.actor.encaisser();
    })
    html.find('.sheet-possession-attack').click(async event => {
      const poss = RdDSheetUtility.getItem(event, this.actor)
      this.actor.conjurerPossession(poss)
    })
    html.find('.remise-a-neuf').click(async event => {
      if (game.user.isGM) {
        this.actor.remiseANeuf();
      }
    });
    html.find('.creer-tache').click(async event => {
      this.createEmptyTache();
    });
    html.find('.creer-un-objet').click(async event => {
      RdDUtility.selectObjetType(this);
    });
    html.find('.creer-une-oeuvre').click(async event => {
      RdDUtility.selectTypeOeuvre(this);
    });
    html.find('.nettoyer-conteneurs').click(async event => {
      this.actor.nettoyerConteneurs();
    });

    // Blessure control
    html.find('.blessure-control').click(async event => {
      const tr = $(event.currentTarget).parents(".item");
      let btype = tr.data("blessure-type");
      let index = tr.data('blessure-index');
      let active = $(event.currentTarget).data('blessure-active');
      //console.log(btype, index, active);
      await this.actor.manageBlessureFromSheet(btype, index, active);
    });

    // Blessure data
    html.find('.blessure-soins').change(async event => {
      const tr = $(event.currentTarget).parents(".item");
      let btype = tr.data('blessure-type');
      let index = tr.data('blessure-index');
      let psoins = tr.find('.blessure-premiers_soins').val();
      let pcomplets = tr.find('.blessure-soins_complets').val();
      let jours = tr.find('.blessure-jours').val();
      let loc = tr.find('.blessure-localisation').val();
      let psdone = tr.find('.blessure-psdone:checked').val();
      let scdone = tr.find('.blessure-scdone:checked').val();
      console.log(btype, index, psoins, pcomplets, jours, loc, psdone, scdone);
      await this.actor.setDataBlessureFromSheet(btype, index, psoins, pcomplets, jours, loc, psdone, scdone);
    });

    // Equip Inventory Item
    html.find('.item-equip').click(async event => {
      this.actor.equiperObjet(RdDSheetUtility.getItemId(event));
    });

    // Roll Carac
    html.find('.carac-label a').click(async event => {
      let caracName = event.currentTarget.attributes.name.value;
      this.actor.rollCarac(caracName.toLowerCase());
    });

    html.find('.chance-actuelle').click(async event => {
      this.actor.rollCarac('chance-actuelle');
    });

    html.find('.chance-appel').click(async event => {
      this.actor.rollAppelChance();
    });

    html.find('#jet-astrologie').click(async event => {
      this.actor.astrologieNombresAstraux();
    });

    // Roll Skill
    html.find('a.competence-label').click(async event => {
      this.actor.rollCompetence(RdDSheetUtility.getItemId(event));
    });
    html.find('.tache-label a').click(async event => {
      this.actor.rollTache(RdDSheetUtility.getItemId(event));
    });
    html.find('.meditation-label a').click(async event => {
      this.actor.rollMeditation(RdDSheetUtility.getItemId(event));
    });
    html.find('.chant-label a').click(async event => {
      this.actor.rollChant(RdDSheetUtility.getItemId(event));
    });
    html.find('.danse-label a').click(async event => {
      this.actor.rollDanse(RdDSheetUtility.getItemId(event));
    });
    html.find('.musique-label a').click(async event => {
      this.actor.rollMusique(RdDSheetUtility.getItemId(event));
    });
    html.find('.oeuvre-label a').click(async event => {
      this.actor.rollOeuvre(RdDSheetUtility.getItemId(event));
    });
    html.find('.jeu-label a').click(async event => {
      this.actor.rollJeu(RdDSheetUtility.getItemId(event));
    });
    html.find('.recettecuisine-label a').click(async event => {
      this.actor.rollRecetteCuisine(RdDSheetUtility.getItemId(event));
    });
    html.find('.subacteur-label a').click(async event => {
      let actorId = RdDSheetUtility.getEventItemData(event, 'actor-id');
      let actor = game.actors.get(actorId);
      if (actor) {
        actor.sheet.render(true);
      }
    });

    // Boutons spéciaux MJs
    html.find('.forcer-tmr-aleatoire').click(async event => {
      this.actor.reinsertionAleatoire("Action MJ");
    });
    html.find('.afficher-tmr').click(async event => {
      this.actor.changeTMRVisible();
    });

    // Points de reve actuel
    html.find('.ptreve-actuel a').click(async event => {
      this.actor.rollCarac('reve-actuel');
    });

    // Roll Weapon1
    html.find('.arme-label a').click(async event => {
      let arme = this._getEventArmeCombat(event);
      this.actor.rollArme(duplicate(arme));
    });
    // Initiative pour l'arme
    html.find('.arme-initiative a').click(async event => {
      let combatant = game.combat.combatants.find(c => c.actor.id == this.actor.id);
      if (combatant) {
        let action = this._getEventArmeCombat(event);
        RdDCombatManager.rollInitiativeAction(combatant._id, action);
      } else {
        ui.notifications.info("Impossible de lancer l'initiative sans être dans un combat.");
      }
    });
    // Display TMR, visualisation
    html.find('.visu-tmr').click(async event => {
      this.actor.displayTMR("visu");
    });

    // Display TMR, normal
    html.find('.monte-tmr').click(async event => {
      this.actor.displayTMR("normal");
    });

    // Display TMR, fast 
    html.find('.monte-tmr-rapide').click(async event => {
      this.actor.displayTMR("rapide");
    });

    html.find('.repos').click(async event => {
      await DialogRepos.create(this.actor);
    });
    html.find('.delete-active-effect').click(async event => {
      if (game.user.isGM) {
        let effect = $(event.currentTarget).parents(".active-effect").data('effect');
        this.actor.removeEffect(effect);
      }
    });
    html.find('.enlever-tous-effets').click(async event => {
      if (game.user.isGM) {
        await this.actor.removeEffects();
      }
    });
    html.find('.conteneur-name a').click(async event => {
      RdDUtility.toggleAfficheContenu(RdDSheetUtility.getItemId(event));
      this.render(true);
    });
    html.find('.carac-xp-augmenter').click(async event => {
      let caracName = event.currentTarget.name.replace("augmenter.", "");
      this.actor.updateCaracXPAuto(caracName);
    });
    html.find('.competence-xp-augmenter').click(async event => {
      this.actor.updateCompetenceXPAuto(RdDSheetUtility.getItemId(event));
    });
    html.find('.competence-stress-augmenter').click(async event => {
      this.actor.updateCompetenceStress(RdDSheetUtility.getItemId(event));
    });

    if (this.options.vueDetaillee) {
      // On carac change
      html.find('.carac-value').change(async event => {
        let caracName = event.currentTarget.name.replace(".value", "").replace("system.carac.", "");
        this.actor.updateCarac(caracName, parseInt(event.target.value));
      });
      html.find('input.carac-xp').change(async event => {
        let caracName = event.currentTarget.name.replace(".xp", "").replace("system.carac.", "");
        this.actor.updateCaracXP(caracName, parseInt(event.target.value));
      });
      // On competence change
      html.find('.competence-value').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        //console.log("Competence changed :", compName);
        this.actor.updateCompetence(compName, parseInt(event.target.value));
      });
      // On competence xp change
      html.find('input.competence-xp').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        this.actor.updateCompetenceXP(compName, parseInt(event.target.value));
      });
      // On competence xp change
      html.find('input.competence-xp-sort').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        this.actor.updateCompetenceXPSort(compName, parseInt(event.target.value));
      });
      // On competence archetype change
      html.find('.competence-archetype').change(async event => {
        let compName = event.currentTarget.attributes.compname.value;
        this.actor.updateCompetenceArchetype(compName, parseInt(event.target.value));
      });
    }

    html.find('.show-hide-competences').click(async event => {
      this.options.showCompNiveauBase = !this.options.showCompNiveauBase;
      this.render(true);
    });

    html.find('.recherche')
      .each((index, field) => {
        if (this.options.recherche) {
          field.focus();
          field.setSelectionRange(this.options.recherche.start, this.options.recherche.end);
        }
      })
      .keyup(async event => {
        const nouvelleRecherche = this._optionRecherche(event.currentTarget);
        if (this.options.recherche?.text != nouvelleRecherche?.text){
          this.options.recherche = nouvelleRecherche;
          if (this.timerRecherche) {
            clearTimeout(this.timerRecherche);
          }
          this.timerRecherche = setTimeout(() => {
            this.timerRecherche = undefined;
            this.render(true);
          }, 500);
        }
      })
      .change(async event =>
        this.options.recherche = this._optionRecherche(event.currentTarget)
      );
    html.find('.vue-detaillee').click(async event => {
      this.options.vueDetaillee = !this.options.vueDetaillee;
      this.render(true);
    });

    // On pts de reve change
    html.find('.pointsreve-value').change(async event => {
      let reveValue = event.currentTarget.value;
      this.actor.update({ "system.reve.reve.value": reveValue });
    });

    // On seuil de reve change
    html.find('.seuil-reve-value').change(async event => {
      console.log("seuil-reve-value", event.currentTarget)
      this.actor.setPointsDeSeuil(event.currentTarget.value);
    });

    html.find('#attribut-protection-edit').change(async event => {
      this.actor.updateAttributeValue(event.currentTarget.attributes.name.value, parseInt(event.target.value));
    });

    // On stress change
    html.find('.compteur-edit').change(async event => {
      let fieldName = event.currentTarget.attributes.name.value;
      this.actor.updateCompteurValue(fieldName, parseInt(event.target.value));
    });

    html.find('#ethylisme').change(async event => {
      this.actor.setEthylisme(parseInt(event.target.value));
    });
    html.find('.stress-test').click(async event => {
      this.actor.transformerStress();
    });
    html.find('.moral-malheureux').click(async event => {
      this.actor.jetDeMoral('malheureuse');
    });
    html.find('.moral-neutre').click(async event => {
      this.actor.jetDeMoral('neutre');
    });
    html.find('.moral-heureux').click(async event => {
      this.actor.jetDeMoral('heureuse');
    });
    html.find('.ethylisme-test').click(async event => {
      this.actor.jetEthylisme();
    });

    html.find('.jet-vie').click(async event => {
      this.actor.jetVie();
    });
    html.find('.jet-endurance').click(async event => {
      this.actor.jetEndurance();
    });

    html.find('.monnaie-plus').click(async event => {
      this.actor.monnaieIncDec(RdDSheetUtility.getItemId(event), 1);
    });
    html.find('.monnaie-moins').click(async event => {
      this.actor.monnaieIncDec(RdDSheetUtility.getItemId(event), -1);
    });

    html.find('.vie-plus').click(async event => {
      this.actor.santeIncDec("vie", 1);
    });
    html.find('.vie-moins').click(async event => {
      this.actor.santeIncDec("vie", -1);
    });
    html.find('.endurance-plus').click(async event => {
      this.actor.santeIncDec("endurance", 1);
    });
    html.find('.endurance-moins').click(async event => {
      this.actor.santeIncDec("endurance", -1);
    });
    html.find('.ptreve-actuel-plus').click(async event => {
      this.actor.reveActuelIncDec(1);
    });
    html.find('.ptreve-actuel-moins').click(async event => {
      this.actor.reveActuelIncDec(-1);
    });
    html.find('.fatigue-plus').click(async event => {
      this.actor.santeIncDec("fatigue", 1);
    });
    html.find('.fatigue-moins').click(async event => {
      this.actor.santeIncDec("fatigue", -1);
    });
  }

  _optionRecherche(target) {
    if (!target.value?.length){
      return undefined;
    }
    return {
      text: target.value,
      start: target.selectionStart,
      end: target.selectionEnd,
    };
  }

  _getEventArmeCombat(event) {
    const li = $(event.currentTarget)?.parents(".item");
    let armeName = li.data("arme-name");
    let compName = li.data('competence-name');
    const arme = this.armesList.find(a => a.name == armeName && a.system.competence == compName);
    if (!arme) {
      return { name: armeName, system: { competence: compName } };
    }
    return arme;
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetHeader = this.element.find(".sheet-header");
    const sheetTabs = this.element.find(".sheet-tabs");
    const sheetBody = this.element.find(".sheet-body");
    let bodyHeight = position.height - sheetHeader[0].clientHeight;
    if (sheetTabs.length>0) {
      bodyHeight  -= sheetTabs[0].clientHeight;
    }
    sheetBody.css("height", bodyHeight);
    return position;
  }


  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    // Update the Actor
    return this.actor.update(formData);
  }

  async splitItem(item) {
    const dialog = await DialogSplitItem.create(item, (item, split) => this._onSplitItem(item, split));
    dialog.render(true);
  }

  async _onSplitItem(item, split) {
    if (split >= 1 && split < item.system.quantite) {
      await item.diminuerQuantite(split);
      const splitItem = duplicate(item);
      splitItem.system.quantite = split;
      await this.actor.createEmbeddedDocuments('Item', [splitItem])
    }
  }

}
