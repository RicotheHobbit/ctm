import { SYSTEM_RDD } from "../constants.js";

export const STATUSES = {
  StatusStunned : 'stun',
  StatusBleeding: 'bleeding',
  StatusProne: 'prone',
  StatusGrappling: 'grappling',
  StatusGrappled: 'grappled',
  StatusRestrained: 'restrain',
  StatusUnconscious: 'unconscious', 
  StatusBlind: 'blind',
  StatusComma: 'comma',
  StatusDead: 'dead',
  StatusDemiReve: 'demi-reve',
}

const rddStatusEffects = [
  { rdd: true, id: STATUSES.StatusStunned, label: 'EFFECT.StatusStunned', icon: 'icons/svg/stoned.svg', "duration.rounds": 1 },
  { rdd: true, id: STATUSES.StatusBleeding, label: 'EFFECT.StatusBleeding', icon: 'icons/svg/blood.svg' },
  { rdd: true, id: STATUSES.StatusProne, label: 'EFFECT.StatusProne', icon: 'icons/svg/falling.svg' },
  { rdd: true, id: STATUSES.StatusGrappling, tint: '#33cc33', label: 'EFFECT.StatusGrappling', icon: 'systems/foundryvtt-reve-de-dragon/icons/competence_corps_a_corps.webp' },
  { rdd: true, id: STATUSES.StatusGrappled, tint: '#ff9900', label: 'EFFECT.StatusGrappled', icon: 'systems/foundryvtt-reve-de-dragon/icons/competence_corps_a_corps.webp' },
  { rdd: true, id: STATUSES.StatusRestrained, label: 'EFFECT.StatusRestrained', icon: 'icons/svg/net.svg' },
  { rdd: true, id: STATUSES.StatusUnconscious, label: 'EFFECT.StatusUnconscious', icon: 'icons/svg/unconscious.svg' },
  { rdd: true, id: STATUSES.StatusBlind, label: 'EFFECT.StatusBlind', icon: 'icons/svg/blind.svg' },
  { rdd: true, id: STATUSES.StatusComma, label: 'EFFECT.StatusComma', icon: 'icons/svg/skull.svg' },
  { rdd: true, id: STATUSES.StatusDead, label: 'EFFECT.StatusDead', icon: 'icons/svg/skull.svg' },
  { rdd: true, id: STATUSES.StatusDemiReve, label: 'EFFECT.StatusDemiReve', icon: 'systems/foundryvtt-reve-de-dragon/icons/heures/hd12.svg' }
];
const demiReveStatusEffect = rddStatusEffects.find(it => it.id == STATUSES.StatusDemiReve);

const statusDemiSurprise = [STATUSES.StatusStunned, STATUSES.StatusProne, STATUSES.StatusRestrained];
const statusSurpriseTotale = [STATUSES.StatusUnconscious, STATUSES.StatusBlind, STATUSES.StatusComma];

export class StatusEffects extends FormApplication {
  static onReady() {
    const rddStatusIds = rddStatusEffects.map(it => it.id);
    rddStatusEffects.forEach(it => it.flags = { core: { statusId: it.id } });
    const defaultStatusEffectIds = CONFIG.statusEffects.map(it => it.id);
    game.settings.register(SYSTEM_RDD, "use-status-effects", {
      name: "use-status-effects",
      scope: "world",
      config: false,
      default: defaultStatusEffectIds.join(),
      type: String
    });

    game.settings.registerMenu(SYSTEM_RDD, "select-status-effect", {
      name: "Choisir les effets disponibles",
      label: "Choix des effets",
      hint: "Ouvre la fenêtre de sélection des effets/status appliqués aux acteurs",
      icon: "fas fa-bars",
      type: StatusEffects,
      restricted: true
    });

    CONFIG.RDD.allEffects = rddStatusEffects.concat(CONFIG.statusEffects.filter(it => !rddStatusIds.includes(it.id)));

    StatusEffects._setUseStatusEffects(StatusEffects._getUseStatusEffects());
    console.log('statusEffects', CONFIG.statusEffects);
  }

  static valeurSurprise(effect, isCombat) {
    // const id = StatusEffects.statusId(effect);
    if (statusSurpriseTotale.includes(effect.flags?.core?.statusId)) {
      return 2;
    }
    return statusDemiSurprise.includes(effect.flags?.core?.statusId) || (isCombat && effect.flags?.core?.statusId == STATUSES.StatusDemiReve) ? 1 : 0;
  }

  static _getUseStatusEffects() {
     return game.settings.get(SYSTEM_RDD, "use-status-effects")?.split(',') ?? [];
  }

  static _setUseStatusEffects(statusIds) {
    if (game.user.isGM) {
      game.settings.set(SYSTEM_RDD, "use-status-effects", statusIds.join());
    }

    for (let effect of CONFIG.RDD.allEffects) {
      effect.active = effect.rdd || statusIds.includes(effect.flags?.core?.statusId);
    }
    CONFIG.statusEffects = CONFIG.RDD.allEffects.filter(it => it.active);
  }

  static status(statusId) {
    return rddStatusEffects.find(it => it.flags?.core?.statusId == statusId);
  }

  static demiReve() {
    return demiReveStatusEffect;
  }

  constructor(...args) {
    super(...args);
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      id: "status-effects",
      template: "systems/foundryvtt-reve-de-dragon/templates/settings/status-effects.html",
      height: 800,
      width: 350,
      minimizable: false,
      closeOnSubmit: true,
      title: "Choix des status/effets"
    });
    return options;
  }

  getData() {
    const used = StatusEffects._getUseStatusEffects();
    let formData = super.getData();
    formData.effects = duplicate(CONFIG.RDD.allEffects);
    formData.effects.forEach(it => it.active = used.includes(it.id))
    return formData;
  }

  activateListeners(html) {
    html.find(".select-effect").click((event) => {
      let id = event.currentTarget.attributes.name?.value;
      if (id) {
        let selected = StatusEffects._getUseStatusEffects();
        let isChecked = event.currentTarget.checked;
        if (isChecked) {
          selected.push(id);
        }
        else {
          selected = selected.filter(it => it != id)
        }
        StatusEffects._setUseStatusEffects(selected);
      }
    });
  }

  async _updateObject(event, formData) {
    this.close();
  }
}

