import loadFiles from "../../Functions/fileLoader.js";
import "colors";

async function loadComponents(client) {
  await client.components.clear();

  const files = await loadFiles("src/bot/components");
  console.log("Refreshing components".yellow)

  //Promising all the files and looping through them and pushing them to commandsArray.
  await Promise.all(
    files.map(async (file) => {
      const component = await import(`file://${file}`);
      try {
        client.components.set(component.default.customId, component);
      } catch (err) {
        console.log(err);
        console.log(`An error occurred while loading components`.red)
      }
    })
  );

  console.log(`Successfully loaded all the components`.green);
}

export default loadComponents;
