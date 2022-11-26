
export class DialogSelectTarget extends Dialog {
  constructor(html, onSelectTarget, targets) {
    const options = {
      classes: ["rdd-dialog-select-target"],
      width: 'fit-content',
      height: 'fit-content',
      'max-height': 600,
      'z-index': 99999
    };
    const conf = {
      title: "Choisir une cible",
      content: html,
      buttons: {}
    };
    super(conf, options);
    this.onSelectTarget = onSelectTarget;
    this.targets = targets;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("li.select-target").click((event) => {
      this.targetSelected($(event.currentTarget)?.data("token-id"));
    });
  }


  targetSelected(tokenId) {
    const target = this.targets.find(it => it.id == tokenId);
    this.close();
    if (target) {
      this.onSelectTarget(target);
    }
  }
}