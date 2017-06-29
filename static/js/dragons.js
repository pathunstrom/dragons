const invisible = "invisible";

const config = {
    food: {
        free: {
            amount: 15,
            coolDown: 10,
            cost: 0,
            volatility: 1,
            growth: 1,
        }
    },
    timers: {
        explode: 500,
    }
};

const view = {
    player: document.getElementsByClassName("player-view")[0],
    dragon: document.getElementsByClassName("dragon-view")[0],
    freeFood: document.getElementsByClassName("free-food")[0],
};

const input = {
    playerName: 0,
    dragonName: 1,
};

const display = {
    player: 0,
    dragon: 1,
};

function makeVisible(viewElement) {
    if (viewElement.classList.contains(invisible)) {
        viewElement.classList.remove(invisible)
    }
}

function makeInvisible(viewElement) {
    if (!viewElement.classList.contains(invisible)) {
        viewElement.classList.add(invisible)
    }
}

function setScore(viewElement, fieldName, value) {
    viewElement.getElementsByClassName(fieldName)[0].innerHTML = value.toString();
}

function Display() {
}

function updateDisplay(state) {
    // Stalls first.
    this.drawStalls(state.dragon);

    if (state.viewing === display.player) {
        makeVisible(view.player);
        makeInvisible(view.dragon);
        setScore(view.player, "money-view", state.player.money);
        setScore(view.player, "fame-view", state.player.fame);
    } else if (state.viewing === display.dragon) {
        makeVisible(view.dragon);
        makeInvisible(view.player);
        setScore(view.dragon, "hunger-view", state.dragon.currentHunger);
        setScore(view.dragon, "volatility-view", state.dragon.volatility);
    }

    // the input
    if (state.showInput) {
        document.getElementsByClassName("input")[0].classList.remove("invisible");
        document.getElementsByClassName("prompt")[0].innerHTML = state.inputPrompt;
    } else {
        document.getElementsByClassName("input")[0].classList.add("invisible");
    }
}

Display.prototype.drawStalls = function drawStalls (dragon) {
    if (!dragon.displayed) {
        let stall = document.getElementsByClassName("stall")[0];
        stall.appendChild(dragon.createDOMObject());
        /*
        Consider message passing.
        The display should not modify state.
        Perhaps dragon can look for it's elementId and switch displayed to
        true?
         */
        dragon.displayed = true;
    }
};

Display.prototype.displayVisibility = function displayVisibility () {

};

Display.prototype.draw = updateDisplay;

function Dragon() {
    this.name = "Errol";  // A name is important.
    this.maxHunger = 10;
    this.currentHunger = 10;  // I know hunger will be a primary mechanic.
    this.volatility = 0;  // I know volatility will be a primary mechanic.
    this.timers = {
        ticker: 1000,
        feedingCooldown: 0,
        explode: config.timers.explode,
        settle: 0,
    };
    this.id = Math.floor(Math.random() * 1000);
    this.elementId = "dragon-" + this.id.toString();
    this.dirty = 0;
}

Dragon.prototype.feed = function feed (type) {
    if (this.timers.feedingCooldown === 0) {
        let food = config.food[type];
        this.currentHunger = Math.min(this.currentHunger + food.amount, this.maxHunger);
        this.timers.feedingCooldown = food.coolDown * 1000;
        this.volatility += food.volatility;
        this.maxHunger += food.growth;
    }
};

Dragon.prototype.advance = function advance (delta) {
    this.dirty = 0;
    for (let key in this.timers) {
        if (this.timers.hasOwnProperty(key)) {
            let timer = this.timers[key];
            this.timers[key] = Math.max(timer - delta, 0)
        }
    }

    if (this.timers.ticker === 0) {
        this.timers.ticker = 1000;
        this.currentHunger = Math.max(this.currentHunger - 1, 0);
        if (this.currentHunger === 0) {
            this.volatility += 1;
        }
        this.dirty = 1;
    }

    if (this.timers.explode === 0) {
        this.timers.explode = config.timers.explode;
        if (Math.random() * this.volatility >= 100) {
            alert("You lose.");
        }
    }
    return this.dirty;
};

Dragon.prototype.createDOMObject = function createDOMObject() {
    /*
    <section class="dragon" id="dragon-{{dragon.id}}">
        <h1 class="title">{{dragon.name}}</h1>
        <img class="image" src="static/img/dogan.png">
    </section>
     */
    let dragonElement = document.createElement("div");
    dragonElement.id = this.elementId;
    dragonElement.classList = ["dragon"];

    let dragonTitle = document.createElement("h1");
    dragonTitle.innerHTML = this.name;
    dragonTitle.classList = ["title"];
    dragonElement.appendChild(dragonTitle);

    let dragonImage = document.createElement("img");
    dragonImage.src = "static/img/dogan.png";
    dragonImage.classList = ["image"];
    dragonElement.appendChild(dragonImage);

    return dragonElement;
};

function Game() {
    this.state = new GameState();
    this.display = new Display();
    this.unusedTime = 0;
    this.lastTime = undefined;
    this.timeStep = 16;
    document.getElementById("affirm").addEventListener("click", this.inputEvent.bind(this));
    view.freeFood.addEventListener("click", this.foodClick.bind(this));
    window.requestAnimationFrame(this.update.bind(this))
}

Game.prototype.foodClick = function foodClick(event) {
    this.state.dragon.feed("free")
};

Game.prototype.inputEvent = function inputEvent(event) {
    let field = document.getElementById("field");
    this.state.inputResponse(field.value);
    event.stopPropagation();
};

Game.prototype.update = function update (time) {
    if (this.lastTime === undefined) {
        this.lastTime = time;
    }
    this.unusedTime += (time - this.lastTime);
    this.lastTime = time;
    let shouldRedraw = false;
    while (this.unusedTime >= this.timeStep) {
        this.unusedTime -= this.timeStep;
        let result = this.state.advance(this.timeStep);
        if (result > 0) {
            shouldRedraw = true;
        }
    }
    if (shouldRedraw) {
        this.display.draw(this.state);
    }
    window.requestAnimationFrame(this.update.bind(this))
};

function GameState() {
    this.player = new Player();
    this.dragon = new Dragon();
    this.showInput = false;
    this.inputPrompt = "Test";
    this.viewing = display.dragon;
}

GameState.prototype.advance = function advance (delta) {
    this.dragon.advance(delta);
    this.player.advance(delta);
    return 1;
};

GameState.prototype.inputResponse = function inputResponse (value) {
    this.showInput = false;
};

function Player() {
    this.money = 0;
    this.fame = 0;
    this.dirty = false;
}

Player.prototype.advance = function advance(delta) {
    this.dirty = false;
    return delta;
};

new Game();