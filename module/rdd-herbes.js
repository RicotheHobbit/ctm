import { RdDUtility } from "./rdd-utility.js";
import { RdDCalendrier } from "./rdd-calendrier.js";
import { Grammar } from "./grammar.js";
import { SystemCompendiums } from "./settings/system-compendiums.js";

/* -------------------------------------------- */
export class RdDHerbes extends Item {

  /* -------------------------------------------- */
  static async initializeHerbes() {
    this.herbesSoins = await RdDHerbes.listCategorieHerbes('Soin');
    this.herbesRepos = await RdDHerbes.listCategorieHerbes('Repos');
  }

  static async listCategorieHerbes(categorie) {
    const herbes = await SystemCompendiums.getWorldOrCompendiumItems('herbe', 'botanique');
    return herbes.filter(it => Grammar.equalsInsensitive(it.system.categorie, categorie));
  }

  /* -------------------------------------------- */
  static buildHerbesList(listeHerbes, max) {
    let list = {}
    for (let herbe of listeHerbes) {
      let brins = max - herbe.system.niveau;
      list[herbe.name] = `${herbe.name} (Bonus: ${herbe.system.niveau}, Brins: ${brins})`;
    }
    list['Autre'] = 'Autre (Bonus: variable, Brins: variable)'
    return list;
  }

  /* -------------------------------------------- */
  static async updatePotionData(formData) {
    formData.isSoins = formData.system.categorie.includes('Soin');
    formData.isRepos = formData.system.categorie.includes('Repos');
    if (formData.isSoins) {
      RdDHerbes.calculBonusHerbe(formData, this.herbesSoins, 12);
    }
    if (formData.isRepos) {
      RdDHerbes.calculBonusHerbe(formData, this.herbesRepos, 7);
    }
    formData.herbesSoins = RdDHerbes.buildHerbesList(this.herbesSoins, 12);
    formData.herbesRepos = RdDHerbes.buildHerbesList(this.herbesRepos, 7);
    formData.jourMoisOptions = RdDCalendrier.buildJoursMois();
    formData.dateActuelle = game.system.rdd.calendrier.getDateFromIndex();
    formData.splitDate = game.system.rdd.calendrier.getDayMonthFromIndex(formData.system.prdate);
  }

  /* -------------------------------------------- */
  static calculPuissancePotion(potion) {
    return potion.system.herbebonus * potion.system.pr;
  }

  /* -------------------------------------------- */
  static calculPointsRepos(potion) {
    return potion.system.herbebonus * potion.system.pr;
  }

  /* -------------------------------------------- */
  static calculPointsGuerison(potion) {
    return potion.system.herbebonus * potion.system.pr;
  }

  /* -------------------------------------------- */
  static calculBonusHerbe(formData, herbesList, max) {
    if (Number(formData.system.herbebrins)) {
      let herbe = herbesList.find(item => item.name.toLowerCase() == formData.system.herbe.toLowerCase());
      if (herbe) {
        const brinsRequis = max - herbe.system.niveau;
        const brinsManquants = Math.max(brinsRequis - formData.system.herbebrins, 0);
        formData.system.herbebonus = Math.max(herbe.system.niveau - brinsManquants, 0);
      }
    }
  }

}  