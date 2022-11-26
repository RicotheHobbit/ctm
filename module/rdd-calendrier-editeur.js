import { Misc } from "./misc.js";

/**
 * Extend the base Dialog entity by defining a custom window to perform roll.
 * @extends {Dialog}
 */
export class RdDCalendrierEditeur extends Dialog {

  /* -------------------------------------------- */
  constructor(html, calendrier, calendrierData) {
    let dialogConf = {
      content: html,
      title: "Editeur de date/heure",
      buttons: {
        save: { label: "Enregistrer", callback: html => this.fillData() }
      },
      default: "save"
    };
    let dialogOptions = { classes: ["rdd-dialog-calendar-editor"], width: 400, height: 'fit-content', 'z-index': 99999 }
    super(dialogConf, dialogOptions)

    this.calendrier = calendrier;
    this.calendrierData = calendrierData;
  }

  /* -------------------------------------------- */
  fillData() {
    this.calendrierData.annee = $("input[name='annee']").val();
    this.calendrierData.moisKey = $("select[name='nomMois']").val();
    this.calendrierData.heureKey = $("select[name='nomHeure']").val();
    this.calendrierData.jourMois = $("select[name='jourMois']").val();
    this.calendrierData.minutesRelative = $("select[name='minutesRelative']").val();

    console.log("UPDATE  ", this.calendrierData);
    this.calendrier.saveEditeur(this.calendrierData)
  }

  /* -------------------------------------------- */
  updateData(calendrierData) {
    this.calendrierData = duplicate(calendrierData);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    let calendrierData = this.calendrierData;

    $(function () {
      console.log(calendrierData);
      $("input[name='nomMois']").val(calendrierData.moisKey);
      $("select[name='nomHeure']").val(calendrierData.heureKey);
      $("select[name='jourMois']").val(calendrierData.jourMois);
      $("select[name='minutesRelative']").val(calendrierData.minutesRelative);
      $("select[name='annee']").val(calendrierData.annee);
    });

  }

}
