import { Debordement } from "./debordement.js";
import { FermetureCites } from "./fermeture-cites.js";
import { QueteEaux } from "./quete-eaux.js";
import { TerreAttache } from "./terre-attache.js";
import { ReserveExtensible } from "./reserve-extensible.js";
import { DemiReve } from "./demi-reve.js";
import { TrouNoir } from "./trou-noir.js";
import { Rencontre } from "./rencontre.js";
import { SortReserve } from "./sort-reserve.js";
import { CarteTmr } from "./carte-tmr.js";
import { PontImpraticable } from "./pont-impraticable.js";
import { Draconique } from "./draconique.js";
import { PresentCites } from "./present-cites.js";
import { Desorientation } from "./desorientation.js";
import { Conquete } from "./conquete.js";
import { Pelerinage } from "./pelerinage.js";
import { Periple } from "./periple.js";
import { UrgenceDraconique } from "./urgence-draconique.js";
import { Grammar } from "../grammar.js";
import { AugmentationSeuil } from "./augmentation-seuil.js";


export class EffetsDraconiques {
  static carteTmr = new CarteTmr();
  static demiReve = new DemiReve();
  static rencontre = new Rencontre();
  static sortReserve = new SortReserve();
  static debordement = new Debordement();
  static presentCites = new PresentCites();
  static fermetureCites = new FermetureCites();
  static queteEaux = new QueteEaux();
  static reserveExtensible = new ReserveExtensible();
  static terreAttache = new TerreAttache();
  static trouNoir = new TrouNoir();
  static pontImpraticable = new PontImpraticable();
  static desorientation = new Desorientation();
  static conquete = new Conquete();
  static pelerinage = new Pelerinage();
  static periple = new Periple();
  static urgenceDraconique = new UrgenceDraconique();
  static augmentationSeuil = new AugmentationSeuil();

  static init() {
    Draconique.register(EffetsDraconiques.carteTmr);
    Draconique.register(EffetsDraconiques.demiReve);
    Draconique.register(EffetsDraconiques.rencontre);
    Draconique.register(EffetsDraconiques.sortReserve);
    Draconique.register(EffetsDraconiques.debordement);
    Draconique.register(EffetsDraconiques.fermetureCites);
    Draconique.register(EffetsDraconiques.queteEaux);
    Draconique.register(EffetsDraconiques.reserveExtensible);
    Draconique.register(EffetsDraconiques.terreAttache);
    Draconique.register(EffetsDraconiques.trouNoir);
    Draconique.register(EffetsDraconiques.pontImpraticable);
    Draconique.register(EffetsDraconiques.presentCites);
    Draconique.register(EffetsDraconiques.desorientation);
    Draconique.register(EffetsDraconiques.conquete);
    Draconique.register(EffetsDraconiques.pelerinage);
    Draconique.register(EffetsDraconiques.periple);
    Draconique.register(EffetsDraconiques.urgenceDraconique);
    Draconique.register(EffetsDraconiques.augmentationSeuil)
  }

  /* -------------------------------------------- */
  static isCaseInondee(caseTMR, coord) {
    return EffetsDraconiques.debordement.isCase(caseTMR, coord) ||
      EffetsDraconiques.pontImpraticable.isCase(caseTMR, coord);
  }

  static isInnaccessible(caseTMR, coord) {
    return EffetsDraconiques.trouNoir.isCase(caseTMR, coord) ||
      EffetsDraconiques.desorientation.isCase(caseTMR, coord);
  }

  static isCaseTrouNoir(caseTMR, coord) {
    return EffetsDraconiques.trouNoir.isCase(caseTMR, coord);
  }

  static isCasePelerinage(caseTMR, coord) {
    return EffetsDraconiques.pelerinage.isCase(caseTMR, coord);
  }

  static isReserveExtensible(caseTMR, coord) {
    return EffetsDraconiques.reserveExtensible.isCase(caseTMR, coord);
  }

  static isTerreAttache(caseTMR, coord) {
    return EffetsDraconiques.terreAttache.isCase(caseTMR, coord);
  }

  static isCiteFermee(caseTMR, coord) {
    return EffetsDraconiques.fermetureCites.isCase(caseTMR, coord);
  }

  static isPresentCite(caseTMR, coord) {
    return EffetsDraconiques.presentCites.isCase(caseTMR, coord);
  }

  /* -------------------------------------------- */
  static isSortImpossible(actor) {
    return actor.items.find(it =>
      EffetsDraconiques.conquete.match(it) ||
      EffetsDraconiques.periple.match(it) ||
      EffetsDraconiques.urgenceDraconique.match(it) ||
      EffetsDraconiques.pelerinage.match(it)
    );
  }

  static isSortReserveImpossible(actor) {
    return actor.items.find(it =>
      EffetsDraconiques.conquete.match(it) ||
      EffetsDraconiques.periple.match(it) ||
      EffetsDraconiques.pelerinage.match(it)
    );
  }

  static filterItems(actor, filter, name) {
    return actor.filterItems(filter)
      .filter(it => Grammar.includesLowerCaseNoAccent(it.name, name));
  }

  static countAugmentationSeuil(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isTeteDragon, 'Augmentation du seuil de r??ve').length;
  }

  static isDonDoubleReve(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isTeteDragon, 'Don de double-r??ve').length>0;
  }

  static isConnaissanceFleuve(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isTeteDragon, 'connaissance du fleuve').length>0;
  }

  static isReserveEnSecurite(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isTeteDragon, 'r??serve en s??curit??').length>0;
  }

  static isDeplacementAccelere(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isTeteDragon, ' d??placement acc??l??r??').length>0;
  }

  static isDoubleResistanceFleuve(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isSouffleDragon, 'r??sistance du fleuve').length>0;
  }

  static countInertieDraconique(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isQueueDragon, 'inertie draconique').length;
  }

  static countMonteeLaborieuse(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isQueueSouffle, 'mont??e laborieuse').length;
  }

  static mauvaiseRencontre(actor) {
    const mauvaisesRencontres = EffetsDraconiques.filterItems(actor, Draconique.isQueueSouffle, 'mauvaise rencontre');
    return mauvaisesRencontres.length>0 ? mauvaisesRencontres[0] : undefined;
  }

  static isPontImpraticable(actor) {
    return actor.items.find(it => EffetsDraconiques.pontImpraticable.match(it));
  }

  static isUrgenceDraconique(actor) {
    return actor.items.find(it => EffetsDraconiques.urgenceDraconique.match(it));
  }

  static isPeage(actor) {
    return EffetsDraconiques.filterItems(actor, Draconique.isSouffleDragon, 'p??age').length > 0;
  }


}