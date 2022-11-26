import { LOG_HEAD, SYSTEM_RDD } from "./constants.js";
import { Grammar } from "./grammar.js";
import { Misc } from "./misc.js";

class Migration {
  get code() { return "sample"; }
  get version() { return "0.0.0"; }
  async migrate() { }

  async applyItemsUpdates(computeUpdates) {
    await game.actors.forEach(async (actor) => {
      const actorItemUpdates = computeUpdates(actor.items);
      if (actorItemUpdates.length > 0) {
        console.log(
          this.code,
          `Applying updates on actor ${actor.name} items`,
          actorItemUpdates
        );
        await actor.updateEmbeddedDocuments("Item", actorItemUpdates);
      }
    });

    const itemUpdates = computeUpdates(game.items);
    if (itemUpdates.length > 0) {
      console.log(this.code, "Applying updates on items", itemUpdates);
      await Item.updateDocuments(itemUpdates);
    }
  }

}

class _10_0_16_MigrationSortsReserve extends Migration {
  get code() { return "creation-item-sort-reserve"; }
  get version() { return "10.0.16"; }

  async migrate() {
    await game.actors
      .filter((actor) => actor.type == "personnage")
      .filter((actor) => actor.system.reve?.reserve?.list?.length ?? 0 > 0)
      .forEach(async (actor) => {
        const sortsReserve = actor.system.reve.reserve.list.map(this.conversionSortReserve);
        console.log(`${LOG_HEAD} Migration des sorts en réserve de ${actor.name}`, sortsReserve);
        await actor.createEmbeddedDocuments("Item", sortsReserve, {
          renderSheet: false,
        });
        await actor.update({ 'system.reve.reserve': undefined })
      });
  }

  conversionSortReserve(it) {
    return {
      type: 'sortreserve',
      name: it.sort.name,
      img: it.sort.img,
      system: {
        // ATTENTION, utilisation de data / _id possibles, encore présents pour les anciens sorts en réserve
        sortid: it.sort._id,
        draconic: it.sort.draconic,
        ptreve: (it.sort.system ?? it.sort.data).ptreve_reel,
        coord: it.coord,
        heurecible: 'Vaisseau',
      },
    };
  }
}

class _10_0_17_MigrationCompetenceCreature extends Migration {
  get code() { return "competences-creature-parade"; }
  get version() { return "10.0.17"; }

  async migrate() {
    await this.applyItemsUpdates(items => items
      .filter(it => it.type == "competencecreature" && it.system.isparade && it.system.categorie_parade == "")
      .map(it => { return { _id: it.id, "system.categorie_parade": "armes-naturelles" } }));

    await this.applyItemsUpdates(items => items
      .filter(it => it.type == "competencecreature" && it.system.iscombat)
      .map(it => { return { _id: it.id, "system.categorie": (Grammar.includesLowerCaseNoAccent(it.name, "lancee") ? "lancer" : "melee") } })
    );

  }
}

class _10_0_21_VehiculeStructureResistanceMax extends Migration {
  get code() { return "vehicule-structure-resistance-max"; }
  get version() { return "10.0.21"; }

  async migrate() {
    await game.actors
      .filter((actor) => actor.type == "vehicule")
      .forEach(async (actor) => {
        await actor.update({
          'system.etat.resistance.value': actor.system.resistance,
          'system.etat.resistance.max': actor.system.resistance,
          'system.etat.structure.value': actor.system.structure,
          'system.etat.structure.max': actor.system.structure
        })
      });
  }
}

class _10_0_33_MigrationNomsDraconic extends Migration {
  get code() { return "competences-creature-parade"; }
  get version() { return "10.0.33"; }

  migrationNomDraconic(ancien) {
    if (typeof ancien == 'string') {
      switch (ancien) {
        case 'oniros': case "Voie d'Oniros": return "Voie d'Oniros";
        case 'hypnos': case "Voie d'Hypnos": return "Voie d'Hypnos";
        case 'narcos': case "Voie de Narcos": return "Voie de Narcos";
        case 'thanatos': case "Voie de Thanatos": return "Voie de Thanatos";
      }
      return ancien;
    }
    else if (typeof ancien.name == 'string') {
      return this.migrationNomDraconic(ancien.name)
    }
    return ancien;
  }
  async migrate() {

    await this.applyItemsUpdates(items => items
      .filter(it => ["sort", "sortreserve"].includes(it.type)
        && (typeof it.system.draconic == 'string') || (typeof it.system.draconic?.name == 'string'))
      .map(it => { return { _id: it.id, "system.draconic": this.migrationNomDraconic(it.system.draconic) } }));
  }
}

class _10_2_5_ArmesTirLancer extends Migration {
  constructor() {
    super();
    this.dagues = { "system.competence": 'Dague', "system.lancer": 'Dague de jet', "system.portee_courte": 3, "system.portee_moyenne": 8, "system.portee_extreme": 15 }
    this.javelot = { "system.competence": 'Lance', "system.lancer": 'Javelot', "system.portee_courte": 6, "system.portee_moyenne": 12, "system.portee_extreme": 20 }
    this.fouet = { "system.competence": '', "system.lancer": 'Fouet', "system.portee_courte": 2, "system.portee_moyenne": 2, "system.portee_extreme": 3, "system.penetration": -1 }
    this.arc = { "system.competence": '', "system.tir": 'Arc' }
    this.arbalete = { "system.competence": '', "system.tir": 'Arbalète' }
    this.fronde = { "system.competence": '', "system.tir": 'Fronde' }

    this.mappings = {
      'dague': { filter: it => true, updates: this.dagues },
      'dague de jet': { filter: it => true, updates: this.dagues },
      'javelot': { filter: it => true, updates: this.javelot },
      'lance': { filter: it => it.name == 'Javeline', updates: this.javelot },
      'fouet': { filter: it => true, updates: this.fouet },
      'arc': { filter: it => true, updates: this.arc },
      'arbalete': { filter: it => true, updates: this.arbalete },
      'fronde': { filter: it => true, updates: this.fronde },
    }
  }

  get code() { return "separation-competences-tir-lancer"; }
  get version() { return "10.2.5"; }

  migrateArmeTirLancer(it) {
    let updates = mergeObject({ _id: it.id }, this.getMapping(it).updates);
    console.log(it.name, updates);
    return updates;
  }

  async migrate() {
    await this.applyItemsUpdates(items => items
      .filter(it => "arme" == it.type)
      .filter(it => this.isTirLancer(it))
      .filter(it => this.getMapping(it).filter(it))
      .map(it => this.migrateArmeTirLancer(it)));
  }


  isTirLancer(it) {
    return Object.keys(this.mappings).includes(this.getCompKey(it));
  }

  getMapping(it) {
    return this.mappings[this.getCompKey(it)];
  }

  getCompKey(it) {
    return Grammar.toLowerCaseNoAccent(it.system.competence);
  }
}
class _10_2_10_DesirLancinant_IdeeFixe extends Migration {
  get code() { return "desir-lancinat-idee-fixe"; }
  get version() { return "10.2.10"; }

  migrateQueue(it) {
    let categorie = undefined
    let name = it.name
    if (Grammar.toLowerCaseNoAccent(name).includes('desir')) {
      categorie = 'lancinant';
      name = it.name.replace('Désir lancinant : ', '');

    }
    if (Grammar.toLowerCaseNoAccent(name).includes('idee fixe')) {
      categorie = 'ideefixe';
      name = it.name.replace('Idée fixe : ', '')
    }
    return { _id: it.id, name: name,
      'system.ideefixe': undefined,
      'system.lancinant': undefined,
      'system.categorie': categorie
    }
  }

  async migrate() {
    await this.applyItemsUpdates(items => items
      .filter(it => ['queue', 'ombre'].includes(it.type))
      .map(it => this.migrateQueue(it))
      //.filter(it => it.system.categorie )
      );
  }
}

export class Migrations {
  static getMigrations() {
    return [
      new _10_0_16_MigrationSortsReserve(),
      new _10_0_17_MigrationCompetenceCreature(),
      new _10_0_21_VehiculeStructureResistanceMax(),
      new _10_0_33_MigrationNomsDraconic(),
      new _10_2_5_ArmesTirLancer(),
      new _10_2_10_DesirLancinant_IdeeFixe(),
    ];
  }

  constructor() {
    game.settings.register(SYSTEM_RDD, "systemMigrationVersion", {
      name: "System Migration Version",
      scope: "world",
      config: false,
      type: String,
      default: "0.0.0",
    });
  }

  migrate() {
    const currentVersion = game.settings.get(
      SYSTEM_RDD,
      "systemMigrationVersion"
    );
    if (isNewerVersion(game.system.version, currentVersion)) {
      const migrations = Migrations.getMigrations().filter(m => isNewerVersion(m.version, currentVersion));
      if (migrations.length > 0) {
        migrations.sort((a, b) =>
          isNewerVersion(a.version, b.version)
            ? 1
            : isNewerVersion(b.version, a.version)
              ? -1
              : 0
        );
        migrations.forEach(async (m) => {
          ui.notifications.info(
            `Executing migration ${m.code}: version ${currentVersion} is lower than ${m.version}`
          );
          await m.migrate();
        });
        ui.notifications.info(
          `Migrations done, version will change to ${game.system.version}`
        );
      } else {
        console.log(
          LOG_HEAD +
          `No migration needeed, version will change to ${game.system.version}`
        );
      }

      game.settings.set(
        SYSTEM_RDD,
        "systemMigrationVersion",
        game.system.version
      );
    } else {
      console.log(LOG_HEAD + `No system version changed`);
    }
  }
}
