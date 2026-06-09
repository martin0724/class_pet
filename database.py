from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    class_name = db.Column(db.String(100), default='三年一班')
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    pets = db.relationship('Pet', backref='student', lazy=True)
    interaction_points = db.relationship('InteractionPoints', backref='student', lazy=True)
    logs = db.relationship('Log', backref='student', lazy=True)

class Pet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False, unique=True)
    pet_type = db.Column(db.String(50), nullable=False)
    nickname = db.Column(db.String(100), nullable=False)
    health = db.Column(db.Integer, default=100)
    hunger = db.Column(db.Integer, default=100)
    mood = db.Column(db.Integer, default=100)
    intimacy = db.Column(db.Integer, default=0)
    experience = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    is_alive = db.Column(db.Integer, default=1)
    titles = db.Column(db.String(500), default='[]')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now)

class InteractionPoints(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    points = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.now)

class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)
    details = db.Column(db.String(500), default='{}')
    created_at = db.Column(db.DateTime, default=datetime.now)

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_type = db.Column(db.String(50), nullable=False)
    participants = db.Column(db.String(500), default='[]')
    status = db.Column(db.String(20), default='waiting')
    winner_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

PET_TYPES = [
    {'name': '小汪', 'type': '狗狗', 'emoji': '🐶', 'personality': '忠诚友好，喜欢互动'},
    {'name': '喵喵', 'type': '猫咪', 'emoji': '🐱', 'personality': '高冷傲娇，需要耐心'},
    {'name': '咕咕', 'type': '小鸡', 'emoji': '🐤', 'personality': '活泼可爱，容易满足'},
    {'name': '跳跳', 'type': '小兔', 'emoji': '🐰', 'personality': '蹦蹦跳跳，精力旺盛'},
    {'name': '毛毛', 'type': '小羊', 'emoji': '🐑', 'personality': '温柔乖巧，善于撒娇'},
    {'name': '牙牙', 'type': '小马', 'emoji': '🐴', 'personality': '勇敢热情，喜欢奔跑'},
    {'name': '蛋蛋', 'type': '恐龙', 'emoji': '🦕', 'personality': '神秘稀有，成长惊喜大'}
]

LEVEL_INFO = [
    {'level': 1, 'name': '蛋', 'exp_required': 0},
    {'level': 2, 'name': '幼儿', 'exp_required': 100},
    {'level': 3, 'name': '青年', 'exp_required': 300},
    {'level': 4, 'name': '成年', 'exp_required': 600},
    {'level': 5, 'name': '冠军', 'exp_required': 1000}
]

INTERACTION_TYPES = {
    'feed': {'name': '喂养食物', 'cost': 1, 'hunger': 25, 'mood': 5, 'intimacy': 3, 'experience': 5},
    'play': {'name': '投球游戏', 'cost': 1, 'health': 15, 'mood': 20, 'intimacy': 10, 'experience': 8},
    'pet': {'name': '抚摸互动', 'cost': 1, 'mood': 30, 'intimacy': 15, 'experience': 3},
    'clean': {'name': '清理房间', 'cost': 1, 'health': 10, 'mood': 10, 'intimacy': 5, 'experience': 3},
    'walk': {'name': '外出散步', 'cost': 2, 'health': 20, 'mood': 25, 'intimacy': 20, 'experience': 8},
    'party': {'name': '生日派对', 'cost': 3, 'hunger': 15, 'health': 15, 'mood': 40, 'intimacy': 30, 'experience': 12}
}

GAME_TYPES = {
    'sprint': {'name': '短跑比赛', 'min_level': 3, 'cost': 2, 'exp_reward': 15, 'title': '短跑冠军'},
    'jump': {'name': '跳跃比赛', 'min_level': 3, 'cost': 2, 'exp_reward': 15, 'title': '跳跃冠军'},
    'eating': {'name': '吃货大赛', 'min_level': 1, 'cost': 3, 'hunger_reward': 50, 'title': '吃货大王'},
    'talent': {'name': '才艺展示', 'min_level': 4, 'cost': 3, 'exp_reward': 20, 'title': '才艺之星'}
}

DECAY_RATES = {
    'hunger': 10,
    'health': 5,
    'mood': 5
}