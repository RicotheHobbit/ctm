import { HtmlUtility } from "./html-utility.js";
import { Misc } from "./misc.js";

export class DialogItemVente extends Dialog {

  static async display(item, callback) {
    const quantite = item.isConteneur() ? 1 : item.system.quantite;
    const venteData = {
      item: item,
      alias: item.actor?.name ?? game.user.name,
      vendeurId: item.actor?.id,
      prixOrigine: item.system.cout,
      prixUnitaire: item.system.cout,
      prixLot: item.system.cout,
      tailleLot: 1,
      quantiteNbLots: quantite,
      quantiteMaxLots: quantite,
      quantiteMax: quantite ,
      quantiteIllimite: !item.isOwned,
      isOwned: item.isOwned,
    };
    const html = await renderTemplate(`systems/ctm/templates/dialog-item-vente.html`, venteData);
    return new DialogItemVente(venteData, html, callback).render(true);
  }

  constructor(venteData, html, callback) {
    let options = { classes: ["dialogvente"], width: 400, height: 'fit-content', 'z-index': 99999 };

    let conf = {
      title: "Proposer",
      content: html,
      default: "proposer",
      buttons: { "proposer": { label: "Proposer", callback: it => { this.onProposer(it); } } }
    };

    super(conf, options);
    this.callback = callback;
    this.venteData = venteData;
  }

  async onProposer(it) {
    await $(".tailleLot").change();
    await $(".quantiteNbLots").change();
    await $(".quantiteIllimite").change();
    await $(".prixLot").change();
    this.callback(this.venteData);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    HtmlUtility._showControlWhen($(".quantiteNbLots"), !this.venteData.quantiteIllimite)

    html.find(".tailleLot").change(event => this.setTailleLot(Number(event.currentTarget.value)));
    html.find(".quantiteNbLots").change(event => this.setNbLots(Number(event.currentTarget.value)));
    html.find(".quantiteIllimite").change(event => this.setQuantiteIllimite(event.currentTarget.checked));
    html.find(".prixLot").change(event => this.setPrixLot(Number(event.currentTarget.value)));
  }

  setPrixLot(prixLot) {
    this.venteData.prixLot = prixLot;
  }

  setTailleLot(tailleLot) {
    // recalculer le prix du lot
    if (tailleLot != this.venteData.tailleLot) {
      this.venteData.prixLot = (tailleLot * this.venteData.prixOrigine).toFixed(2);
      $(".prixLot").val(this.venteData.prixLot);
    }
    this.venteData.tailleLot = tailleLot;
    if (this.venteData.isOwned) {
      // recalculer le nombre de lots max
      this.venteData.quantiteMaxLots = Math.floor(this.venteData.quantiteMax / tailleLot);
      this.venteData.quantiteNbLots = Math.min(this.venteData.quantiteMaxLots, this.venteData.quantiteNbLots);
      $(".quantiteNbLots").val(this.venteData.quantiteNbLots);
      $(".quantiteNbLots").attr("max", this.venteData.quantiteMaxLots)
    }
  }

  setNbLots(nbLots) {
    if (this.venteData.isOwned) {
      nbLots = Math.max(0, Math.min(nbLots, this.venteData.quantiteMaxLots));
    }
    this.venteData.quantiteNbLots = nbLots;
    $(".quantiteNbLots").val(this.venteData.quantiteNbLots);
  }

  setQuantiteIllimite(checked) {
    this.venteData.quantiteIllimite = checked;
    $(".label-quantiteIllimite").text(this.venteData.quantiteIllimite ? "Illimités" : "disponibles");
    HtmlUtility._showControlWhen($(".quantiteNbLots"), !this.venteData.quantiteIllimite)
  }
}