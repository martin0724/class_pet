const API_BASE = '';

let allPets = [];
let petTypes = [];
let selectedPetType = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchPets();
    });
    document.getElementById('searchBtn').addEventListener('click', searchPets);
    document.getElementById('searchInput').addEventListener('input', debounceSearch);

    document.getElementById('addPetBtn').addEventListener('click', showPetSelectModal);
    document.getElementById('confirmAdoptBtn').addEventListener('click', adoptPet);
    document.getElementById('cancelAdoptBtn').addEventListener('click', hidePetSelectModal);

    loadPetTypes();
    loadAllPets();
});

let debounceTimer = null;
function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        searchPets();
    }, 300);
}

async function loadPetTypes() {
    try {
        const response = await fetch(`${API_BASE}/api/pet_types`);
        petTypes = await response.json();
    } catch (error) {
        console.error('Failed to load pet types:', error);
    }
}

async function loadAllPets(searchText = '') {
    try {
        const url = searchText ? `${API_BASE}/api/pets?search=${encodeURIComponent(searchText)}` : `${API_BASE}/api/pets`;
        const response = await fetch(url);
        allPets = await response.json();
        renderPetList();
    } catch (error) {
        console.error('Failed to load pets:', error);
    }
}

function searchPets() {
    const searchText = document.getElementById('searchInput').value.trim();
    loadAllPets(searchText);
}

function renderPetList() {
    const grid = document.getElementById('petGrid');
    grid.innerHTML = '';

    if (allPets.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🐾</div>
                <p>${document.getElementById('searchInput').value.trim() ? '没有找到匹配的宠物' : '还没有宠物，点击右上角按钮领养吧！'}</p>
            </div>
        `;
        document.getElementById('petCount').textContent = `共 ${allPets.length} 只宠物`;
        return;
    }

    const petEmojis = {
        '小汪': '🐶', '喵喵': '🐱', '咕咕': '🐤', '跳跳': '🐰',
        '毛毛': '🐑', '牙牙': '🐴', '蛋蛋': '🦕'
    };

    allPets.forEach(pet => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.innerHTML = `
            <div class="pet-emoji">${petEmojis[pet.pet_type] || '🐾'}</div>
            <div class="pet-name">${pet.nickname}</div>
            <div class="pet-type">${pet.pet_type}</div>
            <div class="pet-student">学生: ${pet.student_name || '未知'}</div>
            <div class="pet-level">Lv${pet.level} ${pet.level_name}</div>
        `;
        card.addEventListener('click', () => {
            window.location.href = `/pet/${pet.id}`;
        });
        grid.appendChild(card);
    });

    document.getElementById('petCount').textContent = `共 ${allPets.length} 只宠物`;
}

function showPetSelectModal() {
    renderPetTypesGrid();
    document.getElementById('petSelectModal').classList.remove('hidden');
    selectedPetType = null;
    document.getElementById('studentNameInput').value = '';
    document.getElementById('petNickname').value = '';
}

function hidePetSelectModal() {
    document.getElementById('petSelectModal').classList.add('hidden');
    document.getElementById('studentNameInput').value = '';
    document.getElementById('petNickname').value = '';
    selectedPetType = null;
}

function renderPetTypesGrid() {
    const grid = document.getElementById('petTypesGrid');
    grid.innerHTML = '';

    petTypes.forEach(pet => {
        const item = document.createElement('div');
        item.className = 'pet-type-item';
        item.innerHTML = `
            <div class="emoji">${pet.emoji || '🐾'}</div>
            <div class="name">${pet.name}</div>
            <div class="type">${pet.type || ''}</div>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.pet-type-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedPetType = pet;
        });
        grid.appendChild(item);
    });
}

async function adoptPet() {
    const studentName = document.getElementById('studentNameInput').value.trim();
    const nickname = document.getElementById('petNickname').value.trim();

    if (!studentName) {
        showNotification('请输入学生姓名');
        document.getElementById('studentNameInput').focus();
        return;
    }

    if (!selectedPetType) {
        showNotification('请选择宠物类型');
        return;
    }

    if (!nickname) {
        showNotification('请给宠物起个名字');
        document.getElementById('petNickname').focus();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/pets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_name: studentName,
                pet_type: selectedPetType.name,
                nickname: nickname
            })
        });

        if (response.ok) {
            hidePetSelectModal();
            showNotification(`成功领养了${nickname}！`);
            document.getElementById('searchInput').value = '';
            await loadAllPets();
        } else {
            const error = await response.json();
            showNotification(error.error || '领养失败');
        }
    } catch (error) {
        console.error('Failed to adopt pet:', error);
        showNotification('领养失败');
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 2500);
}
