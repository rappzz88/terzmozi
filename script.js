// Import Firebase
import { database, ref, set, get, update, onValue, push, remove } from './firebase-config.js';

// Game State
let gameState = {
    roomCode: null,
    playerName: null,
    isHost: false,
    targetParentwork: null,
    targetUrl: null,
    currentStage: 1,
    selectedParentwork: null,
    detectedIp: null,
    selectedAddon: null,
    startTime: null,
    raceTimeMinutes: 5
};

// Navigation Functions
function showLanding() {
    hideAllPages();
    document.getElementById('landingPage').classList.add('active');
}

function showCreateRoom() {
    hideAllPages();
    document.getElementById('createRoomPage').classList.add('active');
}

function showJoinRoom() {
    hideAllPages();
    document.getElementById('joinRoomPage').classList.add('active');
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Generate Room Code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate Random IP
function generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Create Room
window.createRoom = async function() {
    const hostName = document.getElementById('hostName').value.trim();
    const parentwork = document.getElementById('parentworkSelect').value;
    const targetUrl = document.getElementById('targetUrl').value.trim();
    const raceTime = parseInt(document.getElementById('raceTime').value);

    if (!hostName || !targetUrl) {
        alert('Sila isi semua maklumat!');
        return;
    }

    const roomCode = generateRoomCode();
    gameState.roomCode = roomCode;
    gameState.playerName = hostName;
    gameState.isHost = true;
    gameState.targetParentwork = parentwork;
    gameState.targetUrl = targetUrl;
    gameState.raceTimeMinutes = raceTime;

    // Create room in Firebase
    try {
        await set(ref(database, `rooms/${roomCode}`), {
            host: hostName,
            targetParentwork: parentwork,
            targetUrl: targetUrl,
            raceTime: raceTime,
            status: 'waiting',
            createdAt: Date.now()
        });

        // Add host as player
        await set(ref(database, `rooms/${roomCode}/players/${hostName}`), {
            name: hostName,
            isHost: true,
            stage: 0,
            completed: false,
            finishTime: null
        });

        showLobby();
        setupRoomListeners();
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Gagal membuat room. Cuba lagi.');
    }
};

// Join Room
window.joinRoom = async function() {
    const playerName = document.getElementById('playerName').value.trim();
    const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();

    if (!playerName || !roomCode) {
        alert('Sila isi semua maklumat!');
        return;
    }

    try {
        const roomSnapshot = await get(ref(database, `rooms/${roomCode}`));
        
        if (!roomSnapshot.exists()) {
            alert('Room tidak dijumpai!');
            return;
        }

        const roomData = roomSnapshot.val();
        
        if (roomData.status === 'playing') {
            alert('Perlumbaan sudah bermula!');
            return;
        }

        gameState.roomCode = roomCode;
        gameState.playerName = playerName;
        gameState.isHost = false;
        gameState.targetParentwork = roomData.targetParentwork;
        gameState.targetUrl = roomData.targetUrl;
        gameState.raceTimeMinutes = roomData.raceTime;

        // Add player to room
        await set(ref(database, `rooms/${roomCode}/players/${playerName}`), {
            name: playerName,
            isHost: false,
            stage: 0,
            completed: false,
            finishTime: null
        });

        showLobby();
        setupRoomListeners();
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Gagal join room. Cuba lagi.');
    }
};

// Show Lobby
function showLobby() {
    hideAllPages();
    document.getElementById('lobbyPage').classList.add('active');
    
    document.getElementById('displayRoomCode').textContent = gameState.roomCode;
    document.getElementById('lobbyParentwork').textContent = gameState.targetParentwork;
    document.getElementById('lobbyUrl').textContent = gameState.targetUrl;

    if (gameState.isHost) {
        document.getElementById('startGameBtn').style.display = 'block';
    } else {
        document.getElementById('startGameBtn').style.display = 'none';
    }
}

// Setup Room Listeners
function setupRoomListeners() {
    const playersRef = ref(database, `rooms/${gameState.roomCode}/players`);
    
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        updatePlayersList(players);
    });

    const statusRef = ref(database, `rooms/${gameState.roomCode}/status`);
    onValue(statusRef, (snapshot) => {
        if (snapshot.val() === 'playing') {
            startGameForPlayer();
        }
    });
}

// Update Players List
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    const playerCount = document.getElementById('playerCount');
    
    if (!players) {
        playersList.innerHTML = '<p>Tiada pemain lagi...</p>';
        playerCount.textContent = '0';
        return;
    }

    const playersArray = Object.values(players);
    playerCount.textContent = playersArray.length;
    
    playersList.innerHTML = playersArray.map(player => `
        <div class="player-item ${player.isHost ? 'host' : ''}">
            <span>👤 ${player.name}</span>
            ${player.isHost ? '<span class="player-badge">HOST</span>' : ''}
        </div>
    `).join('');
}

// Start Game
window.startGame = async function() {
    if (!gameState.isHost) return;

    try {
        await update(ref(database, `rooms/${gameState.roomCode}`), {
            status: 'playing',
            startTime: Date.now()
        });
    } catch (error) {
        console.error('Error starting game:', error);
    }
};

// Start Game For Player
function startGameForPlayer() {
    hideAllPages();
    document.getElementById('gamePage').classList.add('active');
    
    gameState.currentStage = 1;
    gameState.startTime = Date.now();
    
    document.getElementById('gameUrl').textContent = gameState.targetUrl;
    document.getElementById('currentStage').textContent = '1/4';
    
    showStage(1);
    startTimer();
    setupGameListeners();
}

// Show Stage
function showStage(stageNum) {
    document.querySelectorAll('.stage-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`stage${stageNum}`).classList.add('active');
    document.getElementById('currentStage').textContent = `${stageNum}/4`;
}

// Stage 1: Select Parentwork
window.selectParentwork = function(parentwork) {
    gameState.selectedParentwork = parentwork;
    
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    setTimeout(() => {
        if (parentwork === gameState.targetParentwork) {
            alert('✅ Betul! Parentwork berjaya dikenali!');
            gameState.currentStage = 2;
            showStage(2);
            setupTerminal();
            updatePlayerProgress(2);
        } else {
            alert('❌ Salah! Cuba lagi!');
            gameState.selectedParentwork = null;
            event.target.classList.remove('selected');
        }
    }, 500);
};

// Stage 2: Terminal
function setupTerminal() {
    const terminalInput = document.getElementById('terminalInput');
    const terminalOutput = document.getElementById('terminalOutput');
    
    let commands = {
        parentwork: false,
        url: false,
        find: false
    };
    
    terminalInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const command = this.value.trim();
            terminalOutput.innerHTML += `<div class="terminal-line">$ ${command}</div>`;
            
            if (command.toLowerCase().includes('parentwork =')) {
                commands.parentwork = true;
                terminalOutput.innerHTML += `<div class="terminal-line">✓ Parentwork set: ${gameState.targetParentwork}</div>`;
            } else if (command.toLowerCase().includes('url =')) {
                commands.url = true;
                terminalOutput.innerHTML += `<div class="terminal-line">✓ URL set: ${gameState.targetUrl}</div>`;
            } else if (command.toLowerCase().includes('find.ip.url.parent()')) {
                if (commands.parentwork && commands.url) {
                    gameState.detectedIp = generateRandomIP();
                    terminalOutput.innerHTML += `<div class="terminal-line">🔍 Scanning...</div>`;
                    setTimeout(() => {
                        terminalOutput.innerHTML += `<div class="terminal-line">✓ IP Found: ${gameState.detectedIp}</div>`;
                        setTimeout(() => {
                            alert(`✅ IP berjaya dijumpai: ${gameState.detectedIp}`);
                            gameState.currentStage = 3;
                            showStage(3);
                            updatePlayerProgress(3);
                        }, 1000);
                    }, 2000);
                } else {
                    terminalOutput.innerHTML += `<div class="terminal-line">❌ Error: Set Parentwork dan URL terlebih dahulu!</div>`;
                }
            } else {
                terminalOutput.innerHTML += `<div class="terminal-line">❌ Unknown command</div>`;
            }
            
            this.value = '';
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    });
}

// Stage 3: Select Addon
window.selectAddon = function(addon) {
    gameState.selectedAddon = addon;
    
    document.querySelectorAll('.addon-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.addon-card').classList.add('selected');
    
    setTimeout(() => {
        alert(`✅ Addon dipilih: ${addon}`);
        
        // Apply addon effects to other players
        if (addon !== 'none') {
            applyAddonEffects(addon);
        }
        
        gameState.currentStage = 4;
        showStage(4);
        setupAttackTerminal();
        updatePlayerProgress(4);
    }, 500);
};

// Apply Addon Effects
async function applyAddonEffects(addon) {
    // This would affect other players in a real implementation
    console.log(`Addon ${addon} activated!`);
}

// Stage 4: Attack Terminal
function setupAttackTerminal() {
    const attackInput = document.getElementById('attackInput');
    const attackOutput = document.getElementById('attackOutput');
    
    let attackCommands = {
        rules: false,
        ip: false,
        parentwork: false,
        addon: false,
        choose: false,
        start: false,
        started: false
    };
    
    attackInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const command = this.value.trim();
            attackOutput.innerHTML += `<div class="terminal-line">$ ${command}</div>`;
            
            if (command.toLowerCase().includes('rules = down')) {
                attackCommands.rules = true;
                attackOutput.innerHTML += `<div class="terminal-line">✓ Rules set to DOWN</div>`;
            } else if (command.toLowerCase().includes('ip =')) {
                attackCommands.ip = true;
                attackOutput.innerHTML += `<div class="terminal-line">✓ IP configured: ${gameState.detectedIp}</div>`;
            } else if (command.toLowerCase().includes('parentwork =')) {
                attackCommands.parentwork = true;
                attackOutput.innerHTML += `<div class="terminal-line">✓ Parentwork configured: ${gameState.targetParentwork}</div>`;
            } else if (command.toLowerCase().includes('addon =')) {
                attackCommands.addon = true;
                attackOutput.innerHTML += `<div class="terminal-line">✓ Addon loaded: ${gameState.selectedAddon}</div>`;
            } else if (command.toLowerCase().includes('choose.rules_in.ip_pw.parentwork()')) {
                if (attackCommands.rules && attackCommands.ip && attackCommands.parentwork) {
                    attackCommands.choose = true;
                    attackOutput.innerHTML += `<div class="terminal-line">✓ Attack vector configured</div>`;
                } else {
                    attackOutput.innerHTML += `<div class="terminal-line">❌ Error: Set Rules, IP, dan Parentwork dahulu!</div>`;
                }
            } else if (command.toLowerCase().includes('start all()')) {
                if (attackCommands.choose) {
                    attackCommands.start = true;
                    attackOutput.innerHTML += `<div class="terminal-line">🚀 Initiating attack...</div>`;
                } else {
                    attackOutput.innerHTML += `<div class="terminal-line">❌ Error: Execute choose command first!</div>`;
                }
            } else if (command.toLowerCase().includes('started addon')) {
                if (attackCommands.start && attackCommands.addon) {
                    attackCommands.started = true;
                    attackOutput.innerHTML += `<div class="terminal-line">💥 Attack launched!</div>`;
                    attackOutput.innerHTML += `<div class="terminal-line">⏳ Breaching security...</div>`;
                    
                    setTimeout(() => {
                        attackOutput.innerHTML += `<div class="terminal-line">✅ BREACH SUCCESSFUL!</div>`;
                        setTimeout(() => {
                            completeGame();
                        }, 1500);
                    }, 2000);
                } else {
                    attackOutput.innerHTML += `<div class="terminal-line">❌ Error: Complete all steps first!</div>`;
                }
            } else {
                attackOutput.innerHTML += `<div class="terminal-line">❌ Unknown command</div>`;
            }
            
            this.value = '';
            attackOutput.scrollTop = attackOutput.scrollHeight;
        }
    });
}

// Complete Game
async function completeGame() {
    const finishTime = Date.now() - gameState.startTime;
    
    try {
        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerName}`), {
            completed: true,
            finishTime: finishTime
        });
        
        alert('🏁 Anda telah selesai! Menunggu pemain lain...');
    } catch (error) {
        console.error('Error completing game:', error);
    }
}

// Update Player Progress
async function updatePlayerProgress(stage) {
    try {
        await update(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerName}`), {
            stage: stage
        });
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

// Setup Game Listeners
function setupGameListeners() {
    const playersRef = ref(database, `rooms/${gameState.roomCode}/players`);
    
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        updateLeaderboard(players);
        checkForWinner(players);
    });
}

// Update Leaderboard
function updateLeaderboard(players) {
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (!players) return;
    
    const playersArray = Object.values(players)
        .sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            if (a.completed && b.completed) return a.finishTime - b.finishTime;
            return b.stage - a.stage;
        });
    
    leaderboardList.innerHTML = playersArray.map((player, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        return `
            <div class="leaderboard-item ${rankClass}">
                <span>${index + 1}. ${player.name}</span>
                <span>${player.completed ? '✅' : `Tahap ${player.stage}`}</span>
            </div>
        `;
    }).join('');
}

// Check For Winner
function checkForWinner(players) {
    if (!players) return;
    
    const playersArray = Object.values(players);
    const completedPlayers = playersArray.filter(p => p.completed);
    
    // Check if all players completed or time's up
    if (completedPlayers.length === playersArray.length && completedPlayers.length > 0) {
        showResults(playersArray);
    }
}

// Show Results
function showResults(players) {
    hideAllPages();
    document.getElementById('resultsPage').classList.add('active');
    
    const sortedPlayers = players.sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        if (a.completed && b.completed) return a.finishTime - b.finishTime;
        return 0;
    });
    
    const winner = sortedPlayers[0];
    document.getElementById('winnerName').textContent = winner.name;
    
    if (winner.completed) {
        const minutes = Math.floor(winner.finishTime / 60000);
        const seconds = Math.floor((winner.finishTime % 60000) / 1000);
        document.getElementById('winnerTime').textContent = `Masa: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        document.getElementById('winnerTime').textContent = 'Tidak selesai';
    }
    
    const finalLeaderboard = document.getElementById('finalLeaderboard');
    finalLeaderboard.innerHTML = sortedPlayers.map((player, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        let timeText = 'Tidak selesai';
        if (player.completed) {
            const minutes = Math.floor(player.finishTime / 60000);
            const seconds = Math.floor((player.finishTime % 60000) / 1000);
            timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return `
            <div class="leaderboard-item ${rankClass}">
                <span>${index + 1}. ${player.name}</span>
                <span>${timeText}</span>
            </div>
        `;
    }).join('');
}

// Timer
function startTimer() {
    const timerElement = document.getElementById('timer');
    let timeLeft = gameState.raceTimeMinutes * 60;
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('⏰ Masa tamat!');
            completeGame();
        }
    }, 1000);
}

// Leave Room
window.leaveRoom = async function() {
    if (confirm('Adakah anda pasti mahu keluar dari room?')) {
        try {
            await remove(ref(database, `rooms/${gameState.roomCode}/players/${gameState.playerName}`));
            
            if (gameState.isHost) {
                await remove(ref(database, `rooms/${gameState.roomCode}`));
            }
            
            gameState = {
                roomCode: null,
                playerName: null,
                isHost: false,
                targetParentwork: null,
                targetUrl: null,
                currentStage: 1,
                selectedParentwork: null,
                detectedIp: null,
                selectedAddon: null,
                startTime: null,
                raceTimeMinutes: 5
            };
            
            showLanding();
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }
};

// Initialize
showLanding();
