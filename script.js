document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    const players = [
        { id: 0, name: 'Jānis', hand: [], bid: null, tricksWon: 0, score: 0, isCPU: true },
        { id: 1, name: 'Pēteris', hand: [], bid: null, tricksWon: 0, score: 0, isCPU: true },
        { id: 2, name: 'Andris', hand: [], bid: null, tricksWon: 0, score: 0, isCPU: true },
        { id: 3, name: 'Jūs', hand: [], bid: null, tricksWon: 0, score: 0, isCPU: false },
    ];
    let totalRounds = 5, currentRound = 0, dealerIndex = Math.floor(Math.random() * 4);
    let currentPlayerIndex, trickStartIndex, trick = [], lastTrick = [], trickSuit = null, trickNumber = 0;
    let isPlayerAutoplaying = false;
    let autoplaySpeed = 1;
    let gameState = 'setup';
    let roundState = {};
    let resolveNextRound;
    let cpuDifficulty = 'hard'; // Tagad vienmēr "grūti"
    let gameStats = { gamesPlayed: 0, wins: 0, totalScore: 0 };
    let isGameActive = false; // New flag to control game loop

    const allDominoes = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            allDominoes.push({ pips1: i, pips2: j, id: [i, j].sort().join('-'), originalId: `${i}-${j}` });
        }
    }
    const trumps = ['0-0', '1-1', '1-6', '1-5', '1-4', '1-3', '1-2', '0-1'];
    const aces = ['6-6', '5-5', '4-4', '3-3', '2-2', '0-6'];
    
    // --- UI ELEMENTS ---
    const statusMessage = document.getElementById('status-message'), tableArea = document.getElementById('table-area'),
          suitInfo = document.getElementById('suit-info'), suitModal = document.getElementById('suit-modal'), 
          gameOverModal = document.getElementById('game-over-modal'), scoreboardBody = document.getElementById('scoreboard-body'), 
          roundOverModal = document.getElementById('round-over-modal'), autoplayBtn = document.getElementById('autoplay-btn'),
          historyBody = document.getElementById('history-body'),
          rulesModal = document.getElementById('rules-modal'),
          statsModal = document.getElementById('stats-modal'),
          helpBtn = document.getElementById('help-btn'),
          statsBtn = document.getElementById('stats-btn'),
          leaveGameBtn = document.getElementById('leave-game-btn'),
          roundsModal = document.getElementById('rounds-modal');

    // Lobby Elements (ATSTĀJAM TIKAI NEPIECIEŠAMĀS)
    const lobbyScreen = document.getElementById('lobby-screen');
    const gameContainer = document.getElementById('game-container');
    const lobbyNavBtns = document.querySelectorAll('.lobby-nav-btn');
    const lobbyContentSections = document.querySelectorAll('.lobby-content-section');
    const startQuickGameBtn = document.getElementById('start-quick-game');
    
    // --- RULES & TRANSLATIONS ---
    const rules = {
        lv: {
            title: "Domino Pokera Noteikumi",
            content: `
                <h3>Spēles Mērķis</h3>
                <p>Domino pokers ir individuāla domino spēle, kurā četri spēlētāji vāc punktus, precīzi paņemot iepriekš solītos stiķus. Galvenais mērķis ir sasniegt pēc iespējas vairāk punktu, pārdomāti plānojot un taktiski izjaucot pretinieku plānus.</p>
                <h3>Spēles Gaita</h3>
                <h4>1. Maisīšana un Vilkšana</h4>
                <p>Katrs spēlētājs saņem 7 domino kauliņus no samaisīta 28 kauliņu komplekta.</p>
                <h4>2. Solīšana</h4>
                <p>Katrs spēlētājs pēc kārtas nosola, cik stiķus viņš plāno iegūt (no 0 līdz 7). Solīšana notiek vienā aplī.</p>
                <h4>3. Izspēle</h4>
                <p>Spēlētājs, kurš sāk, var likt jebkuru kauliņu. Pārējiem spēlētājiem ir jāseko mastam (jāliek kauliņš ar tādu pašu ciparu), ja tas ir iespējams. Ja mastam sekot nevar, drīkst likt trumpi vai atmest jebkuru citu kauliņu.</p>
				<p>Ja tiek veikts gājiens ar trumpi, obligāti visiem jāliek trumpis (ja tāds ir). Ja trumpis nav, tad drīkst atmest jebkuru kauliņu.</p>
				<p>Ja tiek veikts gājiens ar dūzi, obligāti jāliek atbilstošs kauliņš. Ja tāds nav, tad obligāti jāsit ar trumpi. Ja arī trumpis nav, tad drīkst atmest ar jebkuru kauliņu.</p>
				<p>Ja tiek veikts gājiens ar neitrālu kauliņu piemēram "4-3", obligāti jāliek pieprasītais kauliņš. Ja pieprasītais kauliņš nav, tad obligāti jāsit ar trumpi. Ja nav nedz pieprasītais, nedz trumpis, tad drīkst atmest ar jebkuru.</p>
                <h4>Trumpju secība (no spēcīgākā):</h4>
                <ul><li>0-0, 1-1, 1-6, 1-5, 1-4, 1-3, 1-2, 1-0</li></ul>
                <h4>Dūžu secība (no spēcīgākā):</h4>
                <ul><li>6-6, 5-5, 4-4, 3-3, 2-2, 0-6. (Izejot ar 0-6, spēlētājs var izvēlēties, vai prasīt '0' vai '6' mastu).</li></ul>
                <h3>Punktu skaitīšana</h3>
                <ul>
                    <li><b>+15 punkti</b> par katru precīzi paņemtu stiķi (ja solīji 3 un paņēmi 3, saņem 45 punktus).</li>
                    <li><b>+5 punkti</b> par katru stiķi virs solītā (ja solīji 2 un paņēmi 4, saņem 4*5=20 punktus).</li>
                    <li><b>-5 punkti</b> par katru nepaņemto stiķi līdz solītajam (ja solīji 4 un paņēmi 2, saņem -10 punktus).</li>
                    <li><b>+30 bonusa punkti</b>, ja precīzi paņemti visi 7 solītie stiķi (kopā 7*15+30=135 punkti).</li>
                    <li><b>-30 punkti</b>, ja solīti visi 7, bet nav paņemti.</li>
                </ul>`
        },
        en: {
            title: "Domino Poker Rules",
            content: `
                <h3>Game Objective</h3>
                <p>Domino Poker is an individual domino game for four players who aim to score points by accurately taking previously bid rounds. Strategic planning and interference with opponents are essential for winning.</p>
                <h3>Gameplay</h3>
                <h4>1. Shuffling and Drawing</h4>
                <p>Each player draws 7 dominoes from a shuffled 28-tile set.</p>
                <h4>2. Bidding</h4>
                <p>Each player bids in turn how many rounds they plan to take (from 0 to 7). There is only one round of bidding.</p>
                <h4>3. Play</h4>
				<p>If a move is made with a trump, everyone must play a trump (if they have one). If no trump is available, any tile may be discarded.</p>
				<p>If a move is made with an ace, the corresponding tile must be played. If such a tile is unavailable, a trump must be played. If no trump is available, any tile may be discarded.</p>
				<p>If a move is made with a neutral tile, for example "4-3", the requested tile must be played. If the requested tile is unavailable, a trump must be played. If neither the requested tile nor a trump is available, any tile may be discarded.</p>
                <p>The lead player can play any tile. Other players must follow suit (play a tile with the same number) if they can. If you cannot follow suit, you may play a trump or discard any other tile.</p>
                <h4>Trump order (highest first):</h4>
                <ul><li>0-0, 1-1, 1-6, 1-5, 1-4, 1-3, 1-2, 1-0</li></ul>
                <h4>Ace order (highest first):</h4>
                <ul><li>6-6, 5-5, 4-4, 3-3, 2-2, 0-6. (When leading with 0-6, the player can choose to call for either the '0' or '6' suit).</li></ul>
                <h3>Scoring</h3>
                <ul>
                    <li><b>+15 points</b> for each round taken if the bid was met exactly (e.g., bid 3, took 3 = 45 points).</li>
                    <li><b>+5 points</b> for each round taken if the bid was exceeded (e.g., bid 2, took 4 = 20 points).</li>
                    <li><b>-5 points</b> for each round missed below the bid (e.g., bid 4, took 2 = -10 points).</li>
                    <li><b>+30 bonus points</b> for bidding and taking all 7 rounds (total 7*15+30=135 points).</li>
                    <li><b>-30 points</b> for bidding 7 rounds but failing to take them all.</li>
                </ul>`
        }
    };
    
    const translations = {
        lv: {
            you: 'Jūs', bid: 'Solīja', taken: 'Paņēma', round: 'Partija', scoreboard: 'Rezultāti', howManyRounds: 'Cik partijas spēlēsiet?',
            startGame: 'Sākt spēli', chooseSuitLead: 'Ar kuru skaitli sākt gājienu?', roundResults: 'Punktu Aprēķins', continue: 'Turpināt',
            gameOver: 'Spēle Beigusies!', playAgain: 'Spēlēt vēlreiz', mustFollow: 'Nederīgs gājiens! Jāseko mastam vai jāliek trumpis.',
            playerTurn: (name) => `${name} gājiens...`, bidding: (name) => `${name} solīs...`, bidMade: (name, bid) => `${name} sola ${bid}`,
            gameStarts: (name) => `Spēle sākas! ${name} sāk.`, trickWon: (name) => `${name} paņem stiķi!`, roundOver: 'Partija beigusies! Skaita punktus...',
            shuffling: 'Maisa kauliņus...', bidPrompt: 'Cik stiķus jūs solīsiet?',
            winnerIs: (name, score) => `Uzvarētājs ir ${name} ar ${score} punktiem!`, finalScoresTitle: 'Gala Rezultāti:', points: 'punkti',
            roundResultText: (bid, taken) => `Solīja ${bid}, Paņēma ${taken}`, pointsSuffix: 'punkti', suitLead: (suit) => `Jāseko: ${suit}`,
            trumpSuit: 'Trumpji', enableAutoplay: 'Ieslēgt CPU', disableAutoplay: 'Izslēgt CPU',
            trickHistory: 'Gājienu Vēsture', noHistory: 'Vēl nav nospēlēts neviens stiķis.', speed: 'Ātrums:',
            getAdvice: 'Gājiena ieteikums', analyzeRound: 'Analizēt partiju', adviceTitle: 'Gemini padoms', analysisTitle: 'Gemini analīze',
            difficulty: 'Grūtības līmenis', easy: 'Viegli', normal: 'Normāli', hard: 'Grūti',
            statsTitle: 'Jūsu Statistika', gamesPlayed: 'Nospēlētās spēles', wins: 'Uzvaras', totalScore: 'Kopējais punktu skaits',
            playGame: 'Spēlēt Spēli', quickPlay: 'Ātrā Spēle', quickPlayDesc: 'Sākt spēli pret CPU spēlētājiem. Ideāli piemērots ātrai izklaidei.',
            start: 'Sākt', tournament: 'Turnīrs', tournamentDesc: 'Spēlēt vairākas partijas pret dažādiem pretiniekiem, lai iegūtu kopvērtējuma uzvaru.',
            privateGame: 'Privātā Spēle', privateGameDesc: 'Izveidot vai pievienoties spēlei ar kodu, lai spēlētu ar draugiem.',
            join: 'Pievienoties', create: 'Izveidot jaunu', profile: 'Profils', achievements: 'Sasniegumi',
            store: 'Veikals', friends: 'Draugi', settings: 'Iestatījumi', news: 'Ziņojumu Dēlis',
            saveProfile: 'Saglabāt Profilu', firstWin: 'Pirmā Uzvara', firstWinDesc: 'Uzvāri savu pirmo spēli.',
            completed: 'Pabeigts!', bidMaster: 'Stiķu Meistars', bidMasterDesc: 'Precīzi izsolīt un paņemt 7 stiķus 5 reizes.',
            progress: 'Progresā', dominoSkin: 'Domino Āda', tableBackground: 'Galda Fons', buy: 'Pirkt',
            friendsDesc: 'Šeit parādīsies jūsu draugu saraksts un to statuss.', soundVolume: 'Skaņas Skaļums',
            musicVolume: 'Mūzikas Skaļums', language: 'Valoda', latvian: 'Latviešu', english: 'Angļu',
            saveSettings: 'Saglabāt Iestatījumus', newsUpdate: 'Jauns Atjauninājums!', newsUpdateContent: 'Izdots Domino Pokera 1.0.1 versija ar uzlabojumiem un kļūdu labojumiem.',
            newsTournament: 'Turnīrs Drīzumā!', newsTournamentContent: 'Gatavojieties lielajam Domino Pokera turnīram nākamnedēļ! Lieliskas balvas!',
            exit: 'Iziet'
        },
        en: {
            exit: 'Exit',
            you: 'You', bid: 'Bid', taken: 'Taken', round: 'Round', scoreboard: 'Scoreboard', howManyRounds: 'How many rounds to play?',
            startGame: 'Start Game', chooseSuitLead: 'Which number to lead with?', roundResults: 'Point Calculation', continue: 'Continue',
            gameOver: 'Game Over!', playAgain: 'Play Again', mustFollow: 'Invalid move! You must follow suit or play a trump.',
            playerTurn: (name) => `${name}'s turn...`, bidding: (name) => `${name} is bidding...`, bidMade: (name, bid) => `${name} bids ${bid} dominoes`,
            gameStarts: (name) => `The game begins! ${name} starts.`, trickWon: (name) => `${name} takes the round!`, roundOver: 'Round over! Calculating scores...',
            shuffling: 'Shuffling dominoes...', bidPrompt: 'How many dominoes will you take?',
            winnerIs: (name, score) => `The winner is ${name} with ${score} points!`, finalScoresTitle: 'Final Scores:', points: 'points',
            roundResultText: (bid, taken) => `Bid ${bid} dominoes, Took ${taken} dominoes`, pointsSuffix: 'points', suitLead: (suit) => `Suit to follow: ${suit}`,
            trumpSuit: 'Trumps', enableAutoplay: 'Enable CPU', disableAutoplay: 'Disable CPU',
            trickHistory: 'Round History', noHistory: 'No rounds played yet.', speed: 'Speed:',
            getAdvice: 'Get Advice', analyzeRound: 'Analyze Round', adviceTitle: 'Gemini Advice', analysisTitle: 'Gemini Analysis',
            difficulty: 'Difficulty Level', easy: 'Easy', normal: 'Normal', hard: 'Hard',
            statsTitle: 'Your Statistics', gamesPlayed: 'Games Played', wins: 'Wins', totalScore: 'Total Score',
            playGame: 'Play Game', quickPlay: 'Quick Play', quickPlayDesc: 'Start a game against CPU players. Ideal for quick fun.',
            start: 'Start', tournament: 'Tournament', tournamentDesc: 'Play multiple rounds against different opponents for overall victory.',
            privateGame: 'Private Game', privateGameDesc: 'Create or join a game with a code to play with friends.',
            join: 'Join', create: 'Create New', profile: 'Profile', achievements: 'Achievements',
            store: 'Store', friends: 'Friends', settings: 'Settings', news: 'News Board',
            saveProfile: 'Save Profile', firstWin: 'First Win', firstWinDesc: 'Win your first game.',
            completed: 'Completed!', bidMaster: 'Bid Master', bidMasterDesc: 'Accurately bid and take 7 tricks 5 times.',
            progress: 'In Progress', dominoSkin: 'Domino Skin', tableBackground: 'Table Background', buy: 'Buy',
            friendsDesc: 'Here you will see your friends list and their status.', soundVolume: 'Sound Volume',
            musicVolume: 'Music Volume', language: 'Language', latvian: 'Latvian', english: 'English',
            saveSettings: 'Save Settings', newsUpdate: 'New Update!', newsUpdateContent: 'Domino Poker version 1.0.1 released with improvements and bug fixes.',
            newsTournament: 'Tournament Soon!', newsTournamentContent: 'Get ready for the big Domino Poker tournament next week! Great prizes!'
        }
    };
    const cpuComments = {
        lv: {
            bidding: {
                high: ["Šoreiz spēlēšu nopietni!", "Man ir laba roka!", "Es būšu agresīvs.", "Lai sākas cīņa!"],
                low: ["Jābūt uzmanīgam...", "Hmm, ne pārāk daudz.", "Šoreiz piesardzīgi.", "Redzēs, kas sanāks."],
                zero: ["Nullīte būs.", "Nevienu nepaņemšu!", "Bloķēšu citus.", "Taktiskā nulle."]
            },
            playing: {
                leadStrong: ["Sāksim ar spēku!", "Šis noteikti paņems!", "Mans labākais gājiens.", "Uzbrūkam!"],
                leadWeak: ["Paskatīsimies...", "Varbūt kāds pārspēs.", "Sākšu maigi.", "Drošs gājiens."],
                followWin: ["Paņemšu šo!", "Mans stiķis!", "Neviens nepārspēs.", "Perfekti!"],
                followLose: ["Lai kāds cits ņem.", "Saglabāšu spēku.", "Pagaidām zaudēju.", "Nav vērts cīnīties."],
                mustWin: ["Man šis jāpaņem!", "Kritiski svarīgs!", "Nedrīkstu zaudēt!", "Jāvinnē!"],
                frustrated: ["Ak nē!", "Tas nebija plānā...", "Kāpēc tā?", "Nepatīkami!"]
            },
            trickEnd: {
                won: ["Jā! Paņēmu!", "Kā plānoju!", "Labi sanāca!", "Mans stiķis! 💪"],
                lost: ["Nu labi...", "Lai viņam paliek.", "Nākamreiz.", "Hmm..."],
                critical: ["Perfekti!", "Tieši ko vajadzēja!", "Super!", "Plāns strādā! 🎯"],
                bad: ["Ak nē!", "Tas nav labi!", "Problēmas...", "Vai tiešām? 😰"]
            }
        },
        en: {
            bidding: {
                high: ["I'll play seriously!", "Good hand here!", "Going aggressive.", "Let's fight!"],
                low: ["Need to be careful...", "Hmm, not too much.", "Playing safe.", "We'll see."],
                zero: ["Going for zero.", "Won't take any!", "Blocking others.", "Tactical nil."]
            },
            playing: {
                leadStrong: ["Starting strong!", "This will win!", "My best move.", "Attack!"],
                leadWeak: ["Let's see...", "Maybe someone beats it.", "Starting soft.", "Safe play."],
                followWin: ["Taking this!", "My round!", "No one beats this.", "Perfect!"],
                followLose: ["Let others take it.", "Saving strength.", "Losing for now.", "Not worth it."],
                mustWin: ["Must take this!", "Critical round!", "Can't lose!", "Need to win!"],
                frustrated: ["Oh no!", "Not as planned...", "Why?", "Not good!"]
            },
            trickEnd: {
                won: ["Yes! Got it!", "As planned!", "Nice one!", "My round! 💪"],
                lost: ["Oh well...", "Keep it.", "Next time.", "Hmm..."],
                critical: ["Perfect!", "Exactly what I needed!", "Great!", "Plan works! 🎯"],
                bad: ["Oh no!", "That's bad!", "Problems...", "Really? 😰"]
            }
        }
    };
	
    let currentLanguage = 'lv';
    function setLanguage(lang) {
        currentLanguage = lang;
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            const translation = translations[lang][key];
            if (translation) {
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0);
                 if (el.tagName === 'OPTION') {
                    el.textContent = translation;
                } else if (textNode) {
                    textNode.textContent = translation;
                } else if (el.querySelector('span')) {
                    el.querySelector('span').textContent = ' ' + translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
        if (!isPlayerAutoplaying) players[3].name = translations[lang].you;
        document.getElementById('lang-lv').classList.toggle('active', lang === 'lv');
        document.getElementById('lang-en').classList.toggle('active', lang === 'en');
        updateAutoplayButton(); 
        updateUI();
        
        // Update lobby language selector
        if (lobbyLangSelect) lobbyLangSelect.value = lang;
    }

    function getRandomComment(category, type) {
        const comments = cpuComments[currentLanguage][category][type];
        return comments[Math.floor(Math.random() * comments.length)];
    }

    function showCPUComment(playerIndex, comment, duration = 3000) {
        if (!players[playerIndex].isCPU) return;
        const playerArea = document.getElementById(`player-area-${playerIndex}`);
        let commentEl = playerArea.querySelector('.cpu-comment');
        if (!commentEl) {
            commentEl = document.createElement('div');
            commentEl.className = 'cpu-comment';
            playerArea.insertBefore(commentEl, playerArea.firstChild);
        }
        commentEl.textContent = comment;
        commentEl.style.opacity = '1';
        setTimeout(() => { commentEl.style.opacity = '0'; }, duration);
    }

    function showPlayerEmotion(playerIndex, emotion) {
        const playerName = document.getElementById(`player-name-${playerIndex}`);
        const existingEmoji = playerName.querySelector('.emotion-emoji');
        if (existingEmoji) existingEmoji.remove();

        const emoji = document.createElement('span');
        emoji.className = 'emotion-emoji';
        switch(emotion) {
            case 'happy': emoji.textContent = ' 😊'; break;
            case 'sad': emoji.textContent = ' 😔'; break;
            case 'angry': emoji.textContent = ' 😤'; break;
            case 'shocked': emoji.textContent = ' 😱'; break;
            case 'cool': emoji.textContent = ' 😎'; break;
            case 'thinking': emoji.textContent = ' 🤔'; break;
        }
        playerName.appendChild(emoji);
        setTimeout(() => {
            emoji.style.opacity = '0';
            setTimeout(() => emoji.remove(), 500);
        }, 4000);
    }

    // --- DOMINO & GAME LOGIC ---
    function getDominoType(domino) {
        if (!domino) return 'normal';
        if (trumps.includes(domino.id)) return 'trump';
        if (aces.includes(domino.id)) return 'ace';
        return 'normal';
    }
    
    function getDominoRank(domino, currentTrickSuit) {
        if (!domino) return 0;
        const type = getDominoType(domino);

        if (type === 'trump') {
            return 30 + trumps.length - trumps.indexOf(domino.id);
        }

        if (currentTrickSuit !== null && currentTrickSuit !== 'trump') {
            const hasSuit = domino.pips1 === currentTrickSuit || domino.pips2 === currentTrickSuit;
            if (hasSuit) {
                if (type === 'ace' && domino.pips1 === domino.pips2) {
                    return 20 + domino.pips1;
                }
                const otherPip = domino.pips1 === currentTrickSuit ? domino.pips2 : domino.pips1;
                return 10 + otherPip;
            } else {
                return 0;
            }
        }
        
        if (type === 'ace') {
            return 20 + aces.length - aces.indexOf(domino.id);
        }
        return Math.max(domino.pips1, domino.pips2);
    }

    function createPips(container, count) {
        container.innerHTML = '';
        const pipsLayout = { 1:['5'], 2:['1','9'], 3:['1','5','9'], 4:['1','3','7','9'], 5:['1','3','5','7','9'], 6:['1','3','4','6','7','9'] };
        if (pipsLayout[count]) {
            pipsLayout[count].forEach(pos => {
                const dot = document.createElement('div'); dot.className = 'dot';
                dot.style.gridArea = `${Math.ceil(parseInt(pos)/3)}/${((parseInt(pos)-1)%3)+1}`;
                container.appendChild(dot);
            });
        }
    }

    function createDominoElement(domino, isFaceDown = false, isSidePlayer = false) {
        const dominoEl = document.createElement('div');
        dominoEl.className = 'domino';
        if (isSidePlayer) dominoEl.classList.add('domino-side');
        if (domino) dominoEl.dataset.id = domino.originalId;

        if (isFaceDown) {
            dominoEl.classList.add('domino-back');
            return dominoEl;
        }

        const half1 = document.createElement('div'); half1.className = 'domino-half'; createPips(half1, domino.pips1);
        const divider = document.createElement('div'); divider.className = 'domino-divider';
        const half2 = document.createElement('div'); half2.className = 'domino-half'; createPips(half2, domino.pips2);

        dominoEl.append(half1, divider, half2);
        return dominoEl;
    }
    
    // --- UI UPDATES ---
    function updateUI() {
        players.forEach((player, index) => {
            const handEl = document.getElementById(`player-hand-${index}`),
                  bidEl = document.getElementById(`player-bid-${index}`),
                  tricksEl = document.getElementById(`player-tricks-${index}`),
                  playerAreaEl = document.getElementById(`player-area-${index}`);
            document.getElementById(`player-name-${index}`).textContent = player.name;
            
            playerAreaEl.classList.toggle('active-player', index === currentPlayerIndex && gameState !== 'setup' && gameState !== 'bidding');
            
            const isTurnStarter = index === trickStartIndex && (gameState === 'bidding' || (gameState === 'playing' && trick.length === 0));
            playerAreaEl.classList.toggle('turn-starter-indicator', isTurnStarter);

            const isSide = index === 0 || index === 2;
            handEl.innerHTML = '';
            const showHand = index === 3 || !player.isCPU;
            player.hand.sort((a,b) => getDominoRank(b, null) - getDominoRank(a, null)).forEach(d => {
                const dominoEl = createDominoElement(d, !showHand, isSide);
                handEl.appendChild(dominoEl);
            });
            bidEl.textContent = player.bid === null ? '?' : player.bid;
            tricksEl.textContent = player.tricksWon;
        });

        tableArea.querySelectorAll('.trick-domino-container, #bidding-controls').forEach(el => el.remove());
        
        if (gameState === 'bidding' && currentPlayerIndex === 3 && !isPlayerAutoplaying) {
            getPlayerBid(); 
        }

        trick.forEach((play) => {
            const container = document.createElement('div');
            container.className = 'trick-domino-container';
            
            const dominoEl = createDominoElement(play.domino);
            dominoEl.style.transform = 'scale(0.85)';
            container.appendChild(dominoEl);
            
            const ownerEl = document.createElement('div');
            ownerEl.className = 'trick-domino-owner';
            ownerEl.textContent = players[play.playerIndex].name;
            container.appendChild(ownerEl);
            
            tableArea.appendChild(container);
        });

        document.getElementById('round-number').textContent = currentRound > 0 ? currentRound : 1;
        document.getElementById('total-rounds').textContent = totalRounds;
        suitInfo.textContent = trickSuit !== null && trickSuit !== 'trump' ? `${translations[currentLanguage].suitLead(trickSuit)}` : (trickSuit === 'trump' ? translations[currentLanguage].trumpSuit : '');
        
        updatePlayerHandClickability();
        updateScoreboard();
        updateHistoryUI();
    }
    
    function updateScoreboard() {
        scoreboardBody.innerHTML = '';
        const sortedPlayers = [...players].sort((a,b) => b.score - a.score);
        sortedPlayers.forEach((player, idx) => {
            const playerRow = document.createElement('div');
            playerRow.className = `flex justify-between items-center p-2 rounded ${idx === 0 ? 'bg-yellow-600/30' : 'bg-slate-700/50'}`;
            playerRow.innerHTML = `<span class="font-bold">${idx + 1}. ${player.name}</span><span class="text-lg">${player.score}</span>`;
            scoreboardBody.appendChild(playerRow);
        });
    }

    // HISTORY PANEL REWORK
    function updateHistoryUI() {
        historyBody.innerHTML = '';
        if (!roundState.trickHistory || roundState.trickHistory.length === 0) {
            const noHistoryEl = document.createElement('p');
            noHistoryEl.textContent = translations[currentLanguage].noHistory;
            noHistoryEl.className = 'text-center text-slate-400 p-4';
            historyBody.appendChild(noHistoryEl);
            return;
        }

        // Paņemam tikai pēdējo gājienu no vēstures
        const lastTrickData = roundState.trickHistory[roundState.trickHistory.length - 1];
        const index = roundState.trickHistory.length - 1;

        const trickContainer = document.createElement('div');
        trickContainer.className = 'p-2 border-b border-slate-700 last:border-b-0';

        const trickHeader = document.createElement('h4');
        trickHeader.className = 'font-bold text-xs text-slate-300 mb-1 pl-1';
        trickHeader.textContent = `Stiķis ${index + 1}`;
        trickContainer.appendChild(trickHeader);

        const playsContainer = document.createElement('div');
        playsContainer.className = 'flex flex-row justify-center items-start gap-1'; 
        
        const winnerPlay = determineTrickWinner(lastTrickData.plays, lastTrickData.trickSuit);

        lastTrickData.plays.forEach(play => {
            const playContainer = document.createElement('div');
            playContainer.className = 'flex flex-col items-center text-center w-1/4';

            const dominoEl = createDominoElement(play.domino);
            dominoEl.style.transform = 'scale(0.4)';
            dominoEl.style.margin = '-12px 0';
            
            if (winnerPlay && play.playerIndex === winnerPlay.playerIndex) {
                dominoEl.classList.add('history-domino-winner');
            }

            const playerNameEl = document.createElement('span');
            playerNameEl.textContent = players[play.playerIndex].name;
            playerNameEl.className = 'text-slate-400 text-[10px] mt-2 truncate w-full';

            playContainer.appendChild(dominoEl);
            playContainer.appendChild(playerNameEl);
            playsContainer.appendChild(playContainer);
        });

        trickContainer.appendChild(playsContainer);
        historyBody.appendChild(trickContainer);
    }


    function updatePlayerHandClickability() {
        const isPlayerTurn = currentPlayerIndex === 3 && gameState === 'playing' && !isPlayerAutoplaying;
        const handElements = document.querySelectorAll('#player-hand-3 .domino');
        handElements.forEach(el => {
            const domino = players[3].hand.find(d => d.originalId === el.dataset.id);
            const isValid = isMoveValid(domino, players[3]);
            el.classList.toggle('disabled', !isPlayerTurn || !isValid);
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    function countRemainingTrumps() { return trumps.filter(t => !roundState.trumpsPlayed.includes(t)).length; }
    function countRemainingAces() { return aces.filter(a => !roundState.acesPlayed.includes(a)).length; }
    function getSuitCount(hand, suit) { return hand.filter(d => d.pips1 === suit || d.pips2 === suit).length; }

    function getPlayerSuitExhaustion(playerIndex, suit) {
        const plays = roundState.trickHistory || [];
        for (let trick of plays) {
            const playerPlay = trick.plays.find(p => p.playerIndex === playerIndex);
            if (playerPlay && trick.trickSuit === suit && playerPlay.domino.pips1 !== suit && playerPlay.domino.pips2 !== suit) {
                return true; 
            }
        }
        return false;
    }

    function analyzeOpponentsBids() {
        const totalBid = players.reduce((sum, p) => sum + (p.bid || 0), 0);
        return { totalBid, averageBid: totalBid / 4, isOverbid: totalBid > 7, isUnderbid: totalBid < 7 };
    }

    function evaluateHandStrength(hand) {
        let strength = 0;
        hand.forEach(d => {
            if (getDominoType(d) === 'trump') strength += (8 - trumps.indexOf(d.id)) * 3;
            else if (getDominoType(d) === 'ace') {
                const support = getSuitCount(hand, d.pips1) - 1;
                let aceValue = (6 - aces.indexOf(d.id)) * 2;
                if (support === 0) aceValue *= 0.3; else if (support === 1) aceValue *= 0.6; else if (support === 2) aceValue *= 0.85;
                strength += aceValue;
            }
        });
        for (let suit = 0; suit <= 6; suit++) {
            const count = getSuitCount(hand, suit);
            if (count >= 4) strength += (count - 3) * 2;
            if (count === 1) strength -= 1;
        }
        return strength;
    }

    function determineObjective(player) {
        const tricksNeeded = player.bid - player.tricksWon;
        const remainingTricks = 7 - trickNumber + 1;
        if (player.bid === 0) return 'AVOID_ALL';
        if (tricksNeeded <= 0) return 'AVOID';
        if (tricksNeeded >= remainingTricks) return 'MUST_WIN';
        if (tricksNeeded > remainingTricks * 0.7) return 'NEED_WIN';
        return 'FLEXIBLE';
    }

    function analyzeTrick() {
        const currentWinner = determineTrickWinner(trick, trickSuit);
        return {
            expectedWinner: currentWinner ? currentWinner.playerIndex : -1,
            highCards: trick.filter(t => getDominoRank(t.domino, trickSuit) > 15).length,
            trumpsPlayed: trick.filter(t => getDominoType(t.domino) === 'trump').length,
            remainingPlayers: 4 - trick.length
        };
    }

    function evaluateTrickValue(player, context) {
        const tricksNeeded = player.bid - player.tricksWon;
        const urgency = tricksNeeded / context.remainingTricks;
        if (urgency >= 1) return 1.0; if (urgency >= 0.8) return 0.8; if (urgency >= 0.6) return 0.6; return 0.4;
    }

    function recordTrickHistory() {
        roundState.trickHistory.push({
            trickNumber: trickNumber,
            trickSuit: trickSuit,
            plays: [...trick]
        });
    }

    // --- GAME FLOW ---
    async function runGame() {
        const cpuNames = {
            lv: { male: ["Jānis", "Pēteris", "Andris", "Māris", "Juris", "Aigars", "Edgars", "Kārlis", "Artūrs", "Rihards"], female: ["Anna", "Līga", "Ilze", "Kristīne", "Laura", "Inga", "Elīna", "Sanita", "Dace", "Zane"] },
            en: { male: ["John", "Peter", "Andrew", "Mark", "James", "Robert", "Michael", "David", "William", "Richard"], female: ["Mary", "Emma", "Sarah", "Lisa", "Jennifer", "Jessica", "Michelle", "Amanda", "Ashley", "Emily"] }
        };
        const allNames = [...cpuNames[currentLanguage].male, ...cpuNames[currentLanguage].female];
        shuffleArray(allNames);
        players.filter(p => p.isCPU).forEach((p, i) => p.name = allNames[i]);
    
        currentRound = 0;
        players.forEach(p => p.score = 0);
        isPlayerAutoplaying = false; 
        updateAutoplayButton();

        isGameActive = true; // Set game to active
        leaveGameBtn.classList.remove('hidden'); // Show leave game button
    
        while(currentRound < totalRounds && isGameActive) {
            currentRound++;
            roundOverModal.classList.add('hidden');
            await startRound();
        }

        if (!isGameActive) {
            // Game was abandoned, return to lobby
            showLobbySection('play-game');
            return;
        }

        showGameOver();
    }
    
    function startRound() {
        return new Promise(async roundResolve => {
            if (!isGameActive) { // If game was abandoned during round setup
                roundResolve();
                return;
            }

            resolveNextRound = roundResolve; 
            gameState = 'bidding';
            statusMessage.textContent = translations[currentLanguage].shuffling;
            trickNumber = 0; trick = []; trickSuit = null;
            roundState = { playedDominoes: [], trumpsPlayed: [], acesPlayed: [], trickHistory: [] };

            tableArea.innerHTML = '';
            suitInfo.textContent = '';
            players.forEach(p => { p.hand = []; p.bid = null; p.tricksWon = 0; });
            
            const shuffledDominoes = [...allDominoes];
            shuffleArray(shuffledDominoes);
            for(let i = 0; i < 28; i++) players[i % 4].hand.push(shuffledDominoes[i]);
            
            dealerIndex = (dealerIndex + 1) % 4;
            currentPlayerIndex = (dealerIndex + 1) % 4;
            trickStartIndex = currentPlayerIndex;
            updateUI();
            
            await sleep(1000);
            if (!isGameActive) { roundResolve(); return; } // Check again after sleep
            await startBidding();
            
            gameState = 'playing';
            while(trickNumber < 7 && isGameActive) {
                await playTrick();
            }
            if (!isGameActive) { roundResolve(); return; } // Check again after trick loop
            endRound();
        });
    }
    
    function leaveGame() {
        isGameActive = false;
        players[3].isCPU = true; // Make human player a CPU
        isPlayerAutoplaying = true; // Ensure CPU logic takes over
        
        // Hide game elements
        gameContainer.classList.add('hidden');
        roundsModal.classList.add('hidden');
        gameOverModal.classList.add('hidden');
        roundOverModal.classList.add('hidden');
        
        // Show lobby
        lobbyScreen.classList.remove('hidden');
        
        // Hide leave game button
        leaveGameBtn.classList.add('hidden');

        // Reset game state for next play if needed (or let it continue in background as CPU)
        // For simplicity, we just return to lobby here. The game loop will exit.
        if (resolveNextRound) { // Resolve any pending promises from game loop
            resolveNextRound();
            resolveNextRound = null;
        }

        // Update UI elements that might be affected
        updateAutoplayButton(); 
        updatePlayerHandClickability();
        setLanguage(currentLanguage); // Re-apply language to refresh player name (You -> You (CPU))
        showLobbySection('play-game'); // Default to play game section

        // Optionally, reset other game state variables if a clean restart is preferred
        // currentPlayerIndex = null; trick = []; trickSuit = null; etc.
    }
    
    async function startBidding() {
        for (let i = 0; i < 4; i++) {
            const player = players[currentPlayerIndex];
            statusMessage.textContent = translations[currentLanguage].bidding(player.name);
            document.querySelectorAll('.player-area').forEach(el => el.classList.remove('active-player'));
            document.getElementById(`player-area-${player.id}`).classList.add('active-player');
            
            const isAutoplaying = player.id === 3 && isPlayerAutoplaying;
            if (player.isCPU || isAutoplaying) {
                player.bid = getCPUBid(player);
				if (player.isCPU) {
                    let commentType = player.bid >= 4 ? 'high' : (player.bid === 0 ? 'zero' : 'low');
                    showCPUComment(player.id, getRandomComment('bidding', commentType));
                }
                await sleep(1200 / autoplaySpeed);
            } else {
                player.bid = await getPlayerBid();
            }
            
            tableArea.querySelector('#bidding-controls')?.remove();
            statusMessage.textContent = translations[currentLanguage].bidMade(player.name, player.bid);
            updateUI();
            await sleep(500 / autoplaySpeed);
            currentPlayerIndex = (currentPlayerIndex + 1) % 4;
        }
        document.querySelectorAll('.player-area').forEach(el => el.classList.remove('active-player'));
        currentPlayerIndex = trickStartIndex;
        statusMessage.textContent = translations[currentLanguage].gameStarts(players[currentPlayerIndex].name);
        updateUI();
        await sleep(1500 / autoplaySpeed);
    }

    function getPlayerBid() {
        return new Promise(resolve => {
            let biddingControls = document.getElementById('bidding-controls');
            if (!biddingControls) {
                biddingControls = document.createElement('div');
                biddingControls.id = 'bidding-controls';
                tableArea.appendChild(biddingControls);
            }
            
            statusMessage.textContent = translations[currentLanguage].bidPrompt;
            biddingControls.innerHTML = '';
            biddingControls.classList.remove('hidden');
            for(let i = 0; i <= 7; i++) {
                const btn = document.createElement('button');
                btn.className = 'btn m-1'; btn.textContent = i;
                btn.onclick = () => {
                    biddingControls.classList.add('hidden');
                    resolve(i);
                };
                biddingControls.appendChild(btn);
            }
        });
    }

    function playTrick() {
        return new Promise(async resolve => {
            trick = []; trickSuit = null;
            trickNumber++;
            trickStartIndex = currentPlayerIndex;
            updateUI();

            for (let i = 0; i < 4; i++) {
                const player = players[currentPlayerIndex];
                statusMessage.textContent = translations[currentLanguage].playerTurn(player.name);
                updateUI();
                
                let playedDomino;
                const isAutoplaying = player.id === 3 && isPlayerAutoplaying;

                if (player.isCPU || isAutoplaying) {
                    await sleep((isPlayerAutoplaying ? 800 : 1500) / autoplaySpeed);
                    const moveChoice = getCPUMove(player);
					if (player.isCPU) {
                        if (trick.length === 0) {
                            const isStrongLead = getDominoType(moveChoice.domino) !== 'normal';
                            showCPUComment(player.id, getRandomComment('playing', isStrongLead ? 'leadStrong' : 'leadWeak'));
                        } else if (determineObjective(player) === 'MUST_WIN') {
                            showCPUComment(player.id, getRandomComment('playing', 'mustWin'));
                        }
                    }
                    playedDomino = moveChoice.domino;
                    if (trick.length === 0) {
                        trickSuit = getDominoType(playedDomino) === 'trump' ? 'trump' : moveChoice.suitToLead;
                    }
                } else {
                     playedDomino = await getPlayerMove();
                     if (trick.length === 0) {
                        trickSuit = getDominoType(playedDomino) === 'trump' ? 'trump' : await chooseSuit(playedDomino);
                     }
                }
                
                player.hand = player.hand.filter(d => d.originalId !== playedDomino.originalId);
                trick.push({ domino: playedDomino, playerIndex: currentPlayerIndex });
                
                roundState.playedDominoes.push(playedDomino.id);
                if (getDominoType(playedDomino) === 'trump') roundState.trumpsPlayed.push(playedDomino.id);
                if (getDominoType(playedDomino) === 'ace') roundState.acesPlayed.push(playedDomino.id);

                currentPlayerIndex = (currentPlayerIndex + 1) % 4;
                updateUI();
                await sleep(500 / autoplaySpeed);
            }
            await sleep(1000 / autoplaySpeed);
            await endTrick();
            resolve();
        });
    }
    
    function chooseSuit(domino) {
        if (domino.pips1 === domino.pips2 && domino.id !== '0-6') {
             return Promise.resolve(domino.pips1);
        }
        return new Promise(resolve => {
            suitModal.classList.remove('hidden');
            const choices = document.getElementById('suit-choice-buttons');
            choices.innerHTML = '';
            const options = (domino.id === '0-6') ? [0, 6] : [domino.pips1, domino.pips2].filter(p => p !== 1 || getDominoType(domino) !== 'trump');
            options.forEach(pips => {
                const btn = document.createElement('button');
                btn.className = 'btn'; btn.textContent = pips;
                btn.onclick = () => { suitModal.classList.add('hidden'); resolve(pips); };
                choices.appendChild(btn);
            });
        });
    }

    function isMoveValid(domino, player) {
        if (!domino) return false;
        if (trick.length === 0) return true; // Can lead anything

        const isDominoTrump = getDominoType(domino) === 'trump';
        const isDominoOnSuit = domino.pips1 === trickSuit || domino.pips2 === trickSuit;

        // Ja prasīts trumpis
        if (trickSuit === 'trump') {
            const playerHasTrump = player.hand.some(d => getDominoType(d) === 'trump');
            return !playerHasTrump || isDominoTrump;
        }
    
        // Pārbauda vai spēlētājam ir prasītais skaitlis (NEIEKĻAUJOT trumpjus)
        const playerHasSuit = player.hand.some(d => 
            (d.pips1 === trickSuit || d.pips2 === trickSuit) && getDominoType(d) !== 'trump'
        );
    
        if (playerHasSuit) {
            // Ja ir prasītais skaitlis, var likt TIKAI parasto kauliņu ar šo skaitli (NE trumpi)
            return isDominoOnSuit && !isDominoTrump;
        }
    
        // Ja NAV prasītā skaitļa, bet IR trumpis - OBLIGĀTI jāliek trumpis
        const playerHasTrump = player.hand.some(d => getDominoType(d) === 'trump');
        if (playerHasTrump) {
            return isDominoTrump;
        }
    
        // Ja nav ne prasītā, ne trumpja - var likt jebko
        return true;
    }
    
    function getPlayerMove() {
        return new Promise(resolve => {
            const handler = (event) => {
                const dominoEl = event.target.closest('.domino:not(.disabled)');
                if (!dominoEl) return;
                const domino = players[3].hand.find(d => d.originalId === dominoEl.dataset.id);
                if (domino && isMoveValid(domino, players[3])) {
                    document.getElementById('player-hand-3').removeEventListener('click', handler);
                    resolve(domino);
                } else {
                    statusMessage.textContent = translations[currentLanguage].mustFollow;
                    setTimeout(() => { statusMessage.textContent = translations[currentLanguage].playerTurn(players[3].name); }, 2500);
                }
            };
            document.getElementById('player-hand-3').addEventListener('click', handler);
        });
    }

    // HISTORY PANEL UPDATE: Function signature changed
    function determineTrickWinner(currentTrick, suitForTrick) {
        if (!currentTrick || currentTrick.length === 0) return null;
        let highestRank = -1;
        let winnerPlay = null;
        for (const play of currentTrick) {
            const rank = getDominoRank(play.domino, suitForTrick);
            if (rank > highestRank) {
                highestRank = rank;
                winnerPlay = play;
            }
        }
        return winnerPlay;
    }
    
    function endTrick() {
        return new Promise(async resolve => {
            recordTrickHistory(); // Record before determining winner for history UI
            const winnerPlay = determineTrickWinner(trick, trickSuit);
			
            if (winnerPlay) {
                const winner = players[winnerPlay.playerIndex];
                winner.tricksWon++;
                const objective = determineObjective(winner);
                if (objective === 'MUST_WIN' || objective === 'NEED_WIN') {
                    showPlayerEmotion(winner.id, 'happy');
                    if (winner.isCPU) showCPUComment(winner.id, getRandomComment('trickEnd', 'critical'));
                } else if (objective === 'AVOID' || objective === 'AVOID_ALL') {
                    showPlayerEmotion(winner.id, 'shocked');
                    if (winner.isCPU) showCPUComment(winner.id, getRandomComment('trickEnd', 'bad'));
                } else {
                    showPlayerEmotion(winner.id, 'cool');
                    if (winner.isCPU) showCPUComment(winner.id, getRandomComment('trickEnd', 'won'));
                }
    
                trick.forEach(play => {
                    if (play.playerIndex !== winnerPlay.playerIndex) {
                        const loser = players[play.playerIndex];
                        const loserObjective = determineObjective(loser);
                        if (loserObjective === 'MUST_WIN') showPlayerEmotion(loser.id, 'angry');
                        else if (loserObjective === 'AVOID_ALL') showPlayerEmotion(loser.id, 'happy');
                        else showPlayerEmotion(loser.id, 'thinking');
                    }
                });
                currentPlayerIndex = winner.id;
                statusMessage.textContent = translations[currentLanguage].trickWon(winner.name);
                
                const winningDominoContainer = Array.from(tableArea.querySelectorAll('.trick-domino-container')).find(container => 
                    container.querySelector('.domino').dataset.id === winnerPlay.domino.originalId
                );
                if (winningDominoContainer) winningDominoContainer.classList.add('winning-domino');
                
            } else {
                currentPlayerIndex = trickStartIndex; 
            }
            
            updateUI(); // Update UI to show history immediately
            await sleep(2500 / autoplaySpeed);
            resolve();
        });
    }

    function endRound() {
        gameState = 'roundover';
        statusMessage.textContent = translations[currentLanguage].roundOver;
        const roundResultsBody = document.getElementById('round-results-body');
        roundResultsBody.innerHTML = ''; 

        let playerWon = false;
        players.forEach(p => {
            let roundPoints = 0;
            let calculationText = '';

            if (p.bid === p.tricksWon) {
                roundPoints = p.bid * 15;
                if (p.bid === 7) { roundPoints += 30; calculationText = `(7 x 15) + 30 bonuss = ${roundPoints}`; } 
                else { calculationText = `${p.bid} x 15 = ${roundPoints}`; }
            } else {
                if (p.bid === 7) { roundPoints = -30; calculationText = `Neizpildīts 7 stiķu solījums = -30`; } 
                else if (p.tricksWon < p.bid) { roundPoints = -5 * (p.bid - p.tricksWon); calculationText = `-5 x ${p.bid - p.tricksWon} nepaņemti = ${roundPoints}`; } 
                else { roundPoints = p.tricksWon * 5; calculationText = `${p.tricksWon} x 5 = ${roundPoints}`; }
            }
            p.score += roundPoints;
            if (p.id === 3 && roundPoints > 0) playerWon = true;

            const pointsClass = roundPoints >= 15 ? 'text-green-400' : (roundPoints > 0 ? 'text-yellow-400' : 'text-red-400');
            const resultRow = document.createElement('div');
            resultRow.className = 'result-row';
            resultRow.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="player-name">${p.name}</span>
                    <span class="points-calculation ${pointsClass}">${roundPoints >= 0 ? '+' : ''}${roundPoints} ${translations[currentLanguage].pointsSuffix}</span>
                </div>
                <div class="bid-info">${translations[currentLanguage].roundResultText(p.bid, p.tricksWon)}</div>
                <div class="bid-info text-xs italic opacity-80">${calculationText}</div>`;
            roundResultsBody.appendChild(resultRow);
        });
        
        updateScoreboard(); 
        roundOverModal.classList.remove('hidden'); 
    }

    function showGameOver() {
        gameState = 'gameover';
        const sortedPlayers = [...players].sort((a,b) => b.score - a.score);
        const winner = sortedPlayers[0];
        
        if (winner.id === 3) gameStats.wins++;
        gameStats.gamesPlayed++;
        gameStats.totalScore += players[3].score;
        saveStats();

        document.getElementById('game-over-winner').textContent = translations[currentLanguage].winnerIs(winner.name, winner.score);
        const finalScoresEl = document.getElementById('final-scores');
        finalScoresEl.innerHTML = `<h4 class="text-lg font-bold mb-2">${translations[currentLanguage].finalScoresTitle}</h4>`;
        sortedPlayers.forEach(p => finalScoresEl.innerHTML += `<p class="flex justify-between"><span>${p.name}:</span> <span>${p.score} ${translations[currentLanguage].pointsSuffix}</span></p>`);
        
        document.getElementById('winner-animation-container').innerHTML = '<div class="winner-cup">🏆</div>';
        gameOverModal.classList.remove('hidden');
        roundsModal.classList.add('hidden'); // Ensure rounds modal is hidden when game over is displayed
        leaveGameBtn.classList.add('hidden'); // Hide leave game button after game over
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    
    function saveStats() { localStorage.setItem('dominoPokerStats', JSON.stringify(gameStats)); }
    function loadStats() {
        const savedStats = localStorage.getItem('dominoPokerStats');
        if (savedStats) gameStats = JSON.parse(savedStats);
    }
    function showStats() {
        const contentEl = document.getElementById('stats-modal-content');
        document.getElementById('stats-modal-title').textContent = translations[currentLanguage].statsTitle;
        contentEl.innerHTML = `
            <p>${translations[currentLanguage].gamesPlayed}: <span class="stat-value">${gameStats.gamesPlayed}</span></p>
            <p>${translations[currentLanguage].wins}: <span class="stat-value">${gameStats.wins}</span></p>
            <p>${translations[currentLanguage].totalScore}: <span class="stat-value">${gameStats.totalScore}</span></p>`;
        statsModal.classList.remove('hidden');
    }

    function updateAutoplayButton() {
        autoplayBtn.classList.toggle('btn-toggle-on', isPlayerAutoplaying);
        autoplayBtn.textContent = isPlayerAutoplaying ? translations[currentLanguage].disableAutoplay : translations[currentLanguage].enableAutoplay;
    }
    function toggleAutoplay() {
        isPlayerAutoplaying = !isPlayerAutoplaying;
        players[3].name = isPlayerAutoplaying ? `${translations[currentLanguage].you} (CPU)` : translations[currentLanguage].you;
        updateAutoplayButton();
        updatePlayerHandClickability();
    }
    function setAutoplaySpeed(speed) {
        autoplaySpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`speed-${speed}x`).classList.add('active');
    }
    document.getElementById('start-game-btn').addEventListener('click', () => {
        document.getElementById('rounds-modal').classList.add('hidden');
        totalRounds = parseInt(document.getElementById('rounds-input').value) || 5;
        // cpuDifficulty vairs nav jālasa no select — mēs to fiksējam kā 'hard'

        // Attach autoplay and speed controls when game starts
        document.getElementById('speed-1x').addEventListener('click', () => setAutoplaySpeed(1));
        document.getElementById('speed-2x').addEventListener('click', () => setAutoplaySpeed(2));
        document.getElementById('speed-3x').addEventListener('click', () => setAutoplaySpeed(3));
        autoplayBtn.addEventListener('click', toggleAutoplay);
        
        runGame();
    });
    document.getElementById('play-again-btn').addEventListener('click', () => {
        // Hide only gameOver modal, show rounds-modal (jauna spēle kā sākumā)
        gameOverModal.classList.add('hidden');
        suitModal.classList.add('hidden');
        roundOverModal.classList.add('hidden');
        roundsModal.classList.remove('hidden');
        // Netīram stāvokli un neatgriežam uz Lobby!
    });

    // Jaunā "Iziet" poga
    document.getElementById('exit-to-lobby-btn').addEventListener('click', () => {
        // Tieši šis bija iepriekšējās "play-again" funkcionalitāte:
        gameOverModal.classList.add('hidden');
        roundsModal.classList.add('hidden'); // Drošībai
        suitModal.classList.add('hidden');
        roundOverModal.classList.add('hidden');
        lobbyScreen.classList.remove('hidden'); // Atgriež uz lobby
        gameContainer.classList.add('hidden');
        leaveGameBtn.classList.add('hidden');
        // Reset stāvoklis nākotnes spēlēm
        currentRound = 0;
        players.forEach(p => { p.hand = []; p.bid = null; p.tricksWon = 0; p.score = 0; });
        players[3].isCPU = false;
        isPlayerAutoplaying = false;
        gameState = 'setup';
        isGameActive = false;
        updateUI();
        updateAutoplayButton();
        setLanguage(currentLanguage);
        showLobbySection('play-game');
    });
    document.getElementById('next-round-btn').addEventListener('click', () => {
        roundOverModal.classList.add('hidden');
        if (resolveNextRound) resolveNextRound();
    });
    document.getElementById('lang-lv').addEventListener('click', () => setLanguage('lv'));
    document.getElementById('lang-en').addEventListener('click', () => setLanguage('en'));
    
    // Language buttons in popup modal
    document.getElementById('popup-lang-lv').addEventListener('click', () => {
        setLanguage('lv');
        document.getElementById('popup-lang-lv').classList.add('active');
        document.getElementById('popup-lang-en').classList.remove('active');
    });
    document.getElementById('popup-lang-en').addEventListener('click', () => {
        setLanguage('en');
        document.getElementById('popup-lang-en').classList.add('active');
        document.getElementById('popup-lang-lv').classList.remove('active');
    });
    helpBtn.addEventListener('click', () => {
        const rulesData = rules[currentLanguage];
        document.getElementById('rules-modal-title').textContent = rulesData.title;
        document.getElementById('rules-modal-content').innerHTML = rulesData.content;
        rulesModal.classList.remove('hidden');
    });
    document.getElementById('rules-modal-close-btn').addEventListener('click', () => rulesModal.classList.add('hidden'));
    statsBtn.addEventListener('click', showStats);
    document.getElementById('stats-modal-close-btn').addEventListener('click', () => statsModal.classList.add('hidden'));

    // Attach leave game button listener
    leaveGameBtn.addEventListener('click', leaveGame);

    loadStats();
    
    // Initial setup when the script loads
    showLobbySection('play-game'); // Default to play game section

    // =========================
    // FONA ATTĒLA MAIŅA LOBBY/SPĒLE
    function updateBodyBackground() {
      if (!lobbyScreen.classList.contains('hidden')) {
        document.body.classList.add('lobby-bg');
        document.body.classList.remove('playroom-bg');
        document.body.style.background = "url('images/lobby-background.webp') center center / cover no-repeat";
      } else if (!gameContainer.classList.contains('hidden')) {
        document.body.classList.add('playroom-bg');
        document.body.classList.remove('lobby-bg');
        document.body.style.background = "url('images/play-room-background.jpg') center center / cover no-repeat";
      }
    }
    // Katru reizi kad pārslēdzam view…
    const origShowLobbySection = showLobbySection;
    window.showLobbySection = function() {
      origShowLobbySection.apply(this, arguments);
      updateBodyBackground();
    };
    // Uz quick play pogas:
    startQuickGameBtn.addEventListener('click', () => {
      setTimeout(updateBodyBackground,100);
    });
    // Uz gameContainer/lobbyScreen maiņu:
    const observer = new MutationObserver(updateBodyBackground);
    observer.observe(lobbyScreen, { attributes: true, attributeFilter: ['class'] });
    observer.observe(gameContainer, { attributes: true, attributeFilter: ['class'] });
    // Pirmreiz arī uzreiz
    updateBodyBackground();
    // =========================
    // Ensure game info is hidden when lobby is active
    document.getElementById('game-info').classList.add('hidden');

    // Initial state: show lobby, hide game
    lobbyScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden');

    // Hide leave game button initially
    leaveGameBtn.classList.add('hidden');

    // Lobby Navigation
    function showLobbySection(sectionId) {
        lobbyContentSections.forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
        });
        lobbyNavBtns.forEach(btn => btn.classList.remove('active'));

        // Tikai, ja elements vispār eksistē (ir palikusi tikai viena sadaļa)
        if(document.getElementById(sectionId)) {
            document.getElementById(sectionId).classList.remove('hidden');
            document.getElementById(sectionId).classList.add('active');
        }
        // Tāpat drošībai arī uz pogas pārbaudām
        const navBtn = document.querySelector(`.lobby-nav-btn[data-target="${sectionId}"]`);
        if(navBtn) navBtn.classList.add('active');
        
        // Ensure rounds modal is hidden when returning to lobby sections
        roundsModal.classList.add('hidden');
    }

    lobbyNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showLobbySection(btn.dataset.target);
        });
    });

    // Function to open the rounds modal (difficulty/rounds selection)
    function openRoundsModal() {
        roundsModal.classList.remove('hidden');
    }

    // Quick Play Button
    startQuickGameBtn.addEventListener('click', () => {
        lobbyScreen.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        document.getElementById('game-info').classList.remove('hidden'); // Ensure game info is visible
        openRoundsModal(); // Call the dedicated function to show the rounds modal
    });

    // Šeit profilam vairs nav attiecīgo funkciju - viss šis nav vajadzīgs!

    // Iestatījumu pārvaldība vairs nav vajadzīga - visu šo ķēdi dzēšam!


    // --- CPU STRATEGY ---
    function getCPUBid(player) {
        const handStrength = evaluateHandStrength(player.hand);
        let estimatedTricks = 0;
        const myTrumps = player.hand.filter(d => getDominoType(d) === 'trump');
        myTrumps.forEach(t => { estimatedTricks += 0.45 + (0.5 * (trumps.length - trumps.indexOf(t.id)) / trumps.length); });
        player.hand.filter(d => getDominoType(d) === 'ace').forEach(ace => {
            const support = getSuitCount(player.hand, ace.pips1) - 1;
            let prob = 0.2 + (0.3 * (aces.length - aces.indexOf(ace.id)) / aces.length);
            if (support === 0) prob += 0.5; else if (support === 1) prob += 0.3; else if (support === 2) prob += 0.1;
            if (myTrumps.length === 0) prob -= 0.2; else if (myTrumps.length >= 3) prob += 0.1;
            estimatedTricks += Math.min(0.95, prob);
        });
        
        let bid = Math.round(estimatedTricks);
        // Vienmēr tikai "hard" loģika:
        if (handStrength > 25 && bid < 3) bid = 3;
        if (myTrumps.length >= 4 && bid < 4) bid = Math.min(4, bid + 1);
        if (bid === 1 && handStrength < 15 && Math.random() < 0.4) bid = 0;
        return Math.max(0, Math.min(7, bid));
    }
    
	function getCPUMove(player) {
        const validMoves = player.hand.filter(d => isMoveValid(d, player));
        if (validMoves.length === 0) return { domino: player.hand[0], suitToLead: player.hand[0].pips1 }; // Fallback
        if (validMoves.length === 1) return { domino: validMoves[0], suitToLead: getDominoType(validMoves[0]) === 'trump' ? 'trump' : validMoves[0].pips1 };
    
        const objective = determineObjective(player);
        const gameContext = {
            trickNumber, remainingTricks: 7 - trickNumber, myTricksNeeded: player.bid - player.tricksWon,
            opponents: players.filter(p => p.id !== player.id), remainingTrumps: countRemainingTrumps(),
            bidAnalysis: analyzeOpponentsBids()
        };
    
        return trick.length === 0 ? makeLeadDecision(player, validMoves, objective, gameContext) : makeFollowDecision(player, validMoves, objective, gameContext);
    }
	
	function makeLeadDecision(player, validMoves, objective, context) {
        let bestMove = null, bestSuit = -1;
        const myTrumps = validMoves.filter(d => getDominoType(d) === 'trump').sort((a,b)=>trumps.indexOf(a.id)-trumps.indexOf(b.id));
        const myAces = validMoves.filter(d => getDominoType(d) === 'ace').sort((a,b)=>aces.indexOf(a.id)-aces.indexOf(b.id));
        const normal = validMoves.filter(d => getDominoType(d) === 'normal');

        if (context.trickNumber === 1 && myAces.length > 0) return { domino: myAces[0], suitToLead: myAces[0].pips1 };
    
        if (objective === 'MUST_WIN' || objective === 'NEED_WIN') {
            if (myTrumps.length > 0 && context.remainingTrumps <= 3) bestMove = myTrumps[0];
            else if (myAces.length > 0) bestMove = myAces[0];
            else if (normal.length > 0) bestMove = selectLongSuitLead(player, normal);
        } else if (objective === 'AVOID_ALL' || objective === 'AVOID') {
            if (normal.length > 0) bestMove = selectShortSuitLead(player, normal);
            else if (myAces.length > 0) bestMove = myAces[myAces.length - 1]; // Weakest ace
            else bestMove = myTrumps[myTrumps.length - 1]; // Weakest trump
        }
        
        if (!bestMove) {
             bestMove = makeStrategicLead(player, validMoves, context);
        }
        
        if (getDominoType(bestMove) !== 'trump') {
            bestSuit = (bestMove.pips1 === bestMove.pips2) ? bestMove.pips1 : (getSuitCount(player.hand, bestMove.pips1) >= getSuitCount(player.hand, bestMove.pips2) ? bestMove.pips1 : bestMove.pips2);
        }
        return { domino: bestMove, suitToLead: bestSuit };
    }

    function makeFollowDecision(player, validMoves, objective, context) {
        const canWin = validMoves.some(m => determineTrickWinner([...trick, { domino: m, playerIndex: player.id }], trickSuit).playerIndex === player.id);
        const trickAnalysis = analyzeTrick();
    
        if (objective === 'MUST_WIN' || objective === 'NEED_WIN') {
            return { domino: canWin ? selectWinningMove(player, validMoves, 'minimal') : selectDiscardMove(player, validMoves, 'save_winners') };
        } else if (objective === 'AVOID_ALL' || objective === 'AVOID') {
            return { domino: !canWin ? selectDiscardMove(player, validMoves, 'dump_winners') : selectWinningMove(player, validMoves, 'minimal') };
        } else { // Flexible
            return makeStrategicFollow(player, validMoves, context, trickAnalysis);
        }
    }

    function selectLongSuitLead(player, doms) { /* ... */ return doms.sort((a,b) => getSuitCount(player.hand, a.pips1) - getSuitCount(player.hand, b.pips1))[0] || doms[0]; }
    function selectShortSuitLead(player, doms) { /* ... */ return doms.sort((a,b) => (a.pips1 + a.pips2 + getSuitCount(player.hand, a.pips1)*5) - (b.pips1 + b.pips2 + getSuitCount(player.hand, b.pips1)*5))[0] || doms[0]; }
    
    function selectWinningMove(player, moves, strategy) {
        const sorted = moves.filter(m => determineTrickWinner([...trick, { domino: m, playerIndex: player.id }], trickSuit).playerIndex === player.id)
                            .sort((a, b) => getDominoRank(a, trickSuit) - getDominoRank(b, trickSuit));
        if (sorted.length === 0) return selectDiscardMove(player, moves, 'balanced'); // Fallback
        if (strategy === 'minimal') return sorted[0];
        if (strategy === 'maximal') return sorted[sorted.length - 1];
        return sorted[Math.floor(sorted.length / 2)];
    }

    function selectDiscardMove(player, moves, strategy) {
        const nonWinning = moves.filter(m => determineTrickWinner([...trick, { domino: m, playerIndex: player.id }], trickSuit).playerIndex !== player.id);
        const list = nonWinning.length > 0 ? nonWinning : moves;
        const getVal = d => (getDominoType(d) === 'trump' ? 100 : (getDominoType(d) === 'ace' ? 50 : 0)) + d.pips1 + d.pips2;
        if (strategy === 'save_winners') return list.sort((a, b) => getVal(a) - getVal(b))[0];
        if (strategy === 'dump_winners') return list.sort((a, b) => getVal(b) - getVal(a))[0];
        return list[Math.floor(list.length/2)];
    }

    function makeStrategicLead(player, validMoves, context) {
        const dangerousOpponent = context.opponents.find(opp => opp.bid - opp.tricksWon >= context.remainingTricks - 1);
        if (dangerousOpponent) {
            for (let suit = 6; suit >= 0; suit--) {
                if (getPlayerSuitExhaustion(dangerousOpponent.id, suit)) {
                    const move = validMoves.find(d => getDominoType(d) === 'normal' && (d.pips1 === suit || d.pips2 === suit));
                    if (move) return move;
                }
            }
        }
        return validMoves[Math.floor(validMoves.length / 2)];
    }

    function makeStrategicFollow(player, validMoves, context, trickAnalysis) {
        const canWin = validMoves.some(m => determineTrickWinner([...trick, { domino: m, playerIndex: player.id }], trickSuit).playerIndex === player.id);
        const desperateOpponentWinning = context.opponents.find(opp => opp.id === trickAnalysis.expectedWinner && opp.bid - opp.tricksWon === context.remainingTricks);
        if (desperateOpponentWinning && canWin) return { domino: selectWinningMove(player, validMoves, 'minimal') };
        if (canWin && player.tricksWon < player.bid) return { domino: selectWinningMove(player, validMoves, 'minimal') };
        return { domino: selectDiscardMove(player, validMoves, 'balanced') };
    }
});