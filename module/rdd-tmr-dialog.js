import { SHOW_DICE } from "./constants.js";
import { RollDataAjustements } from "./rolldata-ajustements.js";
import { RdDUtility } from "./rdd-utility.js";
import { TMRUtility } from "./tmr-utility.js";
import { tmrConstants } from "./tmr-constants.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDTMRRencontreDialog } from "./rdd-tmr-rencontre-dialog.js";
import { TMRRencontres } from "./tmr-rencontres.js";
import { ChatUtility } from "./chat-utility.js";
import { RdDRoll } from "./rdd-roll.js";
import { Poetique } from "./poetique.js";
import { EffetsDraconiques } from "./tmr/effets-draconiques.js";
import { PixiTMR } from "./tmr/pixi-tmr.js";
import { Draconique } from "./tmr/draconique.js";
import { HtmlUtility } from "./html-utility.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";
import { RdDDice } from "./rdd-dice.js";
import { STATUSES } from "./settings/status-effects.js";
import { RdDRencontre } from "./item-rencontre.js";
import { RdDCalendrier } from "./rdd-calendrier.js";

/* -------------------------------------------- */

export class RdDTMRDialog extends Dialog {

  static async create(actor, tmrData) {
    let html = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/dialog-tmr.html', tmrData);

    if (tmrData.mode != 'visu') {
      // Notification au MJ
      ChatMessage.create({ content: actor.name + " est monté dans les TMR en mode : " + tmrData.mode, whisper: ChatMessage.getWhisperRecipients("GM") });
    }

    return new RdDTMRDialog(html, actor, tmrData);
  }

  /* -------------------------------------------- */
  constructor(html, actor, tmrData) {
    const dialogConf = {
      title: "Terres Médianes de Rêve",
      content: html,
      buttons: {
        closeButton: { label: "Fermer", callback: html => this.close(html) }
      },
      default: "closeButton"
    }

    const dialogOptions = {
      classes: ["tmrdialog"],
      width: 920, height: 980,
      'z-index': 40
    }
    super(dialogConf, dialogOptions);

    this.tmrdata = duplicate(tmrData);
    this.actor = actor;
    this.actor.tmrApp = this; // reference this app in the actor structure
    this.viewOnly = tmrData.mode == "visu"
    this.fatigueParCase = this.viewOnly || !ReglesOptionelles.isUsing("appliquer-fatigue") ? 0 : this.actor.getTMRFatigue();
    this.cumulFatigue = 0;
    this.loadRencontres();
    this.loadCasesSpeciales();
    this.allTokens = [];
    this.rencontreState = 'aucune';
    this.pixiApp = new PIXI.Application({ width: 720, height: 860 });

    this.pixiTMR = new PixiTMR(this, this.pixiApp);

    this.callbacksOnAnimate = [];
    if (!this.viewOnly) {
      this._tellToGM(this.actor.name + " monte dans les terres médianes (" + tmrData.mode + ")");
    }

    // load the texture we need
    this.pixiTMR.load((loader, resources) => this.createPixiSprites());
  }

  isDemiReveCache() {
    return !game.user.isGM && this.actor.isTMRCache();
  }

  /* -------------------------------------------- */
  loadCasesSpeciales() {
    this.casesSpeciales = this.actor.items.filter(item => Draconique.isCaseTMR(item));
  }

  get sortsReserve() {
    return this.actor.itemTypes['sortreserve'];
  }

  getSortsReserve(coord) {
    return this.actor.itemTypes['sortreserve'].filter(// Reserve sur une case fleuve ou normale
      TMRUtility.getTMR(coord).type == 'fleuve'
        ? it => TMRUtility.getTMR(it.system.coord).type == 'fleuve'
        : it => it.system.coord == coord
    );
  }

  /* -------------------------------------------- */
  loadRencontres() {
    this.rencontresExistantes = this.actor.getTMRRencontres();
  }

  /* -------------------------------------------- */
  createPixiSprites() {
    EffetsDraconiques.carteTmr.createSprite(this.pixiTMR);
    this.updateTokens();
    this.forceDemiRevePositionView();
  }

  /* -------------------------------------------- */
  _createTokens() {
    if (!this.isDemiReveCache()) {
      this.demiReve = this._tokenDemiReve();
      this._trackToken(this.demiReve);
    }
    let tokens = this._getTokensCasesTmr()
      .concat(this._getTokensRencontres())
      .concat(this._getTokensSortsReserve());

    for (let t of tokens) {
      this._trackToken(t);
    }
  }

  /* -------------------------------------------- */
  updateTokens() {
    this._removeTokens(t => true);
    this.loadRencontres();
    this.loadCasesSpeciales();
    this._createTokens();
  }

  /* -------------------------------------------- */
  removeToken(tmr, casetmr) {
    this._removeTokens(t => t.coordTMR() == tmr.coord && t.caseSpeciale?._id == casetmr._id);
    this.updateTokens()
  }

  /* -------------------------------------------- */
  _getTokensCasesTmr() {
    return this.casesSpeciales.map(c => this._tokenCaseSpeciale(c)).filter(token => token);
  }
  _getTokensRencontres() {
    return this.rencontresExistantes.map(it => this._tokenRencontre(it));
  }
  _getTokensSortsReserve() {
    return this.actor.itemTypes['sortreserve'].map(it => this._tokenSortEnReserve(it));
  }

  /* -------------------------------------------- */
  _tokenRencontre(rencontre) {
    return EffetsDraconiques.rencontre.token(this.pixiTMR, rencontre, () => rencontre.system.coord);
  }
  _tokenCaseSpeciale(casetmr) {
    const caseData = casetmr;
    const draconique = Draconique.get(caseData.system.specific);
    return draconique?.token(this.pixiTMR, caseData, () => caseData.system.coord);
  }
  _tokenSortEnReserve(sortReserve) {
    return EffetsDraconiques.sortReserve.token(this.pixiTMR, sortReserve, () => sortReserve.system.coord);
  }

  _tokenDemiReve() {
    return EffetsDraconiques.demiReve.token(this.pixiTMR, this.actor, () => this.actor.system.reve.tmrpos.coord);
  }

  forceDemiRevePositionView() {
    this.notifierResonanceSigneDraconique(this._getActorCoord());
    this._trackToken(this.demiReve);
  }

  _getActorCoord() {
    return this.actor.system.reve.tmrpos.coord;
  }

  /* -------------------------------------------- */
  async moveFromKey(move) {
    let oddq = TMRUtility.coordTMRToOddq(this._getActorCoord());

    if (move == 'top') oddq.row -= 1;
    if (move == 'bottom') oddq.row += 1;
    if (move.includes('left')) oddq.col -= 1;
    if (move.includes('right')) oddq.col += 1;
    if (oddq.col % 2 == 1) {
      if (move == 'top-left') oddq.row -= 1;
      if (move == 'top-right') oddq.row -= 1;
    } else {
      if (move == 'bottom-left') oddq.row += 1;
      if (move == 'bottom-right') oddq.row += 1;
    }

    let targetCoord = TMRUtility.oddqToCoordTMR(oddq);
    await this._deplacerDemiReve(targetCoord, 'normal');
    this.checkQuitterTMR();
  }

  /* -------------------------------------------- */
  async activateListeners(html) {
    super.activateListeners(html);

    document.getElementById("tmrrow1").insertCell(0).append(this.pixiApp.view);

    if (this.viewOnly) {
      html.find('.lancer-sort').remove();
      html.find('.lire-signe-draconique').remove();
      return;
    }

    HtmlUtility._showControlWhen($(".appliquerFatigue"), ReglesOptionelles.isUsing("appliquer-fatigue"));
    HtmlUtility._showControlWhen($(".lire-signe-draconique"), this.actor.isResonanceSigneDraconique(this._getActorCoord()));

    // Roll Sort
    html.find('.lancer-sort').click((event) => {
      this.actor.rollUnSort(this._getActorCoord());
    });
    html.find('.lire-signe-draconique').click((event) => {
      this.actor.rollLireSigneDraconique(this._getActorCoord());
    });

    html.find('#dir-top').click((event) => this.moveFromKey("top"));
    html.find('#dir-top-left').click((event) => this.moveFromKey("top-left"));
    html.find('#dir-top-right').click((event) => this.moveFromKey("top-right"));
    html.find('#dir-bottom-left').click((event) => this.moveFromKey("bottom-left"));
    html.find('#dir-bottom-right').click((event) => this.moveFromKey("bottom-right"));
    html.find('#dir-bottom').click((event) => this.moveFromKey("bottom"));

    // Gestion du cout de montée en points de rêve
    let reveCout = ((this.tmrdata.isRapide && !EffetsDraconiques.isDeplacementAccelere(this.actor)) ? -2 : -1) - this.actor.countMonteeLaborieuse();
    if (ReglesOptionelles.isUsing("appliquer-fatigue")) {
      this.cumulFatigue += this.fatigueParCase;
    }
    await this.actor.reveActuelIncDec(reveCout);

    // Le reste...
    this.updateValuesDisplay();
    let tmr = TMRUtility.getTMR(this._getActorCoord());
    await this.manageRencontre(tmr);
  }

  /* -------------------------------------------- */
  async updateValuesDisplay() {
    if (!this.rendered) {
      return;
    }
    const coord = this._getActorCoord();

    HtmlUtility._showControlWhen($(".lire-signe-draconique"), this.actor.isResonanceSigneDraconique(coord));

    let ptsreve = document.getElementById("tmr-pointsreve-value");
    ptsreve.innerHTML = this.actor.system.reve.reve.value;

    let tmrpos = document.getElementById("tmr-pos");
    if (this.isDemiReveCache()) {
      tmrpos.innerHTML = `?? ( ${TMRUtility.getTMRType(coord)})`;
    } else {
      tmrpos.innerHTML = `${coord} ( ${TMRUtility.getTMRLabel(coord)})`;
    }

    let etat = document.getElementById("tmr-etatgeneral-value");
    etat.innerHTML = this.actor.getEtatGeneral();

    let refoulement = document.getElementById("tmr-refoulement-value");
    refoulement.innerHTML = this.actor.system.reve.refoulement.value;

    if (ReglesOptionelles.isUsing("appliquer-fatigue")) {
      let fatigueItem = document.getElementById("tmr-fatigue-table");
      fatigueItem.innerHTML = "<table class='table-fatigue'>" + RdDUtility.makeHTMLfatigueMatrix(this.actor.system.sante.fatigue.value, this.actor.system.sante.endurance.max).html() + "</table>";
    }
  }

  /* -------------------------------------------- */
  async close() {
    this.descenteTMR = true;
    if (this.actor.tmrApp) {
      this.actor.tmrApp = undefined; // Cleanup reference
      if (!this.viewOnly) {
        await this.actor.setEffect(STATUSES.StatusDemiReve, false)
        this._tellToGM(this.actor.name + " a quitté les terres médianes");
      }
      await this.actor.santeIncDec("fatigue", this.cumulFatigue)
    }
    await super.close(); // moving 1 cell costs 1 fatigue
  }

  /* -------------------------------------------- */
  async onActionRencontre(action, tmr) {
    switch (action) {
      case 'derober':
        await this.derober();
        return;
      case 'refouler':
        await this.refouler();
        break;
      case 'maitriser':
        await this.maitriserRencontre();
        break;
      case 'ignorer':
        await this.ignorerRencontre();
        break;
    }
    await this.postRencontre(tmr);
  }

  async derober() {
    console.log("-> derober", this.currentRencontre);
    await this.actor.addTMRRencontre(this.currentRencontre);
    this._tellToGM(this.actor.name + " s'est dérobé et quitte les TMR.");
    this.close();
  }

  /* -------------------------------------------- */
  async refouler() {
    console.log("-> refouler", this.currentRencontre);
    await this.actor.ajouterRefoulement(this.currentRencontre.system.refoulement, `${this.currentRencontre.system.genre == 'f' ? 'une' : 'un'} ${this.currentRencontre.name}`);
    await this.actor.deleteTMRRencontreAtPosition(); // Remove the stored rencontre if necessary
    this.updateTokens();
    this.updateValuesDisplay();
    this.nettoyerRencontre();
  }

  /* -------------------------------------------- */
  async ignorerRencontre() {
    console.log("-> ignorer", this.currentRencontre);
    this._tellToGM(this.actor.name + " a ignoré: " + this.currentRencontre.name);
    await this.actor.deleteTMRRencontreAtPosition(); // Remove the stored rencontre if necessary
    this.updateTokens();
    this.updateValuesDisplay();
    this.nettoyerRencontre();
  }

  /* -------------------------------------------- */
  // garder la trace de l'état en cours
  setRencontreState(state, listCoordTMR) {
    this.rencontreState = state;
    this.$marquerCasesTMR(listCoordTMR ?? []);
  }

  /* -------------------------------------------- */
  $marquerCasesTMR(listCoordTMR) {
    this.currentRencontre.graphics = []; // Keep track of rectangles to delete it
    this.currentRencontre.locList = duplicate(listCoordTMR); // And track of allowed location
    for (let coordTMR of listCoordTMR) {
      const rect = this._getCaseRectangleCoord(coordTMR);
      const rectDraw = new PIXI.Graphics();
      rectDraw.beginFill(0xffff00, 0.3);
      // set the line style to have a width of 5 and set the color to red
      rectDraw.lineStyle(5, 0xff0000);
      // draw a rectangle
      rectDraw.drawRect(rect.x, rect.y, rect.w, rect.h);
      this.pixiApp.stage.addChild(rectDraw);
      this.currentRencontre.graphics.push(rectDraw); // garder les objets pour gestion post-click
    }
  }

  /* -------------------------------------------- */
  checkQuitterTMR() {

    if (this.actor.isDead()) {
      this._tellToGM("Vous êtes mort : vous quittez les Terres médianes !");
      this.close();
      return true;
    }
    const resteAvantInconscience = this.actor.getFatigueMax() - this.actor.getFatigueActuelle() - this.cumulFatigue;
    if (ReglesOptionelles.isUsing("appliquer-fatigue") && resteAvantInconscience <= 0) {
      this._tellToGM("Vous vous écroulez de fatigue : vous quittez les Terres médianes !");
      this.quitterLesTMRInconscient();
      return true;
    }
    if (this.actor.getReveActuel() == 0) {
      this._tellToGM("Vos Points de Rêve sont à 0 : vous quittez les Terres médianes !");
      this.quitterLesTMRInconscient();
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  async quitterLesTMRInconscient() {
    await this.refouler();
    this.close();
  }

  /* -------------------------------------------- */
  async maitriserRencontre() {
    console.log("-> maitriser", this.currentRencontre);

    await this.actor.deleteTMRRencontreAtPosition();
    this.updateTokens();

    let rencontreData = {
      actor: this.actor,
      alias: this.actor.name,
      reveDepart: this.actor.getReveActuel(),
      competence: this.actor.getBestDraconic(),
      rencontre: this.currentRencontre,
      nbRounds: 1,
      canClose: false,
      selectedCarac: { label: "reve-actuel" },
      tmr: TMRUtility.getTMR(this._getActorCoord())
    }

    await this._tentativeMaitrise(rencontreData);
  }

  /* -------------------------------------------- */
  async _tentativeMaitrise(rencData) {
    rencData.reve = this.actor.getReveActuel();
    rencData.etat = this.actor.getEtatGeneral();

    RollDataAjustements.calcul(rencData, this.actor);

    rencData.rolled = rencData.presentCite
      ? this._rollPresentCite(rencData)
      : await RdDResolutionTable.roll(rencData.reve, RollDataAjustements.sum(rencData.ajustements));

    const result = rencData.rolled.isSuccess
      ? rencData.rencontre.system.succes
      : rencData.rencontre.system.echec;

    await RdDRencontre.appliquer(result.effets, this, rencData);

    rencData.poesie = { extrait: result.poesie, reference: result.reference };
    rencData.message = this.formatMessageRencontre(rencData, result.message);

    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(game.user.name),
      content: await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/chat-rencontre-tmr.html`, rencData)
    });

    this.updateValuesDisplay();
    if (this.checkQuitterTMR()) {
      return;
    }
    if (this.rencontreState == 'persistant') {
      this._nouvelleTentativeMaitrise(rencData);
    }
    else if (!this.isRencontreDeplacement()) {
      this.nettoyerRencontre();
    }
  }

  _nouvelleTentativeMaitrise(rencData) {
    setTimeout(() => {
      // TODO: remplacer par une boucle while(this.currentRencontre) ?
      rencData.nbRounds++;
      if (ReglesOptionelles.isUsing("appliquer-fatigue")) {
        this.cumulFatigue += this.fatigueParCase;
      }
      this._tentativeMaitrise(rencData);
      this._deleteTmrMessages(rencData.actor, rencData.nbRounds);
    }, 2000);
    this.rencontreState == 'normal';
  }

  formatMessageRencontre(rencData, template) {
    let messageDuree = ''
    if (rencData.nbRounds > 1) {
      if (rencData.rolled.isSuccess) {
        messageDuree = ` Au total, vous avez passé ${rencData.nbRounds} rounds à vous battre!`;
      }
      else {
        messageDuree  = ` Vous avez passé ${rencData.nbRounds} rounds à lutter!`;
      }
    }
    try {
      const compiled = Handlebars.compile(template);
      return compiled(rencData) + messageDuree ;
    } catch (error) {
      return template + messageDuree ;
    }
  }

  /* -------------------------------------------- */
  _rollPresentCite(rencData) {
    let rolled = RdDResolutionTable.computeChances(rencData.reve, 0);
    mergeObject(rolled, { caracValue: rencData.reve, finalLevel: 0, roll: rolled.score });
    RdDResolutionTable.succesRequis(rolled);
    return rolled;
  }

  /* -------------------------------------------- */
  _deleteTmrMessages(actor, nbRounds = -1) {
    setTimeout(() => {
      if (nbRounds < 0) {
        ChatUtility.removeChatMessageContaining(`<h4 data-categorie="tmr" data-actor-id="${actor._id}"`);
      }
      else {
        for (let i = 1; i < nbRounds; i++) {
          ChatUtility.removeChatMessageContaining(`<h4 data-categorie="tmr" data-actor-id="${actor._id}" data-rencontre-round="${i}">`);
        }
      }
    }, 500);
  }

  /* -------------------------------------------- */
  _tellToUser(message) {
    ChatMessage.create({ content: message, user: game.user.id, whisper: [game.user.id] });
  }

  /* -------------------------------------------- */
  _tellToGM(message) {
    ChatMessage.create({ content: message, user: game.user.id, whisper: ChatMessage.getWhisperRecipients("GM") });
  }

  /* -------------------------------------------- */
  _tellToUserAndGM(message) {
    ChatMessage.create({ content: message, user: game.user.id, whisper: [game.user.id].concat(ChatMessage.getWhisperRecipients("GM")) });
  }

  /* -------------------------------------------- */
  async manageRencontre(tmr) {
    if (this.viewOnly) {
      return;
    }
    this.descenteTMR = false;
    this.currentRencontre = undefined;
    if (this._presentCite(tmr)) {
      return;
    }
    this.currentRencontre = await this._jetDeRencontre(tmr);
    if (this.currentRencontre) {
      if (this.rencontresExistantes.find(it => it.id == this.currentRencontre.id)){
        // rencontre en attente suite à dérobade
        await this.maitriserRencontre();
      }
      else {
        let dialog = new RdDTMRRencontreDialog(this, this.currentRencontre, tmr);
        dialog.render(true);
      }
    }
    else {
      this.postRencontre(tmr);
    }
  }

  /* -------------------------------------------- */
  _presentCite(tmr) {
    const presentCite = this.casesSpeciales.find(c => EffetsDraconiques.presentCites.isCase(c, tmr.coord));
    if (presentCite) {
      this.minimize();
      const caseData = presentCite;
      EffetsDraconiques.presentCites.choisirUnPresent(caseData, (present => this._utiliserPresentCite(presentCite, present, tmr)));
    }
    return presentCite;
  }

  /* -------------------------------------------- */
  async _utiliserPresentCite(presentCite, present, tmr) {
    this.currentRencontre = present.clone({
      'system.force': await RdDDice.rollTotal(present.system.formule),
      'system.coord': tmr.coord
    }, {save: false});

    await EffetsDraconiques.presentCites.ouvrirLePresent(this.actor, presentCite);
    this.removeToken(tmr, presentCite);

    // simuler une rencontre
    let rencontreData = {
      actor: this.actor,
      alias: this.actor.name,
      reveDepart: this.actor.getReveActuel(),
      competence: this.actor.getBestDraconic(),
      rencontre: this.currentRencontre,
      tmr: tmr,
      presentCite: presentCite
    };
    await this._tentativeMaitrise(rencontreData);

    this.maximize();
    this.postRencontre(tmr);
  }

  /* -------------------------------------------- */
  async _jetDeRencontre(tmr) {
    let rencontre = this.lookupRencontreExistente(tmr);
    if (rencontre) {
      return game.system.rencontresTMR.calculRencontre(rencontre, tmr);
    }
    let locTMR = (this.isDemiReveCache()
      ? TMRUtility.getTMRType(tmr.coord) + " ??"
      : tmr.label + " (" + tmr.coord + ")");

    let myRoll = await RdDDice.rollTotal("1dt", { showDice: SHOW_DICE });
    if (myRoll == 7) {
      this._tellToUser(myRoll + ": Rencontre en " + locTMR);
      return await game.system.rencontresTMR.getRencontreAleatoire(tmr, this.actor.isMauvaiseRencontre())
    } else {
      this._tellToUser(myRoll + ": Pas de rencontre en " + locTMR);
    }
  }

  lookupRencontreExistente(tmr) {
    return this.rencontresExistantes.find(it => it.system.coord == tmr.coord)
      ?? this.rencontresExistantes.find(it => it.system.coord == "");
  }

  /* -------------------------------------------- */
  async manageTmrInnaccessible(tmr) {
    if (!tmr) {
      return await this.actor.reinsertionAleatoire('Sortie de carte');
    }
    const caseTmrInnaccessible = this.casesSpeciales.find(c => EffetsDraconiques.isInnaccessible(c, tmr.coord));
    if (caseTmrInnaccessible) {
      return await this.actor.reinsertionAleatoire(caseTmrInnaccessible.name);
    }
    return tmr;
  }

  /* -------------------------------------------- */
  async manageCaseHumide(tmr) {
    if (this.isCaseHumide(tmr)) {
      let rollData = {
        actor: this.actor,
        competence: duplicate(this.actor.getBestDraconic()),
        tmr: tmr,
        canClose: false,
        diffLibre: -7,
        forceCarac: { 'reve-actuel': { label: "Rêve Actuel", value: this.actor.getReveActuel() } },
        maitrise: { verbe: 'maîtriser', action: 'Maîtriser le fleuve' }
      }
      rollData.double = EffetsDraconiques.isDoubleResistanceFleuve(this.actor) ? true : undefined,
        rollData.competence.system.defaut_carac = 'reve-actuel';
      await this._rollMaitriseCaseHumide(rollData);
    }
  }

  /* -------------------------------------------- */
  async _rollMaitriseCaseHumide(rollData) {
    await this._maitriserTMR(rollData, r => this._resultatMaitriseCaseHumide(r));
  }

  async _resultatMaitriseCaseHumide(rollData) {
    await this.souffleSiEchecTotal(rollData);
    if (rollData.rolled.isSuccess && rollData.double) {
      rollData.previous = { rolled: rollData.rolled, ajustements: rollData.ajustements };
      rollData.double = undefined;
      await this._rollMaitriseCaseHumide(rollData);
      return;
    }
    rollData.poesie = await Poetique.getExtrait();
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(game.user.name),
      content: await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/chat-resultat-maitrise-tmr.html`, rollData)
    });
    if (rollData.rolled.isEchec) {
      await this.close();
    }
  }

  /* -------------------------------------------- */
  async souffleSiEchecTotal(rollData) {
    if (rollData.rolled.isETotal) {
      rollData.souffle = await this.actor.ajouterSouffle({ chat: false });
    }
  }

  /* -------------------------------------------- */
  isCaseHumide(tmr) {
    if (!(TMRUtility.isCaseHumide(tmr) || this.isCaseHumideAdditionelle(tmr))) {
      return false;
    }
    if (this.isCaseMaitrisee(tmr.coord)) {
      ChatMessage.create({
        content: tmr.label + ": cette case humide est déja maitrisée grâce à votre Tête <strong>Quête des Eaux</strong>",
        whisper: ChatMessage.getWhisperRecipients(game.user.name)
      });
      return false;
    }
    return true;
  }

  /* -------------------------------------------- */
  isCaseHumideAdditionelle(tmr) {
    if (tmr.type == 'pont' && EffetsDraconiques.isPontImpraticable(this.actor)) {
      ChatMessage.create({
        content: tmr.label + ": Vous êtes sous le coup d'une Impraticabilité des Ponts : ce pont doit être maîtrisé comme une case humide.",
        whisper: ChatMessage.getWhisperRecipients(game.user.name)
      });
      return true;
    }
    if (this.isCaseInondee(tmr.coord)) {
      ChatMessage.create({
        content: tmr.label + ": cette case est inondée, elle doit être maîtrisée comme une case humide.",
        whisper: ChatMessage.getWhisperRecipients(game.user.name)
      });
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  async conquerirCiteFermee(tmr) {
    if (EffetsDraconiques.fermetureCites.find(this.casesSpeciales, tmr.coord)) {
      await this._conquerir(tmr, {
        difficulte: -9,
        action: 'Conquérir la cité',
        onConqueteReussie: r => EffetsDraconiques.fermetureCites.onVisiteSupprimer(r.actor, tmr, (casetmr) => this.removeToken(tmr, casetmr)),
        onConqueteEchec: r => {
          this.souffleSiEchecTotal(rollData);
          this.close()
        },
        canClose: false
      });
    }
  }
  /* -------------------------------------------- */
  async purifierPeriple(tmr) {
    if (EffetsDraconiques.periple.find(this.casesSpeciales, tmr.coord)) {
      await this._conquerir(tmr, {
        difficulte: EffetsDraconiques.periple.getDifficulte(tmr),
        action: 'Purifier ' + TMRUtility.getTMRDescr(tmr.coord),
        onConqueteReussie: r => EffetsDraconiques.periple.onVisiteSupprimer(r.actor, tmr, (casetmr) => this.removeToken(tmr, casetmr)),
        onConqueteEchec: r => {
          this.souffleSiEchecTotal(rollData);
          this.close()
        },
        canClose: false
      });
    }
  }

  /* -------------------------------------------- */
  async conquerirTMR(tmr) {
    if (EffetsDraconiques.conquete.find(this.casesSpeciales, tmr.coord)) {
      await this._conquerir(tmr, {
        difficulte: -7,
        action: 'Conquérir',
        onConqueteReussie: r => EffetsDraconiques.conquete.onVisiteSupprimer(r.actor, tmr, (casetmr) => this.removeToken(tmr, casetmr)),
        onConqueteEchec: r => this.close(),
        canClose: false
      });
    }
  }

  /* -------------------------------------------- */
  async _conquerir(tmr, options) {
    let rollData = {
      actor: this.actor,
      competence: duplicate(this.actor.getBestDraconic()),
      tmr: tmr,
      canClose: options.canClose ?? false,
      diffLibre: options.difficulte ?? -7,
      forceCarac: { 'reve-actuel': { label: "Rêve Actuel", value: this.actor.getReveActuel() } },
      maitrise: { verbe: 'conquérir', action: options.action }
    };
    rollData.competence.system.defaut_carac = 'reve-actuel';

    await this._maitriserTMR(rollData, r => this._onResultatConquerir(r, options));
  }

  /* -------------------------------------------- */
  async _onResultatConquerir(rollData, options) {
    if (rollData.rolled.isETotal) {
      rollData.souffle = await this.actor.ajouterSouffle({ chat: false });
    }
    rollData.poesie = await Poetique.getExtrait();
    ChatMessage.create({
      whisper: ChatUtility.getWhisperRecipientsAndGMs(game.user.name),
      content: await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/chat-resultat-maitrise-tmr.html`, rollData)
    });
    if (rollData.rolled.isEchec) {
      options.onConqueteEchec(rollData, options.effetDraconique);
    }
    else {
      await options.onConqueteReussie(rollData, options.effetDraconique);
      this.updateTokens();
    }
  }

  /* -------------------------------------------- */
  async _maitriserTMR(rollData, callbackMaitrise) {
    this.minimize(); // Hide
    rollData.isTMRCache = rollData.actor.isTMRCache();
    const dialog = await RdDRoll.create(this.actor, rollData,
      {
        html: 'systems/foundryvtt-reve-de-dragon/templates/dialog-roll-maitrise-tmr.html',
        close: html => { this.maximize(); } // Re-display TMR
      },
      {
        name: rollData.maitrise.verbe, label: rollData.maitrise.action,
        callbacks: [
          this.actor.createCallbackExperience(),
          { action: callbackMaitrise }
        ]
      }
    );
    dialog.render(true);
  }

  /* -------------------------------------------- */
  async validerVisite(tmr) {
    await EffetsDraconiques.pelerinage.onVisiteSupprimer(this.actor, tmr, (casetmr) => this.removeToken(tmr, casetmr));
    await EffetsDraconiques.urgenceDraconique.onVisiteSupprimer(this.actor, tmr, (casetmr) => this.removeToken(tmr, casetmr));
  }


  /* -------------------------------------------- */
  async declencheSortEnReserve(coord) {
    let sorts = this.getSortsReserve(coord);
    if (sorts.length > 0) {
      if (EffetsDraconiques.isSortReserveImpossible(this.actor)) {
        ui.notifications.error("Une queue ou un souffle vous empèche de déclencher de sort!");
        return;
      }
      if (!EffetsDraconiques.isUrgenceDraconique(this.actor) &&
        (EffetsDraconiques.isReserveEnSecurite(this.actor) || this.isReserveExtensible(coord))) {
        let msg = "Vous êtes sur une case avec un Sort en Réserve. Grâce à votre Tête <strong>Reserve en Sécurité</strong> ou <strong>Réserve Exensible</strong>, vous pouvez contrôler le déclenchement. Cliquez si vous souhaitez le déclencher : <ul>";
        for (let sort of sorts) {
          msg += `<li><a class="chat-card-button declencher-sort-reserve" data-actor-id="${this.actor.id}" data-tmr-coord="${coord}" data-sort-id='${sort.id}">${sort.name}</a></li>`;
        }
        msg += "</ol>";
        ChatMessage.create({
          content: msg,
          whisper: ChatMessage.getWhisperRecipients(game.user.name)
        });
        return;
      }
      await this.processSortReserve(sorts[0]);
    }
  }

  /* -------------------------------------------- */
  lancerSortEnReserve(coord, sortId) {
    let sorts = this.getSortsReserve(coord);
    let sort = sorts.find(it => it.id == sortId);
    if (sort) {
      this.processSortReserve(sort);
    } else {
      ChatMessage.create({
        content:
          "Une erreur est survenue : impossible de récupérer le sort en réserve demandé.",
        whisper: ChatMessage.getWhisperRecipients(game.user.name),
      });
    }
  }

  /* -------------------------------------------- */
  async processSortReserve(sortReserve) {
    await this.actor.deleteEmbeddedDocuments('Item', [sortReserve.id]);
    console.log("declencheSortEnReserve", sortReserve);
    const heureCible = RdDCalendrier.getSigneAs('label', sortReserve.system.heurecible);
    this._tellToUserAndGM(`Vous avez déclenché 
        ${sortReserve.system.echectotal ? "<strong>l'échec total!</strong>" : "le sort"}
        en réserve <strong>${sortReserve.name}</strong>
        avec ${sortReserve.system.ptreve} points de Rêve
        en ${sortReserve.system.coord} (${TMRUtility.getTMRLabel(sortReserve.system.coord)}).
        L'heure ciblée est ${heureCible}`);
    this.close();
  }

  /* -------------------------------------------- */
  nettoyerRencontre() {
    if (!this.currentRencontre) return; // Sanity check
    if (this.currentRencontre.graphics) {
      for (let drawRect of this.currentRencontre.graphics) { // Suppression des dessins des zones possibles
        this.pixiApp.stage.removeChild(drawRect);
      }
    }
    this.currentRencontre = undefined; // Nettoyage de la structure
    this.rencontreState = 'aucune'; // Et de l'état
  }

  /* -------------------------------------------- */
  isCaseInondee(coord) {
    return EffetsDraconiques.debordement.find(this.casesSpeciales, coord);
  }

  isCiteFermee(coord) {
    return EffetsDraconiques.fermetureCites.find(this.casesSpeciales, coord);
  }

  /* -------------------------------------------- */
  isTerreAttache(coord) {
    return EffetsDraconiques.terreAttache.find(this.casesSpeciales, coord);
  }

  /* -------------------------------------------- */
  isCaseMaitrisee(coord) {
    return EffetsDraconiques.queteEaux.find(this.casesSpeciales, coord);
  }

  /* -------------------------------------------- */
  isReserveExtensible(coord) {
    return EffetsDraconiques.reserveExtensible.find(this.casesSpeciales, coord);
  }

  /* -------------------------------------------- */
  isConnaissanceFleuve(currentTMR, nextTMR) {
    return TMRUtility.getTMR(currentTMR).type == 'fleuve' &&
      TMRUtility.getTMR(nextTMR).type == 'fleuve' &&
      EffetsDraconiques.isConnaissanceFleuve(this.actor);
  }

  /* -------------------------------------------- */
  async onClickTMR(event) {
    if (this.viewOnly) {
      return;
    }
    let clickOddq = RdDTMRDialog._computeEventOddq(event.data.originalEvent);
    await this._onClickTMRPos(clickOddq); // Vérifier l'état des compteurs reve/fatigue/vie
  }

  /* -------------------------------------------- */
  async _onClickTMRPos(clickOddq) {
    let currentOddq = TMRUtility.coordTMRToOddq(this._getActorCoord());
    let targetCoord = TMRUtility.oddqToCoordTMR(clickOddq);
    let currentCoord = TMRUtility.oddqToCoordTMR(currentOddq);
    // Validation de la case de destination (gestion du cas des rencontres qui peuvent téléporter)
    let deplacementType = this._calculDeplacement(targetCoord, currentCoord, currentOddq, clickOddq);

    if (this.isDemiReveCache()) {
      if (this.isTerreAttache(targetCoord)
        || this.isConnaissanceFleuve(currentCoord, targetCoord)
        || deplacementType == 'changeur') {
        // déplacement possible
        await this.actor.setTMRVisible(true);
        this.demiReve = this._tokenDemiReve();
        this._trackToken(this.demiReve);
      }
      else {
        ui.notifications.error(`Vous ne connaissez plus votre position dans les TMR.
        Vous devez utiliser les boutons de direction pour vous déplacer.
        Une fois que vous aurez retrouvé votre demi-rêve, demandez au gardien de vérifier et rendre les TMR visibles.
        `);
        return;
      }
    }

    switch (deplacementType) {
      case 'normal':
      case 'changeur':
      case 'passeur':
        await this._deplacerDemiReve(targetCoord, deplacementType);
        break;
      case 'messager':
        await this._messagerDemiReve(targetCoord);
        break;
      default:
        ui.notifications.error("Vous ne pouvez pas vous déplacer que sur des cases adjacentes à votre position ou valides dans le cas d'une rencontre");
        console.log("STATUS :", this.rencontreState, this.currentRencontre);
    }

    this.checkQuitterTMR();
  }

  /* -------------------------------------------- */
  _calculDeplacement(targetCoord, currentCoord, fromOddq, toOddq) {
    if (this.isRencontreDeplacement()) {
      if (this.currentRencontre?.locList?.find(coord => coord == targetCoord)) {
        return this.rencontreState;
      }
    }
    else {
      if (this.isTerreAttache(targetCoord) || this.isConnaissanceFleuve(currentCoord, targetCoord) || TMRUtility.distanceOddq(fromOddq, toOddq) <= 1) {
        return 'normal'
      }
    }
    return 'erreur';
  }

  isRencontreDeplacement() {
    return ['passeur', 'changeur', 'messager'].includes(this.rencontreState);
  }

  /* -------------------------------------------- */
  async _messagerDemiReve(targetCoord) {
    /*
     TODO: si la case a un sort en réserve, lancer ce sort.
     Si la case est le demi-rêve, ne pas lancer de sort.
     Si un lancement de sort est en cours, trouver un moyen de réafficher cette fenêtre si on essaie de lancer un sort (ou bloquer le lancer de sort)
    */
    this.notifierResonanceSigneDraconique(targetCoord);
    await this.actor.rollUnSort(targetCoord);
    this.nettoyerRencontre();
  }

  /* -------------------------------------------- */
  externalRefresh() {
    this.createPixiSprites();
    this.updateValuesDisplay();
    this.updateTokens();
    console.log("TMR REFRESHED !!!");
  }

  /* -------------------------------------------- */
  async _deplacerDemiReve(targetCoord, deplacementType) {
    if (this.currentRencontre != 'normal') {
      this.nettoyerRencontre();
    }
    let tmr = TMRUtility.getTMR(targetCoord);
    // Gestion cases spéciales type Trou noir, etc
    tmr = await this.manageTmrInnaccessible(tmr);

    await this.actor.updateCoordTMR(tmr.coord);

    this.forceDemiRevePositionView();
    if (ReglesOptionelles.isUsing("appliquer-fatigue")) {
      this.cumulFatigue += this.fatigueParCase;
    }
    this.updateValuesDisplay();
    this.actor.notifyRefreshTMR();

    if (deplacementType == 'normal') { // Pas de rencontres après un saut de type passeur/changeur/...
      await this.manageRencontre(tmr);
    }
    else {
      await this.postRencontre(tmr);
    }
  }

  async notifierResonanceSigneDraconique(coord) {
    if (this.actor.isResonanceSigneDraconique(coord)) {
      ChatMessage.create({
        whisper: ChatUtility.getWhisperRecipientsAndGMs(game.user.name),
        content: await renderTemplate(`systems/foundryvtt-reve-de-dragon/templates/chat-signe-draconique-resonance.html`, { alias: this.actor.name, typeTMR: TMRUtility.getTMRType(coord) })
      });
    }
  }

  /* -------------------------------------------- */
  async postRencontre(tmr) {
    if (!(this.viewOnly || this.currentRencontre)) {
      // TODO: vérifier que la méthode s'arrête en cas de non-maîtrise
      if (!this.descenteTMR) await this.manageCaseHumide(tmr);
      if (!this.descenteTMR) await this.conquerirCiteFermee(tmr);
      if (!this.descenteTMR) await this.purifierPeriple(tmr);
      if (!this.descenteTMR) await this.conquerirTMR(tmr);
      if (!this.descenteTMR) await this.validerVisite(tmr);
      if (!this.descenteTMR) await this.declencheSortEnReserve(tmr.coord);
      if (!this.descenteTMR) await this.actor.checkSoufflePeage(tmr);
    }
  }

  /* -------------------------------------------- */
  async positionnerDemiReve(coord) {
    await this.actor.updateCoordTMR(coord);
    this.forceDemiRevePositionView();
    let tmr = TMRUtility.getTMR(coord);
    await this.postRencontre(tmr);
    return tmr;
  }

  /* -------------------------------------------- */
  static _computeEventOddq(origEvent) {
    let canvasRect = origEvent.target.getBoundingClientRect();
    let x = origEvent.clientX - canvasRect.left;
    let y = origEvent.clientY - canvasRect.top;
    let col = Math.floor(x / tmrConstants.cellw); //  [From 0 -> 12]
    y -= col % 2 == 0 ? tmrConstants.col1_y : tmrConstants.col2_y;
    let row = Math.floor(y / tmrConstants.cellh); //  [From 0 -> 14]
    return { col: col, row: row };
  }

  /* -------------------------------------------- */
  /** Retourne les coordonnées x, h, w, h du rectangle d'une case donnée */
  _getCaseRectangleCoord(coord) {
    return this.pixiTMR.getCaseRectangle(TMRUtility.coordTMRToOddq(coord));
  }

  /* -------------------------------------------- */
  _removeTokens(filter) {
    const tokensToRemove = this.allTokens.filter(filter);
    for (let token of tokensToRemove) {
      this.pixiApp.stage.removeChild(token.sprite);
    }
  }

  /* -------------------------------------------- */
  _trackToken(token) {
    if (this.demiReve === token && this.isDemiReveCache()) {
      return;
    }
    this.pixiTMR.setPosition(token.sprite, TMRUtility.coordTMRToOddq(token.coordTMR()));
    this.allTokens.push(token);
  }
}
