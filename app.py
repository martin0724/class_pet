from flask import Flask, render_template, request, jsonify, redirect, url_for
from config import Config
from database import db, Student, Pet, InteractionPoints, Log, Game, PET_TYPES, LEVEL_INFO, INTERACTION_TYPES, GAME_TYPES, DECAY_RATES
from datetime import datetime, timedelta
import json
import random

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/pet/<int:pet_id>')
def pet_detail(pet_id):
    return render_template('student.html', pet_id=pet_id)

@app.route('/api/students', methods=['GET', 'POST'])
def students_api():
    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        class_name = data.get('class_name', '三年一班')
        
        if not name:
            return jsonify({'error': '学生姓名不能为空'}), 400
        
        student = Student(name=name, class_name=class_name)
        db.session.add(student)
        db.session.commit()
        
        points = InteractionPoints(student_id=student.id, points=0)
        db.session.add(points)
        db.session.commit()
        
        return jsonify({'id': student.id, 'name': student.name, 'class_name': student.class_name}), 201
    
    students = Student.query.all()
    return jsonify([{'id': s.id, 'name': s.name, 'class_name': s.class_name} for s in students])

@app.route('/api/students/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def student_api(id):
    student = Student.query.get_or_404(id)
    
    if request.method == 'GET':
        pets = Pet.query.filter_by(student_id=id).all()
        points = InteractionPoints.query.filter_by(student_id=id).first()
        return jsonify({
            'id': student.id,
            'name': student.name,
            'class_name': student.class_name,
            'pets': [pet_to_dict(p) for p in pets],
            'points': points.points if points else 0
        })
    
    elif request.method == 'PUT':
        data = request.json
        if 'name' in data:
            student.name = data['name']
        if 'class_name' in data:
            student.class_name = data['class_name']
        db.session.commit()
        return jsonify({'id': student.id, 'name': student.name})
    
    elif request.method == 'DELETE':
        db.session.delete(student)
        db.session.commit()
        return jsonify({'message': '删除成功'}), 204

@app.route('/api/pets', methods=['GET', 'POST'])
def pets_api():
    if request.method == 'POST':
        data = request.json
        student_name = data.get('student_name')
        pet_type = data.get('pet_type')
        nickname = data.get('nickname')
        
        if not student_name or not pet_type or not nickname:
            return jsonify({'error': '缺少必要参数：学生姓名、宠物类型、宠物昵称'}), 400
        
        student = Student.query.filter_by(name=student_name).first()
        if not student:
            student = Student(name=student_name)
            db.session.add(student)
            db.session.commit()
            
            points = InteractionPoints(student_id=student.id, points=5)
            db.session.add(points)
            db.session.commit()
        
        existing_pet = Pet.query.filter_by(student_id=student.id).first()
        if existing_pet:
            return jsonify({'error': f'{student.name}已经有宠物了！'}), 400
        
        pet = Pet(student_id=student.id, pet_type=pet_type, nickname=nickname)
        db.session.add(pet)
        db.session.commit()
        
        return jsonify(pet_to_dict(pet)), 201
    
    search = request.args.get('search')
    if search:
        pets = Pet.query.join(Student).filter(
            (Student.name.like(f'%{search}%')) | 
            (Pet.nickname.like(f'%{search}%'))
        ).all()
    else:
        pets = Pet.query.join(Student).all()
    
    result = []
    for pet in pets:
        pet_dict = pet_to_dict(pet)
        pet_dict['student_name'] = pet.student.name
        result.append(pet_dict)
    
    return jsonify(result)

@app.route('/api/pets/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def pet_api(id):
    pet = Pet.query.get_or_404(id)
    
    if request.method == 'GET':
        return jsonify(pet_to_dict(pet))
    
    elif request.method == 'PUT':
        data = request.json
        if 'nickname' in data:
            pet.nickname = data['nickname']
        if 'health' in data:
            pet.health = max(0, min(100, data['health']))
        if 'hunger' in data:
            pet.hunger = max(0, min(100, data['hunger']))
        if 'mood' in data:
            pet.mood = max(0, min(100, data['mood']))
        if 'intimacy' in data:
            pet.intimacy = max(0, min(100, data['intimacy']))
        if 'experience' in data:
            pet.experience = max(0, data['experience'])
        pet.updated_at = datetime.now()
        check_level_up(pet)
        db.session.commit()
        return jsonify(pet_to_dict(pet))
    
    elif request.method == 'DELETE':
        db.session.delete(pet)
        db.session.commit()
        return jsonify({'message': '删除成功'}), 204

@app.route('/api/points/add', methods=['POST'])
def add_points():
    data = request.json
    student_id = data.get('student_id')
    points = data.get('points', 1)
    
    ip = InteractionPoints.query.filter_by(student_id=student_id).first()
    if not ip:
        ip = InteractionPoints(student_id=student_id, points=0)
        db.session.add(ip)
    
    ip.points += points
    ip.updated_at = datetime.now()
    db.session.commit()
    
    add_log(student_id, 'points_add', {'points': points, 'total': ip.points})
    
    return jsonify({'student_id': student_id, 'points': ip.points})

@app.route('/api/points/<int:student_id>', methods=['GET'])
def get_points(student_id):
    ip = InteractionPoints.query.filter_by(student_id=student_id).first()
    return jsonify({'student_id': student_id, 'points': ip.points if ip else 0})

@app.route('/api/points/use', methods=['POST'])
def use_points():
    data = request.json
    student_id = data.get('student_id')
    cost = data.get('cost', 1)
    
    ip = InteractionPoints.query.filter_by(student_id=student_id).first()
    if not ip or ip.points < cost:
        return jsonify({'error': '互动机会不足'}), 400
    
    ip.points -= cost
    ip.updated_at = datetime.now()
    db.session.commit()
    
    return jsonify({'student_id': student_id, 'points': ip.points})

@app.route('/api/interactions/<string:action>', methods=['POST'])
def interaction(action):
    if action not in INTERACTION_TYPES:
        return jsonify({'error': '无效的互动类型'}), 400
    
    data = request.json
    student_id = data.get('student_id')
    pet_id = data.get('pet_id')
    
    pet = Pet.query.get_or_404(pet_id)
    if pet.student_id != student_id:
        return jsonify({'error': '宠物不属于该学生'}), 400
    
    if pet.is_alive == 0:
        return jsonify({'error': '宠物已死亡'}), 400
    
    interaction_info = INTERACTION_TYPES[action]
    cost = interaction_info['cost']
    
    ip = InteractionPoints.query.filter_by(student_id=student_id).first()
    if not ip or ip.points < cost:
        return jsonify({'error': '互动机会不足'}), 400
    
    ip.points -= cost
    ip.updated_at = datetime.now()
    
    if 'hunger' in interaction_info:
        pet.hunger = min(100, pet.hunger + interaction_info['hunger'])
    if 'health' in interaction_info:
        pet.health = min(100, pet.health + interaction_info['health'])
    if 'mood' in interaction_info:
        pet.mood = min(100, pet.mood + interaction_info['mood'])
    if 'intimacy' in interaction_info:
        pet.intimacy = min(100, pet.intimacy + interaction_info['intimacy'])
    if 'experience' in interaction_info:
        pet.experience += interaction_info['experience']
    
    pet.updated_at = datetime.now()
    check_level_up(pet)
    db.session.commit()
    
    add_log(student_id, f'interaction_{action}', {
        'pet_id': pet_id,
        'pet_name': pet.nickname,
        'action': interaction_info['name'],
        'cost': cost
    })
    
    return jsonify({
        'pet': pet_to_dict(pet),
        'points': ip.points,
        'message': f'{interaction_info["name"]}成功！'
    })

@app.route('/api/games/create', methods=['POST'])
def create_game():
    data = request.json
    game_type = data.get('game_type')
    
    if game_type not in GAME_TYPES:
        return jsonify({'error': '无效的比赛类型'}), 400
    
    game = Game(game_type=game_type)
    db.session.add(game)
    db.session.commit()
    
    return jsonify({
        'id': game.id,
        'game_type': game.game_type,
        'game_name': GAME_TYPES[game_type]['name'],
        'status': game.status,
        'participants': []
    })

@app.route('/api/games', methods=['GET'])
def get_games():
    games = Game.query.all()
    result = []
    for game in games:
        participants = json.loads(game.participants)
        result.append({
            'id': game.id,
            'game_type': game.game_type,
            'game_name': GAME_TYPES.get(game.game_type, {}).get('name', game.game_type),
            'status': game.status,
            'participants': participants,
            'winner_id': game.winner_id
        })
    return jsonify(result)

@app.route('/api/games/join', methods=['POST'])
def join_game():
    data = request.json
    game_id = data.get('game_id')
    student_id = data.get('student_id')
    
    game = Game.query.get_or_404(game_id)
    if game.status != 'waiting':
        return jsonify({'error': '比赛已开始或结束'}), 400
    
    game_info = GAME_TYPES.get(game.game_type)
    if not game_info:
        return jsonify({'error': '无效的比赛类型'}), 400
    
    pet = Pet.query.filter_by(student_id=student_id, is_alive=1).first()
    if not pet:
        return jsonify({'error': '没有存活的宠物'}), 400
    
    if pet.level < game_info['min_level']:
        return jsonify({'error': f'宠物等级不足，需要{game_info["min_level"]}级'}), 400
    
    ip = InteractionPoints.query.filter_by(student_id=student_id).first()
    if not ip or ip.points < game_info['cost']:
        return jsonify({'error': '互动机会不足'}), 400
    
    ip.points -= game_info['cost']
    ip.updated_at = datetime.now()
    
    participants = json.loads(game.participants)
    if student_id not in participants:
        participants.append(student_id)
        game.participants = json.dumps(participants)
    
    db.session.commit()
    
    return jsonify({
        'game_id': game.id,
        'participants': participants,
        'points': ip.points
    })

@app.route('/api/games/start', methods=['POST'])
def start_game():
    data = request.json
    game_id = data.get('game_id')
    
    game = Game.query.get_or_404(game_id)
    participants = json.loads(game.participants)
    
    if len(participants) < 1:
        return jsonify({'error': '没有参赛者'}), 400
    
    game_info = GAME_TYPES.get(game.game_type)
    
    winner_id = random.choice(participants)
    game.winner_id = winner_id
    game.status = 'finished'
    db.session.commit()
    
    winner_pet = Pet.query.filter_by(student_id=winner_id, is_alive=1).first()
    if winner_pet:
        if 'exp_reward' in game_info:
            winner_pet.experience += game_info['exp_reward']
        if 'hunger_reward' in game_info:
            winner_pet.hunger = min(100, winner_pet.hunger + game_info['hunger_reward'])
        
        titles = json.loads(winner_pet.titles)
        if game_info['title'] not in titles:
            titles.append(game_info['title'])
            winner_pet.titles = json.dumps(titles)
        
        check_level_up(winner_pet)
    
    db.session.commit()
    
    add_log(winner_id, 'game_win', {
        'game_type': game.game_type,
        'game_name': game_info['name'],
        'title': game_info['title']
    })
    
    return jsonify({
        'game_id': game.id,
        'winner_id': winner_id,
        'winner_title': game_info['title'],
        'participants': participants
    })

@app.route('/api/pets/<int:pet_id>/resurrect', methods=['POST'])
def resurrect_pet(pet_id):
    pet = Pet.query.get_or_404(pet_id)
    
    if pet.is_alive == 1:
        return jsonify({'error': '宠物还活着'}), 400
    
    pet.is_alive = 1
    pet.health = 50
    pet.hunger = 50
    pet.mood = 50
    pet.level = max(1, pet.level - 1)
    pet.experience = 0
    pet.updated_at = datetime.now()
    db.session.commit()
    
    add_log(pet.student_id, 'pet_resurrect', {'pet_id': pet_id, 'pet_name': pet.nickname})
    
    return jsonify(pet_to_dict(pet))

@app.route('/api/pet_types', methods=['GET'])
def get_pet_types():
    return jsonify(PET_TYPES)

@app.route('/api/check_decay/<int:student_id>', methods=['POST'])
def check_decay(student_id):
    pets = Pet.query.filter_by(student_id=student_id, is_alive=1).all()
    points = InteractionPoints.query.filter_by(student_id=student_id).first()
    
    if not points:
        return jsonify({'message': '没有互动机会记录'})
    
    last_update = points.updated_at
    now = datetime.now()
    days_passed = (now - last_update).days
    
    if days_passed <= 0:
        return jsonify({'message': '无需衰减'})
    
    for pet in pets:
        pet.hunger = max(0, pet.hunger - DECAY_RATES['hunger'] * days_passed)
        pet.health = max(0, pet.health - DECAY_RATES['health'] * days_passed)
        pet.mood = max(0, pet.mood - DECAY_RATES['mood'] * days_passed)
        
        if pet.hunger == 0 or pet.health == 0 or pet.mood == 0:
            pet.is_alive = 0
        
        pet.updated_at = datetime.now()
    
    if points:
        points.updated_at = datetime.now()
    
    db.session.commit()
    
    return jsonify({
        'days_passed': days_passed,
        'pets': [pet_to_dict(p) for p in pets]
    })

def pet_to_dict(pet):
    return {
        'id': pet.id,
        'student_id': pet.student_id,
        'pet_type': pet.pet_type,
        'nickname': pet.nickname,
        'health': pet.health,
        'hunger': pet.hunger,
        'mood': pet.mood,
        'intimacy': pet.intimacy,
        'experience': pet.experience,
        'level': pet.level,
        'level_name': get_level_name(pet.level),
        'is_alive': pet.is_alive,
        'titles': json.loads(pet.titles),
        'created_at': pet.created_at.isoformat(),
        'updated_at': pet.updated_at.isoformat()
    }

def get_level_name(level):
    for l in LEVEL_INFO:
        if l['level'] == level:
            return l['name']
    return '未知'

def check_level_up(pet):
    for l in LEVEL_INFO:
        if pet.experience >= l['exp_required'] and pet.level < l['level']:
            pet.level = l['level']

def add_log(student_id, action_type, details):
    log = Log(
        student_id=student_id,
        action_type=action_type,
        details=json.dumps(details)
    )
    db.session.add(log)
    db.session.commit()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)