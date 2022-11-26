import { Grammar } from "./grammar.js";
import { Misc } from "./misc.js";

const competenceTroncs = [["Esquive", "Dague", "Corps à corps"],
["Epée à 1 main", "Epée à 2 mains", "Hache à 1 main", "Hache à 2 mains", "Lance", "Masse à 1 main", "Masse à 2 mains"]];

const xp_par_niveau = [5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20, 20, 30, 30, 40, 40, 60, 60, 100, 100, 100, 100, 100, 100, 100, 100, 100];
const niveau_max = xp_par_niveau.length - 10;
/* -------------------------------------------- */
const limitesArchetypes = [
  { "niveau": 0, "nombreMax": 100, "nombre": 0 },
  { "niveau": 1, "nombreMax": 10, "nombre": 0 },
  { "niveau": 2, "nombreMax": 9, "nombre": 0 },
  { "niveau": 3, "nombreMax": 8, "nombre": 0 },
  { "niveau": 4, "nombreMax": 7, "nombre": 0 },
  { "niveau": 5, "nombreMax": 6, "nombre": 0 },
  { "niveau": 6, "nombreMax": 5, "nombre": 0 },
  { "niveau": 7, "nombreMax": 4, "nombre": 0 },
  { "niveau": 8, "nombreMax": 3, "nombre": 0 },
  { "niveau": 9, "nombreMax": 2, "nombre": 0 },
  { "niveau": 10, "nombreMax": 1, "nombre": 0 },
  { "niveau": 11, "nombreMax": 1, "nombre": 0 }
];

/* -------------------------------------------- */
const categorieCompetences = {
  "generale": { base: -4, label: "Générales" },
  "particuliere": { base: -8, label: "Particulières" },
  "specialisee": { base: -11, label: "Spécialisées" },
  "connaissance": { base: -11, label: "Connaissances" },
  "draconic": { base: -11, label: "Draconics" },
  "melee": { base: -6, label: "Mêlée" },
  "tir": { base: -8, label: "Tir" },
  "lancer": { base: -8, label: "Lancer" }
}

function _buildCumulXP() {
  let cumulXP = { "-11": 0 };
  let cumul = 0;
  for (let i = 0; i <= xp_par_niveau.length; i++) {
    let level = i - 10;
    cumul += xp_par_niveau[i];
    cumulXP[level] = cumul;
  }
  return cumulXP;
}

const competence_xp_cumul = _buildCumulXP();

export class RdDItemCompetence extends Item {
  /* -------------------------------------------- */
  static getCategorieCompetences() {
    return categorieCompetences;
  }
  /* -------------------------------------------- */
  static getNiveauBase(category) {
    return categorieCompetences[category].base;
  }
  /* -------------------------------------------- */
  static getLabelCategorie(category) {
    return categorieCompetences[category].label;
  }

  /* -------------------------------------------- */
  static getCategorie(competence) {
    return competence?.system.categorie;
  }
  static isDraconic(competence) {
    return competence?.system.categorie == 'draconic';
  }

  /* -------------------------------------------- */
  static getVoieDraconic(competences, voie) {
    return RdDItemCompetence.findFirstItem(competences, voie, {
      preFilter: it => it.isCompetence() && RdDItemCompetence.isDraconic(it),
      description: 'Draconic',
    });
  }

  /* -------------------------------------------- */
  static isCompetenceArme(competence) {
    if (competence.isCompetence()) {
      switch (competence.system.categorie) {
        case 'melee':
          return !Grammar.toLowerCaseNoAccent(competence.name).includes('esquive');
        case 'tir':
        case 'lancer':
          return true;
      }
    }
    return false;
  }

  /* -------------------------------------------- */
  static isArmeUneMain(competence) {
    return RdDItemCompetence.isCompetenceArme(competence) && competence.name.toLowerCase().includes("1 main");
  }
  static isArme2Main(competence) {
    return RdDItemCompetence.isCompetenceArme(competence) && competence.name.toLowerCase().includes("2 main");
  }

  static isThanatos(competence) {
    return competence.isCompetencePersonnage() && Grammar.toLowerCaseNoAccent(competence.name).includes('thanatos');
  }

  /* -------------------------------------------- */
  static isMalusEncombrementTotal(competence) {
    return competence?.name.toLowerCase().match(/(natation|acrobatie)/) || 0;
  }

  /* -------------------------------------------- */
  static getListTronc(compName) {
    for (let troncList of competenceTroncs) {
      for (let troncName of troncList) {
        if (troncName == compName)
          return troncList;
      }
    }
    return [];
  }

  /* -------------------------------------------- */
  static computeTotalXP(competences) {
    const total = competences.map(c => RdDItemCompetence.computeXP(c))
      .reduce(Misc.sum(), 0);
    const economieTronc = RdDItemCompetence.computeEconomieXPTronc(competences);
    return total - economieTronc;
  }

  /* -------------------------------------------- */
  static computeXP(competence) {
    const factor = RdDItemCompetence.isThanatos(competence) ? 2 : 1; // Thanatos compte double !
    const xpNiveau = RdDItemCompetence.computeDeltaXP(competence.system.base, competence.system.niveau ?? competence.system.base);
    const xp = competence.system.xp ?? 0;
    const xpSort = competence.system.xp_sort ?? 0;
    return factor * (xpNiveau + xp) + xpSort;
  }

  /* -------------------------------------------- */
  static computeEconomieXPTronc(competences) {
    return competenceTroncs.map(
      list => list.map(name => RdDItemCompetence.findCompetence(competences, name))
        // calcul du coût xp jusqu'au niveau 0 maximum
        .map(it => RdDItemCompetence.computeDeltaXP(it?.system.base ?? -11, Math.min(it?.system.niveau ?? -11, 0)))
        .sort(Misc.ascending())
        .splice(0, list.length - 1) // prendre toutes les valeurs sauf l'une des plus élevées
        .reduce(Misc.sum(), 0)
    ).reduce(Misc.sum(), 0);
  }

  /* -------------------------------------------- */
  static computeDeltaXP(from, to) {
    RdDItemCompetence._valideNiveau(from);
    RdDItemCompetence._valideNiveau(to);
    return competence_xp_cumul[to] - competence_xp_cumul[from];
  }

  /* -------------------------------------------- */
  static computeCompetenceXPCost(competence) {
    let xp = RdDItemCompetence.getDeltaXp(competence.system.base, competence.system.niveau ?? competence.system.base);
    xp += competence.system.xp ?? 0;
    if (compData.name.includes('Thanatos')) xp *= 2; /// Thanatos compte double !
    xp += competence.system.xp_sort ?? 0;
    return xp;
  }

  /* -------------------------------------------- */
  static computeEconomieCompetenceTroncXP(competences) {
    let economie = 0;
    for (let troncList of competenceTroncs) {
      let list = troncList.map(name => RdDItemCompetence.findCompetence(competences, name))
        .sort(Misc.descending(c => this.system.niveau)); // tri du plus haut au plus bas
      list.splice(0, 1); // ignorer la plus élevée
      list.map(c => c).forEach(c => {
        economie += RdDItemCompetence.getDeltaXp(c.system.base, Math.min(c.system.niveau, 0))
      });
    }
    return economie;
  }

  /* -------------------------------------------- */
  static levelUp(item, stressTransforme) {
    item.system.xpNext = RdDItemCompetence.getCompetenceNextXp(item.system.niveau);
    const xpManquant = item.system.xpNext - item.system.xp;
    item.system.isLevelUp = xpManquant <= 0;
    item.system.isStressLevelUp = (xpManquant > 0 && stressTransforme >= xpManquant && item.system.niveau < item.system.niveau_archetype);
    item.system.stressXpMax = 0;
    if (xpManquant > 0 && stressTransforme > 0 && item.system.niveau < item.system.niveau_archetype) {
      item.system.stressXpMax = Math.min(xpManquant, stressTransforme);
    }
  }

  /* -------------------------------------------- */
  static isVisible(item) {
    return Number(item.system.niveau) != RdDItemCompetence.getNiveauBase(item.system.categorie);
  }

  static nomContientTexte(item, texte) {
    return Grammar.toLowerCaseNoAccent(item.name).includes(Grammar.toLowerCaseNoAccent(texte))
  }

  /* -------------------------------------------- */
  static isNiveauBase(item) {
    return Number(item.system.niveau) == RdDItemCompetence.getNiveauBase(item.system.categorie);
  }

  /* -------------------------------------------- */
  static findCompetence(list, idOrName, options = {}) {
    if (idOrName == undefined || idOrName == "") {
      return RdDItemCompetence.sansCompetence();
    }
    options = mergeObject(options, { preFilter: it => it.isCompetence(), description: 'compétence' }, { overwrite: false });
    return RdDItemCompetence.findFirstItem(list, idOrName, options);
  }

  /* -------------------------------------------- */
  static findCompetences(list, name) {
    return Misc.findAllLike(name, list, { filter: it => it.isCompetence(), description: 'compétence' });
  }

  static sansCompetence() {
    return {
      name: "Sans compétence",
      type: "competence",
      img: "systems/ctm/icons/templates/icone_parchement_vierge.webp",
      system: {
        niveau: 0,
        default_diffLibre: 0,
        base: 0,
        categorie: "Aucune",
        description: "",
        descriptionmj: "",
        defaut_carac: "",
      }
    };
  }

  static findFirstItem(list, idOrName, options) {
    return list.find(it => it.id == idOrName && options.preFilter(it))
      ?? Misc.findFirstLike(idOrName, list, options);
  }

  /* -------------------------------------------- */
  static getCompetenceNextXp(niveau) {
    return RdDItemCompetence.getCompetenceXp(niveau + 1);
  }

  /* -------------------------------------------- */
  static getCompetenceXp(niveau) {
    RdDItemCompetence._valideNiveau(niveau);
    return niveau < -10 ? 0 : xp_par_niveau[niveau + 10];
  }

  /* -------------------------------------------- */
  static getDeltaXp(from, to) {
    RdDItemCompetence._valideNiveau(from);
    RdDItemCompetence._valideNiveau(to);
    return competence_xp_cumul[to] - competence_xp_cumul[from];
  }

  /* -------------------------------------------- */
  static _valideNiveau(niveau) {
    if (niveau < -11 || niveau > niveau_max) {
      console.warn(`Niveau ${niveau} en dehors des niveaux de compétences: [-11, ${niveau_max} ]`);
    }
  }

  /* -------------------------------------------- */
  static computeResumeArchetype(competences) {
    const archetype = RdDItemCompetence.getLimitesArchetypes();
    competences.map(it => Math.max(0, it.system.niveau_archetype))
      .forEach(niveau => {
        archetype[niveau] = archetype[niveau] ?? { "niveau": niveau, "nombreMax": 0, "nombre": 0 };
        archetype[niveau].nombre = (archetype[niveau]?.nombre ?? 0) + 1;
      });
    return archetype;
  }

  /* -------------------------------------------- */
  static getLimitesArchetypes() {
    return duplicate(limitesArchetypes);
  }

}