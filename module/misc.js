import { Grammar } from "./grammar.js";

/**
 * This class is intended as a placeholder for utility methods unrelated
 * to actual classes of the game system or of FoundryVTT
 */
export class Misc {
  static isFunction(v) {
    return v && {}.toString.call(v) === '[object Function]';
  }

  static upperFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  static lowerFirst(text) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  static toSignedString(number) {
    const value = parseInt(number)
    const isPositiveNumber = value != NaN && value > 0;
    return isPositiveNumber ? "+" + number : number
  }

  static sum() {
    return (a, b) => a + b;
  }

  static ascending(orderFunction = x => x) {
    return (a, b) => Misc.sortingBy(orderFunction(a), orderFunction(b));
  }

  static descending(orderFunction = x => x) {
    return (a, b) => Misc.sortingBy(orderFunction(b), orderFunction(a));
  }

  static sortingBy(a, b) {
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  }

  /**
   * Converts the value to an integer, or to 0 if undefined/null/not representing integer
   * @param {*} value value to convert to an integer using parseInt
   */
  static toInt(value) {
    if (value == undefined) {
      return 0;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  static keepDecimals(num, decimals) {
    if (decimals <= 0 || decimals > 6) return num;
    const decimal = Math.pow(10, parseInt(decimals));
    return Math.round(num * decimal) / decimal;
  }

  static getFractionHtml(diviseur) {
    if (!diviseur || diviseur <= 1) return undefined;
    switch (diviseur || 1) {
      case 2: return '&frac12;';
      case 4: return '&frac14;';
      default: return '1/' + diviseur;
    }
  }

  static classify(items, classifier = it => it.type) {
    let itemsBy = {}
    Misc.classifyInto(itemsBy, items, classifier)
    return itemsBy
  }

  static classifyFirst(items, classifier) {
    let itemsBy = {};
    for (const item of items) {
      const classification = classifier(item);
      if (!itemsBy[classification]) {
        itemsBy[classification] = item;
      }
    }
    return itemsBy;
  }

  static classifyInto(itemsBy, items, classifier = it => it.type) {
    for (const item of items) {
      const classification = classifier(item)
      let list = itemsBy[classification];
      if (!list) {
        list = []
        itemsBy[classification] = list
      }
      list.push(item)
    }
  }

  static distinct(array) {
    return [...new Set(array)];
  }

  static join(params, separator = '') {
    return params?.reduce((a, b) => a + separator + b) ?? '';
  }

  static connectedGMOrUser(ownerId = undefined) {
    if (ownerId && game.user.id == ownerId) {
      return ownerId;
    }
    return Misc.firstConnectedGM()?.id ?? game.user.id;
  }

  static getActiveUser(id) {
    return game.users.find(u => u.id == id && u.active);
  }  

  static firstConnectedGM() {
    return game.users.filter(u => u.isGM && u.active).sort(Misc.ascending(u => u.id)).find(u => u.isGM && u.active);
    
  }

  static isOwnerPlayer(actor, user=undefined) {
    return actor.testUserPermission(user ?? game.user, CONST.DOCUMENT_PERMISSION_LEVELS.OWNER)
  }

  static  isOwnerPlayerOrUniqueConnectedGM(actor, user =undefined){
    return Misc.isOwnerPlayer(actor, user) ?? Misc.isUniqueConnectedGM();
  }

  /**
   * @returns true pour un seul utilisateur: le premier GM connecté par ordre d'id
   */
  static isUniqueConnectedGM() {
    return game.user.id == Misc.firstConnectedGMId();
  }

  static firstConnectedGMId() {
    return Misc.firstConnectedGM()?.id;
  }

  /* -------------------------------------------- */
  static findPlayer(name) {
    return Misc.findFirstLike(name, game.users, { description: 'joueur' });
  }

  /* -------------------------------------------- */
  static findActor(name, actors = game.actors) {
    return Misc.findFirstLike(name, actors, { description: 'acteur' });
  }

  /* -------------------------------------------- */
  static findFirstLike(value, elements, options = {}) {
    options = mergeObject({
      mapper: it => it.name,
      preFilter: it => true,
      description: 'valeur',
      onMessage: m => ui.notifications.info(m)
    }, options);

    const subset = this.findAllLike(value, elements, options);
    if (subset.length == 0) {
      return undefined
    }
    if (subset.length == 1) {
      return subset[0]
    }
    let single = subset.find(it => Grammar.toLowerCaseNoAccent(options.mapper(it)) == Grammar.toLowerCaseNoAccent(value));
    if (!single) {
      single = subset[0];
      const choices = Misc.join(subset.map(it => options.mapper(it)), '<br>');
      options.onMessage(`Plusieurs choix de ${options.description}s possibles:<br>${choices}<br>Le premier sera choisi: ${options.mapper(single)}`);
    }
    return single;
  }

  static findAllLike(value, elements, options = {}) {
    options = mergeObject({
      mapper: it => it.name,
      preFilter: it => true,
      description: 'valeur',
      onMessage: m => ui.notifications.info(m)
    }, options);

    if (!value) {
      options.onMessage(`Pas de ${options.description} correspondant à une valeur vide`);
      return [];
    }
    value = Grammar.toLowerCaseNoAccent(value);
    const subset = elements.filter(options.preFilter)
      .filter(it => Grammar.toLowerCaseNoAccent(options.mapper(it))?.includes(value));
    if (subset.length == 0) {
      options.onMessage(`Pas de ${options.description} correspondant à ${value}`);
    }
    return subset;
  }
}
