import { ChatUtility } from "./chat-utility.js";
import { Misc } from "./misc.js";
import { RdDDice } from "./rdd-dice.js";
import { ReglesOptionelles } from "./settings/regles-optionelles.js";

/**
 * difficultés au delà de -10
 */
const levelDown = [
  { level: -11, score: 1, norm: 1, sign: 0, part: 0, epart: 2, etotal: 90 },
  { level: -12, score: 1, norm: 1, sign: 0, part: 0, epart: 2, etotal: 70 },
  { level: -13, score: 1, norm: 1, sign: 0, part: 0, epart: 2, etotal: 50 },
  { level: -14, score: 1, norm: 1, sign: 0, part: 0, epart: 2, etotal: 30 },
  { level: -15, score: 1, norm: 1, sign: 0, part: 0, epart: 2, etotal: 10 },
  { level: -16, score: 1, norm: 1, sign: 0, part: 0, epart: 0, etotal: 2 }
];
const levelImpossible = { score: 0, norm:0, sign: 0, part: 0, epart: 0, etotal: 1 };

const reussites = [
  { code: "etotal", isPart: false, isSign: false, isSuccess: false, isEchec: true, isEPart: true, isETotal: true, ptTache: -4, ptQualite: -6, quality: "Echec total", condition: (target, roll) => roll >= target.etotal && roll <= 100 },
  { code: "epart", isPart: false, isSign: false, isSuccess: false, isEchec: true, isEPart: true, isETotal: false, ptTache: -2, ptQualite: -4, quality: "Echec particulier", condition: (target, roll) => (roll >= target.epart && roll < target.etotal) },
  { code: "echec", isPart: false, isSign: false, isSuccess: false, isEchec: true, isEPart: false, isETotal: false, ptTache: 0, ptQualite: -2, quality: "Echec normal", condition: (target, roll) => (roll > target.norm && roll < target.etotal) },
  { code: "norm", isPart: false, isSign: false, isSuccess: true, isEchec: false, isEPart: false, isETotal: false, ptTache: 1, ptQualite: 0, quality: "Réussite normale", condition: (target, roll) => (roll > target.sign && roll <= target.norm) },
  { code: "sign", isPart: false, isSign: true, isSuccess: true, isEchec: false, isEPart: false, isETotal: false, ptTache: 2, ptQualite: 1, quality: "Réussite significative", condition: (target, roll) => (roll > target.part && roll <= target.sign) },
  { code: "part", isPart: true, isSign: true, isSuccess: true, isEchec: false, isEPart: false, isETotal: false, ptTache: 3, ptQualite: 2, quality: "Réussite Particulière!", condition: (target, roll) => (roll > 0 && roll <= target.part) },
  { code: "error", isPart: false, isSign: false, isSuccess: false, isEchec: true, isEPart: true, isETotal: true, ptTache: 0, ptQualite: 0, quality: "Jet de dés invalide", condition: (target, roll) => (roll <= 0 || roll > 100) }
];

const reussiteInsuffisante = { code: "notSign", isPart: false, isSign: false, isSuccess: false, isEchec: true, isEPart: false, isETotal: false, ptTache: 0, ptQualite: -2, quality: "Réussite insuffisante", condition: (target, roll) => false }
/* -------------------------------------------- */
const caracMaximumResolution = 60;
/* -------------------------------------------- */
export class RdDResolutionTable {
  static resolutionTable = this.build()

  /* -------------------------------------------- */
  static build() {
    let table = []
    for (var caracValue = 0; caracValue <= caracMaximumResolution; caracValue++) {
      table[caracValue] = this._computeRow(caracValue);
    }
    return table;
  }

  /* -------------------------------------------- */
  static getResultat(code) {
    let resultat = reussites.find(r => code == r.code);
    if (resultat == undefined) {
      resultat = reussites.find(r => r.code == "error");
    }
    return resultat;
  }

  /* -------------------------------------------- */
  static explain(rolled) {
    let message = "<br>Jet : <strong>" + rolled.roll + "</strong> sur " + rolled.score + "% ";
    if (rolled.caracValue != undefined && rolled.finalLevel != undefined) {
      message += (rolled.diviseurSignificative > 1 ? `(1/${rolled.diviseurSignificative} de ` : "(")
        + rolled.caracValue + " à " + Misc.toSignedString(rolled.finalLevel) + ") ";
    }
    message += '<strong>' + rolled.quality + '</strong>'
    return message;
  }

  /* -------------------------------------------- */
  static async displayRollData(rollData, actor = undefined, template = 'chat-resultat-general.html') {
    return await ChatUtility.createChatWithRollMode(actor?.userName ?? game.user.name, {
      content: await RdDResolutionTable.buildRollDataHtml(rollData, actor, template)
    });
  }

  /* -------------------------------------------- */
  static async buildRollDataHtml(rollData, actor, template = 'chat-resultat-general.html') {
    rollData.show = rollData.show || {};
    return await renderTemplate(`systems/foundryvtt-ctm/templates/${template}`, rollData);
  }

  /* -------------------------------------------- */
  static async rollData(rollData) {
    rollData.rolled = await this.roll(rollData.caracValue, rollData.finalLevel, rollData);
    return rollData;
  }

  /* -------------------------------------------- */
  static async roll(caracValue, finalLevel, rollData = {}){
    let chances = this.computeChances(caracValue, finalLevel);
    this._updateChancesWithBonus(chances, rollData.bonus, finalLevel);
    this._updateChancesFactor(chances, rollData.diviseurSignificative);
    chances.showDice = rollData.showDice;
    chances.rollMode = rollData.rollMode;

    let rolled = await this.rollChances(chances, rollData.diviseurSignificative, rollData.forceDiceResult);
    rolled.caracValue = caracValue;
    rolled.finalLevel = finalLevel;
    rolled.bonus = rollData.bonus;
    rolled.factorHtml = Misc.getFractionHtml(rollData.diviseurSignificative);

    if (ReglesOptionelles.isUsing("afficher-colonnes-reussite")){
      rolled.niveauNecessaire = this.findNiveauNecessaire(caracValue, rolled.roll);
      rolled.ajustementNecessaire = rolled.niveauNecessaire - finalLevel;
    }
    return rolled;
  }

  /* -------------------------------------------- */
  static findNiveauNecessaire(caracValue, rollValue) {
    for (let cell of this.resolutionTable[caracValue]) {
      if ( rollValue <= cell.norm) {
        return cell.niveau;
      }
    }
    return 16; // Dummy default
  }

  /* -------------------------------------------- */
  static _updateChancesFactor(chances, diviseur) {
    if (chances.level > -11 && diviseur && diviseur > 1) {
      let newScore = Math.floor(chances.score / diviseur);
      mergeObject(chances, this._computeCell(undefined, newScore), { overwrite: true });
    }
  }

  /* -------------------------------------------- */
  static _updateChancesWithBonus(chances, bonus, finalLevel) {
    if (bonus && finalLevel>-11) {
      let newScore = Number(chances.score) + bonus;
      mergeObject(chances, this._computeCell(undefined, newScore), { overwrite: true });
    }
  }

  /* -------------------------------------------- */
  static significativeRequise(chances) {
    chances.roll = Math.floor(chances.score / 2);
    mergeObject(chances, reussites.find(x => x.code == 'sign'), { overwrite: true });
  }

  /* -------------------------------------------- */
  static succesRequis(chances) {
    chances.roll = chances.score;
    mergeObject(chances, reussites.find(x => x.code == 'norm'), { overwrite: true });
  }

  /* -------------------------------------------- */
  static async rollChances(chances, diviseur, forceDiceResult = -1) {
    chances.forceDiceResult = forceDiceResult <= 0 || forceDiceResult > 100 ? undefined : {total: forceDiceResult};
    chances.roll = await RdDDice.rollTotal( "1d100", chances);
    mergeObject(chances, this.computeReussite(chances, chances.roll, diviseur), { overwrite: true });
    return chances;
  }

  /* -------------------------------------------- */
  static computeChances(caracValue, difficulte) {
    if (difficulte < -16) {
      return duplicate(levelImpossible);
    }
    if (difficulte < -10) {
      return duplicate(levelDown.find(levelData => levelData.level == difficulte));
    }
    return duplicate(RdDResolutionTable.resolutionTable[caracValue][difficulte + 10]);
  }

  /* -------------------------------------------- */
  static isAjustementAstrologique(rollData) {
    if (rollData.selectedCarac?.label.toLowerCase().includes('chance')) {
      return true;
    }
    if (rollData.selectedSort?.system.isrituel) {
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  static isEchec(rollData) {
    switch (rollData.surprise) {
      case 'demi': return !rollData.rolled.isSign;
      case 'totale': return true;
    }
    return rollData.rolled.isEchec;
  }

  /* -------------------------------------------- */
  static isEchecTotal(rollData) {
    if (rollData.arme && rollData.surprise == 'demi') {
      return rollData.rolled.isEchec;
    }
    return rollData.rolled.isETotal;
  }

  /* -------------------------------------------- */
  static isParticuliere(rollData) {
    if (rollData.arme && rollData.surprise) {
      return false;
    }
    return rollData.rolled.isPart;
  }

  /* -------------------------------------------- */
  static isReussite(rollData) {
    switch (rollData.surprise) {
      case 'demi': return rollData.rolled.isSign;
      case 'totale': return false;
    }
    return rollData.rolled.isSuccess;
  }

  /* -------------------------------------------- */
  static computeReussite(chances, roll, diviseur) {
    const reussite = reussites.find(x => x.condition(chances, roll));
    if (diviseur > 1 && reussite.code == 'norm') {
      return reussiteInsuffisante;
    }
    return reussite;
  }

  /* -------------------------------------------- */
  static _computeRow(caracValue) {
    let dataRow = [
      this._computeCell(-10, Math.max(Math.floor(caracValue / 4), 1)),
      this._computeCell(-9, Math.max(Math.floor(caracValue / 2), 1))
    ]
    for (var diff = -8; diff <= 22; diff++) {
      dataRow[diff + 10] = this._computeCell(diff, Math.max(Math.floor(caracValue * (diff + 10) / 2), 1));
    }
    return dataRow;
  }

  /* -------------------------------------------- */
  static _computeCell(niveau, percentage) {
    return {
      niveau: niveau,
      score: percentage,
      norm: Math.min(99, percentage),
      sign: this._reussiteSignificative(percentage),
      part: this._reussitePart(percentage),
      epart: this._echecParticulier(percentage),
      etotal: this._echecTotal(percentage)
    };
  }

  /* -------------------------------------------- */
  static _reussiteSignificative(percentage) {
    return Math.floor(percentage / 2);
  }

  /* -------------------------------------------- */
  static _reussitePart(percentage) {
    return Math.ceil(percentage / 5);
  }

  /* -------------------------------------------- */
  static _echecParticulier(percentage) {
    const epart = Math.ceil(percentage / 5) + 80;
    return epart >= 100 ? 101 : epart;
  }

  /* -------------------------------------------- */
  static _echecTotal(percentage) {
    const etotal = Math.ceil(percentage / 10) + 91;
    return percentage >= 100 ? 101 : Math.min(etotal, 100);
  }

  /* -------------------------------------------- */
  static buildHTMLResults(caracValue, levelValue) {
    if (caracValue == undefined || isNaN(caracValue)) caracValue = 10;
    if (levelValue == undefined || isNaN(levelValue)) levelValue = 0;

    let cell = this.computeChances(caracValue, levelValue);
    cell.epart = cell.epart > 99 ? 'N/A' : cell.epart;
    cell.etotal = cell.etotal > 100 ? 'N/A' : cell.etotal;
    cell.score = Math.min(cell.score, 99);

    return `
    <span class="table-proba-reussite competence-label">
    Particulière: <span class="rdd-roll-part">${cell.part}</span>
    - Significative: <span class="rdd-roll-sign">${cell.sign}</span>
    - Réussite: <span class="rdd-roll-norm">${cell.score}</span>
    - Echec Particulier: <span class="rdd-roll-epart">${cell.epart}</span>
    - Echec Total: <span class="rdd-roll-etotal">${cell.etotal}</span>
    </span>
    `
  }

  /* -------------------------------------------- */
  static buildHTMLTableExtract(caracValue, levelValue) {
    return this.buildHTMLTable(caracValue, levelValue, caracValue - 2, caracValue + 2, levelValue - 5, levelValue + 5)
  }

  static buildHTMLTable(caracValue, levelValue, minCarac = 1, maxCarac = 21, minLevel = -10, maxLevel = 11) {
    return this._buildHTMLTable(caracValue, levelValue, minCarac, maxCarac, minLevel, maxLevel)
  }

  /* -------------------------------------------- */
  static _buildHTMLTable(caracValue, levelValue, minCarac, maxCarac, minLevel, maxLevel) {
    let countColonnes = maxLevel - minLevel;
    minCarac = Math.max(minCarac, 1);
    maxCarac = Math.min(maxCarac, caracMaximumResolution);
    minLevel = Math.max(minLevel, -10);
    maxLevel = Math.max(Math.min(maxLevel, 22), minLevel + countColonnes);

    let table = $("<table class='table-resolution'/>")
      .append(this._buildHTMLHeader(RdDResolutionTable.resolutionTable[0], minLevel, maxLevel));

    for (var rowIndex = minCarac; rowIndex <= maxCarac; rowIndex++) {
      table.append(this._buildHTMLRow(RdDResolutionTable.resolutionTable[rowIndex], rowIndex, caracValue, levelValue, minLevel, maxLevel));
    }
    table.append("</table>");
    return table;
  }

  /* -------------------------------------------- */
  static _buildHTMLHeader(dataRow, minLevel, maxLevel) {
    let tr = $("<tr/>");

    if (minLevel > -8) {
      tr.append($("<th class='table-resolution-level'/>").text("-8"))
    }
    if (minLevel > -7) {
      tr.append($("<th class='table-resolution-level'/>").text("..."));
    }
    for (let difficulte = minLevel; difficulte <= maxLevel; difficulte++) {
      tr.append($("<th class='table-resolution-level'/>").text(Misc.toSignedString(difficulte)));
    }
    return tr;
  }

  /* -------------------------------------------- */
  static _buildHTMLRow(dataRow, rowIndex, caracValue, levelValue, minLevel, maxLevel) {
    let tr = $("<tr/>");
    let max = maxLevel;

    if (minLevel > -8) {
      let score = dataRow[-8 + 10].score;
      tr.append($("<td class='table-resolution-carac'/>").text(score))
    }
    if (minLevel > -7) {
      tr.append($("<td/>"))
    }
    for (let difficulte = minLevel; difficulte <= max; difficulte++) {
      let td = $("<td/>");
      let score = dataRow[difficulte + 10].score;
      if (rowIndex == caracValue && levelValue == difficulte) {
        td.addClass('table-resolution-target');
      } else if (difficulte == -8) {
        td.addClass('table-resolution-carac');
      }
      tr.append(td.text(score));
    }
    return tr;
  }

}