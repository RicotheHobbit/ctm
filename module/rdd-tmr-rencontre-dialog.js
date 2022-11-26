/* -------------------------------------------- */
export class RdDTMRRencontreDialog extends Dialog {

  /* -------------------------------------------- */
  constructor(tmrApp, rencontre, tmr) {
    const dialogConf = {
      title: "Rencontre en TMR!",
      content: "Vous rencontrez un " + rencontre.name + " de force " + rencontre.system.force + "<br>",
      buttons: {
        derober: { icon: '<i class="fas fa-check"></i>', label: "Se dérober", callback: () => this.onButtonAction('derober') },
        maitiser: { icon: '<i class="fas fa-check"></i>', label: "Maîtriser", callback: () => this.onButtonAction('maitriser') }
      },
      default: "derober"
    }
    if ((rencontre.system.refoulement ?? 0) == 0) {
      dialogConf.buttons.ignorer = { icon: '<i class="fas fa-check"></i>', label: "Ignorer", callback: () => this.onButtonAction('ignorer') }
    }
    else {
      dialogConf.buttons.refouler =  { icon: '<i class="fas fa-check"></i>', label: "Refouler", callback: () => this.onButtonAction('refouler') }
    }

    const dialogOptions = {
      classes: ["tmrrencdialog"],
      width: 320, height: 'fit-content',
      'z-index': 50
    }
    super(dialogConf, dialogOptions);

    this.toClose = false;
    this.tmr = tmr;
    this.tmrApp = tmrApp;
    this.tmrApp.minimize();
  }

  async onButtonAction(action) {
    this.toClose = true;
    this.tmrApp.onActionRencontre(action, this.tmr)
  }
  
  /* -------------------------------------------- */
  close() {
    if (this.toClose) {
      this.tmrApp.maximize();
      return super.close();
    }
    ui.notifications.info("Vous devez résoudre la rencontre.");
  }

}
