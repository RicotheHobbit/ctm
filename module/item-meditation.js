export class RdDItemMeditation {

  static calculDifficulte(rollData) {
    if (rollData.meditation) {
      // Malus permanent éventuel
      let diff = rollData.meditation.system.malus ?? 0;
      if (!rollData.conditionMeditation.isHeure) diff -= 2;
      if (!rollData.conditionMeditation.isVeture) diff -= 2;
      if (!rollData.conditionMeditation.isComportement) diff -= 2;
      if (!rollData.conditionMeditation.isPurification) diff -= 2;
      return diff;
    }
    return 0;
  }
}