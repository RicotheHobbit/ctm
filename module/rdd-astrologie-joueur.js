import { RdDItemCompetence } from "./item-competence.js";
import { Misc } from "./misc.js";
import { SYSTEM_SOCKET_ID } from "./constants.js";


/**
 * Extend the base Dialog entity by defining a custom window to perform roll.
 * @extends {Dialog}
 */
export class RdDAstrologieJoueur extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, dialogConfig) {

    let dialogData = {
      nombres: this.organizeNombres(actor),
      dates: game.system.rdd.calendrier.getJoursSuivants(10),
      etat: actor.getEtatGeneral(),
      ajustementsConditions: CONFIG.RDD.ajustementsConditions,
      astrologie: RdDItemCompetence.findCompetence(actor.items, 'Astrologie')
    }
    const html = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/dialog-astrologie-joueur.html', dialogData);
    let options = { classes: ["rdddialog"], width: 600, height: 500, 'z-index': 99999 };
    if (dialogConfig.options) {
      mergeObject(options, dialogConfig.options, { overwrite: true });
    }
    return new RdDAstrologieJoueur(html, actor, dialogData);
  }

  /* -------------------------------------------- */
  constructor(html, actor, dialogData) {

    let myButtons = {
      saveButton: { label: "Fermer", callback: html => this.quitDialog() }
    };

    // Get all n
    // Common conf
    let dialogConf = { content: html, title: "Nombres Astraux", buttons: myButtons, default: "saveButton" };
    let dialogOptions = { classes: ["rdddialog"], width: 600, height: 300, 'z-index': 99999 };
    super(dialogConf, dialogOptions);

    this.actor = actor;
    this.dataNombreAstral = duplicate(dialogData);
  }

  /* -------------------------------------------- */
  static organizeNombres(actor) {
    let itemNombres = actor.listItemsData('nombreastral');
    let itemFiltered = {};
    for (let item of itemNombres) {
      if (itemFiltered[item.system.jourindex]) {
        itemFiltered[item.system.jourindex].listValues.push(item.system.value);
      } else {
        itemFiltered[item.system.jourindex] = {
          listValues: [item.system.value],
          jourlabel: item.system.jourlabel
        }
      }
    }
    return itemFiltered;
  }

  /* -------------------------------------------- */
  requestJetAstrologie() {
    let socketData = {
      id: this.actor.id,
      carac_vue: this.actor.system.carac['vue'].value,
      etat: this.dataNombreAstral.etat,
      astrologie: this.dataNombreAstral.astrologie,
      conditions: $("#diffConditions").val(),
      date: $("#joursAstrologie").val(),
      userId: game.user.id
    }
    if (Misc.isUniqueConnectedGM()) {
      game.system.rdd.calendrier.requestNombreAstral(socketData);
    } else {
      game.socket.emit(SYSTEM_SOCKET_ID, {
        msg: "msg_request_nombre_astral",
        data: socketData
      });
    }
    this.close();
  }

  /* -------------------------------------------- */
  quitDialog() {
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    $(function () {
      $("#diffConditions").val(0);
    });

    html.find('#jet-astrologie').click((event) => {
      this.requestJetAstrologie();
    });
  }

}
