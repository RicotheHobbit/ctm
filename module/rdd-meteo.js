
const vents = [
  { min: 0, max: 0, valeur: 'Calme' },
  { min: 1, max: 1, valeur: 'Légère brise' },
  { min: 2, max: 2, valeur: 'Jolie brise' },
  { min: 3, max: 3, valeur: 'Bonne brise' },
  { min: 4, max: 4, valeur: 'Vent frais' },
  { min: 5, max: 5, valeur: 'Coup de vent' },
  { min: 6, max: 6, valeur: 'Fort coup de vent' },
  { min: 7, max: 9, valeur: 'Tempête' },
  { min: 10, max: 13, valeur: 'Violente tempête' },
  { min: 14, valeur: 'Ouragan' },
]
const mers = [
  { min: 0, max: 0, valeur: 'Calme' },
  { min: 1, max: 1, valeur: 'Belle' },
  { min: 2, max: 2, valeur: 'Peu agitée' },
  { min: 3, max: 3, valeur: 'Agitée' },
  { min: 4, max: 4, valeur: 'Forte' },
  { min: 5, max: 6, valeur: 'Très forte' },
  { min: 7, max: 9, valeur: 'Grosse' },
  { min: 10, max: 13, valeur: 'Très grosse' },
  { min: 14, valeur: 'Énorme' },
]

const nuages = [
  { min: 0, max: 3, valeur: 'dégagé' },
  { min: 4, max: 6, valeur: 'passages nuageux' },
  { min: 7, max: 9, valeur: 'nuageux',  },
  { min: 10, max: 10, valeur: 'brouillard' },
  { min: 11, max: 12, valeur: 'bruine' },
  { min: 13, valeur: 'très nuageux' },
]

const pluies = [
  { min: 0, max: 4, valeur: 'aucune' },
  { min: 5, max: 5, valeur: 'bruine, crachin, éparse' },
  { min: 6, max: 7, valeur: 'averses' },
  { min: 8, max: 10, valeur: 'pluvieux', },
  { min: 11, max: 13, valeur: 'forte pluie' },
  { min: 14, valeur: 'déluge' },
]

const temperatures = [
  { max: -14, valeur: 'glaciale' },
  { min: -13, max: -10, valeur: 'Très froide' },
  { min: -9, max: -7, valeur: 'froide' },
  { min: -6, max: -4, valeur: 'fraîche' },
  { min: -3, max: 3, valeur: 'de saison' },
  { min: 4, max: 6, valeur: 'élevée' },
  { min: 7, max: 9, valeur: 'chaude' },
  { min: 10, max: 13, valeur: 'torride' },
  { min: 14, valeur: 'caniculaire' },
]

export class RdDMeteo {
  static async getForce() {
    const roll = new Roll(`1dr`);
    await roll.evaluate({ async: true });
    return roll.total;
  }

  static async getPluie(nuage) {
    return nuage <= 3 ? 0 : await RdDMeteo.getForce();
  }

  static async getTemperature() {
    const degre = await RdDMeteo.getForce();
    const rollChaudFroid = new Roll('1d2');
    await rollChaudFroid.evaluate({ async: true });
    const chaudFroid = rollChaudFroid.total == 1;
    return chaudFroid.total ? degre : -degre;
  }

  static async getDirection(direction) {
    const roll = new Roll(`1d16`);
    await roll.evaluate({ async: true });
    switch (roll.total % 16) {
      case 0: return 'Nord';
      case 1: return 'Nord Nord Est';
      case 2: return 'Nord Est';
      case 3: return 'Est Nord Est';
      case 4: return 'Est';
      case 5: return 'Est Sud Est';
      case 6: return 'Sud Est';
      case 7: return 'Sud Sud Est';
      case 8: return 'Sud';
      case 9: return 'Sud Sud Ouest';
      case 10: return 'Sud Ouest';
      case 11: return 'Ouest Sud Ouest';
      case 12: return 'Ouest';
      case 13: return 'Ouest Nord Ouest';
      case 14: return 'Nord Ouest';
      case 15: return 'Nord Nord Ouest';
    }
    return undefined;
  }

  static async getMeteo() {
    const vent = await RdDMeteo.getForce();
    const mer = await RdDMeteo.getForce();
    const nuage = await RdDMeteo.getForce();
    const pluie = await RdDMeteo.getPluie(nuage);
    const temperature = await RdDMeteo.getTemperature();
    const meteo = {
      vent: { force: vent, direction: await RdDMeteo.getDirection(), },
      mer: { force: mer, direction: await RdDMeteo.getDirection(), },
      temperature: { force: temperature },
      nuage: { force: nuage, },
      pluie: { force: pluie },
    }
    meteo.vent.description = RdDMeteo.vent(meteo.vent.force);
    meteo.mer.description = RdDMeteo.mer(meteo.mer.force),
    meteo.temperature.description = RdDMeteo.temperature(meteo.temperature.force);
    meteo.nuage.description = RdDMeteo.nuage(meteo.nuage.force);
    meteo.pluie.description = RdDMeteo.pluie(meteo.pluie.force);

    ChatMessage.create({
      content: await renderTemplate('systems/ctm/templates/chat-resultat-meteo.html', meteo),
      whisper: ChatMessage.getWhisperRecipients('GM')
    });
  }

  static description(liste, force, valeur = it => it.valeur) {
    let select = liste.find(it => (it.min == undefined || it.min <= force) && (it.max == undefined || force <= it.max));
    return valeur(select ?? liste[0]);
  }

  static vent(force) { return this.description(vents, force); }
  static mer(force) { return this.description(mers, force); }
  static nuage(force) { return this.description(nuages, force); }
  static pluie(force) { return this.description(pluies, force); }
  static temperature(force) { return this.description(temperatures, force); }
}