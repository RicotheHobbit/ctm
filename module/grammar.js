
const articlesApostrophes = {
  'de': 'd\'',
  'le': 'l\'',
  'la': 'l\''
}
export class Grammar {

  /* -------------------------------------------- */
  static apostrophe(article, word) {
    if (articlesApostrophes[article] && Grammar.startsWithVoyel(word)) {
      return articlesApostrophes[article] + word
    }
    return article + ' ' + word;
  }

  /* -------------------------------------------- */
  static startsWithVoyel(word) {
    return word.match(/^[aeiouy]/i)
  }

  static equalsInsensitive(a, b) {
    return Grammar.toLowerCaseNoAccent(a) == Grammar.toLowerCaseNoAccent(b)
  }
  
  static includesLowerCaseNoAccent(value, content) {
    return Grammar.toLowerCaseNoAccent(value).includes(Grammar.toLowerCaseNoAccent(content));
  }

  /* -------------------------------------------- */
  static toLowerCaseNoAccent(words) {
    return words?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? words;
  }

  /* -------------------------------------------- */
  static toLowerCaseNoAccentNoSpace(words) {
    return words?.toLowerCase().normalize("NFD").replace(/[ \u0300-\u036f]/g, "") ?? words;
  }
  
  /* -------------------------------------------- */
  static articleDetermine(genre) {
    switch (Grammar.toLowerCaseNoAccent(genre)) {
      case 'f': case 'feminin': return 'la';
      case 'p': case 'mp': case 'fp': case 'pluriel': return 'les';
      default:
      case 'm': case 'masculin': return 'le';
    }
  }
  
  /* -------------------------------------------- */
  static articleIndetermine(genre) {
    switch (Grammar.toLowerCaseNoAccent(genre)) {
      case 'f': case 'feminin': return 'une';
      case 'p': case 'fp': case 'mp': case 'pluriel': return 'des';
      case 'n': case 'neutre': return 'du'
      default:
      case 'm': case 'masculin': return 'un';
    }
  }

  /* -------------------------------------------- */
  /**
   * renvoie un des mots en fonction du genre:
   *
   * - masculin/neutre/m/n : mots[0]
   * - feminin/f : mots[1]
   * - pluriel/mp/p : mots[2]
   * - fp : mots[3]
   * 
   * @param {*} genre
   * @param  {...any} mots 
   */
  static accord(genre, ...mots) {
    switch (Grammar.toLowerCaseNoAccent(genre)) {
      default:
      case 'n': case 'neutre':
      case 'm': case 'masculin': return mots[0];
      case 'f': case 'feminin': return mots[1];
      case 'p': case 'mp': case 'pluriel': return mots[2]
      case 'fp': return mots[3];
    }
  }

}