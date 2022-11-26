import { SYSTEM_RDD } from "./constants.js";

/* -------------------------------------------- */
const context2file = { 
    "argent": { file: "son_piece_monnaie.mp3", isGlobal: false }
  }

/* -------------------------------------------- */
export class RdDAudio {

  /* -------------------------------------------- */
  static PlayContextAudio(context) {
    if (game.settings.get(SYSTEM_RDD, "activer-sons-audio") ) {
      let audioData = context2file[context];
      if ( audioData ) {
        let audioPath = "systems/ctm/sounds/" + audioData.file;
        console.log(`ctm | Playing Sound: ${audioPath}`)
        AudioHelper.play({ src: audioPath }, audioData.isGlobal);
      }
    }
  }
}
