const API_BASE = '';

let petId = null;
let currentPet = null;
let studentId = null;
let interactionPoints = 0;

const petEmojis = {
    '小汪': '🐶', '喵喵': '🐱', '咕咕': '🐤', '跳跳': '🐰',
    '毛毛': '🐑', '牙牙': '🐴', '蛋蛋': '🦕'
};

const interactionCosts = {
    feed: 1, play: 1, pet: 1, clean: 1, walk: 2, party: 3
};

document.addEventListener('DOMContentLoaded', () => {
    // 从URL获取宠物ID
    const pathParts = window.location.pathname.split('/');
    petId = parseInt(pathParts[pathParts.length - 1]);

    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('editNicknameBtn').addEventListener('click', showEditModal);
    document.getElementById('closeEditBtn').addEventListener('click', hideEditModal);
    document.getElementById('saveNicknameBtn').addEventListener('click', saveNickname);
    document.getElementById('deletePetBtn').addEventListener('click', showDeleteConfirm);
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteConfirm);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deletePet);
    document.getElementById('addPointsBtn').addEventListener('click', addPoints);
    document.getElementById('reducePointsBtn').addEventListener('click', reducePoints);

    document.querySelectorAll('.btn-interaction').forEach(btn => {
        btn.addEventListener('click', handleInteraction);
    });

    init();
});

async function init() {
    try {
        await loadPetInfo();
        if (currentPet) {
            await checkDecay();
            await loadPoints();
            await loadGames();
        }
    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

async function loadPetInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/pets/${petId}`);
        if (!response.ok) {
            throw new Error('宠物不存在');
        }
        currentPet = await response.json();
        studentId = currentPet.student_id;
        renderPetDisplay();
        renderStatusPanel();
    } catch (error) {
        console.error('Failed to load pet info:', error);
        document.querySelector('.desktop-container').innerHTML =
            '<div style="text-align:center;padding:80px;"><h2>宠物不存在</h2><button onclick="window.location.href=\'/\'">返回首页</button></div>';
    }
}

async function checkDecay() {
    try {
        await fetch(`${API_BASE}/api/check_decay/${studentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to check decay:', error);
    }
}

async function loadPoints() {
    try {
        const response = await fetch(`${API_BASE}/api/points/${studentId}`);
        const data = await response.json();
        interactionPoints = data.points;
        document.getElementById('pointsValue').textContent = interactionPoints;
        updateInteractionButtons();
    } catch (error) {
        console.error('Failed to load points:', error);
    }
}

function renderPetDisplay() {
    document.getElementById('petEmoji').textContent = petEmojis[currentPet.pet_type] || '🐾';
    document.getElementById('petName').textContent = currentPet.nickname;
    document.getElementById('petType').textContent = currentPet.pet_type;
    document.getElementById('petLevel').textContent = `Lv${currentPet.level} ${currentPet.level_name}`;

    const titlesDiv = document.getElementById('petTitles');
    titlesDiv.innerHTML = '';
    if (currentPet.titles && currentPet.titles.length > 0) {
        currentPet.titles.forEach(title => {
            const span = document.createElement('span');
            span.className = 'pet-title';
            span.textContent = title;
            titlesDiv.appendChild(span);
        });
    }
}

function renderStatusPanel() {
    updateStatusBar('health', currentPet.health);
    updateStatusBar('hunger', currentPet.hunger);
    updateStatusBar('mood', currentPet.mood);
    updateStatusBar('intimacy', currentPet.intimacy);
    updateStatusBar('experience', currentPet.experience % 100);
}

function updateStatusBar(type, value) {
    document.getElementById(`${type}Value`).textContent = Math.round(value);
    document.getElementById(`${type}Bar`).style.width = `${Math.min(100, value)}%`;
}

function updateInteractionButtons() {
    document.querySelectorAll('.btn-interaction').forEach(btn => {
        const action = btn.dataset.action;
        const cost = interactionCosts[action];
        btn.disabled = interactionPoints < cost || (currentPet && currentPet.is_alive === 0);
    });
}

async function handleInteraction(e) {
    const action = e.currentTarget.dataset.action;
    const cost = interactionCosts[action];

    if (interactionPoints < cost) {
        showNotification('互动机会不足');
        return;
    }

    if (!currentPet || currentPet.is_alive === 0) {
        showNotification('宠物已死亡');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/interactions/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                pet_id: currentPet.id
            })
        });

        if (response.ok) {
            const data = await response.json();
            currentPet = data.pet;
            interactionPoints = data.points;

            renderPetDisplay();
            renderStatusPanel();
            updatePointsDisplay();
            updateInteractionButtons();
            showNotification(`${getActionName(action)}成功！`);
        } else {
            const error = await response.json();
            showNotification(error.error || '互动失败');
        }
    } catch (error) {
        console.error('Interaction failed:', error);
        showNotification('互动失败');
    }
}

function getActionName(action) {
    const names = {
        feed: '喂养', play: '玩耍', pet: '抚摸', clean: '清理', walk: '散步', party: '派对'
    };
    return names[action] || action;
}

function updatePointsDisplay() {
    document.getElementById('pointsValue').textContent = interactionPoints;
}

async function loadGames() {
    try {
        const response = await fetch(`${API_BASE}/api/games`);
        const games = await response.json();
        renderGameList(games);
    } catch (error) {
        console.error('Failed to load games:', error);
    }
}

function renderGameList(games) {
    const gameList = document.getElementById('gameList');
    gameList.innerHTML = '';

    const activeGames = games.filter(g => g.status === 'waiting');

    if (activeGames.length === 0) {
        gameList.innerHTML = '<div class="no-games">暂无比赛</div>';
        return;
    }

    activeGames.forEach(game => {
        const item = document.createElement('div');
        item.className = 'game-item';
        item.innerHTML = `
            <div class="game-info">
                <div class="game-name">${game.game_name}</div>
                <div class="game-status">参赛者: ${game.participants.length}人</div>
            </div>
            <button class="btn-join" data-game-id="${game.id}">报名参赛</button>
        `;
        item.querySelector('.btn-join').addEventListener('click', () => joinGame(game.id));
        gameList.appendChild(item);
    });
}

async function joinGame(gameId) {
    if (!currentPet || currentPet.is_alive === 0) {
        showNotification('宠物已死亡，无法参赛');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/games/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: gameId,
                student_id: studentId
            })
        });

        if (response.ok) {
            const data = await response.json();
            interactionPoints = data.points;
            updatePointsDisplay();
            updateInteractionButtons();
            showNotification('报名成功！');
            loadGames();
        } else {
            const error = await response.json();
            showNotification(error.error || '报名失败');
        }
    } catch (error) {
        console.error('Failed to join game:', error);
        showNotification('报名失败');
    }
}

function showEditModal() {
    document.getElementById('editNickname').value = currentPet.nickname;
    document.getElementById('petEditModal').classList.remove('hidden');
}

function hideEditModal() {
    document.getElementById('petEditModal').classList.add('hidden');
}

async function saveNickname() {
    const newNickname = document.getElementById('editNickname').value.trim();
    if (!newNickname) {
        showNotification('请输入昵称');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/pets/${currentPet.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: newNickname })
        });

        if (response.ok) {
            const pet = await response.json();
            currentPet = pet;
            renderPetDisplay();
            hideEditModal();
            showNotification('昵称已更新');
        }
    } catch (error) {
        console.error('Failed to update nickname:', error);
        showNotification('更新失败');
    }
}

function goBack() {
    window.location.href = '/';
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 2500);
}

function showDeleteConfirm() {
    document.getElementById('deleteConfirmText').textContent =
        `确定要删除"${currentPet.nickname}"吗？此操作不可恢复！`;
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

function hideDeleteConfirm() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
}

async function deletePet() {
    try {
        const response = await fetch(`${API_BASE}/api/pets/${currentPet.id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            hideDeleteConfirm();
            showNotification('宠物已删除');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            const error = await response.json();
            showNotification(error.error || '删除失败');
        }
    } catch (error) {
        console.error('Failed to delete pet:', error);
        showNotification('删除失败');
    }
}

async function addPoints() {
    try {
        const response = await fetch(`${API_BASE}/api/points/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                points: 1
            })
        });

        if (response.ok) {
            const data = await response.json();
            interactionPoints = data.points;
            updatePointsDisplay();
            updateInteractionButtons();
            showNotification('互动机会 +1');
        } else {
            const error = await response.json();
            showNotification(error.error || '增加失败');
        }
    } catch (error) {
        console.error('Failed to add points:', error);
        showNotification('增加失败');
    }
}

async function reducePoints() {
    if (interactionPoints <= 0) {
        showNotification('互动机会已为0');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/points/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                points: -1
            })
        });

        if (response.ok) {
            const data = await response.json();
            interactionPoints = data.points;
            updatePointsDisplay();
            updateInteractionButtons();
            showNotification('互动机会 -1');
        } else {
            const error = await response.json();
            showNotification(error.error || '减少失败');
        }
    } catch (error) {
        console.error('Failed to reduce points:', error);
        showNotification('减少失败');
    }
}
