/* -------------------------------------------- */
import { RdDCalendrierEditeur } from "./rdd-calendrier-editeur.js";
import { RdDAstrologieEditeur } from "./rdd-astrologie-editeur.js";
import { HtmlUtility } from "./html-utility.js";
import { RdDResolutionTable } from "./rdd-resolution-table.js";
import { RdDUtility } from "./rdd-utility.js";
import { Grammar } from "./grammar.js";
import { RdDDice } from "./rdd-dice.js";
import { Misc } from "./misc.js";
import { HIDE_DICE, SHOW_DICE, SYSTEM_RDD, SYSTEM_SOCKET_ID } from "./constants.js";
import { DialogChronologie } from "./dialog-chronologie.js";

/* -------------------------------------------- */
const dossierIconesHeures = 'systems/foundryvtt-reve-de-dragon/icons/heures/'
const heuresList = ["vaisseau", "sirene", "faucon", "couronne", "dragon", "epees", "lyre", "serpent", "poissonacrobate", "araignee", "roseau", "chateaudormant"];
const heuresDef = {
  "vaisseau": {key: "vaisseau", label: "Vaisseau", lettreFont: 'v', saison: "printemps", heure: 0, icon: 'hd01.svg' },
  "sirene": { key: "sirene", label: "Sirène", lettreFont: 'i', saison: "printemps", heure: 1, icon: 'hd02.svg' },
  "faucon": { key: "faucon", label: "Faucon", lettreFont: 'f', saison: "printemps", heure: 2, icon: 'hd03.svg' },
  "couronne": { key: "couronne", label: "Couronne", lettreFont: '', saison: "ete", heure: 3, icon: 'hd04.svg' },
  "dragon": { key: "dragon", label: "Dragon", lettreFont: 'd', saison: "ete", heure: 4, icon: 'hd05.svg' },
  "epees": { key: "epees", label: "Epées", lettreFont: 'e', saison: "ete", heure: 5, icon: 'hd06.svg' },
  "lyre": { key: "lyre", label: "Lyre", lettreFont: 'l', saison: "automne", heure: 6, icon: 'hd07.svg' },
  "serpent": { key: "serpent", label: "Serpent", lettreFont: 's', saison: "automne", heure: 7, icon: 'hd08.svg' },
  "poissonacrobate": { key: "poissonacrobate", label: "Poisson Acrobate", lettreFont: 'p', saison: "automne", heure: 8, icon: 'hd09.svg' },
  "araignee": { key: "araignee", label: "Araignée", lettreFont: 'a', saison: "hiver", heure: 9, icon: 'hd10.svg' },
  "roseau": { key: "roseau", label: "Roseau", lettreFont: 'r', saison: "hiver", heure: 10, icon: 'hd11.svg' },
  "chateaudormant": { key: "chateaudormant", label: "Château Dormant", lettreFont: 'c', saison: "hiver", heure: 11, icon: 'hd12.svg' }
};
const saisonsDef = {
  "printemps": { label: "Printemps" },
  "ete": { label: "Eté" },
  "automne": { label: "Automne" },
  "hiver": { label: "Hiver" }
};

const RDD_MOIS_PAR_AN = 12;
export const RDD_JOUR_PAR_MOIS = 28;
const RDD_HEURES_PAR_JOUR = 12;
const RDD_MINUTES_PAR_HEURES = 120;
const MAX_NOMBRE_ASTRAL = 12;

/* -------------------------------------------- */
export class RdDCalendrier extends Application {

  static createCalendrierPos() {
    return { top: 200, left: 200 };
  }

  static getDefSigne(chiffre) {
    chiffre = chiffre % RDD_MOIS_PAR_AN;
    return Object.values(heuresDef).find(h => h.heure == chiffre);
  }

  static getSigneAs(key, value) {
    const heure = (typeof value == 'string' || typeof value == 'number') && Number.isInteger(Number(value))
      ? Number(value)
      : (typeof value == 'string') ? RdDCalendrier.getChiffreFromSigne(value)
      : undefined

    if (heure != undefined && ['key', 'label', 'lettreFont', 'saison', 'heure', 'icon'].includes(key)) {
      return RdDCalendrier.getDefSigne(heure)[key]
    }
    if (heure != undefined && ['webp'].includes(key)) {
      return RdDCalendrier.getDefSigne(heure)['icon'].replace('svg', 'webp');
    }
    console.error(`Appel à getSigneAs('${key}', ${value}) avec une clé/heure incorrects`);
    return value;

  }
  static getChiffreFromSigne(signe) {
    return heuresList.indexOf(signe);
  }

  static createCalendrierInitial() {
    return {
      heureRdD: 0,
      minutesRelative: 0,
      indexJour: 0,
      annee: 0,
      moisRdD: 0,
      moisLabel: heuresDef["vaisseau"].label,
      jour: 0
    }
  }

  getCalendrier(index) {
    index = index ?? this.getCurrentDayIndex();
    const mois = Math.floor(index / RDD_JOUR_PAR_MOIS) % RDD_MOIS_PAR_AN;
    return {
      heureRdD: 0, // Index dans heuresList / heuresDef[x].heure
      minutesRelative: 0,
      indexJour: index,
      annee: Math.floor(index / (RDD_JOUR_PAR_MOIS * RDD_MOIS_PAR_AN)),
      moisRdD: RdDCalendrier.getDefSigne(mois).heure,
      moisLabel: RdDCalendrier.getDefSigne(mois).label,
      jour: (index % RDD_JOUR_PAR_MOIS) // Le calendrier stocke le jour en 0-27, mais en 1-28 à l'affichage
    }
  }

  constructor() {
    super();
    // position
    this.calendrierPos = duplicate(game.settings.get(SYSTEM_RDD, "calendrier-pos"));
    if (this.calendrierPos == undefined || this.calendrierPos.top == undefined) {
      this.calendrierPos = RdDCalendrier.createCalendrierPos();
      game.settings.set(SYSTEM_RDD, "calendrier-pos", this.calendrierPos);
    }

    // Calendrier
    this.calendrier = duplicate(game.settings.get(SYSTEM_RDD, "calendrier") ?? RdDCalendrier.createCalendrierInitial());
    this.calendrier.annee = this.calendrier.annee ?? Math.floor((this.calendrier.moisRdD ?? 0) / RDD_MOIS_PAR_AN);
    this.calendrier.moisRdD = (this.calendrier.moisRdD ?? 0) % RDD_MOIS_PAR_AN;

    if (Misc.isUniqueConnectedGM()) { // Uniquement si GM
      game.settings.set(SYSTEM_RDD, "calendrier", this.calendrier);

      this.listeNombreAstral = this.getListeNombreAstral();
      this.rebuildListeNombreAstral(HIDE_DICE); // Ensure always up-to-date
    }
    console.log('RdDCalendrier.constructor()', this.calendrier, this.calendrierPos, this.listeNombreAstral);
  }

  /* -------------------------------------------- */
  getListeNombreAstral() {
    return game.settings.get(SYSTEM_RDD, "liste-nombre-astral") ?? [];
  }

  /* -------------------------------------------- */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/foundryvtt-reve-de-dragon/templates/calendar-template.html",
      popOut: false,
      resizable: false
    });
  }

  /* -------------------------------------------- */
  getDateFromIndex(index) {
    const dateRdD = this.getCalendrier(index);
    return (dateRdD.jour + 1) + ' ' + dateRdD.moisLabel;
  }

  /* -------------------------------------------- */
  getDayMonthFromIndex(index = undefined) {
    const dateRdD = this.getCalendrier(index);
    return {
      day: dateRdD.jour + 1,
      month: heuresList[dateRdD.moisRdD]
    }
  }

  /* -------------------------------------------- */
  getCurrentHeure() {
    return heuresList[this.calendrier.heureRdD];
  }

  /* -------------------------------------------- */
  getCurrentDayIndex() {
    return (((this.calendrier.annee ?? 0) * RDD_MOIS_PAR_AN + (this.calendrier.moisRdD ?? 0)) * RDD_JOUR_PAR_MOIS) + (this.calendrier.jour ?? 0);
  }

  /* -------------------------------------------- */
  getIndexFromDate(jour, mois) {
    return (heuresDef[mois].heure * RDD_JOUR_PAR_MOIS) + jour - 1;
  }
  /* -------------------------------------------- */
  getJoursSuivants(num) {
    let jours = [];
    let index = this.getCurrentDayIndex();
    for (let i = 0; i < num; i++) {
      jours[i] = { label: this.getDateFromIndex(index + i), index: index + i };
    }
    return jours;
  }

  /* -------------------------------------------- */
  async ajouterNombreAstral(index, showDice = SHOW_DICE) {
    const nombreAstral = await RdDDice.rollTotal("1dh", { showDice: showDice, rollMode: "selfroll" });
    const dateFuture = this.getDateFromIndex(index);
    if (showDice != HIDE_DICE) {
      ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients("GM"),
        content: `Le chiffre astrologique du ${dateFuture} sera le ${nombreAstral}`
      });
    }
    return {
      nombreAstral: nombreAstral,
      valeursFausses: [],
      index: index
    }
  }

  /* -------------------------------------------- */
  getCurrentNombreAstral() {
    let indexDate = this.getCurrentDayIndex();
    return this.getNombreAstral(indexDate);
  }

  /* -------------------------------------------- */
  resetNombreAstral() {
    this.listeNombreAstral = [];
    game.settings.set(SYSTEM_RDD, "liste-nombre-astral", this.listeNombreAstral);

    game.socket.emit(SYSTEM_SOCKET_ID, {
      msg: "msg_reset_nombre_astral",
      data: {}
    });
  }

  /* -------------------------------------------- */
  getNombreAstral(indexDate) {
    const listNombreAstral = this.getListeNombreAstral();
    let astralData = listNombreAstral.find((nombreAstral, i) => nombreAstral.index == indexDate);
    return astralData?.nombreAstral;
  }

  /* -------------------------------------------- */
  async rebuildListeNombreAstral(showDice = HIDE_DICE) {
    if (Misc.isUniqueConnectedGM()) {
      let jourCourant = this.getCurrentDayIndex();
      let newList = [];
      for (let i = 0; i < MAX_NOMBRE_ASTRAL; i++) {
        let dayIndex = jourCourant + i;
        let na = this.listeNombreAstral.find(n => n.index == dayIndex);
        if (na) {
          newList[i] = na;
        } else {
          newList[i] = await this.ajouterNombreAstral(dayIndex, showDice);
        }
      }
      game.settings.set(SYSTEM_RDD, "liste-nombre-astral", newList);
      this.listeNombreAstral = newList;
    }
  }

  /* -------------------------------------------- */
  async onCalendarButton(ev) {
    ev.preventDefault();
    const calendarAvance = ev.currentTarget.attributes['data-calendar-avance'];
    const calendarSet = ev.currentTarget.attributes['data-calendar-set'];
    if (calendarAvance) {
      await this.incrementTime(Number(calendarAvance.value));
    }
    else if (calendarSet) {
      this.positionnerHeure(Number(calendarSet.value));
    }
    this.updateDisplay();
  }

  /* -------------------------------------------- */
  checkMaladie( periode) {
    for (let actor of game.actors) {
      if (actor.type == 'personnage') {
        let maladies = actor.items.filter( item => (item.type == 'maladie' || (item.type == 'poison' && item.system.active) ) && item.system.periodicite.toLowerCase().includes(periode) );
        for (let maladie of maladies) {
          if ( maladie.system.identifie) {
            ChatMessage.create({ content: `${actor.name} souffre de ${maladie.name} (${maladie.type}): vérifiez que les effets ne se sont pas aggravés !` });
          } else {
            ChatMessage.create({ content: `${actor.name} souffre d'un mal inconnu (${maladie.type}): vérifiez que les effets ne se sont pas aggravés !` });
          }
          let itemMaladie = actor.getObjet(maladie.id)
          itemMaladie.postItem( 'gmroll');
        }
      }
    }    
  }

  /* -------------------------------------------- */
  async incrementTime(minutes = 0) {
    this.calendrier.minutesRelative += minutes;
    this.checkMaladie("round");
    this.checkMaladie("minute");
    if (this.calendrier.minutesRelative >= RDD_MINUTES_PAR_HEURES) {
      this.calendrier.minutesRelative -= RDD_MINUTES_PAR_HEURES;
      this.calendrier.heureRdD += 1;
      this.checkMaladie("heure");
      }
    if (this.calendrier.heureRdD >= RDD_HEURES_PAR_JOUR) {
      this.calendrier.heureRdD -= RDD_HEURES_PAR_JOUR;
      await this.incrementerJour();
      this.checkMaladie("heure");
      this.checkMaladie("jour");
    }
    game.settings.set(SYSTEM_RDD, "calendrier", duplicate(this.calendrier));
    // Notification aux joueurs // TODO: replace with Hook on game settings update
    game.socket.emit(SYSTEM_SOCKET_ID, {
      msg: "msg_sync_time",
      data: duplicate(this.calendrier)
    });
  }

  /* -------------------------------------------- */
  async incrementerJour() {
    const index = this.getCurrentDayIndex() + 1;
    this.calendrier = this.getCalendrier(index);
    await this.rebuildListeNombreAstral();
  }

  /* -------------------------------------------- */
  syncPlayerTime(calendrier) {
    this.calendrier = duplicate(calendrier); // Local copy update
    this.updateDisplay();
  }

  /* -------------------------------------------- */
  async positionnerHeure(indexHeure) {
    if (indexHeure <= this.calendrier.heureRdD) {
      await this.incrementerJour();
    }
    this.calendrier.heureRdD = indexHeure;
    this.calendrier.minutesRelative = 0;
    game.settings.set(SYSTEM_RDD, "calendrier", duplicate(this.calendrier));
  }

  /* -------------------------------------------- */
  fillCalendrierData(formData = {}) {
    const mois = RdDCalendrier.getDefSigne(this.calendrier.moisRdD);
    const heure = RdDCalendrier.getDefSigne(this.calendrier.heureRdD);
    console.log('fillCalendrierData', this.calendrier, mois, heure);

    formData.heureKey = heure.key;
    formData.moisKey = mois.key;
    formData.jourMois = this.calendrier.jour + 1;
    formData.nomMois = mois.label; // heures et mois nommés identiques
    formData.annee = this.calendrier.annee;
    formData.iconMois = dossierIconesHeures + mois.icon;
    formData.nomHeure = heure.label;
    formData.iconHeure = dossierIconesHeures + heure.icon;
    formData.nomSaison = saisonsDef[mois.saison].label;
    formData.heureRdD = this.calendrier.heureRdD;
    formData.minutesRelative = this.calendrier.minutesRelative;
    formData.isGM = game.user.isGM;
    return formData;
  }

  /* -------------------------------------------- */
  getLectureAstrologieDifficulte(dateIndex) {
    let indexNow = this.getCurrentDayIndex();
    let diffDay = dateIndex - indexNow;
    return - Math.floor(diffDay / 2);
  }

  /* -------------------------------------------- */
  async requestNombreAstral(request) {
    if (Misc.isUniqueConnectedGM()) { // Only once
      console.log(request);
      let jourDiff = this.getLectureAstrologieDifficulte(request.date);
      let niveau = Number(request.astrologie.system.niveau) + Number(request.conditions) + Number(jourDiff) + Number(request.etat);
      let rollData = {
        caracValue: request.carac_vue,
        finalLevel: niveau,
        showDice: HIDE_DICE,
        rollMode: "blindroll"
      };
      await RdDResolutionTable.rollData(rollData);
      let nbAstral = this.getNombreAstral(request.date);
      request.rolled = rollData.rolled;
      request.isValid = true;
      if (!request.rolled.isSuccess) {
        request.isValid = false;
        nbAstral = await RdDDice.rollTotal("1dhr" + nbAstral, { rollMode: "selfroll" });
        // Mise à jour des nombres astraux du joueur
        let astralData = this.listeNombreAstral.find((nombreAstral, i) => nombreAstral.index == request.date);
        astralData.valeursFausses.push({ actorId: request.id, nombreAstral: nbAstral });
        game.settings.set(SYSTEM_RDD, "liste-nombre-astral", this.listeNombreAstral);
      }
      request.nbAstral = nbAstral;
      if (Misc.getActiveUser(request.userId)?.isGM) {
        RdDUtility.responseNombreAstral(request);
      } else {
        game.socket.emit(SYSTEM_SOCKET_ID, {
          msg: "msg_response_nombre_astral",
          data: request
        });
      }
    }
  }

  /* -------------------------------------------- */
  findHeure(heure) {
    heure = Grammar.toLowerCaseNoAccentNoSpace(heure);
    let parHeureOuLabel = Object.values(heuresDef).filter(it => (it.heure + 1) == parseInt(heure) || Grammar.toLowerCaseNoAccentNoSpace(it.label) == heure);
    if (parHeureOuLabel.length == 1) {
      return parHeureOuLabel[0];
    }
    let parLabelPartiel = Object.values(heuresDef).filter(it => Grammar.toLowerCaseNoAccentNoSpace(it.label).includes(heure));
    if (parLabelPartiel.length > 0) {
      parLabelPartiel.sort(Misc.ascending(h => h.label.length));
      return parLabelPartiel[0];
    }
    return undefined;
  }
  /* -------------------------------------------- */
  getHeureNumber( hNum) {
    let heure = Object.values(heuresDef).find(it => (it.heure) == hNum);
    return heure
  }

  /* -------------------------------------------- */
  getHeuresChanceMalchance(heureNaissance) {
    let heuresChancesMalchances = [];
    let defHeure = this.findHeure(heureNaissance);
    if (defHeure) {
      let hn = defHeure.heure;
      let chiffreAstral = this.getCurrentNombreAstral() ?? 0;
      heuresChancesMalchances[0] = { value : "+4", heures: [this.getHeureNumber((hn + chiffreAstral) % RDD_HEURES_PAR_JOUR).label]};
      heuresChancesMalchances[1] = { value : "+2", heures: [this.getHeureNumber((hn + chiffreAstral+4) % RDD_HEURES_PAR_JOUR).label, 
        this.getHeureNumber((hn + chiffreAstral + 8) % RDD_HEURES_PAR_JOUR).label ] };
      heuresChancesMalchances[2] = { value : "-4", heures: [this.getHeureNumber((hn + chiffreAstral+6) % RDD_HEURES_PAR_JOUR).label]};
      heuresChancesMalchances[3] = { value : "-2", heures: [this.getHeureNumber((hn + chiffreAstral+3) % RDD_HEURES_PAR_JOUR).label, 
          this.getHeureNumber((hn + chiffreAstral + 9) % RDD_HEURES_PAR_JOUR).label ]};
    }
    return heuresChancesMalchances;
  }

  /* -------------------------------------------- */
  getAjustementAstrologique(heureNaissance, name = undefined) {
    let defHeure = this.findHeure(heureNaissance);
    if (defHeure) {
      let hn = defHeure.heure;
      let chiffreAstral = this.getCurrentNombreAstral() ?? 0;
      let heureCourante = this.calendrier.heureRdD;
      let ecartChance = (hn + chiffreAstral - heureCourante) % RDD_HEURES_PAR_JOUR;
      switch (ecartChance) {
        case 0: return 4;
        case 4: case 8: return 2;
        case 6: return -4;
        case 3: case 9: return -2;
      }
    }
    else if (name) {
      ui.notifications.warn(name + " n'a pas d'heure de naissance, ou elle est incorrecte : " + heureNaissance);
    }
    else {
      ui.notifications.warn(heureNaissance + " ne correspond pas à une heure de naissance");
    }
    return 0;
  }

  /* -------------------------------------------- */
  getData() {
    let formData = super.getData();

    this.fillCalendrierData(formData);

    this.setPos(this.calendrierPos);
    return formData;
  }

  /* -------------------------------------------- */
  setPos(pos) {
    return new Promise(resolve => {
      function check() {
        let elmnt = document.getElementById("calendar-time-container");
        if (elmnt) {
          elmnt.style.bottom = undefined;
          let xPos = (pos.left) > window.innerWidth ? window.innerWidth - 200 : pos.left;
          let yPos = (pos.top) > window.innerHeight - 20 ? window.innerHeight - 100 : pos.top;
          elmnt.style.top = (yPos) + "px";
          elmnt.style.left = (xPos) + "px";
          resolve();
        } else {
          setTimeout(check, 30);
        }
      }
      check();
    });
  }

  /* -------------------------------------------- */
  updateDisplay() {
    let calendrier = this.fillCalendrierData();
    // Rebuild text du calendrier
    let dateHTML = `${calendrier.jourMois} ${calendrier.nomMois} ${calendrier.annee} (${calendrier.nomSaison})`
    if (game.user.isGM) {
      dateHTML = dateHTML + " - NA: " + (this.getCurrentNombreAstral() ?? "indéterminé");
    }
    for (let handle of document.getElementsByClassName("calendar-date-rdd")) {
      handle.innerHTML = dateHTML;
    }
    for (let heure of document.getElementsByClassName("calendar-heure-texte")) {
      heure.innerHTML = calendrier.nomHeure;
    }
    for (const minute of document.getElementsByClassName("calendar-time-disp")) {
      minute.innerHTML = `${calendrier.minutesRelative} minutes`;
    }
    for (const heureImg of document.getElementsByClassName("calendar-heure-img")) {
      heureImg.src = calendrier.iconHeure;
    }
  }

  /* -------------------------------------------- */
  async saveEditeur(calendrierData) {
    this.calendrier.minutesRelative = Number(calendrierData.minutesRelative);
    this.calendrier.jour = Number(calendrierData.jourMois) - 1;
    this.calendrier.moisRdD = RdDCalendrier.getChiffreFromSigne(calendrierData.moisKey);
    this.calendrier.annee = Number(calendrierData.annee);
    this.calendrier.heureRdD = RdDCalendrier.getChiffreFromSigne(calendrierData.heureKey);
    game.settings.set(SYSTEM_RDD, "calendrier", duplicate(this.calendrier));

    await this.rebuildListeNombreAstral();

    game.socket.emit(SYSTEM_SOCKET_ID, {
      msg: "msg_sync_time",
      data: duplicate(this.calendrier)
    });

    this.updateDisplay();
  }

  /* -------------------------------------------- */
  async showCalendarEditor() {
    let calendrierData = duplicate(this.fillCalendrierData());
    if (this.editeur == undefined) {
      calendrierData.jourMoisOptions = RdDCalendrier.buildJoursMois();
      calendrierData.heuresOptions = [0, 1];
      calendrierData.minutesOptions = Array(RDD_MINUTES_PAR_HEURES).fill().map((item, index) => 0 + index);
      let html = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/calendar-editor-template.html', calendrierData);
      this.editeur = new RdDCalendrierEditeur(html, this, calendrierData)
    }
    this.editeur.updateData(calendrierData);
    this.editeur.render(true);
  }

  static buildJoursMois() {
    return Array(RDD_JOUR_PAR_MOIS).fill().map((item, index) => 1 + index);
  }

  /* -------------------------------------------- */
  async showAstrologieEditor() {
    let calendrierData = duplicate(this.fillCalendrierData());
    let astrologieArray = [];
    this.listeNombreAstral = this.listeNombreAstral || [];
    for (let astralData of this.listeNombreAstral) {
      astralData.humanDate = this.getDateFromIndex(astralData.index);
      for (let vf of astralData.valeursFausses) {
        let actor = game.actors.get(vf.actorId);
        vf.actorName = (actor) ? actor.name : "Inconnu";
      }
      astrologieArray.push(duplicate(astralData));
    }
    let heuresParActeur = {};
    for (let actor of game.actors) {
      let heureNaissance = actor.getHeureNaissance();
      if ( heureNaissance) {
        heuresParActeur[actor.name] = this.getHeuresChanceMalchance(heureNaissance);
      }      
    }
    //console.log("ASTRO", astrologieArray);
    calendrierData.astrologieData = astrologieArray;
    calendrierData.heuresParActeur = heuresParActeur;
    let html = await renderTemplate('systems/foundryvtt-reve-de-dragon/templates/calendar-astrologie-template.html', calendrierData);
    let astrologieEditeur = new RdDAstrologieEditeur(html, this, calendrierData)
    astrologieEditeur.updateData(calendrierData);
    astrologieEditeur.render(true);
  }

  /* -------------------------------------------- */
  /** @override */
  async activateListeners(html) {
    super.activateListeners(html);

    this.updateDisplay();

    html.find('.ajout-chronologie').click(ev => DialogChronologie.create());

    html.find('.calendar-btn').click(ev => this.onCalendarButton(ev));

    html.find('.calendar-btn-edit').click(ev => {
      ev.preventDefault();
      this.showCalendarEditor();
    });

    html.find('.astrologie-btn-edit').click(ev => {
      ev.preventDefault();
      this.showAstrologieEditor();
    });

    html.find('#calendar-move-handle').mousedown(ev => {
      ev.preventDefault();
      ev = ev || window.event;
      let isRightMB = false;
      if ("which" in ev) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        isRightMB = ev.which == 3;
      } else if ("button" in ev) { // IE, Opera 
        isRightMB = ev.button == 2;
      }

      if (!isRightMB) {
        dragElement(document.getElementById("calendar-time-container"));
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        function dragElement(elmnt) {
          elmnt.onmousedown = dragMouseDown;
          function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
          }

          function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.bottom = undefined
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
          }

          function closeDragElement() {
            // stop moving when mouse button is released:
            elmnt.onmousedown = undefined;
            document.onmouseup = undefined;
            document.onmousemove = undefined;
            let xPos = (elmnt.offsetLeft - pos1) > window.innerWidth ? window.innerWidth - 200 : (elmnt.offsetLeft - pos1);
            let yPos = (elmnt.offsetTop - pos2) > window.innerHeight - 20 ? window.innerHeight - 100 : (elmnt.offsetTop - pos2)
            xPos = xPos < 0 ? 0 : xPos;
            yPos = yPos < 0 ? 0 : yPos;
            if (xPos != (elmnt.offsetLeft - pos1) || yPos != (elmnt.offsetTop - pos2)) {
              elmnt.style.top = (yPos) + "px";
              elmnt.style.left = (xPos) + "px";
            }
            game.system.rdd.calendrier.calendrierPos.top = yPos;
            game.system.rdd.calendrier.calendrierPos.left = xPos;
            if (game.user.isGM) {
              game.settings.set(SYSTEM_RDD, "calendrier-pos", duplicate(game.system.rdd.calendrier.calendrierPos));
            }
          }
        }
      } else if (isRightMB) {
        game.system.rdd.calendrier.calendrierPos.top = 200;
        game.system.rdd.calendrier.calendrierPos.left = 200;
        if (game.user.isGM) {
          game.settings.set(SYSTEM_RDD, "calendrier-pos", duplicate(game.system.rdd.calendrier.calendrierPos));
        }
        this.setPos(game.system.rdd.calendrier.calendrierPos);
      }
    });
  }

}