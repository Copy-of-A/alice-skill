"use strict";
const { Alice, Reply, Scene, Stage } = require('yandex-dialogs-sdk');
const alice = new Alice();

// общие импорты и константы
const db = require('./db.json');
const topics = db.map((el) => el.name);
const topics_names = topics.join(", ");
const welcomeMatcher = ctx => ctx.data.session.new === true;
const getIntent = (ctx, intent) => ctx.nlu.intents.hasOwnProperty(intent);

// обработчики интентов
const exit = () => Reply.text('До свидания!', {
    end_session: true,
});
const helpHandler = () => Reply.text('Текст помощь');
const noSuchTheme = () => Reply.text(`Такой темы нет. Выбери одну из этих: ${topics_names}`);

// функция изменения темы для соответствующего интента
const changeTheme = (ctx) => {
    // предлагаем на выбор любую другую тему кроме текущей
    const new_themes = topics.filter((el) => el != ctx.session.get('theme'));
    // в сессии отмечаем, что в данный момент пользователь выбирает новую тему
    ctx.session.set('setting_theme', true);
    ctx.session.set('chose_theme_first', false);
    return Reply.text(`Хорошо. Давай выберем другую тему. Выбери одну из этих: ${new_themes.join(", ")}`)
}

const handleFirstTask = (ctx) => {
    ctx.session.set('setting_theme', false);
    ctx.session.set('chose_theme_first', false);
    const chosen_theme = ctx.session.get('theme');

    return Reply.text(`
            Выбрали тему ${chosen_theme.name}. Итак, начнём!
            Какой метод ${getTask(chosen_theme).description}?
        `);
}

// функция выбора темы для соответствующего интента или когда мы в соответсвующем контексе
const chooseTheme = (input, ctx) => {
    let chosen_theme = null;
    db.forEach((theme) => {
        if (theme.activation_names.some((el) => el.includes(input))) {
            chosen_theme = theme;
            return;
        }
    })
    if (chosen_theme) {
        ctx.session.set('theme', chosen_theme);
        return handleFirstTask(ctx);
    }
    else {
        return noSuchTheme();
    }
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// функция получения нового задания в теме
const getTask = (theme) => {
    return theme.tasks[getRandomInt(theme.tasks.length)]
}

const handleConfirm = (ctx) => {
    if (ctx.session.get('theme') && ctx.session.get('chose_theme_first')) {
        return handleFirstTask(ctx);
    }
    //!!!!!!!!!!!!!!!!!!!!вот тут ещё нужна будет обработка да когда уже выбрали тему
    else if (ctx.session.get('setting_theme')) {
        return noSuchTheme();
    }
    else {
        return Reply.text(`Не поняла что вы сказали? ${JSON.stringify(ctx.nlu.intents)}`);
    }
}

//основное меню Алисы
alice.command(welcomeMatcher, ctx => {
    ctx.session.set('chose_theme_first', true);
    ctx.session.set('theme', db[0]);
    return Reply.text(`
        Привет! Я помогу выучить методы различных объектов языка JavaScript.
        В любой момент Вы можете поменять тему или спросить что я умею. 
        Предлагаю начать с темы ${topics[0]}. Приступим? 
    `)
});

alice.any(ctx => {
    if (getIntent(ctx, "help")) {
        return helpHandler();
    }
    else if (getIntent(ctx, "exit")) {
        return exit();
    }
    else if (getIntent(ctx, "YANDEX.CONFIRM")) {
        return handleConfirm(ctx);
    }
    else if (getIntent(ctx, "change_theme")) {
        return changeTheme(ctx);
    }
    else if (getIntent(ctx, "choose_theme")) {
        return chooseTheme(ctx.nlu.intents.choose_theme.slots.name.value.toLowerCase(), ctx);
    }
    else if (ctx.session.get('setting_theme')) {
        return chooseTheme(ctx.command, ctx);
    }
    else {
        if (ctx.session.get('chose_theme_first')) {
            ctx.session.set('chose_theme_first', false);
            ctx.session.set('setting_theme', true);
            return Reply.text(`Чтобы начать изучение нужно выбрать одну из следующих тем: ${topics_names}`)
        }
        return Reply.text(`Не поняла что вы сказали? ${JSON.stringify(ctx.nlu.intents)}`);
    }
})



const server = alice.listen(process.env.post || 3333, '/');