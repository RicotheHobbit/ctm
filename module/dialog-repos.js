import { Misc } from "./misc.js";

export class DialogRepos extends Dialog {

  static async create(actor) {
    const html = await renderTemplate("systems/foundryvtt-ctm/templates/dialog-repos.html", actor);
    const dialog = new DialogRepos(html, actor);
    dialog.render(true);
  }

  constructor(html, actor) {
    let options = { classes: ["DialogCreateSigneDraconiqueActorsActors"], width: 500, height: 400, 'z-index': 99999 };
    let conf = {
      title: "Se reposer",
      content: html,
      default: "repos",
      buttons: {
        "repos": { label: "Se reposer", callback: async it => { this.repos(); } }
      }
    };
    super(conf, options);
    this.actor = actor;
  }

  async repos() {
    await $("[name='nb-heures']").change();
    await $("[name='nb-jours']").change();
    const selection = await $("[name='repos']:checked").val();
    const nbHeures = Number.parseInt(await $("[name='nb-heures']").val());
    const nbJours = Number.parseInt(await $("[name='nb-jours']").val());
    switch (selection) {
      case "sieste": {
        await this.actor.dormir(nbHeures);
        return;
      }
      case "nuit": {
        let heuresDormies = await this.actor.dormir(nbHeures);
        if (heuresDormies == nbHeures){
          await this.actor.dormirChateauDormant();
        }
        return;
      }
      case "chateau-dormant":
        await this.actor.dormirChateauDormant();
        return;
      case "gris-reve": {
        await this.actor.grisReve(nbJours);
        return;
      }
    }
  }
  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
  }
}