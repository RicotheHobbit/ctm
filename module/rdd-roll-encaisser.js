import { ENTITE_BLURETTE, ENTITE_INCARNE} from "./constants.js";

/**
 * Extend the base Dialog entity by defining a custom window to perform roll.
 * @extends {Dialog}
 */
export class RdDEncaisser extends Dialog {

  /* -------------------------------------------- */
  constructor(html, actor) {
    // Common conf
    let buttons = {};
    if (!actor.isEntite()){
      buttons = {
        "mortel": { label: "Mortel", callback: html => this.performEncaisser("mortel") },
        "non-mortel": { label: "Non-mortel", callback: html => this.performEncaisser("non-mortel") },
        "sonne": { label: "Sonné", callback: html => this.actor.setSonne() },
      };
    }
    else if (actor.isEntite([ENTITE_BLURETTE, ENTITE_INCARNE])){
      buttons = {
        "cauchemar": { label: "cauchemar", callback: html => this.performEncaisser("cauchemar") }
      }
    }

    let dialogConf = {
      title: "Jet d'Encaissement",
      content: html,
      buttons: buttons,
      default: "mortel"
    }

    let dialogOptions = {
      classes: ["rdddialog"],
      width: 320,
      height: 'fit-content'
    }

    // Select proper roll dialog template and stuff
    super(dialogConf, dialogOptions);

    this.actor = actor;
    this.modifier = 0;
    this.encaisserSpecial = "aucun";
  }



  /* -------------------------------------------- */
  performEncaisser(mortalite) {
    this.actor.encaisserDommages({
      dmg: {
        total: Number(this.modifier),
        ajustement: Number(this.modifier),
        encaisserSpecial: this.encaisserSpecial,
        loc: { result: 0, label: "" },
        mortalite: mortalite
      }
    });
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    // Setup everything onload
    $(function () {
      $("#modificateurDegats").val("0");
    });

    html.find('#modificateurDegats').change((event) => {
      this.modifier = event.currentTarget.value; // Update the selected bonus/malus
    });
    html.find('#encaisserSpecial').change((event) => {
      this.encaisserSpecial = event.currentTarget.value; // Update the selected bonus/malus
    });
  }

}
