import { Misc } from "./misc.js";
import { Grammar } from "./grammar.js";
import { RdDDice } from "./rdd-dice.js";

/* -------------------------------------------- */
const TMRMapping = {
  A1: { type: "cite", label: "Cité Vide" },
  B1: { type: "plaines", label: "Plaines d’Assorh" },
  C1: { type: "necropole", label: "Nécropole de Kroak" },
  D1: { type: "fleuve", label: "Fleuve de l'Oubli" },
  E1: { type: "monts", label: "Monts de Kanaï" },
  F1: { type: "cite", label: "Cité Glauque" },
  G1: { type: "desolation", label: "Désolation de Jamais" },
  H1: { type: "lac", label: "Lac d’Anticalme" },
  I1: { type: "plaines", label: "Plaines Grises" },
  J1: { type: "monts", label: "Monts Fainéants" },
  K1: { type: "cite", label: "Cité d’Onkause" },
  L1: { type: "fleuve", label: "Fleuve de l'Oubli" },
  M1: { type: "cite", label: "Cité Jalouse" },

  A2: { type: "desert", label: "Désert de Mieux" },
  B2: { type: "collines", label: "Collines de Dawell" },
  C2: { type: "marais", label: "Marais Glignants" },
  D2: { type: "cite", label: "Cité de Frost" },
  E2: { type: "plaines", label: "Plaines de Fiask" },
  F2: { type: "lac", label: "Lac de Misère" },
  G2: { type: "marais", label: "Marais Nuisants" },
  H2: { type: "collines", label: "Collines de Parta" },
  I2: { type: "foret", label: "Forêt Fade" },
  J2: { type: "desert", label: "Désert de Poly" },
  K2: { type: "foret", label: "Forêt Tamée" },
  L2: { type: "fleuve", label: "Fleuve de l'Oubli" },
  M2: { type: "necropole", label: "Nécropole de Logos" },

  A3: { type: "desolation", label: "Désolation de Demain" },
  B3: { type: "plaines", label: "Plaines de Rubéga" },
  C3: { type: "fleuve", label: "Fleuve de l'Oubli" },
  D3: { type: "gouffre", label: "Gouffre d’Oki" },
  E3: { type: "foret", label: "Forêt d’Estoubh" },
  F3: { type: "fleuve", label: "Fleuve de l'Oubli" },
  G3: { type: "gouffre", label: "Gouffre de Sun" },
  H3: { type: "foret", label: "Forêt de Ganna" },
  I3: { type: "monts", label: "Monts Grinçants" },
  J3: { type: "cite", label: "Cité Venin" },
  K3: { type: "plaines", label: "Plaines de Dois" },
  L3: { type: "lac", label: "Lac Laineux" },
  M3: { type: "monts", label: "Monts de Vdah" },

  A4: { type: "foret", label: "Forêt de Falconax" },
  B4: { type: "monts", label: "Monts Crâneurs" },
  C4: { type: "pont", label: "Pont de Giolii" },
  D4: { type: "lac", label: "Lac de Foam" },
  E4: { type: "plaines", label: "Plaines d’Orti" },
  F4: { type: "fleuve", label: "Fleuve de l'Oubli" },
  G4: { type: "sanctuaire", label: "Sanctuaire Blanc" },
  H4: { type: "plaines", label: "Plaines de Psark" },
  I4: { type: "plaines", label: "Plaines de Xiax" },
  J4: { type: "collines", label: "Collines d’Encre" },
  K4: { type: "pont", label: "Pont de Fah" },
  L4: { type: "sanctuaire", label: "Sanctuaire Mauve" },
  M4: { type: "gouffre", label: "Gouffre Grisant" },

  A5: { type: "plaines", label: "Plaines de Trilkh" },
  B5: { type: "collines", label: "Collines de Tanegy" },
  C5: { type: "marais", label: "Marais Flouants" },
  D5: { type: "fleuve", label: "Fleuve de l'Oubli" },
  E5: { type: "monts", label: "Monts Brûlants" },
  F5: { type: "cite", label: "Cité de Panople" },
  G5: { type: "pont", label: "Pont d’Ik" },
  H5: { type: "desert", label: "Désert de Krane" },
  I5: { type: "desolation", label: "Désolation de Toujours" },
  J5: { type: "marais", label: "Marais de Jab" },
  K5: { type: "fleuve", label: "Fleuve de l'Oubli" },
  L5: { type: "collines", label: "Collines Suaves" },
  M5: { type: "cite", label: "Cité Rimarde" },

  A6: { type: "necropole", label: "Nécropole de Zniak" },
  B6: { type: "foret", label: "Forêt de Bust" },
  C6: { type: "cite", label: "Cité Pavois" },
  D6: { type: "fleuve", label: "Fleuve de l'Oubli" },
  E6: { type: "sanctuaire", label: "Sanctuaire de Plaine" },
  F6: { type: "fleuve", label: "Fleuve de l'Oubli" },
  G6: { type: "marais", label: "Marais Glutants" },
  H6: { type: "monts", label: "Monts Gurdes" },
  I6: { type: "necropole", label: "Nécropole de Xotar" },
  J6: { type: "lac", label: "Lac d’Iaupe" },
  K6: { type: "desolation", label: "Désolation de Poor" },
  L6: { type: "foret", label: "Forêt Gueuse" },
  M6: { type: "desolation", label: "Désolation de Presque" },

  A7: { type: "plaines", label: "Plaines de l’Arc" },
  B7: { type: "marais", label: "Marais Bluants" },
  C7: { type: "fleuve", label: "Fleuve de l'Oubli" },
  D7: { type: "plaines", label: "Plaines d’Affa" },
  E7: { type: "foret", label: "Forêt de Glusks" },
  F7: { type: "fleuve", label: "Fleuve de l'Oubli" },
  G7: { type: "cite", label: "Cité de Terwa" },
  H7: { type: "gouffre", label: "Gouffre de Kapfa" },
  I7: { type: "plaines", label: "Plaines de Troo" },
  J7: { type: "fleuve", label: "Fleuve de l'Oubli" },
  K7: { type: "cite", label: "Cité de Kolix" },
  L7: { type: "gouffre", label: "Gouffre d’Episophe" },
  M7: { type: "desert", label: "Désert de Lave" },

  A8: { type: "gouffre", label: "Gouffre de Shok" },
  B8: { type: "fleuve", label: "Fleuve de l'Oubli" },
  C8: { type: "foret", label: "Forêt Turmide" },
  D8: { type: "cite", label: "Cité d’Olak" },
  E8: { type: "plaines", label: "Plaines d’Iolise" },
  F8: { type: "lac", label: "Lac des Chats" },
  G8: { type: "plaines", label: "Plaines Sans Joie" },
  H8: { type: "foret", label: "Forêt d’Ourf" },
  I8: { type: "fleuve", label: "Fleuve de l'Oubli" },
  J8: { type: "monts", label: "Monts Barask" },
  K8: { type: "desert", label: "Désert de Fumée" },
  L8: { type: "monts", label: "Monts Tavelés" },
  M8: { type: "plaines", label: "Plaines Lavées" },

  A9: { type: "collines", label: "Collines de Korrex" },
  B9: { type: "lac", label: "Lac de Lucre" },
  C9: { type: "monts", label: "Monts Tuméfiés" },
  D9: { type: "pont", label: "Pont d’Orx" },
  E9: { type: "fleuve", label: "Fleuve de l'Oubli" },
  F9: { type: "plaines", label: "Plaines de Foe" },
  G9: { type: "desolation", label: "Désolation de Sel" },
  H9: { type: "collines", label: "Collines de Noirseul" },
  I9: { type: "fleuve", label: "Fleuve de l'Oubli" },
  J9: { type: "marais", label: "Marais Gronchants" },
  K9: { type: "sanctuaire", label: "Sanctuaire Noir" },
  L9: { type: "collines", label: "Collines Cornues" },
  M9: { type: "necropole", label: "Nécropole de Zonar" },

  A10: { type: "sanctuaire", label: "Sanctuaire d’Olis" },
  B10: { type: "monts", label: "Monts Salés" },
  C10: { type: "marais", label: "Marais de Dom" },
  D10: { type: "fleuve", label: "Fleuve de l'Oubli" },
  E10: { type: "gouffre", label: "Gouffre de Junk" },
  F10: { type: "marais", label: "Marais Zultants" },
  G10: { type: "cite", label: "Cité de Sergal" },
  H10: { type: "plaines", label: "Plaines Noires" },
  I10: { type: "lac", label: "Lac Wanito" },
  J10: { type: "fleuve", label: "Fleuve de l'Oubli" },
  K10: { type: "plaines", label: "Plaines Jaunes" },
  L10: { type: "desert", label: "Désert de Nicrop" },
  M10: { type: "foret", label: "Forêt de Jajou" },

  A11: { type: "desolation", label: "Désolation d’Hier" },
  B11: { type: "cite", label: "Cité de Brilz" },
  C11: { type: "pont", label: "Pont de Roï" },
  D11: { type: "desolation", label: "Désolation de Partout" },
  E11: { type: "lac", label: "Lac de Glinster" },
  F11: { type: "cite", label: "Cité de Noape" },
  G11: { type: "fleuve", label: "Fleuve de l'Oubli" },
  H11: { type: "fleuve", label: "Fleuve de l'Oubli" },
  I11: { type: "pont", label: "Pont de Yalm" },
  J11: { type: "plaines", label: "Plaines de Miltiar" },
  K11: { type: "cite", label: "Cité Tonnerre" },
  L11: { type: "collines", label: "Collines de Kol" },
  M11: { type: "cite", label: "Cité Crapaud" },

  A12: { type: "plaines", label: "Plaines Sages" },
  B12: { type: "fleuve", label: "Fleuve de l'Oubli" },
  C12: { type: "lac", label: "Lac de Fricassa" },
  D12: { type: "collines", label: "Collines d’Huaï" },
  E12: { type: "monts", label: "Monts Ajourés" },
  F12: { type: "necropole", label: "Nécropole de Troat" },
  G12: { type: "plaines", label: "Plaines de Lufmil" },
  H12: { type: "collines", label: "Collines de Tooth" },
  I12: { type: "gouffre", label: "Gouffre Abimeux" },
  J12: { type: "cite", label: "Cité Folle" },
  K12: { type: "desolation", label: "Désolation d’Amour" },
  L12: { type: "plaines", label: "Plaines Venteuses" },
  M12: { type: "collines", label: "Collines Révulsantes" },

  A13: { type: "fleuve", label: "Fleuve de l'Oubli" },
  B13: { type: "gouffre", label: "Gouffre des Litiges" },
  C13: { type: "desert", label: "Désert de Neige" },
  D13: { type: "cite", label: "Cité Sordide" },
  E13: { type: "plaines", label: "Plaines de Xnez" },
  F13: { type: "foret", label: "Forêt des Cris" },
  G13: { type: "plaines", label: "Plaines Calcaires" },
  H13: { type: "desolation", label: "Désolation de Rien" },
  I13: { type: "monts", label: "Monts Bigleux" },
  J13: { type: "gouffre", label: "Gouffre de Gromph" },
  K13: { type: "foret", label: "Forêt de Kluth" },
  L13: { type: "monts", label: "Monts Dormants" },
  M13: { type: "plaines", label: "Plaines d’Anjou" },

  A14: { type: "collines", label: "Collines de Stolis" },
  B14: { type: "necropole", label: "Nécropole de Gorlo" },
  C14: { type: "foret", label: "Forêt de Bissam" },
  D14: { type: "sanctuaire", label: "Sanctuaire Plat" },
  E14: { type: "monts", label: "Monts de Quath" },
  F14: { type: "plaines", label: "Plaines Brisées" },
  G14: { type: "desert", label: "Désert de Sek" },
  H14: { type: "plaines", label: "Plaines Blanches" },
  I14: { type: "cite", label: "Cité Destituée" },
  J14: { type: "desert", label: "Désert de Sank" },
  K14: { type: "necropole", label: "Nécropole d’Antinéar" },
  L14: { type: "plaines", label: "Plaines de Jislith" },
  M14: { type: "desolation", label: "Désolation d’Après" },
  
  A15: { type: "cite", label: "Cité de Mielh" },
  C15: { type: "plaines", label: "Plaines de Toué" },
  E15: { type: "foret", label: "Forêt des Furies" },
  G15: { type: "plaines", label: "Plaines des Soupirs" },
  I15: { type: "monts", label: "Monts des Dragées" },
  K15: { type: "collines", label: "Collines Pourpres" },
  M15: { type: "cite", label: "Cité de Klana" }
}

export const TMRType = {
  cite: { name: "cité", genre: "f" },
  sanctuaire: { name: "sanctuaire", genre: 'm' },
  plaines: { name: "plaines", genre: "fp" },
  pont: { name: "pont", genre: "m" },
  collines: { name: "collines", genre: "p" },
  foret: { name: "forêt", genre: "f" },
  monts: { name: "monts", genre: "p" },
  desert: { name: "désert", genre: "m" },
  fleuve: { name: "fleuve", genre: "m" },
  lac: { name: "lac", genre: "m" },
  marais: { name: "marais", genre: "m" },
  gouffre: { name: "gouffre", genre: "m" },
  necropole: { name: "nécropole", genre: "f" },
  desolation: { name: "désolation", genre: "f" }
}

/* -------------------------------------------- */
const caseSpecificModes = ["attache", "trounoir", "debordement", "reserve_extensible", "maitrisee"];

/* -------------------------------------------- */
const tmrRandomMovePatten =
  [{ name: 'top', col: 0, row: -1 },
  { name: 'topright', col: 1, row: -1 },
  { name: 'botright', col: 1, row: 1 },
  { name: 'bot', col: 0, row: 1 },
  { name: 'botleft', col: -1, row: 1 },
  { name: 'topleft', col: -1, row: -1 }
  ]

/* -------------------------------------------- */

/* -------------------------------------------- */
export class TMRUtility {
  static init() {
    for (let coord in TMRMapping) {
      const tmr = TMRMapping[coord];
      tmr.coord = coord;
      tmr.oddq = TMRUtility.coordTMRToOddq(coord);
      tmr.genre = TMRType[tmr.type].genre;
    }
    let tmrByType = Misc.classify(Object.values(TMRMapping));
    for (const [type, list] of Object.entries(tmrByType)) {
      TMRType[type].list = list;
    }
  }

  /* -------------------------------------------- */
  static verifyTMRCoord(coord) {
    let TMRregexp = new RegExp(/([A-M])(\d+)/g);
    let res = TMRregexp.exec(coord);
    if (res && res[1] && res[2]) {
      if (res[2] > 0 && res[2] < 16) {
        return true;
      }
    }
    return false;
  }

  /* -------------------------------------------- */
  static getTMR(coord) {
    return TMRMapping[coord];
  }

  static getTMRLabel(coord) {
    return TMRMapping[coord]?.label ?? (coord + ": case inconnue");
  }

  static getTMRType(coord) {
    const tmr = TMRMapping[coord];
    return Misc.upperFirst(TMRType[tmr.type].name);
  }

  static getTMRDescr(coord) {
    const tmr = TMRMapping[coord];
    return Grammar.articleDetermine(tmr.type) + ' ' + tmr.label;
  }
  
  static findTMRLike(type, options = {inclusMauvaise:true}) {
    const choix = [...Object.values(TMRType)]
    if (options.inclusMauvaise){
      choix.push({name: 'Mauvaise'});
    }
    const selection = Misc.findAllLike(type, choix).map(it => it.name);
    if (selection.length == 0) {
      ui.notifications.warn(`Un type de TMR doit être indiqué, '${type}' n'est pas trouvé dans ${choix}`);
      return undefined;
    }
    if (selection.length > 1) {
      ui.notifications.warn(`Plusieurs types de TMR pourraient correspondre à '${type}': ${selection}`);
      return undefined;
    }
    return selection[0];
  }

  static typeTmrName(type) {
    return Misc.upperFirst(TMRType[Grammar.toLowerCaseNoAccent(type)].name);
  }

  static buildSelectionTypesTMR(typesTMR) {
    typesTMR = typesTMR?? [];
    return Object.values(TMRType).map(value => Misc.upperFirst(value.name))
      .sort()
      .map(name => { return { name: name, selected: typesTMR.includes(name) } });
  }

  static buildListTypesTMRSelection(selectionTMRs) {
    return selectionTMRs.filter(it => it.selected).map(it => it.name).join(" ");
  }

  static isCaseHumide(tmr) {
    return tmr.type == 'fleuve' || tmr.type == 'lac' || tmr.type == 'marais';
  }

  /* -------------------------------------------- */
  static async getDirectionPattern() {
    return await RdDDice.rollOneOf(tmrRandomMovePatten);
  }

  /* -------------------------------------------- */
  static async deplaceTMRAleatoire(actor, coord) {
    const currentOddq = TMRUtility.coordTMRToOddq(coord);
    const direction = await TMRUtility.getDirectionPattern();
    currentOddq.col = currentOddq.col + direction.col;
    currentOddq.row = currentOddq.row + direction.row;
    if (this.isOddqInTMR(currentOddq)) { // Sortie de carte ! Ré-insertion aléatoire
      return TMRUtility.getTMR(TMRUtility.oddqToCoordTMR(currentOddq));
    } else {
      return await actor.reinsertionAleatoire('Sortie de carte');
    }
  }

  /* -------------------------------------------- */
  static getListTMR(terrain) {
    return TMRType[terrain].list;
  }

  static filterTMR(filter) {
    return Object.values(TMRMapping).filter(filter);
  }

  static getCasesType(type) {
    return TMRUtility.filterTMR(it => it.type == type).map(it => it.coord);
  }

  static findTMR(search) {
    return TMRUtility.filterTMR(it => Grammar.includesLowerCaseNoAccent(it.label, search) || it.coord == search);
  }

  static filterTMRCoord(filter) {
    return TMRUtility.filterTMR(filter).map(it => it.coord);
  }

  static async getTMRAleatoire(filter = it => true) {
    return await RdDDice.rollOneOf(TMRUtility.filterTMR(filter))
  }

  /* -------------------------------------------- */
  /** Returns a list of case inside a given distance
   * 
   */
  static getTMRPortee(coord, portee) {
    let centerOddq = this.coordTMRToOddq(coord);
    let caseList = [];
    for (let dcol = -portee; dcol <= portee; dcol++) { // rows
      for (let drow = -portee; drow <= portee; drow++) { // columns
        const currentOddq = { col: centerOddq.col + dcol, row: centerOddq.row + drow };
        if (this.isOddqInTMR(currentOddq)) {
          let dist = this.distanceOddq(centerOddq, currentOddq);
          if (dist <= portee) {
            caseList.push(this.oddqToCoordTMR(currentOddq)); // Inside the area
          }
        }
      }
    }
    return caseList;
  }

  /* -------------------------------------------- */
  // https://www.redblobgames.com/grids/hexagons/#distances
  // TMR Letter-row correspond to "odd-q" grid (letter => col, numeric => row )

  /* -------------------------------------------- */
  static coordTMRToOddq(coordTMR) {
    let col = coordTMR.charCodeAt(0) - 65;
    let row = coordTMR.substr(1) - 1;
    return { col: col, row: row }
  }

  /* -------------------------------------------- */
  static oddqToCoordTMR(oddq) {
    let letterX = String.fromCharCode(65 + (oddq.col));
    return letterX + (oddq.row + 1)
  }

  /* -------------------------------------------- */
  static isOddqInTMR(oddq) {
    const col = oddq.col;
    const row = oddq.row;
    return (
      col >= 0 && col < 13 &&
      row >= 0 &&
      (row + col % 2 <= 14)
      );
    // if (x >= 0 && x < 13 && y >= 0 && y < 14) return true;
    // if (x >= 0 && x < 13 && x % 2 == 0 && y == 14) return true;
    // return false;
  }


  /* -------------------------------------------- */
  static distanceCoordTMR(coord1, coord2) {
    let oddq1 = this.coordTMRToOddq(coord1);
    let oddq2 = this.coordTMRToOddq(coord2);
    return this.distanceOddq(oddq1, oddq2);
  }

  /* -------------------------------------------- */
  static distanceOddq(oddq1, oddq2) {
    const axial1 = TMRUtility.oddqToAxial(oddq1);
    const axial2 = TMRUtility.oddqToAxial(oddq2);
    return TMRUtility.distanceAxial(axial1, axial2);

    // const dx = oddq2.col - oddq1.col;
    // const dy = oddq2.row - oddq1.row;
    // const abs_dx = Math.abs(dx);
    // const abs_dy = Math.abs(dy);
    // const distance = Math.sign(dx) == Math.sign(dy) ? Math.max(abs_dx, abs_dy) : (abs_dx + abs_dy);
    // return distance;
  }

  static oddqToAxial(pos) {
    return {
      q: pos.col,
      r: pos.row - (pos.col - (pos.col & 1)) / 2
    }
  }

  static distanceAxial(a, b) {
    const vector = TMRUtility.axial_subtract(a, b)
    return (Math.abs(vector.q)
      + Math.abs(vector.q + vector.r)
      + Math.abs(vector.r)) / 2
  }

  static axial_subtract(a, b) {
    return {
      q: a.q- b.q,
      r: a.r - b.r
    };
  }

  //   function axial_to_cube(hex):
  //   var q = hex.q
  // var r = hex.r
  // var s = -q - r
  // return Cube(q, r, s)
  // }

  
  // /* -------------------------------------------- */
  // static computeRealPictureCoordinates(coordOddq) {
  //   let decallagePairImpair = (coordOddq.col % 2 == 0) ? tmrConstants.col1_y : tmrConstants.col2_y;
  //   return {
  //     x: tmrConstants.gridx + (coordOddq.col * tmrConstants.cellw),
  //     y: tmrConstants.gridy + (coordOddq.row * tmrConstants.cellh) + decallagePairImpair
  //   }
  // }
}