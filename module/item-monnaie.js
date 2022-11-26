import { Misc } from "./misc.js";
import { LOG_HEAD } from "./constants.js";

const MONNAIE_ETAIN = {
  name: "Etain (1 denier)", type: 'monnaie',
  img: "systems/foundryvtt-reve-de-dragon/icons/objets/piece_etain_poisson.webp",
  system: { quantite: 0, valeur_deniers: 1, encombrement: 0.001, description: "" }
};
const MONNAIE_BRONZE = {
  name: "Bronze (10 deniers)", type: 'monnaie',
  img: "systems/foundryvtt-reve-de-dragon/icons/objets/piece_bronze_epees.webp",
  system: { quantite: 0, valeur_deniers: 10, encombrement: 0.002, description: "" }
};
const MONNAIE_ARGENT = {
  name: "Argent (1 sol)", type: 'monnaie',
  img: "systems/foundryvtt-reve-de-dragon/icons/objets/piece_argent_sol.webp",
  system: { quantite: 0, valeur_deniers: 100, encombrement: 0.003, description: "" }
};
const MONNAIE_OR = {
  name: "Or (10 sols)", type: 'monnaie',
  img: "systems/foundryvtt-reve-de-dragon/icons/objets/piece_or_sol.webp",
  system: { quantite: 0, valeur_deniers: 1000, encombrement: 0.004, description: "" }
};

const MONNAIES_STANDARD = [MONNAIE_ETAIN, MONNAIE_BRONZE, MONNAIE_ARGENT, MONNAIE_OR];

export class Monnaie {

  static monnaiesStandard() {
    return MONNAIES_STANDARD;
  }

  static monnaiesManquantes(actor) {
    const disponibles = actor.itemTypes['monnaie'];
    const manquantes = MONNAIES_STANDARD.filter(standard => !disponibles.find(disponible => Monnaie.deValeur(disponible, standard.system?.valeur_deniers)));
    if (manquantes.length > 0) {
      console.error(`${LOG_HEAD} monnaiesManquantes pour ${actor.name}`, manquantes, ' avec monnaies', disponibles, MONNAIES_STANDARD);
    }
    return manquantes;
  }

  static deValeur(monnaie, valeur) {
    return valeur == monnaie.system.valeur_deniers
  }

  static arrondiDeniers(sols) {
    return Number(sols).toFixed(2);
  }

  static triValeurDenier() {
    return Misc.ascending(item => item.system.valeur_deniers)
  }

  static async creerMonnaiesStandard(actor) {
    await actor.createEmbeddedDocuments('Item', MONNAIES_STANDARD, { renderSheet: false });
  }

  static async creerMonnaiesDeniers(actor, fortune) {
    await actor.createEmbeddedDocuments('Item', [Monnaie.creerDeniers(fortune)], { renderSheet: false });
  }

  static creerDeniers(fortune) {
    const deniers = duplicate(MONNAIE_ETAIN);
    deniers.system.quantite = fortune;
    return deniers;
  }

  static async optimiser(actor, fortune) {
    let reste = fortune;
    let monnaies = actor.itemTypes['monnaie'];
    let updates = [];
    let parValeur = Misc.classifyFirst(monnaies, it => it.system.valeur_deniers);
    for (let valeur of  [1000, 100, 10, 1]) {
      const itemPiece = parValeur[valeur];
      if (itemPiece) {
        const quantite = Math.floor(reste / valeur);
        if (quantite != itemPiece.system.quantite) {
          updates.push({ _id: parValeur[valeur].id, 'system.quantite': quantite });
        }
        reste -= quantite*valeur;
      }
    }
    console.log('Monnaie.optimiser', actor.name, 'total', fortune, 'parValeur', parValeur, 'updates', updates, 'reste', reste);
    if (updates.length > 0) {
      await actor.updateEmbeddedDocuments('Item', updates);
    }
    if (reste > 0){
      // créer le reste en deniers fortune en deniers
      await Monnaie.creerMonnaiesDeniers(actor, reste);
    }
  }

}
