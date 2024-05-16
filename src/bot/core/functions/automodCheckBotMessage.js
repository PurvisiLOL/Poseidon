import { Collection} from "discord.js";

/**
 *
 * @param { Collection } collection
 */
export function checkBotMessage(collection, user) {
  const data = collection.get(user.id);

  if (data) {
    const subtraction = Date.now() - data.CreatedTime;

    if (subtraction > 10000) collection.delete(user.id);
    else return true;
  } else {
    const data2 = {
      CreatedTime: Date.now(),
    };
    collection.set(user.id, data2);
  }

  return false;
}
