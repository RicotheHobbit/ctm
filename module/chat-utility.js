import { Misc } from "./misc.js";
import { SYSTEM_RDD, SYSTEM_SOCKET_ID } from "./constants.js";


/**
 * Class providing helper methods to get the list of users, and 
 */
export class ChatUtility {

  /* -------------------------------------------- */
  static onSocketMessage(sockmsg) {
    switch (sockmsg.msg) {
      case "msg_delete_chat_message": return ChatUtility.onRemoveMessages(sockmsg.data);
      case "msg_user_ui_notifications": return ChatUtility.onNotifyUser(sockmsg.data);
    }
  }
  
  
  /* -------------------------------------------- */
  static notifyUser(userId, level = 'info', message) {
    const socketData = {
      userId: userId, level: level, message: message
    };
    if (game.user.id == userId) {
      ChatUtility.onNotifyUser(socketData);
    }
    else {
      game.socket.emit(SYSTEM_SOCKET_ID, {
        msg: "msg_user_ui_notifications", data: socketData
      });
    }
  }

  static onNotifyUser(socketData) {
    if (game.user.id == socketData.userId) {
      switch (socketData.level) {
        case 'warn': ui.notifications.warn(socketData.message); break;
        case 'error': ui.notifications.error(socketData.message); break;
        default: ui.notifications.info(socketData.message); break;
      }
    }
  }

  /* -------------------------------------------- */
  static onRemoveMessages(socketData) {
    if (Misc.isUniqueConnectedGM()) {
      if (socketData.part) {
        const toDelete = game.messages.filter(it => it.content.includes(socketData.part));
        toDelete.forEach(it => it.delete());
      }
      if (socketData.messageId) {
        game.messages.get(socketData.messageId)?.delete();
      }
    }
  }

  /* -------------------------------------------- */

  static removeMessages(socketData) {
    if (Misc.isUniqueConnectedGM()) {
      ChatUtility.onRemoveMessages(socketData);
    }
    else {
      game.socket.emit(SYSTEM_SOCKET_ID, { msg: "msg_delete_chat_message", data: socketData });
    }
  }

  /* -------------------------------------------- */
  static removeChatMessageContaining(part) {
    ChatUtility.removeMessages({ part: part });
  }

  static removeChatMessageId(messageId) {
    if (messageId){
      ChatUtility.removeMessages({ messageId: messageId });
    }
  }

  /* -------------------------------------------- */
  static async createChatWithRollMode(name, chatOptions) {
    return await ChatUtility.createChatMessage(name, game.settings.get("core", "rollMode"), chatOptions);
  }

  /* -------------------------------------------- */
  static async createChatMessage(name, rollMode, chatOptions) {
    switch (rollMode) {
      case "blindroll": // GM only
        if (!game.user.isGM) {
          ChatUtility.blindMessageToGM(chatOptions);

          chatOptions.whisper = [game.user.id];
          chatOptions.content = "Message envoyé en aveugle au Gardien";
        }
        else {
          chatOptions.whisper = ChatUtility.getUsers(user => user.isGM);
        }
        break;
      default:
        chatOptions.whisper = ChatUtility.getWhisperRecipients(rollMode, name);
        break;
    }
    chatOptions.alias = chatOptions.alias || name;
    return await ChatMessage.create(chatOptions);
  }

  /* -------------------------------------------- */
  static prepareChatMessage(rollMode, name) {
    return {
      user: game.user.id,
      whisper: ChatUtility.getWhisperRecipients(rollMode, name)
    }
  }

  /* -------------------------------------------- */
  static getWhisperRecipients(rollMode, name) {
    switch (rollMode) {
      case "blindroll": return ChatUtility.getUsers(user => user.isGM);
      case "gmroll": return ChatUtility.getWhisperRecipientsAndGMs(name);
      case "selfroll": return [game.user.id];
    }
    return undefined;
  }

  /* -------------------------------------------- */
  static getWhisperRecipientsAndGMs(name) {
    let recep1 = ChatMessage.getWhisperRecipients(name) || [];
    return recep1.concat(ChatMessage.getWhisperRecipients('GM'));
  }

  /* -------------------------------------------- */
  static getUsers(filter) {
    return game.users.filter(filter).map(user => user.id);
  }

  /* -------------------------------------------- */
  static blindMessageToGM(chatOptions) {
    let chatGM = duplicate(chatOptions);
    chatGM.whisper = ChatUtility.getUsers(user => user.isGM);
    chatGM.content = "Message aveugle de " + game.user.name + "<br>" + chatOptions.content;
    console.log("blindMessageToGM", chatGM);
    game.socket.emit(SYSTEM_SOCKET_ID, { msg: "msg_gm_chat_message", data: chatGM });
  }

  /* -------------------------------------------- */
  static handleGMChatMessage(socketData) {
    console.log("blindMessageToGM", socketData);
    if (game.user.isGM) { // message privé pour GM only
      socketData.user = game.user.id;
      ChatMessage.create(socketData);
    }
  }

  static async setMessageData(chatMessage, key, flag) {
    if (flag) {
      await chatMessage.setFlag(SYSTEM_RDD, key, JSON.stringify(flag));
    }
  }

  static getMessageData(chatMessage, key) {
    const json = chatMessage.getFlag(SYSTEM_RDD, key);
    return json ? JSON.parse(json) : undefined;
  }

  static getChatMessage(event) {
    const chatMessageId = $(event.currentTarget).closest('.chat-message').attr('data-message-id');
    return game.messages.get(chatMessageId);
  }

}
