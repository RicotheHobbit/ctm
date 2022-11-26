
const tableGemmes = {
  "almaze": { label: "Almaze", couleur: "Blanc"},
  "aquafane": { label: "Aquafane", couleur: "Vert Profond"},
  "asterite": { label: "Astérite", couleur: "Bleu, Violet ou Blanc"},
  "cyanolithe": { label: "Cyanolithe", couleur: "Bleu Intense"},
  "larmededragon": { label: "Larme de Dragon", couleur: "Rouge Intense"},
  "muska": { label: "Muska", couleur: "Violet Profond"},
  "nebuleuse": { label: "Nébuleuse", couleur: "Brouillard Intense"},
  "nebuleuse": { label: "Nébuleuse", couleur: "Brouillard Intense, Rose, Vert ou Bleu Pâle"},
  "oeildetigre": { label: "Oeil de Tigre", couleur: "Jaune"},
  "scarlatine": { label: "Scarlatine", couleur: "Rouge Clair ou Orangé"},
  "seliphane": { label: "Séliphane", couleur: "Vert Lumineux"},
  "tournelune": { label: "Tournelune", couleur: "Violet ou Bleu"},
  "zebraide": { label: "Zebraïde", couleur: "Bandes Bicolores, toutes couleurs"}
}

export class RdDGemme extends Item {

  static getGemmeTypeOptionList() {
    // TODO: look how to map object key-value pairs
    let options = ""
    for (let gemmeKey in tableGemmes) {
      options += `<option value="${gemmeKey}">${tableGemmes[gemmeKey].label}</option>`
    }
    return options;
  }


  static calculDataDerivees(gemme) {
    gemme.system.cout = (gemme.system.taille * gemme.system.purete) + gemme.system.qualite;
    gemme.system.inertie = 7 - gemme.system.purete;
    gemme.system.enchantabilite = gemme.system.taille - gemme.system.inertie;
  }

}
