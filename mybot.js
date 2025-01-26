const mineflayer = require("mineflayer");
//const mineflayerViewer = require("prismarine-viewer").mineflayer;
const fs = require("fs");
const {pathfinder, Movements, goals: {GoalNear, GoalBlock, GoalFollow}} = require('mineflayer-pathfinder');
const item = require("mineflayer/lib/painting");
const {autototem} = require("mineflayer-auto-totem");
const armorManager = require("mineflayer-armor-manager");
//const colors = require('colors');

let settings;
let jokes = [];
let old_health;

try{
    const rawData = fs.readFileSync('settings.json', 'utf-8');
    settings = JSON.parse(rawData);
    log("settings.json was correctly loaded", "success");
}
catch(ex){vvvvvvv
    log(`Error in reading settings.json ${ex}`, "error");
}

try{
    const rawData = fs.readFileSync('jokes.json', 'utf-8');
    jokes = JSON.parse(rawData);
    log("jokes.json was correctly loaded", "success");
}
catch (ex){
    log(`Error in reading jokes.json ${ex}`, "error");
}

const bot = mineflayer.createBot({
    host: settings.ip_address,
    port: settings.port,
    version: settings.version,
    username: settings.bot_name,
});




//const mcData = require('minecraft-data')(bot.version)

bot.once("spawn", function(){
    bot.loadPlugin(pathfinder); // добавление плагина поиска путей
    //bot.loadPlugin(require("mineflayer-autoclicker")); // добавление плагина автокликера
    bot.loadPlugin(autototem); // добавление плагина на экипировку тотема
    bot.loadPlugin(armorManager); // добавление плагина на автоэкипировку

    bot.chat(`Привет мир!\nCoordinates: ${bot.entity.position}`);

    old_health = bot.health;
})

// наблюдение за ботом через браузер (127.0.0.1:3007)
// bot.once("spawn", () => {
//     mineflayerViewer(bot, {
//         port: 3007,
//         firstPerson: true,
//         viewer: 25
//     })
// })

bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    message = message.toLowerCase();

    if (message.startsWith("#")) {
        const message_parts = message.split(" ");

        let command = message_parts[0].substring(1);

        switch (command) {
            case "help":
                seeHelp();
                break;
            case "sleep":
                goToSleep();
                break;
            case "wakeup":
                wakeUp();
                break;
            case "quit":
                bot.quit("Command #quit has been used");
                break;
            case "follow":
                followPlayer(username);
                break;
            case "follow_near":
                followPlayerNear(username);
                break;
            case "stop":
                stopFollow();
                break;
            case "eat":
                eating();
                break;
            case "info":
                seeInfo();
                break;
            case "inv":
                seeInventory();
                break;
            case "a":
            case "j":
                bot.chat(getRandomJoke());
                break;
            case "go":
                let x = +message_parts[1];
                let y = +message_parts[2];
                let z = +message_parts[3];

                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    bot.chat(`Неправильные аргументы команды #go (смотрите #help для справки)\nX: ${x} Y: ${y} Z: ${z}`);
                    return;
                }

                goToCoordinates(x, y, z);
                break;
            case "inv_drop":
                dropAllItems();
                break;
            case "drop":
            {
                let indexes = [];
                for (let part of message_parts) {
                    bot.chat(part.toString());
                    if (!isNaN(+part)){
                        indexes.push(+part);
                    }
                }
                if (indexes.length === 0) {
                    bot.chat("Неверный(е) индекс(а)");
                    return;
                }

                dropItems(indexes);
                break;

                // let ind = -1;
                // if (message_parts.length > 1) {
                //     ind = +message_parts[1];
                //     if (isNaN(ind)) {
                //         bot.chat("Неверный индекс");
                //         return;
                //     }
                // }
                // dropItem(ind);
                // break;
            }
            case "hand":
            {
                if (message_parts.length === 1) {
                    bot.chat("Недостаток аргументов для команды #hand (смотрите #help для справки)");
                    return;
                }

                let ind = +message_parts[1];

                if (isNaN(ind)) {
                    bot.chat(`Неправильные аргументы команды #hand (смотрите #help для справки)\nIND: ${ind}`);
                    return;
                }

                getItemToHand(ind);
                break;
            }
            default:
                bot.chat("Неизвестная команда (введите #help для получения списка команд)");
                break;
        }
    }
});

bot.on("sleep", () => {
    bot.chat("Спокойной ночи!");
});

bot.on("wake", () => {
    bot.chat("Доброе утро!");
});

bot.on("physicsTick", async() => {
    bot.autototem.equip();
});

bot.on("health", () => {
    if (old_health < bot.health) {
        bot.chat(`Я получил урон! Уровень здоровья: ${Math.floor(bot.health)}`);
    }
    old_health = bot.health;
});

async function goToSleep() {
    const bed = bot.findBlock({
        matching: block => bot.isABed(block)
    })
    if (bed){
        try{
            await bot.sleep(bed);
            bot.chat("Я сплю");
        }
        catch (err){
            bot.chat(`Я не могу лечь спать\n${err.message}`);
        }
    }
    else{
        bot.chat("По близости нет кровати");
    }
}

async function wakeUp(){
    try{
        await bot.wake();
    }
    catch (err){
        bot.chat(`Я не могу проснуться\n${err.message}`);
    }
}

async function eating(){

    let foodItem = -1;
    try {
        for (let item of bot.inventory.items()){
            //bot.chat(item.name);
            if (bot.registry.foodsByName[item.name] != null) {
                foodItem = item;
            }
        }
    }
    catch (ex){
        bot.chat(`Finding food error. ${ex.message}`);
        return;
    }

    if (foodItem === -1){
        bot.chat("Я не нашёл еду в своём инвентаре");
        return;
    }

    try {
        await bot.equip(foodItem, "hand"); // Берем в руку нашу еду
    }
    catch (ex){
        bot.chat(`Equip error. ${ex.message}`);
    }

    try{
        await bot.consume();
    }
    catch (ex){
        bot.chat(`Consuming error. ${ex.message}`);
    }
}

function seeInventory(){
    if (bot.inventory.items().length === 0){
        bot.chat("У меня нет предметов в инвентаре");
        return;
    }

    for (let itemInd in bot.inventory.items()){
        bot.chat(`${itemInd} - ${bot.inventory.items()[itemInd].name} ${bot.inventory.items()[itemInd].count}`);
    }
}

function followPlayer(username){
    try {
        const player = bot.players[username];
        bot.pathfinder.setGoal(new GoalFollow(player.entity, 1), true);
    }
    catch (ex) {
        bot.chat(`Error in followPlayer(). ${ex.message}`);
    }
}

function followPlayerNear(username){
    try {
        const player = bot.players[username]
        bot.pathfinder.setGoal(new GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 1))
    }
    catch (ex) {
        bot.chat(`Error in followPlayerNear(). ${ex.message}`);
    }
}

function stopFollow(){
    bot.pathfinder.setGoal(null, 1);
}

function seeInfo(){
    bot.chat(
        `Name: ${bot.username}\n` +
        `Health: ${bot.health}\n` +
        `Hungry: ${bot.food}\n` +
        `Position: ${bot.entity.position},\n`
    );
}

function getRandomJoke() {
    const randomIndex = Math.floor(Math.random() * jokes.length);
    return jokes[randomIndex];
}

function goToCoordinates(x, y, z){
    bot.pathfinder.setGoal(new GoalBlock(x, y, z), true);
}

async function dropAllItems(){
    if (bot.inventory.items().length === 0){
        bot.chat("Инвентарь уже пуст");
        return;
    }

    for (let item of bot.inventory.items()){
            await bot.tossStack(item);
    }
}

async function dropItems(indexes){
    // if (bot.inventory.items()[ind] === undefined){
    //     bot.chat("В руке нет предмета");
    //     return;
    // }

    let items = [];
    for (let ind of indexes){
        if (bot.inventory.items()[ind] !== undefined) {
            items.push(bot.inventory.items()[ind]);
        }
    }

    for (let item of items){
        await bot.tossStack(item);
    }
    //await bot.tossStack(bot.inventory.items()[ind]);
}

async function getItemToHand(ind){
    if (bot.inventory.items()[ind] === undefined){
        bot.chat("Указан неверный индекс");
        return;
    }

    await bot.equip(bot.inventory.items()[ind], "hand");
}

function seeHelp(){
    bot.chat(
        `Привет! Я майнкрафт бот ${settings.bot_name}, меня разработал @Jun_k01. Вот мои команды:\n` +
        "#help — информация о боте\n" +
        "#sleep — лечь спать на ближайшую кровать\n" +
        "#wakeup — встать с кровати\n" +
        "#quit — отключиться от сервера\n" +
        "#follow — следовать за игроком\n" +
        "#follow_near — подойти к игроку\n" +
        "#stop — прекратить движение\n" +
        "#eat — съест что-нибудь из инвентаря\n" +
        "#info — выводит информацию о боте\n" +
        "#inv — выводит список имеющихся предметов в инвентаре\n" +
        "#go (параметр_x) (параметр_y) (параметр_z) — пойти на указанные координаты\n" +
        "#a или #j — случайный анекдот\n" +
        "#inv_drop — выбросить все предметы из инвентаря\n" +
        "#drop !(необязательные параметры_ind через пробел) — выбросить предмет из руки или по индексу\n" +
        "#hand (параметр_ind) — взять предмет по ind в руку\n"
    )
}

function log(message, type){
    if (type === "error"){
        console.log(message.red);
    }
    else if (type === "info"){
        console.log(message.white);
    }
    else if (type === "warning"){
        console.log(message.yellow);
    }
    else if (type === "success"){
        console.log(message.green);
    }
    else{
        console.log(message);
    }
}

bot.on('kicked', console.log)
bot.on('error', console.log)