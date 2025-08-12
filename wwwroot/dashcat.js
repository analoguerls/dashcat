/* global document, setTimeout, window */
/* eslint-disable new-cap */
import {
    GameLoop,
    Sprite,
    SpriteSheet,
    Text,
    audioAssets,
    clamp,
    collides,
    degToRad,
    getStoreItem,
    imageAssets,
    init,
    initKeys,
    keyPressed,
    load,
    randInt,
    setAudioPath,
    setImagePath,
    setStoreItem
} from 'https://unpkg.com/kontra@10.0.2/kontra.min.mjs';

const
    {canvas} = init('game'),
    defaults = {
        assets: 'https://2830-59439.el-alt.com/dash-cat/',
        difficulty: 1,
        font: '"lores-12", sans-serif',
        height: 400,
        lives: 3,
        spawn: 300,
        speed: 6,
        thrust: 1,
        widgetOffset: {
            x: 30,
            y: 150
        },
        width: 600
    },
    entropy = () => (Math.random() + 1) * Math.PI,
    fly = {
        drag: 0.4,
        lift: 0.2,
        speed: -0.075,
        thrust: defaults.thrust,
        time: 0
    },
    game = {
        difficulty: defaults.difficulty,
        difficultyCheck: false,
        entropy: entropy(),
        hasFocus: true,
        level: 1,
        lives: defaults.lives,
        loaded: false,
        musicIsMuted: false,
        over: false,
        running: false,
        score: 0,
        scoreHigh: getStoreItem('dash-cat-high-score') || 0,
        spawn: defaults.spawn,
        spawnMin: 90,
        speed: defaults.speed,
        speedMax: 12,
        time: 0
    },
    getPosition = (width, x) => x + (2 * width), // eslint-disable-line no-extra-parens
    jump = {
        gravity: 4,
        ground: defaults.height - 96,
        max: 24,
        power: 12,
        time: 0
    },
    messages = [
        'You’ve CAT to be KITTEN me!',
        'ME-ouch!',
        'That was a total CAT-astrophe!\nGame over!',
        'Nothing’s im-PAW-sible for this cat!',
        'PURR-fect! It’s the catnip zoomies!',
        'MEOW you’re talking! Tuna is life!',
        'A-MEW-zon Prime delivery: Invincibility!',
        'Art by Shaye Wong • Sound by Nate Reinauer • Programming by Randall Spence',
        'Pawsed'
    ],
    objects = {
        attract: [],
        bonuses: [],
        obstacles: [],
        sheets: {},
        sprites: []
    },
    reset = (full, levelUp) => {
        if (full) {
            fly.thrust = defaults.thrust;
            game.difficulty = defaults.difficulty;
            game.difficultyCheck = false;
            game.entropy = entropy();
            game.level = 1;
            game.lives = defaults.lives;
            game.over = false;
            game.running = true;
            game.score = 0;
            game.spawn = defaults.spawn;
            game.speed = defaults.speed;
            objects.lives.updateText(game.lives);
            objects.message.text = '';
            objects.score.updateText();
        }
        fly.time = 0;
        game.musicIsPlaying = true;
        game.time = 0;
        jump.ground = defaults.height - 96;
        jump.time = 0;
        audioAssets[`level-${game.level}`].currentTime = 0;
        if (!game.musicIsMuted && game.hasFocus) {
            audioAssets[`level-${game.level}`].play();
        }
        objects.bonuses = [];
        objects.cat.animations = objects.sheets.cat.animations;
        objects.cat.hasBox = 0;
        objects.cat.hasZoomies = 0;
        objects.cat.height = objects.sheets.cat.frame.height;
        objects.cat.isWet = false;
        objects.cat.width = objects.sheets.cat.frame.width;
        objects.cat.y = jump.ground;
        objects.credits.text = '';
        objects.obstacles = [];
        objects.widget.x = defaults.width - defaults.widgetOffset.x;
        objects.widget.y = defaults.height - defaults.widgetOffset.y;
        if (levelUp) {
            game.level = clamp(1, 4, game.level + 1);
        }
    },
    setDx = () => -game.speed + (objects.cat.isWet ? fly.thrust / game.entropy : 0),
    spawnSprite = function (obstacle, overrideChoice, overrideOffset) {
        const choice = overrideChoice || randInt(0, 5);
        let
            animation = '',
            animations = null,
            asset = null,
            offset = 0,
            spawn = true,
            type = '',
            x = 0;

        if (obstacle) {
            switch (choice) {
            case 0:
            case 2:
                asset = imageAssets[`slow-${choice === 0 ? '1' : '2'}`];
                offset = 48;
                type = 'slow';
                x = choice === 0 ? 148 : 221;
                break;
            case 1:
            case 4:
                animation = choice === 1 ? 'idle' : 'active';
                animations = objects.sheets.small.animations;
                offset = 3;
                type = 'small';
                x = 40;
                break;
            case 3:
            case 5:
                objects.obstacles.push(spawnSprite(true, 6, 32));
                asset = imageAssets[`large-1-${game.level}`];
                offset = -60;
                type = 'large';
                x = 36;
                break;
            case 6:
                asset = imageAssets[`large-2-${game.level}`];
                offset = -28;
                type = '';
                x = 40;
                break;
            default:
                break;
            }
        } else {
            switch (choice) {
            case 1:
                if (game.lives < 9) {
                    objects.bonuses.push(spawnSprite(false, 6));
                    animation = 'tuna';
                    animations = objects.sheets.bonuses.animations;
                    offset = -100;
                    type = 'tuna';
                    x = 48;
                    break;
                } else {
                    spawn = false;
                }
                break;
            case 3:
                if (objects.cat.hasBox) {
                    spawn = false;
                } else {
                    animation = 'idle';
                    animations = objects.sheets.box.animations;
                    offset = -6;
                    type = 'box';
                    x = 100;
                }
                break;
            case 0:
            case 2:
            case 4:
                objects.bonuses.push(spawnSprite(false, 6));
                animation = 'catnip';
                animations = objects.sheets.bonuses.animations;
                offset = -100;
                type = 'catnip';
                x = 48;
                break;
            case 6:
                animation = 'active';
                animations = objects.sheets.tentacle.animations;
                offset = -56;
                type = '';
                x = 47;
                break;
            default:
                spawn = false;
                break;
            }
        }

        if (!spawn) {
            return false;
        }

        return Sprite({
            animations,
            dx: -game.speed,
            image: asset,
            type,
            update () {
                if (animation) {
                    this.playAnimation(animation);
                }
                this.dx = setDx();
                this.advance();
            },
            x: defaults.width + x + (overrideOffset || 0),
            y: (defaults.height - 96) + offset // eslint-disable-line no-extra-parens
        });
    };

initKeys();

canvas.height = defaults.height;
canvas.width = defaults.width;

setAudioPath(defaults.assets);
setImagePath(defaults.assets);
load(
    'attract.mp3', 'background-1.png', 'bonuses.mp3', 'bonuses.png', 'box.png', 'cat.png', 'catnip.mp3', 'controls.png', 'crash.mp3', 'death.mp3',
    'ground-1.png', 'jump.mp3', 'large-1.png', 'large-1-1.png', 'large-2-1.png', 'level-1.mp3', 'meow.mp3', 'slow-1.mp3', 'slow-1.png', 'slow-2.png',
    'small-1.mp3', 'small-1.png', 'start.png', 'tentacle.png', 'title.png', 'victory.mp3', 'widget.png'
).then(() => {
    const
        background = {
            height: 148,
            image: imageAssets[`background-${game.level}`],
            type: 'background',
            width: 600,
            y: defaults.height - 148
        },
        crash = function (index, type) {
            if (game.lives > 0 && game.loop.isStopped) {
                setTimeout(() => {
                    if (type === 'large') {
                        objects.obstacles.splice(index - 1, 2);
                    } else {
                        objects.obstacles.splice(index, 1);
                    }
                    objects.widget.x = defaults.width - defaults.widgetOffset.x;
                    objects.widget.y = defaults.height - defaults.widgetOffset.y;
                    game.loop.start();
                }, 1500);
            }
        },
        createSheet = (name, config) => {
            objects.sheets[name] = SpriteSheet(config);
        },
        createSprite = (config1, config2 = {}) => {
            const
                config = {
                    ...config1,
                    ...config2
                };

            return Sprite(config);
        },
        createText = (config) => Text(config),
        ground = {
            height: 53,
            image: imageAssets[`ground-${game.level}`],
            type: 'ground',
            width: 1200,
            y: defaults.height - 93
        },
        handlePause = () => {
            game.attract.stop();
            audioAssets.attract.pause();
            audioAssets.attract.currentTime = 0;
            if (game.loaded) {
                if (game.over) {
                    reset(true);
                    game.loop.start();
                } else if (game.running) {
                    objects.message.text = messages[8];
                    game.paused = true;
                } else if (!game.running) {
                    objects.message.text = '';
                    game.paused = false;
                    game.running = true;
                    game.loop.start();
                    if (!game.musicIsMuted) {
                        audioAssets[`level-${game.level}`].loop = true;
                        audioAssets[`level-${game.level}`].play();
                    }
                }
            }
        },
        keyHandlers = {
            Enter: () => handlePause(),
            Escape: () => handlePause(),
            KeyB: () => !objects.cat.hasBox && objects.bonuses.push(spawnSprite(false, 3)),
            KeyC: () => !objects.cat.hasZoomies && objects.bonuses.push(spawnSprite(false, 2)),
            KeyL: () => objects.obstacles.push(spawnSprite(true, 3)),
            KeyM: () => {
                if (game.musicIsMuted) {
                    game.musicIsMuted = false;
                    audioAssets[`level-${game.level}`].loop = true;
                    audioAssets[`level-${game.level}`].play();
                } else {
                    game.musicIsMuted = true;
                    audioAssets[`level-${game.level}`].pause();
                }
            },
            KeyS: () => objects.obstacles.push(spawnSprite(true, 1)),
            KeyT: () => objects.bonuses.push(spawnSprite(false, 1)),
            KeyW: () => objects.obstacles.push(spawnSprite(true, 2)),
            NumpadEnter: () => handlePause()
        },
        over = function () {
            setTimeout(() => {
                if (game.over) {
                    game.attract.start();
                    if (!game.musicIsMuted && game.hasFocus) {
                        audioAssets.attract.play();
                    }
                }
            }, 12000);
        },
        pushAttact = (object) => objects.attract.push(object),
        pushSprite = (object) => objects.sprites.push(object);

    game.loaded = true;

    // Sprite SpriteSheets
    createSheet('bonuses', {
        animations: {
            box: {
                frameRate: 10,
                frames: [4, 5]
            },
            catnip: {
                frameRate: 10,
                frames: [2, 3]
            },
            idle: {
                frameRate: 0,
                frames: [6]
            },
            tuna: {
                frameRate: 10,
                frames: [0, 1]
            }
        },
        frameHeight: 36,
        frameWidth: 42,
        image: imageAssets.bonuses
    });
    createSheet('box', {
        animations: {
            'fall-1': {
                frameRate: 10,
                frames: [16, 17, 18, 19]
            },
            'fall-2': {
                frameRate: 10,
                frames: [12, 13]
            },
            idle: {
                frameRate: 5,
                frames: [0, 1, 2]
            },
            'jump-1': {
                frameRate: 10,
                frames: [14, 15]
            },
            'jump-2': {
                frameRate: 0,
                frames: [11]
            },
            'run-1': {
                frameRate: 10,
                frames: [7, 8, 9, 10]
            },
            'run-2': {
                frameRate: 10,
                frames: [3, 4, 5, 6]
            },
            'wet-1': {
                frameRate: 10,
                frames: [7, 8, 9, 10]
            },
            'wet-2': {
                frameRate: 10,
                frames: [3, 4, 5, 6]
            },
            'zoomie-fall-1': {
                frameRate: 20,
                frames: [16, 17, 18, 19]
            },
            'zoomie-fall-2': {
                frameRate: 20,
                frames: [12, 13]
            },
            'zoomie-jump-1': {
                frameRate: 20,
                frames: [14, 15]
            },
            'zoomie-jump-2': {
                frameRate: 0,
                frames: [11]
            },
            'zoomie-run-1': {
                frameRate: 20,
                frames: [7, 8, 9, 10]
            },
            'zoomie-run-2': {
                frameRate: 20,
                frames: [3, 4, 5, 6]
            },
            'zoomie-wet-1': {
                frameRate: 20,
                frames: [7, 8, 9, 10]
            },
            'zoomie-wet-2': {
                frameRate: 20,
                frames: [3, 4, 5, 6]
            }
        },
        frameHeight: 78,
        frameWidth: 100,
        image: imageAssets.box
    });
    createSheet('cat', {
        animations: {
            dead: {
                frameRate: 0,
                frames: [20]
            },
            fall: {
                frameRate: 10,
                frames: [6, 7]
            },
            idle: {
                frameRate: 5,
                frames: [0, 1]
            },
            jump: {
                frameRate: 0,
                frames: [18]
            },
            run: {
                frameRate: 10,
                frames: [2, 3, 4, 5]
            },
            wet: {
                frameRate: 10,
                frames: [8, 9]
            },
            'zoomie-fall': {
                frameRate: 30,
                frames: [14, 15]
            },
            'zoomie-jump': {
                frameRate: 0,
                frames: [19]
            },
            'zoomie-run': {
                frameRate: 30,
                frames: [10, 11, 12, 13]
            },
            'zoomie-wet': {
                frameRate: 30,
                frames: [16, 17]
            }
        },
        frameHeight: 52,
        frameWidth: 75,
        image: imageAssets.cat
    });
    createSheet('small', {
        animations: {
            active: {
                frameRate: 5,
                frames: [1, 2]
            },
            idle: {
                frameRate: 0,
                frames: [0]
            }
        },
        frameHeight: 45,
        frameWidth: 40,
        image: imageAssets[`small-${game.level}`]
    });
    createSheet('tentacle', {
        animations: {
            active: {
                frameRate: 5,
                frames: [0, 1]
            },
            attract: {
                frameRate: 5,
                frames: [1, 0]
            },
            idle: {
                frameRate: 0,
                frames: [0]
            }
        },
        frameHeight: 104,
        frameWidth: 47,
        image: imageAssets.tentacle
    });
    createSheet('title', {
        animations: {
            active: {
                frameRate: 5,
                frames: [0, 1]
            }
        },
        frameHeight: 97,
        frameWidth: 377,
        image: imageAssets.title
    });

    // Attract objects
    pushAttact(createSprite(background, {
        x: 0
    }));
    pushAttact(createSprite(ground, {
        x: 0
    }));
    pushAttact(createSprite({
        animations: objects.sheets.cat.animations,
        type: 'cat',
        update () {
            this.playAnimation('idle');
            this.advance();
        },
        x: (defaults.width / 2) - 34, // eslint-disable-line no-extra-parens
        y: jump.ground
    }));
    pushAttact(createText({
        color: '#232323',
        font: `20px ${defaults.font}`,
        text: 'Collect these',
        x: 25,
        y: 180
    }));
    pushAttact(createSprite({
        animations: objects.sheets.tentacle.animations,
        type: 'tentacle',
        update () {
            this.playAnimation('active');
            this.advance();
        },
        x: 20,
        y: jump.ground - 56
    }));
    pushAttact(createSprite({
        animations: objects.sheets.bonuses.animations,
        type: 'catnip',
        update () {
            this.playAnimation('catnip');
            this.advance();
        },
        x: 22,
        y: jump.ground - 90
    }));
    pushAttact(createSprite({
        animations: objects.sheets.tentacle.animations,
        type: 'tentacle',
        update () {
            this.playAnimation('attract');
            this.advance();
        },
        x: 110,
        y: jump.ground - 56
    }));
    pushAttact(createSprite({
        animations: objects.sheets.bonuses.animations,
        type: 'tuna',
        update () {
            this.playAnimation('tuna');
            this.advance();
        },
        x: 112,
        y: jump.ground - 90
    }));
    pushAttact(createSprite({
        animations: objects.sheets.box.animations,
        type: 'box',
        update () {
            this.playAnimation('idle');
            this.advance();
        },
        x: 40,
        y: jump.ground - 6
    }));
    pushAttact(createText({
        color: '#232323',
        font: `20px ${defaults.font}`,
        text: 'Avoid these',
        x: defaults.width - 165,
        y: 180
    }));
    pushAttact(createSprite({
        image: imageAssets['slow-1'],
        type: 'water',
        x: defaults.width - 180,
        y: jump.ground + 50
    }));
    pushAttact(createSprite({
        image: imageAssets['large-1'],
        type: 'large',
        x: defaults.width - 110,
        y: jump.ground - 60
    }));
    pushAttact(createSprite({
        animations: objects.sheets.small.animations,
        type: 'small',
        update () {
            this.playAnimation('active');
            this.advance();
        },
        x: defaults.width - 180,
        y: jump.ground + 3
    }));
    pushAttact(createSprite({
        image: imageAssets.start,
        type: 'start',
        x: (defaults.width / 2) - 96, // eslint-disable-line no-extra-parens
        y: jump.ground - 66
    }));
    pushAttact(createSprite({
        image: imageAssets.controls,
        type: 'controls',
        x: (defaults.width / 2) - 60, // eslint-disable-line no-extra-parens
        y: 120
    }));
    pushAttact(createText({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#232323',
        font: `20px ${defaults.font}`,
        text: 'Jump',
        textAlign: 'center',
        x: defaults.width / 2,
        y: 106
    }));
    pushAttact(createText({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#232323',
        font: `20px ${defaults.font}`,
        text: 'Fall faster',
        textAlign: 'center',
        x: defaults.width / 2,
        y: 212
    }));
    pushAttact(createSprite({
        animations: objects.sheets.title.animations,
        type: 'title',
        update () {
            this.playAnimation('active');
            this.advance();
        },
        x: (defaults.width / 2) - 188, // eslint-disable-line no-extra-parens
        y: 20
    }));

    // Attract loop
    game.attract = GameLoop({
        render: () => objects.attract.map((sprite) => sprite.render()),
        update: () => objects.attract.map((sprite) => sprite.update())
    });
    game.attract.start();

    // Background
    pushSprite(createSprite(background, {
        dx: -0.25,
        update () {
            if (this.x < -600) {
                this.x = getPosition(600, this.x);
            }
            this.advance();
        },
        x: 0
    }));
    pushSprite(createSprite(background, {
        dx: -0.25,
        update () {
            if (this.x < -600) {
                this.x = getPosition(600, this.x);
            }
            this.advance();
        },
        x: 600
    }));

    // Ground
    pushSprite(createSprite(ground, {
        dx: -game.speed,
        update () {
            this.dx = setDx();
            if (this.x < -1200) {
                this.x = getPosition(1200, this.x);
            }
            this.advance();
        },
        x: 0
    }));
    pushSprite(createSprite(ground, {
        dx: -game.speed,
        update () {
            this.dx = setDx();
            if (this.x < -1200) {
                this.x = getPosition(1200, this.x);
            }
            this.advance();
        },
        x: 1200
    }));

    // Lives indicator
    pushSprite(createSprite({
        animations: objects.sheets.bonuses.animations,
        update () {
            this.playAnimation('tuna');
            this.advance();
        },
        x: 12,
        y: 6
    }));
    objects.lives = createText({
        color: '#232323',
        font: `24px ${defaults.font}`,
        text: `× ${game.lives}`,
        updateText () {
            this.text = `× ${game.lives}`;
        },
        x: 60,
        y: 15
    });
    pushSprite(objects.lives);

    // Catnip indicator
    pushSprite(createSprite({
        animations: objects.sheets.bonuses.animations,
        update () {
            if (objects.cat.hasZoomies) {
                this.playAnimation('catnip');
            } else {
                this.playAnimation('idle');
            }
            this.advance();
        },
        x: 100,
        y: 4
    }));

    // Box indicators
    pushSprite(createSprite({
        animations: objects.sheets.bonuses.animations,
        update () {
            this.playAnimation(objects.cat.hasBox ? 'box' : 'idle');
            this.advance();
        },
        x: 145,
        y: 2
    }));
    pushSprite(createSprite({
        animations: objects.sheets.bonuses.animations,
        update () {
            this.playAnimation(objects.cat.hasBox === 2 ? 'box' : 'idle');
            this.advance();
        },
        x: 185,
        y: 2
    }));

    // Score indicator
    objects.score = createText({
        anchor: {
            x: 1,
            y: 0
        },
        color: '#232323',
        font: `24px ${defaults.font}`,
        text: `${game.score} / ${game.scoreHigh}`,
        updateText () {
            this.text = `${game.score} / ${game.score > game.scoreHigh ? game.score : game.scoreHigh}`;
            if (game.over && game.score > game.scoreHigh) {
                game.scoreHigh = game.score;
                setStoreItem('dash-cat-high-score', game.score);
            }
        },
        x: defaults.width - 12,
        y: 12
    });
    pushSprite(objects.score);

    // Messages
    objects.message = createText({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#232323',
        font: `24px ${defaults.font}`,
        hasMessage: 0,
        text: '',
        textAlign: 'center',
        update () {
            if (this.hasMessage > 0) {
                this.hasMessage -= 1;
                if (this.hasMessage === 0) {
                    this.text = '';
                }
            }
        },
        updateText (message) {
            this.hasMessage = 360;
            this.text = message;
        },
        x: defaults.width / 2,
        y: defaults.height / 3
    });
    pushSprite(objects.message);

    // Cat
    objects.cat = createSprite({
        animations: objects.sheets.cat.animations,
        hasBox: 0,
        hasZoomies: 0,
        isJumping: false,
        isWet: false,
        type: 'cat',
        update () {
            let prefix = '',
                suffix = '';

            if (this.hasBox) {
                suffix = `-${this.hasBox}`;
            }
            if (this.hasZoomies > 0) {
                this.hasZoomies -= 1;
                if (this.hasZoomies === 0) {
                    audioAssets.catnip.pause();
                    objects.message.text = '';
                    objects.widget.dx = fly.speed;
                } else {
                    prefix = 'zoomie-';
                }
            }
            if (keyPressed('arrowup') || keyPressed('space')) {
                // Jump
                jump.time += 1;
                if (jump.time < jump.max) {
                    this.playAnimation(`${prefix}jump${suffix}`);
                    this.rotation = degToRad(-15);
                    this.y -= jump.power;
                }
                if (!this.isJumping) {
                    this.isJumping = true;
                    audioAssets.jump.play();
                }
            } else {
                // Fall
                this.playAnimation(`${prefix}fall${suffix}`);
                this.rotation = 0;
                jump.time = jump.max;
            }
            if (this.y < jump.ground) {
                this.y += Math.min(jump.gravity * (keyPressed('arrowdown') ? 2 : 1), jump.ground - this.y);
            } else if (this.y === jump.ground) {
                // Run
                this.isJumping = false;
                this.playAnimation(prefix + (this.isWet ? 'wet' : 'run') + suffix);
                jump.time = 0;
            }
            this.advance();
        },
        x: defaults.width / 6,
        y: jump.ground
    });
    pushSprite(objects.cat);

    // Widget
    objects.widget = createSprite({
        dx: fly.speed,
        float: 0,
        image: imageAssets.widget,
        update () {
            fly.time += 1;
            if (fly.time <= 100) {
                this.rotation = degToRad(5);
                this.y += fly.drag;
            } else if (fly.time <= 300) {
                this.rotation = degToRad(-5);
                this.y -= fly.lift;
            } else {
                fly.time = 0;
            }
            if (collides(this, objects.cat)) {
                game.over = true;
                game.score += 1000;
                game.score += (game.lives * 100); // eslint-disable-line no-extra-parens
                audioAssets.catnip.pause();
                objects.message.text = messages[3];
                objects.credits.text = messages[7];
                objects.score.updateText();
                if (!game.musicIsMuted) {
                    audioAssets[`level-${game.level}`].pause();
                    game.musicIsPlaying = false;
                }
                audioAssets.victory.play();
                over();
                game.loop.stop();
            }
            if (this.x > defaults.width - 33) {
                this.x = defaults.width - 33;
            }
            this.advance();
        },
        x: defaults.width - defaults.widgetOffset.x,
        y: defaults.height - defaults.widgetOffset.y
    });
    pushSprite(objects.widget);

    // Credits
    objects.credits = createText({
        anchor: {
            x: 0.5,
            y: 0.5
        },
        color: '#fff',
        font: `12px ${defaults.font}`,
        text: '',
        textAlign: 'center',
        x: defaults.width / 2,
        y: defaults.height - 7
    });
    pushSprite(objects.credits);

    // Game loop
    game.loop = GameLoop({
        render () {
            objects.sprites.map((sprite) => sprite.render());
            objects.bonuses.map((bonus) => bonus.render());
            objects.obstacles.map((obstacle) => obstacle.render());
        },
        update () {
            objects.sprites.map((sprite) => sprite.update());
            game.time += 1;
            if (game.time % 60 === 0) {
                game.score += objects.cat.hasZoomies ? 3 : 1;
                objects.score.updateText();
            }
            if (game.time % game.spawn === 0) {
                objects.obstacles.push(spawnSprite(true));
            }
            if (game.time % Math.trunc((game.spawn + game.difficulty) * game.entropy) === 0) {
                const spawn = spawnSprite(false);

                if (spawn) {
                    objects.bonuses.push(spawn);
                }
            }
            if (game.paused) {
                game.running = false;
                game.loop.stop();
                if (!game.musicIsMuted) {
                    audioAssets[`level-${game.level}`].pause();
                }
            }

            // Process bonuses
            objects.bonuses.forEach((bonus, index) => {
                bonus.update();
                if (collides(objects.cat, bonus)) {
                    switch (bonus.type) {
                    case 'box':
                        audioAssets.bonuses.play();
                        jump.ground = defaults.height - 124;
                        objects.cat.animations = objects.sheets.box.animations;
                        objects.cat.hasBox = 2;
                        objects.cat.height = objects.sheets.box.frame.height;
                        objects.cat.width = objects.sheets.box.frame.width;
                        objects.cat.y = jump.ground;
                        objects.message.updateText(messages[6]);
                        objects.bonuses.splice(index, 1);
                        break;
                    case 'catnip':
                        audioAssets.bonuses.play();
                        audioAssets.catnip.currentTime = 0;
                        audioAssets.catnip.loop = true;
                        audioAssets.catnip.play();
                        objects.cat.hasZoomies = 300;
                        objects.message.updateText(messages[4]);
                        objects.widget.dx = fly.speed * game.entropy;
                        objects.bonuses.splice(index, 1);
                        break;
                    case 'tuna':
                        if (game.lives < 9) {
                            audioAssets.meow.play();
                            game.lives += 1;
                            objects.lives.updateText(game.lives);
                            objects.message.updateText(messages[5]);
                            objects.bonuses.splice(index, 1);
                        }
                        break;
                    default:
                        break;
                    }
                } else if (bonus.x + bonus.width < 0) {
                    objects.bonuses.splice(index, 1);
                }
            });

            // Process obstacles
            objects.obstacles.forEach((obstacle, index) => {
                obstacle.update();
                if (obstacle.type && collides(objects.cat, obstacle)) {
                    if (obstacle.type === 'slow') {
                        objects.widget.dx = fly.thrust;
                        objects.cat.isWet = true;
                        audioAssets[`slow-${game.level}`].play();
                    } else if (objects.cat.hasBox) {
                        objects.cat.hasBox -= 1;
                        if (objects.cat.hasBox === 0) {
                            jump.ground = defaults.height - 96;
                            objects.cat.animations = objects.sheets.cat.animations;
                            objects.cat.height = objects.sheets.cat.frame.height;
                            objects.cat.width = objects.sheets.cat.frame.width;
                            objects.cat.y = jump.ground;
                        }
                        if (obstacle.type === 'large') {
                            objects.obstacles.splice(index - 1, 2);
                        } else {
                            objects.obstacles.splice(index, 1);
                        }
                        audioAssets[obstacle.type === 'small' ? `small-${game.level}` : 'crash'].play();
                    } else {
                        game.lives -= 1;
                        audioAssets.catnip.pause();
                        objects.cat.hasZoomies = 0;
                        objects.cat.playAnimation('dead');
                        objects.lives.updateText(game.lives);
                        if (game.lives === 0) {
                            game.over = true;
                            objects.message.text = messages[2];
                            objects.credits.text = messages[7];
                            objects.score.updateText();
                            if (!game.musicIsMuted) {
                                audioAssets[`level-${game.level}`].pause();
                            }
                            audioAssets.death.play();
                            over();
                        } else {
                            objects.message.updateText(messages[randInt(0, 1)]);
                            audioAssets[obstacle.type === 'small' ? `small-${game.level}` : 'crash'].play();
                        }
                        game.loop.stop();
                        crash(index, obstacle.type);
                    }
                } else if (obstacle.x + obstacle.width < 0) {
                    objects.cat.isWet = false;
                    objects.widget.dx = objects.cat.hasZoomies ? fly.speed * 3 : fly.speed;
                    game.difficultyCheck = true;
                    // Score based on obstacle type
                    if (obstacle.type === 'slow') {
                        game.score += 1;
                    } else if (obstacle.type === 'large') {
                        game.score += 5;
                    } else if (obstacle.type && obstacle.type !== '') {
                        game.score += 3;
                    }
                    objects.score.updateText();
                    objects.obstacles.splice(index, 1);
                }
            });

            // Slowly increase speed until the max speed is reached
            game.speed = Math.min(game.speedMax, game.speed + 0.00075);

            // Decrease delay between obstacles as play progresses
            if (game.difficultyCheck) {
                game.difficultyCheck = false;
                if (game.score > 10 * game.difficulty) {
                    fly.thrust = Math.max(6, fly.thrust + 0.15);
                    game.difficulty += 1;
                    game.spawn = Math.max(game.spawnMin, game.spawn - game.difficulty);
                }
            }
        }
    });

    // Event handlers
    document.addEventListener('keyup', (key) => {
        const handler = keyHandlers[key.code];

        if (handler) {
            handler();
        }
    });
    window.addEventListener('focus', () => {
        game.hasFocus = true;
        if (!game.musicIsMuted && !game.over && game.running) {
            audioAssets[`level-${game.level}`].loop = true;
            audioAssets[`level-${game.level}`].play();
        } else if (!game.musicIsMuted && !game.attract.isStopped) {
            audioAssets.attract.loop = true;
            audioAssets.attract.play();
        }
    });
    window.addEventListener('blur', () => {
        game.hasFocus = false;
        audioAssets[`level-${game.level}`].pause();
        audioAssets.attract.pause();
        audioAssets.catnip.pause();
    });
});
