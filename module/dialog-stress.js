
export class DialogStress extends Dialog {

  static async distribuerStress() {
    const dialogData = {
      motif: "Motif",
      stress: 10,
      immediat: false,
      actors: game.actors.filter(actor => actor.hasPlayerOwner && actor.isPersonnage())
        .map(actor => ({
            id: actor.id,
            name: actor.name,
            selected: true
          })
        )
    };

    const html = await renderTemplate("systems/foundryvtt-ctm/templates/dialog-stress.html", dialogData);
    new DialogStress(dialogData, html)
      .render(true);
  }

  constructor(dialogData, html) {
    const options = { classes: ["DialogStress"],
      width: 400,
      height: 'fit-content',
      'z-index': 99999
    };
    const conf = {
      title: "Donner du stress",
      content: html,
      buttons: {
        stress: { label: "Stress !", callback: it => { this.onStress(); } }
      }
    };
    super(conf, options);
    this.dialogData = dialogData;
  }

  async onStress() {
    const motif = $("form.rdddialogstress input[name='motif']").val();
    const stress = Number($("form.rdddialogstress input[name='stress']").val());
    const compteur = ($("form.rdddialogstress input[name='immediat']").prop("checked")) ? 'experience' : 'stress';

    this.dialogData.actors.filter(it => it.selected)
      .map(it => game.actors.get(it.id))
      .forEach(actor => actor.distribuerStress(compteur, stress, motif));
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input.select-actor").change((event) => this.onSelectActor(event));
  }

  async onSelectActor(event) {
    const actorId = $(event.currentTarget)?.data("actor-id");
    const actor = this.dialogData.actors.find(it => it.id == actorId);
    if (actor) {
      actor.selected = event.currentTarget.checked;
    }
  }
}