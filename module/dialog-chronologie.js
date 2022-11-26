import { SYSTEM_RDD } from "./constants.js";
import { Grammar } from "./grammar.js";


const LATEST_USED_JOURNAL_ID = "chronologie-dernier-journal";

export class DialogChronologie extends Dialog {

  static init() {
    game.settings.register(SYSTEM_RDD, LATEST_USED_JOURNAL_ID, {
      name: "Dernier article de journal utilisé pour enregistrer la chronologie",
      scope: "client",
      config: false,
      default: "",
      type: String
    });
  }
  static async create() {
    const dateRdD = game.system.rdd.calendrier.getCalendrier();
    const dialogData = {
      auteur: game.user.name,
      isGM: game.user.isGM,
      information: "",
      journalId: game.settings.get(SYSTEM_RDD, LATEST_USED_JOURNAL_ID),
      journaux: game.journal.filter(it => it.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)),
      dateRdD: dateRdD,
      jourRdD: dateRdD.jour +1,
      heureRdD: game.system.rdd.calendrier.getCurrentHeure(),
      dateReel: DialogChronologie.getCurrentDateTime()
    };
    const html = await renderTemplate("systems/foundryvtt-ctm/templates/dialog-chronologie.html", dialogData);
    const dialog = new DialogChronologie(html);
    dialog.render(true);
  }

  constructor(html) {
    const options = {
      classes: ["DialogChronologie"],
      width: 500,
      height: 'fit-content',
      'z-index': 99999
    };
    const conf = {
      title: "Chronologie",
      content: html,
      buttons: {
        ajout: { label: "Ajouter", callback: it => this.ajouter() },
      }
    };
    super(conf, options);
  }

  static getCurrentDateTime() {
    return new Date().toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(" ", "T");
  }

  activateListeners(html) {
    super.activateListeners(html);
  }

  async ajouter() {
    await this.forceValidation();
    const { journalId, journalEntry } = this.findJournal();
    // ajouter à la page ou créer une page
    this.addContentToJournal(journalEntry, await this.prepareChronologieEntry());

    this.storeLatestUsedJournalEntry(journalId);
  }

  async forceValidation() {
    await $("form.rdddialogchrono :input").change();
  }

  findJournal() {
    const journalId = $("form.rdddialogchrono :input[name='journalId']").val();
    const journalEntry = game.journal.get(journalId);
    return { journalId, journalEntry };
  }

  async prepareChronologieEntry() {
    return await renderTemplate("systems/foundryvtt-ctm/templates/chronologie-entry.html", this.extractJournalParameters());
  }

  extractJournalParameters() {
    return {
      auteur: $("form.rdddialogchrono :input[name='auteur']").val(),
      information: $("form.rdddialogchrono :input[name='information']").val(),
      dateRdD: {
        jour: $("form.rdddialogchrono :input[name='jourRdD']").val(),
        moisRdD: $("form.rdddialogchrono :input[name='dateRdD.moisRdD.key']").val(),
        annee: $("form.rdddialogchrono :input[name='dateRdD.annee']").val()
      },
      heureRdD: $("form.rdddialogchrono :input[name='heureRdD']").val(),
      dateReel: $("form.rdddialogchrono :input[name='dateReel']").val().replace('T', ' ')
    }
  }

  addContentToJournal(journalEntry, content) {
    let page = journalEntry.pages.find(p => p.type == 'text' && Grammar.equalsInsensitive(p.name, 'Chronologie'));
    if (page) {
      page.update({ 'text.content': content + '\n' + page.text.content });
    }
    else {
      journalEntry.createEmbeddedDocuments('JournalEntryPage', [this.newPageChronologie(content)]);
    }
  }

  newPageChronologie(content) {
    return new JournalEntryPage({
      name: 'Chronologie',
      type: 'text',
      title: { show: true, level: 1 },
      text: { content: content, format: 1 }
    });
  }

  storeLatestUsedJournalEntry(journalId) {
    game.settings.set(SYSTEM_RDD, LATEST_USED_JOURNAL_ID, journalId);
  }
}