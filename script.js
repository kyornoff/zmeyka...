document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('home');
    
    // Инициализация Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyD5mY4XJzQ3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q",
        authDomain: "zmeyka-leaderboard.firebaseapp.com",
        databaseURL: "https://zmeyka-leaderboard-default-rtdb.firebaseio.com",
        projectId: "zmeyka-leaderboard",
        storageBucket: "zmeyka-leaderboard.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:3e3e3e3e3e3e3e3e3e3e3e"
    };
    
    // Инициализируем Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    // Матричный фон
    const matrixCanvas = document.getElementById('matrix-canvas');
    const matrixCtx = matrixCanvas.getContext('2d');
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    
    const matrixChars = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";
    const fontSize = 14;
    const columns = Math.floor(matrixCanvas.width / fontSize);
    const drops = [];
    
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
    }
    
    function drawMatrix() {
        matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        
        matrixCtx.fillStyle = '#0F0';
        matrixCtx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            const x = i * fontSize;
            const y = drops[i] * fontSize;
            
            matrixCtx.fillText(text, x, y);
            
            if (y > matrixCanvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            drops[i]++;
        }
    }
    
    setInterval(drawMatrix, 50);
    
    window.addEventListener('resize', function() {
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        const newColumns = Math.floor(matrixCanvas.width / fontSize);
        
        if (newColumns > drops.length) {
            for (let i = drops.length; i < newColumns; i++) {
                drops[i] = Math.random() * -100;
            }
        } else {
            drops.length = newColumns;
        }
    });

    // Класс игры "Змейка"
    class SnakeGame {
        constructor() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.gameScreenContainer = document.querySelector('.game-screen-container');
            this.gameScreens = document.querySelectorAll('.game-screen');
            this.gameOverScreen = document.getElementById('game-over-screen');
            this.addToLeaderboard = document.getElementById('add-to-leaderboard');
            this.scoreElement = document.getElementById('score');
            this.finalScoreElement = document.getElementById('final-score');
            this.levelElement = document.getElementById('level');
            this.playerNameInput = document.getElementById('player-name');
            
            this.cellSize = 20;
            this.width = 30;
            this.height = 20;
            this.canvas.width = this.width * this.cellSize;
            this.canvas.height = this.height * this.cellSize;
            
            this.snake = [];
            this.direction = 'right';
            this.nextDirection = 'right';
            this.food = {};
            this.score = 0;
            this.gameSpeed = 150;
            this.difficulty = 'easy';
            this.snakeSkin = '◼';
            this.appleSkin = '◻';
            this.gameLoop = null;
            this.backgroundPattern = [];
            this.isPaused = false;
            this.nightmareActive = false;
            this.nightmareEffectActive = false;
            
            this.initEventListeners();
            this.initMenuEventListeners();
            this.initFirebase();
            this.startLeaderboardResetTimer();
        }
        
        initFirebase() {
            this.leaderboardRef = firebase.database().ref('leaderboard');
            this.resetTimerRef = firebase.database().ref('resetTimer');
        }
        
        startLeaderboardResetTimer() {
            // Проверяем, нужно ли сбросить лидерборд
            this.resetTimerRef.on('value', (snapshot) => {
                const resetTime = snapshot.val();
                if (resetTime && resetTime.nextReset) {
                    const now = Date.now();
                    const nextReset = new Date(resetTime.nextReset).getTime();
                    
                    if (now >= nextReset) {
                        this.resetLeaderboard();
                    } else {
                        // Устанавливаем таймер до следующего сброса
                        const timeLeft = nextReset - now;
                        setTimeout(() => this.resetLeaderboard(), timeLeft);
                    }
                } else {
                    // Если время сброса не установлено, устанавливаем его
                    this.setNextResetTime();
                }
            });
        }
        
        setNextResetTime() {
            const now = new Date();
            const nextReset = new Date(now.getTime() + 3600000); // 1 час = 3600000 мс
            
            this.resetTimerRef.set({
                nextReset: nextReset.toISOString()
            });
        }
        
        resetLeaderboard() {
            this.leaderboardRef.remove()
                .then(() => {
                    console.log('Leaderboard reset');
                    this.setNextResetTime();
                    
                    // Показываем уведомление о сбросе
                    const resetMsg = document.createElement('div');
                    resetMsg.className = 'skin-message';
                    resetMsg.textContent = 'Лидерборд был автоматически сброшен';
                    document.body.appendChild(resetMsg);
                    setTimeout(() => resetMsg.remove(), 2000);
                })
                .catch(error => {
                    console.error('Error resetting leaderboard:', error);
                });
        }
        
        showScreen(screenId) {
            this.gameScreens.forEach(screen => {
                screen.classList.remove('active');
                if (screen.id === screenId) {
                    screen.classList.add('active');
                }
            });
        }
        
        initMenuEventListeners() {
            document.getElementById('play-btn').addEventListener('click', () => {
                this.showScreen('game-difficulty-menu');
            });
            
            document.getElementById('skins-btn').addEventListener('click', () => {
                this.showScreen('game-skins-menu');
            });
            
            document.querySelectorAll('.back-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.showScreen('game-main-menu');
                });
            });
            
            document.querySelectorAll('.skin-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const skin = btn.dataset.skin;
                    
                    if (type === 'snake') {
                        this.snakeSkin = skin;
                    } else if (type === 'apple') {
                        this.appleSkin = skin;
                    }
                    
                    this.showSkinMessage(`Скин ${type === 'snake' ? 'змейки' : 'яблока'} изменен!`);
                });
            });
            
            document.querySelectorAll('.game-btn[data-difficulty]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.difficulty = btn.dataset.difficulty;
                    this.setDifficulty(this.difficulty);
                    this.startGame();
                });
            });
        }
        
        showSkinMessage(message) {
            const msgElement = document.createElement('div');
            msgElement.className = 'skin-message';
            msgElement.textContent = message;
            document.body.appendChild(msgElement);
            
            setTimeout(() => {
                msgElement.remove();
            }, 1000);
        }
        
        initEventListeners() {
            document.addEventListener('keydown', (e) => this.handleKeyPress(e));
            
            document.getElementById('play-again').addEventListener('click', () => {
                this.startGame();
            });
            
            document.getElementById('back-to-menu').addEventListener('click', () => {
                this.showScreen('game-main-menu');
            });
            
            document.getElementById('submit-score').addEventListener('click', () => {
                this.addScoreToLeaderboard();
                this.showScreen('game-main-menu');
                document.querySelector('a[href="#records"]').click();
            });
        }
        
        setDifficulty(difficulty) {
            switch(difficulty) {
                case 'easy':
                    this.gameSpeed = 150;
                    break;
                case 'normal':
                    this.gameSpeed = 100;
                    break;
                case 'hard':
                    this.gameSpeed = 50;
                    break;
                case 'nightmare':
                    this.gameSpeed = 35;
                    break;
            }
            this.levelElement.textContent = difficulty;
        }
        
        startGame() {
            this.snake = [
                {x: 10, y: 10},
                {x: 9, y: 10},
                {x: 8, y: 10}
            ];
            this.direction = 'right';
            this.nextDirection = 'right';
            this.score = 0;
            this.scoreElement.textContent = this.score;
            this.backgroundPattern = [];
            this.nightmareActive = false;
            this.nightmareEffectActive = false;
            
            if (this.nightmareOverlay) {
                this.nightmareOverlay.remove();
                this.nightmareOverlay = null;
            }
            
            this.setDifficulty(this.difficulty);
            this.generateFood();
            this.showScreen('game-area');
            this.gameOverScreen.classList.add('hidden');
            
            if (this.gameLoop) clearInterval(this.gameLoop);
            this.gameLoop = setInterval(() => this.update(), this.gameSpeed);
        }
        
        generateFood() {
            let food;
            do {
                food = {
                    x: Math.floor(Math.random() * this.width),
                    y: Math.floor(Math.random() * this.height)
                };
            } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));
            
            this.food = food;
        }
        
        generateBackgroundPattern() {
            this.backgroundPattern = [];
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    if (!this.snake.some(s => s.x === x && s.y === y) && 
                        !(this.food.x === x && this.food.y === y)) {
                        this.backgroundPattern.push({x, y});
                    }
                }
            }
        }
        
        showNightmareEffect() {
            if (!this.nightmareOverlay) {
                this.nightmareOverlay = document.createElement('div');
                this.nightmareOverlay.className = 'nightmare-overlay';
                this.nightmareOverlay.innerHTML = '<div class="nightmare-text">NIGHTMARE...</div>';
                document.getElementById('game-area').appendChild(this.nightmareOverlay);
            }
            
            this.isPaused = true;
            this.nightmareEffectActive = true;
            this.nightmareOverlay.classList.remove('hidden');
            
            setTimeout(() => {
                this.nightmareOverlay.classList.add('hidden');
                setTimeout(() => {
                    this.isPaused = false;
                    this.nightmareEffectActive = false;
                    if (this.difficulty === 'nightmare') {
                        this.gameSpeed = 30;
                        clearInterval(this.gameLoop);
                        this.gameLoop = setInterval(() => this.update(), this.gameSpeed);
                        this.generateBackgroundPattern();
                    }
                }, 1000);
            }, 2000);
        }
        
        update() {
            if (this.isPaused) return;
            
            // Сбрасываем эффект после 6 очков
            if (this.difficulty === 'nightmare' && this.score >= 6 && this.nightmareActive) {
                this.nightmareActive = false;
                this.backgroundPattern = [];
                this.setDifficulty('nightmare');
            }
            
            this.direction = this.nextDirection;
            
            const head = {...this.snake[0]};
            
            switch(this.direction) {
                case 'up': head.y -= 1; break;
                case 'down': head.y += 1; break;
                case 'left': head.x -= 1; break;
                case 'right': head.x += 1; break;
            }
            
            if (this.checkCollision(head)) {
                this.gameOver();
                return;
            }
            
            this.snake.unshift(head);
            
            if (head.x === this.food.x && head.y === this.food.y) {
                this.score += 1;
                this.scoreElement.textContent = this.score;
                
                if (this.difficulty === 'nightmare' && this.score === 3 && !this.nightmareActive) {
                    this.nightmareActive = true;
                    this.showNightmareEffect();
                }
                
                this.generateFood();
            } else {
                this.snake.pop();
            }
            
            this.draw();
        }
        
        checkCollision(head) {
            return (
                head.x < 0 || head.x >= this.width ||
                head.y < 0 || head.y >= this.height ||
                this.snake.some((segment, index) => index > 0 && segment.x === head.x && segment.y === head.y)
            );
        }
        
        draw() {
            // Очищаем canvas
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Рисуем сетку
            this.drawGrid();
            
            // Рисуем фоновые символы для Nightmare
            if (this.difficulty === 'nightmare' && this.nightmareActive && !this.nightmareEffectActive && this.score >= 3 && this.score < 6) {
                this.drawNightmarePattern();
            }
            
            // Рисуем змейку и яблоко с учетом прозрачности
            if (!this.nightmareEffectActive) {
                if (this.difficulty === 'nightmare' && this.score >= 3 && this.score < 6) {
                    // Полупрозрачные объекты
                    this.ctx.globalAlpha = 0.0;
                    this.drawSnake();
                    this.drawFood();
                    this.ctx.globalAlpha = 1.0;
                } else {
                    // Обычные объекты
                    this.drawSnake();
                    this.drawFood();
                }
            }
        }
        
        drawGrid() {
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
            this.ctx.lineWidth = 1;
            
            // Вертикальные линии
            for (let x = 0; x <= this.width; x++) {
                this.ctx.beginPath();
                this.ctx.moveTo(x * this.cellSize, 0);
                this.ctx.lineTo(x * this.cellSize, this.height * this.cellSize);
                this.ctx.stroke();
            }
            
            // Горизонтальные линии
            for (let y = 0; y <= this.height; y++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y * this.cellSize);
                this.ctx.lineTo(this.width * this.cellSize, y * this.cellSize);
                this.ctx.stroke();
            }
            
            // Рамка поля
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        drawNightmarePattern() {
            this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';
            this.ctx.font = `${this.cellSize}px Consolas`;
            const patternChar = '░░';
            
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    if (this.snake.some(s => s.x === x && s.y === y)) continue;
                    if (this.food.x === x && this.food.y === y) continue;
                    
                    this.ctx.fillText(
                        patternChar,
                        x * this.cellSize + 1.7, // Минимальный отступ
                        y * this.cellSize + this.cellSize - 2.55 // Минимальный отступ
                    );
                }
            }
        }
        
        drawSnake() {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = `${this.cellSize}px Consolas`;
            
            this.snake.forEach(segment => {
                this.ctx.fillText(
                    this.snakeSkin,
                    segment.x * this.cellSize + 1.7, // Минимальный отступ
                    segment.y * this.cellSize + this.cellSize - 2.55 // Минимальный отступ
                );
            });
        }
        
        drawFood() {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = `${this.cellSize}px Consolas`;
            this.ctx.fillText(
                this.appleSkin,
                this.food.x * this.cellSize + 1.7, // Минимальный отступ
                this.food.y * this.cellSize + this.cellSize - 2.55// Минимальный отступ
            );
        }
        
        handleKeyPress(e) {
            if (!document.getElementById('game-area').classList.contains('active') || this.isPaused) return;
            
            const key = e.key.toLowerCase();
            
            if (key === 'w' || key === 'ц') {
                if (this.direction !== 'down') this.nextDirection = 'up';
            } else if (key === 's' || key === 'ы') {
                if (this.direction !== 'up') this.nextDirection = 'down';
            } else if (key === 'a' || key === 'ф') {
                if (this.direction !== 'right') this.nextDirection = 'left';
            } else if (key === 'd' || key === 'в') {
                if (this.direction !== 'left') this.nextDirection = 'right';
            }
        }
        
        gameOver() {
            clearInterval(this.gameLoop);
            this.showScreen('game-over-screen');
            this.finalScoreElement.textContent = this.score;
            
            if (this.score > 0) {
                this.addToLeaderboard.classList.remove('hidden');
            } else {
                this.addToLeaderboard.classList.add('hidden');
            }
        }
        
        addScoreToLeaderboard() {
            const playerName = this.playerNameInput.value.trim() || 'Anonymous';
            const scoreData = {
                name: playerName,
                score: this.score,
                level: this.difficulty,
                date: new Date().toLocaleString(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Добавляем результат в Firebase
            this.leaderboardRef.push(scoreData)
                .then(() => {
                    console.log('Score added to leaderboard');
                    this.addToLeaderboard.classList.add('hidden');
                    this.playerNameInput.value = '';
                })
                .catch(error => {
                    console.error('Error adding score:', error);
                });
        }
        
        updateLeaderboard() {
            const recordsTable = document.querySelector('#records .leaderboard tbody');
            if (!recordsTable) return;
            
            recordsTable.innerHTML = '<tr><td colspan="4" style="text-align: center;">Загрузка лидерборда...</td></tr>';
            
            this.leaderboardRef.orderByChild('score').limitToLast(20).once('value')
                .then((snapshot) => {
                    const leaderboard = [];
                    snapshot.forEach((childSnapshot) => {
                        leaderboard.push(childSnapshot.val());
                    });
                    
                    leaderboard.sort((a, b) => b.score - a.score);
                    
                    recordsTable.innerHTML = '';
                    
                    if (leaderboard.length === 0) {
                        const row = document.createElement('tr');
                        row.innerHTML = `<td colspan="4" style="text-align: center;">Лидерборд пуст</td>`;
                        recordsTable.appendChild(row);
                        return;
                    }
                    
                    leaderboard.slice(0, 20).forEach((record, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${record.name}</td>
                            <td>${record.score}</td>
                            <td>${this.getLevelName(record.level)}</td>
                        `;
                        recordsTable.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error('Error loading leaderboard:', error);
                    recordsTable.innerHTML = '<tr><td colspan="4" style="text-align: center;">Ошибка загрузки лидерборда</td></tr>';
                });
        }
        
        getLevelName(level) {
            switch(level) {
                case 'easy': return 'ЛЕГКИЙ';
                case 'normal': return 'НОРМАЛЬНЫЙ';
                case 'hard': return 'ТЯЖЁЛЫЙ';
                case 'nightmare': return 'NIGHTMARE';
                default: return level;
            }
        }
    }

    const game = new SnakeGame();
    
    // Обновляем лидерборд при открытии вкладки
    document.querySelector('a[href="#records"]').addEventListener('click', () => {
        game.updateLeaderboard();
    });
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const address = this.getAttribute('data-address');
            navigator.clipboard.writeText(address).then(() => {
                const originalText = this.textContent;
                this.textContent = 'COPIED!';
                setTimeout(() => {
                    this.textContent = originalText;
                }, 2000);
            });
        });
    });
    
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId !== '#main') {
                document.body.classList.remove('home');
            } else {
                document.body.classList.add('home');
            }
            
            document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            const target = document.querySelector(targetId);
            if (target) {
                target.classList.add('active');
            }
            
            if (targetId === '#play') {
                game.showScreen('game-main-menu');
            }
        });
    });
});