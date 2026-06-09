const API_BASE = '';

let students = [];
let selectedStudentIds = [];
let selectedGameType = null;

const GAME_TYPES = {
    sprint: { name: '短跑比赛', desc: '青年期以上可参加，消耗2次机会' },
    jump: { name: '跳跃比赛', desc: '青年期以上可参加，消耗2次机会' },
    eating: { name: '吃货大赛', desc: '任意阶段可参加，消耗3次机会' },
    talent: { name: '才艺展示', desc: '成年期以上可参加，消耗3次机会' }
};

const petEmojis = {
    '小汪': '🐶', '喵喵': '🐱', '咕咕': '🐤', '跳跳': '🐰',
    '毛毛': '🐑', '牙牙': '🐴', '蛋蛋': '🦕'
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navStudents').addEventListener('click', () => switchTab('tabStudents'));
    document.getElementById('navRewards').addEventListener('click', () => switchTab('tabRewards'));
    document.getElementById('navGames').addEventListener('click', () => switchTab('tabGames'));
    document.getElementById('navResurrect').addEventListener('click', () => switchTab('tabResurrect'));
    
    document.getElementById('addStudentBtn').addEventListener('click', addStudent);
    document.getElementById('searchStudent').addEventListener('input', filterStudents);
    document.getElementById('rewardSelectedBtn').addEventListener('click', rewardSelectedStudents);
    document.getElementById('createGameBtn').addEventListener('click', showCreateGameModal);
    document.getElementById('confirmCreateGame').addEventListener('click', createGame);
    document.getElementById('cancelCreateGame').addEventListener('click', hideCreateGameModal);
    
    loadStudents();
    loadGames();
});

function switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    const btnId = tabId.replace('tab', 'nav');
    document.getElementById(btnId).classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');
    
    if (tabId === 'tabRewards') {
        renderRewardStudentList();
    } else if (tabId === 'tabResurrect') {
        loadDeadPets();
    } else if (tabId === 'tabGames') {
        loadGames();
    }
}

async function loadStudents() {
    try {
        const response = await fetch(`${API_BASE}/api/students`);
        students = await response.json();
        
        for (let i = 0; i < students.length; i++) {
            const petResponse = await fetch(`${API_BASE}/api/pets?student_id=${students[i].id}`);
            students[i].pets = await petResponse.json();
            
            const pointsResponse = await fetch(`${API_BASE}/api/points/${students[i].id}`);
            const pointsData = await pointsResponse.json();
            students[i].points = pointsData.points;
        }
        
        renderStudentList();
    } catch (error) {
        console.error('Failed to load students:', error);
    }
}

function renderStudentList() {
    const list = document.getElementById('studentList');
    list.innerHTML = '';
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <div class="student-name">${student.name}</div>
            <div class="student-class">${student.class_name}</div>
            <div class="pet-status">
                ${student.pets.length > 0 ? 
                    student.pets.map(p => `<span${p.is_alive === 0 ? ' class="dead"' : ''}>${p.nickname}</span>`).join('') : 
                    '<span style="color:#999;">无宠物</span>'
                }
            </div>
            <div class="points">🔔 ${student.points}次</div>
        `;
        list.appendChild(card);
    });
}

function renderRewardStudentList() {
    const list = document.getElementById('rewardStudentList');
    list.innerHTML = '';
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card ${selectedStudentIds.includes(student.id) ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="student-name">${student.name}</div>
            <div class="student-class">${student.class_name}</div>
            <div class="pet-status">
                ${student.pets.length > 0 ? 
                    student.pets.map(p => `<span${p.is_alive === 0 ? ' class="dead"' : ''}>${p.nickname}</span>`).join('') : 
                    '<span style="color:#999;">无宠物</span>'
                }
            </div>
            <div class="points">🔔 ${student.points}次</div>
        `;
        card.addEventListener('click', () => toggleStudentSelection(student.id));
        list.appendChild(card);
    });
}

function toggleStudentSelection(studentId) {
    const index = selectedStudentIds.indexOf(studentId);
    if (index > -1) {
        selectedStudentIds.splice(index, 1);
    } else {
        selectedStudentIds.push(studentId);
    }
    
    document.querySelectorAll('.student-card').forEach(card => {
        if (card.querySelector('.student-name').textContent === 
            students.find(s => s.id === studentId)?.name) {
            card.classList.toggle('selected');
        }
    });
}

function filterStudents() {
    const searchText = document.getElementById('searchStudent').value.toLowerCase();
    const cards = document.querySelectorAll('.student-card');
    
    cards.forEach(card => {
        const name = card.querySelector('.student-name').textContent.toLowerCase();
        card.style.display = name.includes(searchText) ? 'block' : 'none';
    });
}

async function addStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    const className = document.getElementById('newStudentClass').value.trim() || '三年一班';
    
    if (!name) {
        showNotification('请输入学生姓名');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, class_name: className })
        });
        
        if (response.ok) {
            const student = await response.json();
            student.pets = [];
            student.points = 0;
            students.push(student);
            renderStudentList();
            document.getElementById('newStudentName').value = '';
            showNotification(`已添加学生 ${name}`);
        }
    } catch (error) {
        console.error('Failed to add student:', error);
        showNotification('添加失败');
    }
}

async function rewardSelectedStudents() {
    if (selectedStudentIds.length === 0) {
        showNotification('请选择学生');
        return;
    }
    
    const amount = parseInt(document.getElementById('rewardAmount').value);
    
    try {
        for (const studentId of selectedStudentIds) {
            await fetch(`${API_BASE}/api/points/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId, points: amount })
            });
        }
        
        await loadStudents();
        selectedStudentIds = [];
        renderRewardStudentList();
        showNotification(`已向 ${selectedStudentIds.length} 名学生发放奖励`);
    } catch (error) {
        console.error('Failed to reward students:', error);
        showNotification('发放失败');
    }
}

function showCreateGameModal() {
    const list = document.getElementById('gameTypesList');
    list.innerHTML = '';
    
    Object.entries(GAME_TYPES).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'game-type-option';
        item.innerHTML = `
            <div class="game-info">
                <div class="game-name">${value.name}</div>
                <div class="game-desc">${value.desc}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.game-type-option').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedGameType = key;
        });
        list.appendChild(item);
    });
    
    document.getElementById('createGameModal').classList.remove('hidden');
}

function hideCreateGameModal() {
    document.getElementById('createGameModal').classList.add('hidden');
    selectedGameType = null;
}

async function createGame() {
    if (!selectedGameType) {
        showNotification('请选择比赛类型');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/games/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_type: selectedGameType })
        });
        
        if (response.ok) {
            hideCreateGameModal();
            loadGames();
            showNotification('比赛已创建');
        }
    } catch (error) {
        console.error('Failed to create game:', error);
        showNotification('创建失败');
    }
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
    const list = document.getElementById('gameList');
    list.innerHTML = '';
    
    if (games.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">暂无比赛</p>';
        return;
    }
    
    games.forEach(game => {
        const item = document.createElement('div');
        item.className = 'game-item';
        
        let actionBtn = '';
        if (game.status === 'waiting') {
            actionBtn = `<button class="btn-start" data-game-id="${game.id}">开始比赛</button>`;
        } else {
            actionBtn = `<span style="color: #66BB6A;">已结束</span>`;
        }
        
        item.innerHTML = `
            <div class="game-info">
                <div class="game-name">${game.game_name}</div>
                <div class="game-status">${game.status === 'waiting' ? '等待报名' : '已结束'} | 参赛者: ${game.participants.length}人</div>
            </div>
            ${actionBtn}
        `;
        
        const startBtn = item.querySelector('.btn-start');
        if (startBtn) {
            startBtn.addEventListener('click', () => startGame(game.id));
        }
        
        list.appendChild(item);
    });
}

async function startGame(gameId) {
    try {
        const response = await fetch(`${API_BASE}/api/games/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_id: gameId })
        });
        
        if (response.ok) {
            const data = await response.json();
            loadGames();
            const winner = students.find(s => s.id === data.winner_id);
            showNotification(`${winner?.name || '未知'}的宠物获得了${data.winner_title}称号！`);
        } else {
            const error = await response.json();
            showNotification(error.error);
        }
    } catch (error) {
        console.error('Failed to start game:', error);
        showNotification('比赛开始失败');
    }
}

async function loadDeadPets() {
    try {
        const response = await fetch(`${API_BASE}/api/pets`);
        const allPets = await response.json();
        const deadPets = allPets.filter(p => p.is_alive === 0);
        
        const list = document.getElementById('deadPetsList');
        list.innerHTML = '';
        
        if (deadPets.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #999;">没有死亡的宠物</p>';
            return;
        }
        
        for (const pet of deadPets) {
            const student = students.find(s => s.id === pet.student_id);
            const card = document.createElement('div');
            card.className = 'dead-pet-card';
            card.innerHTML = `
                <div class="pet-emoji">${petEmojis[pet.pet_type] || '💀'}</div>
                <div class="pet-name">${pet.nickname}</div>
                <div class="student-name">主人: ${student?.name || '未知'}</div>
                <button class="btn-resurrect" data-pet-id="${pet.id}">复活宠物</button>
            `;
            card.querySelector('.btn-resurrect').addEventListener('click', () => resurrectPet(pet.id));
            list.appendChild(card);
        }
    } catch (error) {
        console.error('Failed to load dead pets:', error);
    }
}

async function resurrectPet(petId) {
    try {
        const response = await fetch(`${API_BASE}/api/pets/${petId}/resurrect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            showNotification('宠物已复活！');
            loadDeadPets();
            loadStudents();
        } else {
            const error = await response.json();
            showNotification(error.error);
        }
    } catch (error) {
        console.error('Failed to resurrect pet:', error);
        showNotification('复活失败');
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 2000);
}