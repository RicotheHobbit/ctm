import { EffetsRencontre } from "./effets-rencontres.js";

const tableEffets = [
  { code: "messager", resultat: "succes", description: "Envoie un message à (force) cases", method: EffetsRencontre.messager },
  { code: "passeur", resultat: "succes", description: "Déplacer le demi-rêve à (force) cases", method: EffetsRencontre.passeur},
  { code: "reve+f", resultat: "succes", description: "Gain de (force) points de rêve" , method: EffetsRencontre.reve_plus_force},
  { code: "teleport", resultat: "succes", description: "Déplacer le demi-rêve (même type)", method: EffetsRencontre.teleportation_typecase },
  { code: "part+tete", resultat: "succes", description: "Tête de dragon sur réussite particulière", method: EffetsRencontre.rdd_part_tete },
  { code: "part+xp", resultat: "succes", description: "Expérience sur réussite particulière", method: EffetsRencontre.experience_particuliere },
  { code: "seuil", resultat: "succes", description: "Récupération de seuil de rêve", method: EffetsRencontre.regain_seuil },

  { code: "reve-1", resultat: "echec", description: "Perte de 1 point de rêve", method: EffetsRencontre.reve_moins_1 },
  { code: "reve-f", resultat: "echec", description: "Perte de (force) points de rêve", method: EffetsRencontre.reve_moins_force },
  { code: "vie-1", resultat: "echec", description: "Perte de 1 point de vie", method: EffetsRencontre.vie_moins_1 },
  { code: "reinsere", resultat: "echec", description: "Réinsertion aléatoire", method: EffetsRencontre.reinsertion },
  { code: "persistant", resultat: "echec", description: "Bloque le demi-rêve", method: EffetsRencontre.rencontre_persistante },
  { code: "teleport-aleatoire", resultat: "echec", description: "Déplacement aléatoire (même type)", method: EffetsRencontre.teleportation_aleatoire_typecase },
  { code: "aleatoire", resultat: "echec", description: "Déplacement aléatoire", method: EffetsRencontre.deplacement_aleatoire },
  { code: "sort-aleatoire", resultat: "echec", description: "Déclenche un sort en réserve aléatoire", method: EffetsRencontre.sort_aleatoire },
  { code: "rompu", resultat: "echec", description: "Demi-rêve interrompu", method: EffetsRencontre.demireve_rompu },
  { code: "echec-queue", resultat: "echec", description: "Queue(s) de dragon sur échec", method: EffetsRencontre.rdd_echec_queue },

  { code: "reve+1", resultat: "succes", description: "Gain de 1 point de rêve", method: EffetsRencontre.reve_plus_1 },
  { code: "vie-f", resultat: "echec", description: "Perte de (force) points de vie", method: EffetsRencontre.vie_moins_force },
  { code: "moral+1", resultat: "succes", description: "Gain de 1 point de moral", method: EffetsRencontre.moral_plus_1 },
  { code: "moral-1", resultat: "echec", description: "Perte de 1 point de moral", method: EffetsRencontre.moral_moins_1 },
  { code: "xpsort+f", resultat: "succes", description: "Gain de (force) xp sort", method: EffetsRencontre.xp_sort_force },
  { code: "endurance-1", resultat: "echec", description: "Perte de 1 point d'endurance", method: EffetsRencontre.end_moins_1 },
  { code: "endurance-f", resultat: "echec", description: "Perte de (force) points d'endurance", method: EffetsRencontre.end_moins_force },
  { code: "fatigue+1", resultat: "echec", description: "Coup de fatigue de 1 point", method: EffetsRencontre.fatigue_plus_1},
  { code: "fatigue+f", resultat: "echec", description: "Coup de fatigue de 1 (force) points", method: EffetsRencontre.fatigue_plus_force },
  { code: "fatigue-1", resultat: "succes", description: "Récupération de 1 point de fatigue", method: EffetsRencontre.fatigue_moins_1},
  { code: "fatigue-f", resultat: "succes", description: "Récupération de 1 (force) points de fatigue", method: EffetsRencontre.fatigue_moins_force },
  { code: "perte-chance", resultat: "echec", description: "Perte de chance actuelle", method: EffetsRencontre.perte_chance },
  { code: "stress+1", resultat: "succes", description: "Gain de 1 point de stress", method: EffetsRencontre.stress_plus_1 },
  // { code: "epart-souffle", resultat: "echec", description: "Souffle de dragon sur échec particulier" },
];

export class RdDRencontre {

  static getEffetsSucces() { return RdDRencontre.getEffets("succes"); }
  static getEffetsEchec() { return RdDRencontre.getEffets("echec"); }
  static getEffets(resultat) {
    return tableEffets.filter(e => resultat == e.resultat);
  }
  
  static mapEffets(liste) {
    return liste.map(it => RdDRencontre.getEffet(it));
  }
  
  static getListeEffets(item, reussite) {
    if (reussite == 'echec') {
      return [...item.system.echec.effets];
    }
    if (reussite == 'succes') {
      return [...item.system.succes.effets];
    }
    return [];
  }

  static getEffet(code) {
    return tableEffets.find(it => code == it.code)
  }

  static async appliquer(codes, tmrDialog, rencData) {
    for(const effet of RdDRencontre.mapEffets(codes)){
      await effet.method(tmrDialog, rencData);
    }
  }

}
