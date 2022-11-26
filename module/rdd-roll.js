import { RollDataAjustements } from "./rolldata-ajustements.js";
import { HtmlUtility } from "./html-utility.js";
import { RdDItemCompetence } from "./item-competence.js";
import { RdDItemSort } from "./item-sort.js";
import { Misc } from "./misc.js";
import { RdDBonus } from "./rdd-bonus.js";
import { RdDCarac } from "./rdd-carac.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";

/**
 * Extend the base Dialog entity to select roll parameters
 * @extends {Dialog}
 */
/* -------------------------------------------- */
export class RdDRoll extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData, dialogConfig, ...actions) {

    if (actor.isRollWindowsOpened()) {
      ui.notifications.warn("Vous avez déja une fenêtre de Test ouverte, il faut la fermer avant d'en ouvrir une autre.")
      return;
    }
    actor.setRollWindowsOpened(true);

    RdDRoll._ensureCorrectActions(actions);
    RdDRoll._setDefaultOptions(actor, rollData);

    const html = await renderTemplate(dialogConfig.html, rollData);

    let options = { classes: ["rdddialog"], width: 600, height: 'fit-content', 'z-index': 99999 };
    if (dialogConfig.options) {
      mergeObject(options, dialogConfig.options, { overwrite: true })
    }
    return new RdDRoll(actor, rollData, html, options, actions, dialogConfig.close);
  }

  /* -------------------------------------------- */
  static _setDefaultOptions(actor, rollData) {
    let defaultRollData = {
      alias: actor.name,
      ajustementsConditions: CONFIG.RDD.ajustementsConditions,
      difficultesLibres: CONFIG.RDD.difficultesLibres,
      etat: actor.getEtatGeneral(),
      moral: actor.getMoralTotal(), /* La valeur du moral pour les jets de volonté */
      carac: actor.system.carac,
      finalLevel: 0,
      diffConditions: 0,
      diffLibre: rollData.competence?.system.default_diffLibre ?? 0,
      perteMoralEchec: false, /* Pour l'affichage dans le chat */
      use: {
        moral: false, /* Est-ce que le joueur demande d'utiliser le moral ? Utile si le joueur change plusieurs fois de carac associée. */
        libre: true,
        conditions: true,
        surenc: actor.isSurenc(),
        encTotal: true
      },
      isMalusEncombrementTotal: RdDItemCompetence.isMalusEncombrementTotal(rollData.competence),
      malusArmureValue: actor.getMalusArmure(),
      surencMalusValue: actor.computeMalusSurEncombrement(),
      encTotal: actor.getEncTotal(),
      ajustementAstrologique: actor.ajustementAstrologique(),
      surprise: actor.getSurprise(false),
      canClose: true,
      isGM: game.user.isGM,
      forceDiceResult: -1
    }
    // Mini patch :Ajout du rêve actuel
    if ( actor.system.type == "personnage") {
      defaultRollData.carac["reve-actuel"] = actor.system.reve.reve
    }

    mergeObject(rollData, defaultRollData, { recursive: true, overwrite: false });
    if (rollData.forceCarac) {
      rollData.carac = rollData.forceCarac;
    }
    rollData.diviseurSignificative = RdDRoll.getDiviseurSignificative(rollData);

    RollDataAjustements.calcul(rollData, actor);
  }
  /* -------------------------------------------- */
  static getDiviseurSignificative(rollData) {
    let facteurSign = 1;
    if (rollData.surprise == 'demi') {
      facteurSign *= 2;
    }
    if (rollData.needParadeSignificative) {
      facteurSign *= 2;
    }
    if (RdDBonus.isDefenseAttaqueFinesse(rollData)) {
      facteurSign *= 2;
    }
    if (!ReglesOptionelles.isUsing('tripleSignificative')) {
      facteurSign = Math.min(facteurSign, 4);
    }
    return facteurSign;
  }


  /* -------------------------------------------- */
  static _ensureCorrectActions(actions) {
    if (actions.length == 0) {
      throw 'No action defined';
    }
    actions.forEach(action => {
      if (action.callbacks == undefined) {
        action.callbacks = [{ action: r => console.log(action.name, r) }];
      }
    });
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, actions, close = undefined) {
    let conf = {
      title: actions[0].label,
      content: html,
      buttons: {},
      default: actions[0].name,
      close: close
    };
    for (let action of actions) {
      conf.buttons[action.name] = {
        label: action.label, callback: html => {
          this.rollData.canClose = true;
          this.onAction(action, html)
        }
      };
    }

    super(conf, options);

    this.actor = actor;
    this.rollData = rollData;
  }

  close() {
    if (this.rollData.canClose) {
      this.actor.setRollWindowsOpened(false);
      return super.close();
    }
    ui.notifications.info("Vous devez faire ce jet de dés!");
  }


  /* -------------------------------------------- */
  async onAction(action, html) {
    this.rollData.forceDiceResult = Number.parseInt($('#force-dice-result').val()) ?? -1;
    await RdDResolutionTable.rollData(this.rollData);
    console.log("RdDRoll -=>", this.rollData, this.rollData.rolled);
    this.actor.setRollWindowsOpened(false);
    if (action.callbacks)
      for (let callback of action.callbacks) {
        if (callback.condition == undefined || callback.condition(this.rollData)) {
          await callback.action(this.rollData);
        }
      }
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    this.bringToTop();

    var dialog = this;

    function onLoad() {
      let rollData = dialog.rollData;
      console.log('Ouverture RdDRoll', rollData);
      // Update html, according to rollData
      if (rollData.competence) {
        const defaut_carac = rollData.competence.system.defaut_carac
        // Set the default carac from the competence item
        rollData.selectedCarac = rollData.carac[defaut_carac];
        $("#carac").val(defaut_carac);
      }
      if (rollData.selectedSort) {
        dialog.setSelectedSort(rollData.selectedSort);
        $(".draconic").val(rollData.selectedSort.system.listIndex); // Uniquement a la selection du sort, pour permettre de changer 
      }
      RdDItemSort.setCoutReveReel(rollData.selectedSort);
      $("#diffLibre").val(Misc.toInt(rollData.diffLibre));
      $("#diffConditions").val(Misc.toInt(rollData.diffConditions));
      dialog.updateRollResult();
    }

    // Setup everything onload
    $(function () { onLoad(); });

    // Update !
    html.find('#diffLibre').change((event) => {
      this.rollData.diffLibre = Misc.toInt(event.currentTarget.value); // Update the selected bonus/malus
      this.updateRollResult();
    });
    html.find('#diffConditions').change((event) => {
      this.rollData.diffConditions = Misc.toInt(event.currentTarget.value); // Update the selected bonus/malus
      this.updateRollResult();
    });
    html.find('#force-dice-result').change((event) => {
      this.rollData.forceDiceResult = Misc.toInt(event.currentTarget.value);
    });
    html.find('#carac').change((event) => {
      let caracKey = event.currentTarget.value;
      this.rollData.selectedCarac = this.rollData.carac[caracKey]; // Update the selectedCarac
      this.updateRollResult();
    });
    html.find('.roll-draconic').change((event) => {
      let draconicKey = Misc.toInt(event.currentTarget.value);
      this.rollData.competence = this.rollData.draconicList[draconicKey]; // Update the selectedCarac
      this.updateRollResult();
    });
    html.find('.roll-sort').change((event) => {
      let sortKey = Misc.toInt(event.currentTarget.value);
      this.setSelectedSort(this.rollData.sortList[sortKey]);
      this.updateRollResult();
      $("#diffLibre").val(this.rollData.diffLibre);
    });
    html.find('.roll-carac-competence').change((event) => {
      const competence = event.currentTarget.value;
      this.rollData.competence = this.rollData.competences.find(it => it.name == competence);
      this.updateRollResult();
    });
    html.find('.roll-signedraconique').change((event) => {
      let sortKey = Misc.toInt(event.currentTarget.value);
      this.setSelectedSigneDraconique(this.rollData.signes[sortKey]);
      this.updateRollResult();
    });
    html.find('#ptreve-variable').change((event) => {
      let ptreve = Misc.toInt(event.currentTarget.value);
      this.rollData.selectedSort.system.ptreve_reel = ptreve;
      console.log("RdDRollSelectDialog - Cout reve", ptreve);
      this.updateRollResult();
    });
    html.find("[name='coupsNonMortels']").change((event) => {
      this.rollData.dmg.mortalite = event.currentTarget.checked ? "non-mortel" : "mortel";
      this.updateRollResult();
    });
    html.find('.cuisine-proportions').change((event) => {
      this.rollData.proportions = Number(event.currentTarget.value);
      this.updateRollResult();
    });
    html.find('.select-by-name').change((event) => {
      const attribute = event.currentTarget.attributes['name'].value;
      this.rollData[attribute] = event.currentTarget.value;
      this.updateRollResult();
    });
    html.find('.checkbox-by-name').change((event) => {
      const attribute = event.currentTarget.attributes['name'].value;
      this.rollData[attribute] = event.currentTarget.checked;
      this.updateRollResult();
    });
    html.find('input.use-encTotal').change((event) => {
      this.rollData.use.encTotal = event.currentTarget.checked;
      this.updateRollResult();
    });
    html.find('input.use-surenc').change((event) => {
      this.rollData.use.surenc = event.currentTarget.checked;
      this.updateRollResult();
    });
    html.find('.appel-moral').click((event) => { /* l'appel au moral, qui donne un bonus de +1 */
      this.rollData.use.moral = !this.rollData.use.moral;
      const appelMoral = html.find('.icon-appel-moral')[0];
      const tooltip = html.find('.tooltipAppelAuMoralText')[0];
      if (this.rollData.use.moral) {
        if (this.rollData.moral > 0) {
          tooltip.innerHTML = "Appel au moral";
          appelMoral.src = "/systems/ctm/icons/moral-heureux.svg";
        } else {
          tooltip.innerHTML = "Appel à l'énergie du désespoir";
          appelMoral.src = "/systems/ctm/icons/moral-malheureux.svg";
        }
      } else {
        tooltip.innerHTML = "Sans appel au moral";
        appelMoral.src = "/systems/ctm/icons/moral-neutre.svg";
      }
      this.updateRollResult();
    });
    // Section Méditation
    html.find('.conditionMeditation').change((event) => {
      let condition = event.currentTarget.attributes['id'].value;
      this.rollData.conditionMeditation[condition] = event.currentTarget.checked;
      this.updateRollResult();
    });
  }

  async setSelectedSort(sort) {
    this.rollData.selectedSort = sort; // Update the selectedCarac
    this.rollData.competence = RdDItemCompetence.getVoieDraconic(this.rollData.draconicList, sort.system.draconic);
    this.rollData.bonus = RdDItemSort.getCaseBonus(sort, this.rollData.tmr.coord);
    this.rollData.diffLibre = RdDItemSort.getDifficulte(sort, -7);
    RdDItemSort.setCoutReveReel(sort);
    const htmlSortDescription = await renderTemplate("systems/ctm/templates/partial-description-sort.html", { sort: sort });
    $(".sort-ou-rituel").text(sort.system.isrituel ? "rituel" : "sort");
    $(".bonus-case").text(`${this.rollData.bonus}%`);
    $(".details-sort").remove();
    $(".description-sort").append(htmlSortDescription);
    $(".roll-draconic").val(sort.system.listIndex);
    $(".div-sort-difficulte-fixe").text(Misc.toSignedString(sort.system.difficulte));
    $(".div-sort-ptreve-fixe").text(sort.system.ptreve);
    const diffVariable = RdDItemSort.isDifficulteVariable(sort);
    const coutVariable = RdDItemSort.isCoutVariable(sort);

    HtmlUtility._showControlWhen($(".div-sort-non-rituel"), !sort.system.isrituel);
    HtmlUtility._showControlWhen($(".div-sort-difficulte-var"), diffVariable);
    HtmlUtility._showControlWhen($(".div-sort-difficulte-fixe"), !diffVariable);
    HtmlUtility._showControlWhen($(".div-sort-ptreve-var"), coutVariable);
    HtmlUtility._showControlWhen($(".div-sort-ptreve-fixe"), !coutVariable);
  }

  async setSelectedSigneDraconique(signe){
    this.rollData.signe = signe;
    this.rollData.diffLibre = signe.system.difficulte,
    $(".signe-difficulte").text(Misc.toSignedString(this.rollData.diffLibre));
  }

  /* -------------------------------------------- */
  async updateRollResult() {
    let rollData = this.rollData;

    rollData.dmg = rollData.attackerRoll?.dmg ?? RdDBonus.dmg(rollData, this.actor.getBonusDegat())
    rollData.caracValue = parseInt(rollData.selectedCarac.value)
    rollData.mortalite = rollData.attackerRoll?.dmg.mortalite ?? rollData.dmg.mortalite ?? 'mortel';
    rollData.coupsNonMortels = (rollData.attackerRoll?.dmg.mortalite ?? rollData.dmg.mortalite) == 'non-mortel';
    rollData.use.appelAuMoral = this.actor.isPersonnage() && RdDCarac.isActionPhysique(rollData.selectedCarac);
    let dmgText = Misc.toSignedString(rollData.dmg.total);

    switch (rollData.mortalite){
      case 'non-mortel':  dmgText = `(${dmgText}) non-mortel`; break;
      case 'empoignade':  dmgText = `empoignade`; break;
    }

    RollDataAjustements.calcul(rollData, this.actor);
    rollData.finalLevel = this._computeFinalLevel(rollData);

    HtmlUtility._showControlWhen($(".use-encTotal"), rollData.ajustements.encTotal.visible && RdDCarac.isAgiliteOuDerivee(rollData.selectedCarac));
    HtmlUtility._showControlWhen($(".use-surenc"), rollData.ajustements.surenc.visible && RdDCarac.isActionPhysique(rollData.selectedCarac));
    HtmlUtility._showControlWhen($(".utilisation-moral"), rollData.use.appelAuMoral);
    HtmlUtility._showControlWhen($(".diffMoral"), rollData.ajustements.moralTotal.used);
    HtmlUtility._showControlWhen($(".divAppelAuMoral"), rollData.use.appelAuMoral);
    HtmlUtility._showControlWhen($("#etat-general"), !RdDCarac.isIgnoreEtatGeneral(rollData));
    HtmlUtility._showControlWhen($("#ajust-astrologique"), RdDResolutionTable.isAjustementAstrologique(rollData));

    // Mise à jour valeurs
    $(".dialog-roll-title").text(this._getTitle(rollData));
    $("[name='coupsNonMortels']").prop('checked', rollData.mortalite == 'non-mortel');
    $(".dmg-arme-actor").text(dmgText);
    $('.table-ajustement').remove();
    $(".table-resolution").remove();
    $(".table-proba-reussite").remove();
    $("#tableAjustements").append(await this.buildAjustements(rollData));
    $("#tableResolution").append(RdDResolutionTable.buildHTMLTableExtract(rollData.caracValue, rollData.finalLevel));
    $("#tableProbaReussite").append(RdDResolutionTable.buildHTMLResults(rollData.caracValue, rollData.finalLevel));
  }


  /* -------------------------------------------- */
  async buildAjustements(rollData) {
    const html = await renderTemplate(`systems/ctm/templates/partial-roll-ajustements.html`, rollData);
    return html;
  }

  /* -------------------------------------------- */
  _computeFinalLevel(rollData) {
    return RollDataAjustements.sum(rollData.ajustements);
  }
  /* -------------------------------------------- */
  _computeDiffCompetence(rollData) {
    if (rollData.competence) {
      return Misc.toInt(rollData.competence.system.niveau);
    }
    if (rollData.draconicList) {
      return Misc.toInt(rollData.competence.system.niveau);
    }
    return 0;
  }

  /* -------------------------------------------- */
  _computeDiffLibre(rollData) {
    let diffLibre = Misc.toInt(rollData.diffLibre);
    if (rollData.draconicList && rollData.selectedSort) {
      return RdDItemSort.getDifficulte(rollData.selectedSort, diffLibre);
    }
    return diffLibre;
  }

  /* -------------------------------------------- */
  _computeMalusArmure(rollData) {
    let malusArmureValue = 0;
    if (rollData.malusArmureValue && (rollData.selectedCarac.label == "Agilité" || rollData.selectedCarac.label == "Dérobée")) {
      $("#addon-message").text("Malus armure appliqué : " + rollData.malusArmureValue);
      malusArmureValue = rollData.malusArmureValue;
    } else {
      $("#addon-message").text("");
    }
    return malusArmureValue;
  }

  /* -------------------------------------------- */
  _getTitle(rollData) {
    const carac = rollData.selectedCarac.label;
    if (!rollData.competence) {
      return carac;
    }
    const compName = rollData.competence.name;
    if (rollData.draconicList && rollData.selectedSort) {
      return compName + " - " + rollData.selectedSort.name;
    }
    // If a weapon is there, add it in the title
    const niveau = Misc.toSignedString(rollData.competence.system.niveau)
    if (compName == carac) {
      // cas des créatures
      return carac + " Niveau " + niveau
    }
    const armeTitle = (rollData.arme) ? " (" + rollData.arme.name + ") " : "";
    return carac + "/" + compName + armeTitle + " Niveau " + niveau
  }
}
