import { ChatUtility } from "./chat-utility.js";
import { HtmlUtility } from "./html-utility.js";
import { RdDItemSigneDraconique } from "./item-signedraconique.js";
import { TMRUtility } from "./tmr-utility.js";

export class DialogCreateSigneDraconique extends Dialog {

  static async createSigneForActors() {
    const signe = await RdDItemSigneDraconique.randomSigneDraconique({ephemere: true});
    let dialogData = {
      signe: signe,
      tmrs: TMRUtility.buildSelectionTypesTMR(signe.system.typesTMR),
      actors: game.actors.filter(actor => actor.isPersonnage() && actor.isHautRevant())
        .map(actor => ({
          id: actor.id,
          name: actor.name,
          selected: true
        }))
    };

    const html = await renderTemplate("systems/foundryvtt-reve-de-dragon/templates/dialog-create-signedraconique.html", dialogData);
    new DialogCreateSigneDraconique(dialogData, html)
      .render(true);
  }

  constructor(dialogData, html) {
    let options = { classes: ["DialogCreateSigneDraconiqueActorsActors"], width: 500, height: 650, 'z-index': 99999 };
    let conf = {
      title: "Créer un signe",
      content: html,
      buttons: {
        "Ajouter aux haut-rêvants": { label: "Ajouter aux haut-rêvants", callback: it => { this._onCreerSigneActeurs(); } }
      }
    };
    super(conf, options);
    this.dialogData = dialogData;
  }

  async _onCreerSigneActeurs() {
    await $("[name='signe.system.ephemere']").change();
    await $(".signe-xp-sort").change();
    this.validerSigne();
    this.dialogData.actors.filter(it => it.selected)
      .map(it => game.actors.get(it.id))
      .forEach(actor => this._createSigneForActor(actor, this.dialogData.signe));
  }

  async _createSigneForActor(actor, signe) {
    actor.createEmbeddedDocuments("Item", [signe]);
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(actor.name),
      content: await renderTemplate("systems/foundryvtt-reve-de-dragon/templates/chat-signe-draconique-actor.html", {
        signe: signe,
        alias: actor.name
      })
    });
  }

  validerSigne() {
    this.dialogData.signe.name = $("[name='signe.name']").val();
    this.dialogData.signe.system.valeur.norm = $("[name='signe.system.valeur.norm']").val();
    this.dialogData.signe.system.valeur.sign = $("[name='signe.system.valeur.sign']").val();
    this.dialogData.signe.system.valeur.part = $("[name='signe.system.valeur.part']").val();
    this.dialogData.signe.system.difficulte = $("[name='signe.system.difficulte']").val();
    this.dialogData.signe.system.ephemere = $("[name='signe.system.ephemere']").prop("checked");
    this.dialogData.signe.system.duree = $("[name='signe.system.duree']").val();
    this.dialogData.signe.system.typesTMR = TMRUtility.buildListTypesTMRSelection(this.dialogData.tmrs);
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
    this.setEphemere(this.dialogData.signe.system.ephemere);
    html.find(".signe-aleatoire").click(event => this.setSigneAleatoire());
    html.find("[name='signe.system.ephemere']").change((event) => this.setEphemere(event.currentTarget.checked));
    html.find(".signe-xp-sort").change((event) => this.onValeurXpSort(event));
    html.find("input.select-actor").change((event) => this.onSelectActor(event));
    html.find("input.select-tmr").change((event) => this.onSelectTmr(event));
  }

  async setSigneAleatoire() {
    const newSigne = await RdDItemSigneDraconique.randomSigneDraconique({ephemere: true});

    $("[name='signe.name']").val(newSigne.name);
    $("[name='signe.system.valeur.norm']").val(newSigne.system.valeur.norm);
    $("[name='signe.system.valeur.sign']").val(newSigne.system.valeur.sign);
    $("[name='signe.system.valeur.part']").val(newSigne.system.valeur.part);
    $("[name='signe.system.difficulte']").val(newSigne.system.difficulte);
    $("[name='signe.system.duree']").val(newSigne.system.duree);
    $("[name='signe.system.ephemere']").prop("checked", newSigne.system.ephemere);
    this.dialogData.tmrs = TMRUtility.buildSelectionTypesTMR(newSigne.system.typesTMR);
    this.dialogData.tmrs.forEach(t => {
      $(`[data-tmr-name='${t.name}']`).prop( "checked", t.selected);
    })
    this.setEphemere(newSigne.system.ephemere);
  }

  async setEphemere(ephemere) {
    this.dialogData.signe.system.ephemere = ephemere;
    HtmlUtility._showControlWhen($(".signe-system-duree"), ephemere);
  }

  async onSelectActor(event) {
    const actorId = $(event.currentTarget)?.data("actor-id");
    const actor = this.dialogData.actors.find(it => it.id == actorId);
    if (actor) {
      actor.selected = event.currentTarget.checked;
    }
  }

  onSelectTmr(event) {
    const tmrName = $(event.currentTarget)?.data("tmr-name");
    const onTmr = this.tmrs.find(it => it.name == tmrName);
    if (onTmr){
      onTmr.selected = event.currentTarget.checked;
    }
  }


  onValeurXpSort(event) {
    const codeReussite = event.currentTarget.attributes['data-typereussite']?.value ?? 0;
    const xp = Number(event.currentTarget.value);
    const oldValeur = this.dialogData.signe.system.valeur;
    this.dialogData.signe.system.valeur = RdDItemSigneDraconique.calculValeursXpSort(codeReussite, xp, oldValeur);
  }

}