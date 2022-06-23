"use strict";
const { Alice, Reply, Scene, Stage } = require('yandex-dialogs-sdk');
const { sample, shuffle } = require('lodash');
const alice = new Alice();

// общие импорты и константы
const db = require('./db.json');
const topics = db.map((el) => el.name);
const topics_names = topics.join(", ");
const welcomeMatcher = ctx => ctx.data.session.new === true;
const getIntent = (ctx, intent) => ctx.nlu.intents.hasOwnProperty(intent);
const congratulations = ["Отлично", "Супер", "Правильно"];
const nextTask = ["Следующее задание", "Дальше", "Продолжим"];
const makeQuestion = (question) => `Какой метод ${question}?`

const { initializeApp } = require("firebase/app");
const { getDatabase } = require("firebase/database");
const firebaseConfig = {
    apiKey: "AIzaSyA37KedzZR8hZNCI3fKsvCCb1n9NzFbx10",
    authDomain: "alise-skill-js.firebaseapp.com",
    databaseURL: "https://alise-skill-js-default-rtdb.firebaseio.com",
    projectId: "alise-skill-js",
    storageBucket: "alise-skill-js.appspot.com",
    messagingSenderId: "522198308214",
    appId: "1:522198308214:web:d8c54f45b32742d54cd657",
};
const app = initializeApp(firebaseConfig);

const database = getDatabase();
const Db = require('./db/db.js');
var botDb = new Db(database);

const questionsWords = [
    "вопрос", "вопроса", "вопросов"
]

const getQuestionWordFromNumber = (number) => {
    const last_digit = number % 10;
    const pre_last_digit = Math.floor((number / 10) % 10);
    if (last_digit === 1) {
        if (pre_last_digit === 1) return questionsWords[2]
        else return questionsWords[0]
    }
    else if (last_digit === 2 || last_digit === 3 || last_digit === 4) {
        if (pre_last_digit === 1) return questionsWords[2]
        else return questionsWords[1]
    }
    else return questionsWords[2]
}

// обработчики интентов
const exit = () => Reply.text('До свидания!', {
    end_session: true,
});
const helpHandler = (ctx) => {
    let extra_text;
    if (ctx.session.get("chose_theme_first")) {
        ctx.session.set('chose_theme_first', false);
        ctx.session.set('setting_theme', true);
        extra_text = `Чтобы начать изучение нужно выбрать одну из следующих тем: ${topics_names}`;
    }
    else {
        extra_text = `Сейчас изучаем тему ${ctx.session.get('theme')}.
        Сейчас на вопросе: ${makeQuestion(ctx.session.get('current_task').description)}`
    }
    return Reply.text(`
    Чтобы выйти из навыка скажите стоп. 
    Вы можете сменить тему или узнать статистику.
    ${extra_text}
`)
};
const noSuchTheme = () => Reply.text(`Такой темы нет. Выбери одну из этих: ${topics_names}`);

const youNeedToChooseThemeText = () => Reply.text(`Чтобы начать изучение нужно выбрать одну из следующих тем: ${topics_names}`);

// функция изменения темы для соответствующего интента
const changeTheme = (ctx) => {
    // предлагаем на выбор любую другую тему кроме текущей
    const new_themes = topics.filter((el) => el != ctx.session.get('theme'));
    // в сессии отмечаем, что в данный момент пользователь выбирает новую тему
    ctx.session.set('setting_theme', true);
    ctx.session.set('chose_theme_first', false);
    return Reply.text(`Хорошо. Давай выберем другую тему. Выбери одну из этих: ${new_themes.join(", ")}`)
}

// функция выбора первого задания
const handleFirstTask = (ctx) => {
    ctx.session.set('setting_theme', false);
    ctx.session.set('chose_theme_first', false);
    ctx.session.set("errorsCount", 0);

    const chosen_theme = ctx.session.get('theme');
    return getTask(chosen_theme, ctx).then(chosen_task => {
        ctx.session.set('current_task', chosen_task);

        return Reply.text(`
                Выбрали тему ${chosen_theme.name}. Итак, начнём!
                ${makeQuestion(chosen_task.description)}
            `);
    });
}

// функция выбора темы для соответствующего интента или когда мы в соответсвующем контексе
const chooseTheme = (input, ctx) => {
    let chosen_theme = null;
    console.log("input", input);
    db.forEach((theme) => {
        if (theme.activation_names.some((el) => el.includes(input))) {
            chosen_theme = theme;
            return;
        }
    })
    if (chosen_theme) {
        ctx.session.set('theme', chosen_theme);
        ctx.session.set('current_task', null);
        return handleFirstTask(ctx);
    }
    else {
        return noSuchTheme();
    }
}

// функция получения случайного числа
function getRandomInt(max, last, second) {
    let randInt = Math.floor(Math.random() * max)
    while (randInt === last || randInt === second) {
        randInt = Math.floor(Math.random() * max)
    }
    return randInt;
}

// Функция получения текста текущего задания
const currentQuestion = (ctx) => {
    return `${makeQuestion(ctx.session.get('current_task').description)}`
}

// Функция обработки неверного ответа
const handleWrongAnswer = (ctx) => {
    ctx.session.set("errorsCount", +ctx.session.get("errorsCount") + 1);
    if (+ctx.session.get("errorsCount") === 3) {
        return getAnswer(ctx, true);
    }
    else {
        return Reply.text(`Неправильно, попробуй ещё раз. ${currentQuestion(ctx)}`);
    }
}

// функция получения нового задания в теме
async function getTask(theme, ctx) {
    return botDb.getUserInfo(ctx.userId, theme.id).then(result => {
        if (Array.isArray(result)) {
            if (result.length >= theme.tasks.length) {
                const only_new_tasks = theme.tasks.filter((el) => el.id !== ctx.session.get("current_task"));
                console.log("теперь кроме последнего")
                const res = only_new_tasks[getRandomInt(only_new_tasks.length)];
                console.log("res", res);
                return res
            }
            else {
                const only_new_tasks = theme.tasks.filter((el) => !result.includes(el.id));
                console.log("only_new_tasks", only_new_tasks.map(el => el.id))
                const res = only_new_tasks[getRandomInt(only_new_tasks.length)];
                console.log("res", res);
                return res
            }
        }
        else {
            return theme.tasks[getRandomInt(theme.tasks.length)]
        }
    })
}

// Функция обработки ответов "да"
const handleConfirm = (ctx) => {
    if (ctx.session.get('theme') && ctx.session.get('chose_theme_first')) {
        return handleFirstTask(ctx);
    }
    else if (ctx.session.get('setting_theme')) {
        return noSuchTheme();
    }
    else if (ctx.session.get('current_task')) {
        return handleWrongAnswer(ctx);
    }
    else {
        return Reply.text(`Не поняла что вы сказали? ${JSON.stringify(ctx.nlu.intents)}`);
    }
}

// Функция получения текущей темы
const getCurrentTheme = (ctx) => {
    return Reply.text(`Сейчас изучаем тему ${ctx.session.get('theme').name}. 
    Сейчас на вопросе: ${currentQuestion(ctx)}`)
}

// Функция получения следующего задания
const getNextTask = (ctx) => {
    return getTask(ctx.session.get('theme'), ctx).then(new_task => {
        ctx.session.set('current_task', new_task);
        ctx.session.set('hint', null);
        ctx.session.set("errorsCount", 0);
        return new_task;
    })
}

// Функция-обёртка для получения следующего задания с поздравлением
const getNextTaskCongratsWrapper = (ctx) => {
    const new_task = getNextTask(ctx);
    return Reply.text(`${sample(congratulations)}! ${sample(nextTask)}. 
        ${makeQuestion(new_task.description)}`
    );
}

// Функция обработки правильности ответа на вопрос
const checkAnswer = (ctx) => {
    const right_answers = [ctx.session.get('current_task').name, ctx.session.get('current_task').tts_name.split('+').join('')]
    if (right_answers.some((el) => ctx.message.includes(el))) {
        botDb.updateLastTheme(ctx.userId, ctx.session.get("theme").id)
        botDb.getUserInfo(ctx.userId, ctx.session.get("theme").id).then(info => {
            const arr = Array.isArray(info) ? [...info.filter((el) => isFinite(el))] : [];
            if (!arr.includes(ctx.session.get('current_task').id)) botDb.updateUserInfo(ctx.userId, ctx.session.get("theme").id, [...arr, ctx.session.get('current_task').id])
        });
        return getNextTaskCongratsWrapper(ctx);
    }
    else {
        return handleWrongAnswer(ctx);
    }
}

// Функция обработки интента ответ
const getAnswer = (ctx, withErrors) => {
    const extraText = withErrors ? "Запоминай! " : ""
    return Reply.text(`
        ${extraText}Метод, который ${ctx.session.get('current_task').description}, называется ${ctx.session.get('current_task').name}.
        Следующее задание: ${makeQuestion(getNextTask(ctx).description)}
    `)
}

// Функция получения двух названий для подсказки, не совпадающих с ответом
const getTwoMoreNames = (currentTask, theme) => {
    const firstHint = theme.tasks[getRandomInt(theme.tasks.length, currentTask.id)]
    const secondHint = theme.tasks[getRandomInt(theme.tasks.length, currentTask.id, firstHint.id)]
    return [
        firstHint.name,
        secondHint.name
    ];
}

// Функция обработки интента с подсказкой
const getHint = (ctx) => {
    const shuffledArray = shuffle([
        ...getTwoMoreNames(ctx.session.get('current_task'), ctx.session.get('theme')),
        ctx.session.get('current_task').name
    ]).join(", ");
    ctx.session.set('hint', shuffledArray)
    return Reply.text(`
    Один из этих ответов верный: ${shuffledArray}.
`)
}

// Функция обработки интента статистики
const getStatistics = (ctx) => {
    return getVisitedTasks(ctx).then(result => {
        if (result === 0 || !result) {
            return Reply.text(`
            Пока не изучено ни одного вопроса по теме ${ctx.session.get("theme").name}.
            Давайте начнем изучение с вопроса: ${makeQuestion(ctx.session.get('current_task').description)}
        `)
        }
        return Reply.text(`
        Изучено ${result} ${getQuestionWordFromNumber(result)} из ${ctx.session.get("theme").tasks.length} по теме ${ctx.session.get("theme").name}.
        Остановились на вопросе: ${makeQuestion(ctx.session.get('current_task').description)}
    `)
    })
}

//основное меню Алисы
alice.command(welcomeMatcher, ctx => {
    return botDb.getUser(ctx.userId).then(user => {
        ctx.session.set('chose_theme_first', true);
        if (user && isFinite(user.lastTheme)) {
            const last_theme = db.find((el) => el.id === user.lastTheme);
            ctx.session.set('theme', last_theme);
            ctx.session.set('old_user', true);
            return Reply.text(`
            Привет! Я помогу выучить методы различных объектов языка JavaScript.
            В любой момент Вы можете поменять тему или спросить что я умею. 
            Остановились на теме ${last_theme.name}. Продолжим? 
        `)
        }
        else {
            botDb.getOrCreateUser(ctx.userId);
            ctx.session.set('theme', db[0]);
            return Reply.text(`
                Привет! Я помогу выучить методы различных объектов языка JavaScript.
                В любой момент Вы можете поменять тему или спросить что я умею. 
                Предлагаю начать с темы ${topics[0]}. Приступим? 
            `)
        }
    });
});

alice.any(ctx => {
    if (getIntent(ctx, "help")) {
        return helpHandler(ctx);
    }
    else if (getIntent(ctx, "exit")) {
        return exit();
    }
    else if (getIntent(ctx, "YANDEX.CONFIRM")) {
        return handleConfirm(ctx);
    }
    else if (getIntent(ctx, "what_theme")) {
        if (ctx.session.get('chose_theme_first') || ctx.session.get('setting_theme')) {
            ctx.session.set('chose_theme_first', false);
            ctx.session.set('setting_theme', true);
            return youNeedToChooseThemeText();
        }
        else {
            return getCurrentTheme(ctx);
        }
    }
    else if (getIntent(ctx, "change_theme")) {
        return changeTheme(ctx);
    }
    else if (getIntent(ctx, "statistics") && (!ctx.session.get('chose_theme_first') || ctx.session.get('old_user'))) {
        return getStatistics(ctx);
    }
    else if (getIntent(ctx, "choose_theme") && !ctx.session.get('current_task')) {
        return chooseTheme(ctx.nlu.intents.choose_theme.slots.name.value.toLowerCase(), ctx);
    }
    else if (getIntent(ctx, "answer") && ctx.session.get('current_task') && !ctx.session.get('chose_theme_first')) {
        return getAnswer(ctx);
    }
    else if (getIntent(ctx, "hint") && ctx.session.get('current_task') && !ctx.session.get('chose_theme_first')) {
        if (ctx.session.get('hint')) {
            return Reply.text(`Один из этих ответов верный: ${ctx.session.get('hint')}`)
        }
        else return getHint(ctx);
    }
    else if (ctx.session.get('setting_theme')) {
        return chooseTheme(ctx.command, ctx);
    }
    else if (ctx.session.get('current_task')) {
        return checkAnswer(ctx);
    }
    else if (ctx.session.get('chose_theme_first')) {
        ctx.session.set('chose_theme_first', false);
        ctx.session.set('setting_theme', true);
        return youNeedToChooseThemeText();
    }
    else {
        return Reply.text(`Не поняла что вы сказали? ${JSON.stringify(ctx.nlu.intents)}`);
    }
})

async function getVisitedTasks(ctx) {
    return botDb.getUserInfo(ctx.userId, ctx.session.get("theme").id)
        .then(info => {
            if (info) {
                console.log(info)
                console.log(info.length)
                return info.filter((el) => isFinite(el)).length
            }
            else return 0
        });
};

const server = alice.listen(process.env.post || 3333, '/');