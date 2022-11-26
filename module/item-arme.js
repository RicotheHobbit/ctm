import { RdDItemCompetenceCreature } from "./item-competencecreature.js"
import { Misc } from "./misc.js";
import { RdDCombatManager } from "./rdd-combat.js";

const nomCategorieParade = {
  "sans-armes": "Sans arme",
  "armes-naturelles": "Sans arme",
  "hast": "Armes d'hast",
  "batons": "Bâtons",
  "boucliers": "Boucliers",
  "dagues": "Dagues",
  "epees-courtes": "Epées courtes",
  "epees-longues": "Epées longues",
  "epees-lourdes": "Epées lourdes",
  "haches": "Haches",
  "lances": "Lances",
}

/* -------------------------------------------- */
export class RdDItemArme extends Item {

  static isArme(item) {
    return (item.type == 'competencecreature' && item.system.iscombat) || item.type == 'arme';
  }

  /* -------------------------------------------- */
  static getArme(arme) {
    switch (arme ? arme.type : '') {
      case 'arme': return arme;
      case 'competencecreature':
        return RdDItemCompetenceCreature.armeNaturelle(arme);
    }
    return RdDItemArme.mainsNues();
  }

  static computeNiveauArmes(armes, competences) {
    for (const arme of armes) {
      arme.system.niveau = RdDItemArme.niveauCompetenceArme(arme, competences);
    }
  }

  static niveauCompetenceArme(arme, competences) {
    const compArme = competences.find(it => it.name == arme.system.competence);
    return compArme?.system.niveau ?? -8;
  }

  /* -------------------------------------------- */
  static getNomCategorieParade(arme) {
    const categorie = arme?.system ? RdDItemArme.getCategorieParade(arme) : arme;
    return nomCategorieParade[categorie];
  }

  /* -------------------------------------------- */
  static needArmeResist(armeAttaque, armeParade) {
    if (!armeAttaque || !armeParade) {
      return false;
    }
    // Epées parant une arme de bois (cf. page 115 ), une résistance est nécessaire
    let attCategory = RdDItemArme.getCategorieParade(armeAttaque);
    let defCategory = RdDItemArme.getCategorieParade(armeParade);

    return attCategory.match(/epees-/) && defCategory.match(/(haches|lances)/);
  }

  /* -------------------------------------------- */
  static getCategorieParade(armeData) {
    if (armeData.system.categorie_parade) {
      return armeData.system.categorie_parade;
    }
    // pour compatibilité avec des personnages existants
    if (armeData.type == 'competencecreature' || armeData.system.categorie == 'creature') {
      return armeData.system.categorie_parade || (armeData.system.isparade ? 'armes-naturelles' : '');
    }
    if (!armeData.type.match(/arme|competencecreature/)) {
      return '';
    }
    if (armeData.system.competence == undefined) {
      return 'competencecreature';
    }
    let compname = armeData.system.competence.toLowerCase();
    if (compname.match(/^(dague de jet|javelot|fouet|arc|arbalête|fronde|hache de jet|fléau)$/)) return '';

    if (compname.match('hache')) return 'haches';
    if (compname.match('hast')) return 'hast';
    if (compname.match('lance')) return 'lances';
    if (compname.match('bouclier')) return 'boucliers';
    if (compname.match('masse')) return 'masses';
    if (compname.match('epée') || compname.match('épée')) {
      if (armeData.name.toLowerCase().match(/(gnome)/))
        return 'epees-courtes';
      if (armeData.name.toLowerCase().match(/((e|é)pée dragone|esparlongue|demi-dragonne)/))
        return 'epees-longues';
      return 'epees-lourdes';
    }
    if (compname.match('dague')) {
      return 'dagues';
    }
    return 'sans-armes';
  }

  /* -------------------------------------------- */
  static needParadeSignificative(armeAttaque, armeParade) {
    if (!armeAttaque || !armeParade) {
      return false;
    }
    // categories d'armes à la parade (cf. page 115 )
    let attCategory = RdDItemArme.getCategorieParade(armeAttaque);
    let defCategory = RdDItemArme.getCategorieParade(armeParade);
    // bouclier et mêmes catégorie: peuvent se parer sans difficulté
    if (defCategory == 'boucliers') {
      return false;
    }
    // Parer avec une hache ou une arme d’hast exige toujours une significative
    if (defCategory.match(/(hast|haches)/)) {
      return true;
    }
    if (defCategory == attCategory) {
      return false;
    }
    // les épées se parent entre elles
    if (defCategory.match(/epees-/) && attCategory.match(/epees-/)) {
      return false;
    }
    // l'épée gnome pare la dague
    if (defCategory == 'epees-courtes' && attCategory == 'dagues') {
      return false;
    }
    // la dague pare les épées courtes et légères
    if (defCategory == 'dagues' && attCategory.match(/epees-(courtes|legeres)/)) {
      return false;
    }
    return true;
  }

  /* -------------------------------------------- */
  static armeUneOuDeuxMains(armeData, aUneMain) {
    if (armeData && !armeData.system.cac) {
      armeData.system.unemain = armeData.system.unemain || !armeData.system.deuxmains;
      const uneOuDeuxMains = armeData.system.unemain && armeData.system.deuxmains;
      const containsSlash = !Number.isInteger(armeData.system.dommages) && armeData.system.dommages.includes("/");
      if (containsSlash) { // Sanity check
        armeData = duplicate(armeData);

        const tableauDegats = armeData.system.dommages.split("/");
        if (aUneMain)
          armeData.system.dommagesReels = Number(tableauDegats[0]);
        else // 2 mains
          armeData.system.dommagesReels = Number(tableauDegats[1]);
      }
      else {
        armeData.system.dommagesReels = Number(armeData.system.dommages);
      }

      if (uneOuDeuxMains != containsSlash) {
        ui.notifications.info("Les dommages de l'arme à 1/2 mains " + armeData.name + " ne sont pas corrects (ie sous la forme X/Y)");
      }
    }
    return armeData;
  }

  static isArmeUtilisable(arme) {
    return arme.type == 'arme' && arme.system.equipe && (arme.system.resistance > 0 || arme.system.portee_courte > 0);
  }

  static ajoutCorpsACorps(armes, competences, carac) {
    let corpsACorps = competences.find(it => it.name == 'Corps à corps') ?? { system: { niveau: -6 } };
    let init = RdDCombatManager.calculInitiative(corpsACorps.system.niveau, carac['melee'].value);
    armes.push(RdDItemArme.mainsNues({ niveau: corpsACorps.system.niveau, initiative: init }));
    //armes.push(RdDItemArme.empoignade({ niveau: corpsACorps.system.niveau, initiative: init }));
  }

  static corpsACorps(mainsNuesActor) {
    const corpsACorps = {
      name: 'Corps à corps',
      img: 'systems/ctm/icons/competence_corps_a_corps.webp',
      system: {
        equipe: true,
        rapide: true,
        force: 0,
        dommages: "0",
        dommagesReels: 0,
        mortalite: 'non-mortel',
        competence: 'Corps à corps',
        categorie_parade: 'sans-armes'
      }
    };
    mergeObject(corpsACorps.system, mainsNuesActor ?? {}, { overwrite: false });
    return corpsACorps;
  }

  static mainsNues(mainsNuesActor) {
    const mainsNues = RdDItemArme.corpsACorps(mainsNuesActor)
    mainsNues.name = 'Mains nues'
    mainsNues.system.cac = 'pugilat'
    mainsNues.system.baseInit = 4
    return mainsNues;
  }
  
  static empoignade(mainsNuesActor) {
    const empoignade = RdDItemArme.corpsACorps(mainsNuesActor)
    empoignade.name = 'Empoignade'
    empoignade.system.cac = 'empoignade'
    empoignade.system.baseInit = 3
    empoignade.system.mortalite = 'empoignade'
    return empoignade
  }
}
