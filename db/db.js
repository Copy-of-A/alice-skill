const { ref, child, get, set } = require("firebase/database");

module.exports = class DB {
    constructor(db) {
        this.db = db;
    }

    // Метод для получения пользователя по userId из базы
    getUser(userId) {
        return get(child(ref(this.db), `users/${userId}`))
            .then(snapshot => {
                return snapshot && snapshot.val();
            })
    }

    // Метод для добавления нового пользователя в базу
    addUser(userId, userDto) {
        return set(ref(this.db, `users/${userId}`), userDto);
    }

    // Метод для получения пользователя userId или добавления нового пользователя с userId в базу
    getOrCreateUser(userId) {
        return get(child(ref(this.db), `users/${userId}`))
            .then(snapshot => {
                if (snapshot && snapshot.val())
                    return snapshot.val();
                else {
                    const userDto = {
                        userId: userId,
                        themes: [{},{},{},{},{}],
                    };
                    return this.addUser(userId, userDto);
                }
            })
    }

    // Метод для обновления прогресса пользователя по userId
    updateUserInfo(userId, themeId, tasks) {
        console.log("updateUserInfo", userId, themeId, tasks)
        return set(ref(this.db, `users/${userId}/themes/${themeId}`), tasks);
    }

    // Метод для получения прогресса пользователя по userId по теме themeId
    getUserInfo(userId, themeId) {
        return get(child(ref(this.db), `users/${userId}/themes/${themeId}`))
            .then(snapshot => {
                return snapshot && snapshot.val();
            })
    }

    // Метод для обновления прогресса пользователя по userId по теме themeId
    updateLastTheme(userId, themeId) {
        return set(ref(this.db, `users/${userId}/lastTheme`), themeId);
    }
}