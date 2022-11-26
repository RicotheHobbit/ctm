
import { Monnaie } from "./item-monnaie.js";
import { Misc } from "./misc.js";
import { RdDUtility } from "./rdd-utility.js";

export class DialogItemAchat extends Dialog {

  static venteData(button) {
    const vendeurId = button.attributes['data-vendeurId']?.value;
    const vendeur = vendeurId ? game.actors.get(vendeurId) : undefined;
    const acheteur = RdDUtility.getSelectedActor();
    const json = button.attributes['data-jsondata']?.value;
    if (!acheteur && !vendeur) {
      ui.notifications.info("Pas d'acheteur ni de vendeur, aucun changement");
      return undefined;
    }
    if (!json) {
      ui.notifications.warn("Impossible d'acheter: informations sur l'objet manquantes")
      return undefined;
    }

    const prixLot = Monnaie.arrondiDeniers(button.attributes['data-prixLot']?.value ?? 0);
    return {
      item: json ? JSON.parse(json) : undefined,
      actingUserId: game.user.id,
      vendeurId: vendeurId,
      vendeur: vendeur,
      acheteur: acheteur,
      tailleLot: parseInt(button.attributes['data-tailleLot']?.value ?? 1),
      quantiteIllimite: button.attributes['data-quantiteIllimite']?.value == 'true',
      quantiteNbLots: parseInt(button.attributes['data-quantiteNbLots']?.value),
      choix: {
        nombreLots: 1,
        seForcer: false,
        supprimerSiZero: true
      },
      prixLot: prixLot,
      prixTotal: prixLot,
      isVente: prixLot > 0,
      chatMessageIdVente: RdDUtility.findChatMessageId(button)
    };
  }

  static async onAcheter(venteData) {
    const html = await renderTemplate(`systems/ctm/templates/dialog-item-achat.html`, venteData);
    const dialog = new DialogItemAchat(html, venteData);
    dialog.render(true);
  }

  constructor(html, venteData) {
    const isConsommable = venteData.item.type == 'nourritureboisson' && venteData.acheteur?.isPersonnage();
    let options = { classes: ["dialogachat"], width: 400, height: 'fit-content', 'z-index': 99999 };

    const actionAchat = venteData.prixLot > 0 ? "Acheter" : "Prendre";
    const buttons = {};
    if (isConsommable) {
      buttons["consommer"] = { label: venteData.item.system.boisson ? "Boire" : "Manger", callback: it => this.onAchatConsommer() }
    }
    buttons[actionAchat] = { label: actionAchat, callback: it => { this.onAchat(); } };
    buttons["decliner"] = { label: "Décliner", callback: it => { } };
    let conf = {
      title: venteData.acheteur ? venteData.acheteur.name + " - " + actionAchat : actionAchat,
      content: html,
      default: actionAchat,
      buttons: buttons
    };

    super(conf, options);

    this.venteData = venteData;
  }

  async onAchat() {
    await $(".nombreLots").change();
    (this.venteData.vendeur ?? this.venteData.acheteur).achatVente({
      userId: game.user.id,
      vendeurId: this.venteData.vendeur?.id,
      acheteurId: this.venteData.acheteur?.id,
      prixTotal: this.venteData.prixTotal,
      chatMessageIdVente: this.venteData.chatMessageIdVente,
      choix: this.venteData.choix,
      vente: this.venteData
    });
  }

  async onAchatConsommer() {
    this.venteData.choix.consommer = true;
    await this.onAchat();
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".nombreLots").change(event => this.setNombreLots(Number(event.currentTarget.value)));
    html.find(".se-forcer").change(event => this.setSeForcer(event));
  }

  setSeForcer(event) {
    this.venteData.choix.seForcer = event.currentTarget.checked;
  }

  setNombreLots(nombreLots) {
    if (nombreLots > this.venteData.quantiteNbLots) {
      ui.notifications.warn(`Seulement ${this.venteData.quantiteNbLots} lots disponibles, vous ne pouvez pas en prendre ${nombreLots}`)
    }
    this.venteData.choix.nombreLots = Math.min(nombreLots, this.venteData.quantiteNbLots);
    this.venteData.prixTotal = (nombreLots * this.venteData.prixLot).toFixed(2);
    $(".nombreLots").val(this.venteData.choix.nombreLots);
    $(".prixTotal").text(this.venteData.prixTotal);
  }

}