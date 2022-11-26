import { Misc } from "./misc.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";

const titleTableDeResolution = 'Table de résolution';
/**
 * Extend the base Dialog entity to select roll parameters
 * @extends {Dialog}
 */
/* -------------------------------------------- */
export class RdDRollResolutionTable extends Dialog {

  /* -------------------------------------------- */
  static async open(rollData = {}) {
    RdDRollResolutionTable._setDefaultOptions(rollData);
    let html = await renderTemplate('systems/ctm/templates/dialog-roll-resolution.html', rollData);
    const dialog = new RdDRollResolutionTable(rollData, html);
    dialog.render(true);
  }

  /* -------------------------------------------- */
  static _setDefaultOptions(rollData) {
    let defRollData = {
      show: { title: titleTableDeResolution },
      ajustementsConditions: CONFIG.RDD.ajustementsConditions,
      difficultesLibres: CONFIG.RDD.ajustementsConditions,
      etat: 0,
      moral: 0,
      carac: {},
      finalLevel: 0,
      diffConditions: 0,
      diffLibre: 0,
      use: { conditions:true, libre:true }
    }
    mergeObject(rollData, defRollData, { overwrite: false });
    for (let i = 1; i < 21; i++) {
      const key = `${i}`;
      rollData.carac[key] = { type: "number", value: i, label: key }
    }
    let selected = (rollData.selectedCarac && rollData.selectedCarac.label)
      ? rollData.selectedCarac.label
      : (Number.isInteger(rollData.selectedCarac))
        ? rollData.selectedCarac
        : 10;
    rollData.selectedCarac = rollData.carac[selected];
  }

  /* -------------------------------------------- */
  constructor(rollData, html) {
    let conf = {
      title: titleTableDeResolution,
      content: html,
      buttons: {
        'lancer-fermer': { label: 'Lancer les dés et fermer', callback: html => this.onLancerFermer() }
      }
    };
    super(conf, { classes: ["rdddialog"], width: 800, height: 'fit-content', 'z-index': 99999 });

    this.rollData = rollData;
  }

  /* -------------------------------------------- */
  async onLancer() {
    await RdDResolutionTable.rollData(this.rollData);
    console.log("RdDRollResolutionTable -=>", this.rollData, this.rollData.rolled);
    await RdDResolutionTable.displayRollData(this.rollData);
  }

  /* -------------------------------------------- */
  async onLancerFermer() {
    await RdDResolutionTable.rollData(this.rollData);
    console.log("RdDRollResolutionTable -=>", this.rollData, this.rollData.rolled);
    await RdDResolutionTable.displayRollData(this.rollData);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    this.bringToTop();

    var dialog = this;

    // Setup everything onload
    function onLoad(){
      $("#diffLibre").val(Misc.toInt(dialog.rollData.diffLibre));
      $("#diffConditions").val(Misc.toInt(dialog.rollData.diffConditions));
      dialog.updateRollResult();
    }
    $(function () { onLoad();});
    html.find('#lancer').click((event) => {
      this.onLancer();
    });
    // Update !
    html.find('#diffLibre').change((event) => {
      this.rollData.diffLibre = Misc.toInt(event.currentTarget.value);
      this.updateRollResult();
    });
    html.find('#diffConditions').change((event) => {
      this.rollData.diffConditions = Misc.toInt(event.currentTarget.value);
      this.updateRollResult();
    });
    html.find('#carac').change((event) => {
      let caracKey = event.currentTarget.value;
      this.rollData.selectedCarac = this.rollData.carac[caracKey];
      this.updateRollResult();
    });
  }

  /* -------------------------------------------- */
  async updateRollResult() {
    let rollData = this.rollData;
    rollData.caracValue = parseInt(rollData.selectedCarac.value)
    rollData.finalLevel = this._computeFinalLevel(rollData);

    // Mise à jour valeurs
    $("#carac").val(rollData.caracValue);
    $("#roll-param").text(rollData.selectedCarac.value + " / " + Misc.toSignedString(rollData.finalLevel));
    $(".table-resolution").remove();
    $(".table-proba-reussite").remove();
    $("#tableResolution").append(RdDResolutionTable.buildHTMLTable(rollData.caracValue, rollData.finalLevel));
    $("#tableProbaReussite").append(RdDResolutionTable.buildHTMLResults(rollData.caracValue, rollData.finalLevel));
  }

  /* -------------------------------------------- */
  _computeFinalLevel(rollData) {
    const diffConditions = Misc.toInt(rollData.diffConditions);
    const diffLibre = this._computeDiffLibre(rollData);

    return diffLibre + diffConditions;
  }

  /* -------------------------------------------- */
  _computeDiffLibre(rollData) {
    return Misc.toInt(rollData.diffLibre);
  }
}
