
/**
 * Extend the base Dialog entity by defining a custom window to perform roll.
 * @extends {Dialog}
 */
 export class RdDAstrologieEditeur extends Dialog {

  /* -------------------------------------------- */
  constructor(html, calendrier, calendrierData) {

    let myButtons = {
        resetButton: { label: "Re-tirer les nombres astraux", callback: html => this.resetNombreAstraux() },
        saveButton: { label: "Fermer", callback: html => this.fillData() }
      };

    // Common conf
    let dialogConf = { content: html, title: "Editeur d'Astrologie", buttons: myButtons, default: "saveButton" };
    let dialogOptions = { classes: ["rdddialog"], width: 600, height: 300, 'z-index': 99999 }  
    super(dialogConf, dialogOptions)
    
    this.calendrier = calendrier;
    this.updateData( calendrierData );
  }

  /* -------------------------------------------- */  
  async resetNombreAstraux() {
    game.system.rdd.calendrier.resetNombreAstral();
    await game.system.rdd.calendrier.rebuildListeNombreAstral();

    game.system.rdd.calendrier.showAstrologieEditor();
  }

  /* -------------------------------------------- */  
  fillData( ) {
  }

  /* -------------------------------------------- */
  updateData( calendrierData ) {
    this.calendrierData = duplicate(calendrierData);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
    
    let astrologieData = this.astrologieData;

    $(function () {
    });

  }

}
