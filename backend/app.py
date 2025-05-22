# app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from marshmallow import Schema, fields, ValidationError
import bcrypt
import logging
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://username:password@localhost/wheel_of_life')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# SECURITY IMPROVEMENT: Rate limiting
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["1000 per day", "100 per hour"],
    storage_uri=os.getenv('REDIS_URL', "memory://")
)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# SECURITY IMPROVEMENT: More restrictive CORS
allowed_origins = [
    "https://wol.com",
    "https://www.wol.com"
]
if app.debug:
    allowed_origins.append("http://localhost:3000")

CORS(app, origins=allowed_origins)

# IMPROVEMENT: Structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s'
)
logger = logging.getLogger(__name__)

# SECURITY IMPROVEMENT: Input validation schemas
class UserRegistrationSchema(Schema):
    name = fields.Str(required=True, validate=lambda x: 2 <= len(x.strip()) <= 100)
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 8)

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)

class ResponseSchema(Schema):
    question_id = fields.Int(required=True, validate=lambda x: x > 0)
    score = fields.Int(required=True, validate=lambda x: 0 <= x <= 10)

class ResponsesSchema(Schema):
    responses = fields.List(fields.Nested(ResponseSchema), required=True, validate=lambda x: len(x) > 0)

# IMPROVEMENT: Error handling
@app.errorhandler(ValidationError)
def handle_validation_error(e):
    logger.warning(f"Validation error: {e.messages}")
    return jsonify({'error': 'Dados inválidos', 'details': e.messages}), 400

@app.errorhandler(404)
def handle_not_found(e):
    return jsonify({'error': 'Recurso não encontrado'}), 404

@app.errorhandler(429)
def handle_rate_limit(e):
    logger.warning(f"Rate limit exceeded: {request.remote_addr}")
    return jsonify({'error': 'Muitas tentativas. Tente novamente em alguns minutos.'}), 429

@app.errorhandler(500)
def handle_internal_error(e):
    logger.error(f"Internal error: {str(e)}")
    db.session.rollback()
    return jsonify({'error': 'Erro interno do servidor'}), 500

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LifeArea(db.Model):
    __tablename__ = 'life_areas'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    display_order = db.Column(db.Integer, default=0)

class Subcategory(db.Model):
    __tablename__ = 'subcategories'
    id = db.Column(db.Integer, primary_key=True)
    life_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    display_order = db.Column(db.Integer, default=0)
    life_area = db.relationship('LifeArea', backref='subcategories')

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    subcategory_id = db.Column(db.Integer, db.ForeignKey('subcategories.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_order = db.Column(db.Integer, default=0)
    subcategory = db.relationship('Subcategory', backref='questions')

class Assessment(db.Model):
    __tablename__ = 'assessments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), default='Avaliação da Roda da Vida')
    status = db.Column(db.Enum('in_progress', 'completed'), default='in_progress')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    user = db.relationship('User', backref='assessments')

class Response(db.Model):
    __tablename__ = 'responses'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assessment = db.relationship('Assessment', backref='responses')
    question = db.relationship('Question', backref='responses')

class SubcategoryScore(db.Model):
    __tablename__ = 'subcategory_scores'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    subcategory_id = db.Column(db.Integer, db.ForeignKey('subcategories.id'), nullable=False)
    average_score = db.Column(db.Numeric(3, 1), nullable=False)
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    assessment = db.relationship('Assessment', backref='subcategory_scores')
    subcategory = db.relationship('Subcategory', backref='subcategory_scores')

class AreaScore(db.Model):
    __tablename__ = 'area_scores'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    life_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False)
    average_score = db.Column(db.Numeric(3, 1), nullable=False)
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    assessment = db.relationship('Assessment', backref='area_scores')
    life_area = db.relationship('LifeArea', backref='area_scores')

class ActionPlan(db.Model):
    __tablename__ = 'action_plans'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    focus_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assessment = db.relationship('Assessment', backref='action_plans')
    focus_area = db.relationship('LifeArea', backref='action_plans')

class Action(db.Model):
    __tablename__ = 'actions'
    id = db.Column(db.Integer, primary_key=True)
    action_plan_id = db.Column(db.Integer, db.ForeignKey('action_plans.id'), nullable=False)
    action_text = db.Column(db.Text, nullable=False)
    strategy_text = db.Column(db.Text, nullable=False)
    target_date = db.Column(db.Date)
    status = db.Column(db.Enum('planned', 'in_progress', 'completed', 'cancelled'), default='planned')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    action_plan = db.relationship('ActionPlan', backref='actions')

# Routes
@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    schema = UserRegistrationSchema()
    
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': 'Dados inválidos', 'details': err.messages}), 400
    
    # Check if user exists
    if User.query.filter_by(email=data['email'].lower().strip()).first():
        logger.warning(f"Registration attempt with existing email: {data['email']}")
        return jsonify({'error': 'Email já cadastrado'}), 409
    
    try:
        # SECURITY IMPROVEMENT: Strong password hashing with bcrypt
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt(rounds=12))
        
        user = User(
            email=data['email'].lower().strip(),
            password_hash=password_hash.decode('utf-8'),
            name=data['name'].strip()
        )
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"New user registered: {user.email}")
        
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration failed for {data['email']}: {str(e)}")
        return jsonify({'error': 'Falha no cadastro. Tente novamente.'}), 500

@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    schema = UserLoginSchema()
    
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': 'Dados inválidos', 'details': err.messages}), 400
    
    user = User.query.filter_by(email=data['email'].lower().strip()).first()
    
    # SECURITY IMPROVEMENT: Use bcrypt for password verification
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        access_token = create_access_token(identity=user.id)
        logger.info(f"Successful login: {user.email}")
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        })
    
    logger.warning(f"Failed login attempt for: {data['email']}")
    return jsonify({'error': 'Email ou senha incorretos'}), 401

@app.route('/api/life-areas', methods=['GET'])
def get_life_areas():
    areas = LifeArea.query.order_by(LifeArea.display_order).all()
    return jsonify([{
        'id': area.id,
        'name': area.name,
        'description': area.description,
        'color': area.color,
        'icon': area.icon,
        'display_order': area.display_order
    } for area in areas])

@app.route('/api/life-areas/<int:area_id>/subcategories', methods=['GET'])
def get_area_subcategories(area_id):
    subcategories = Subcategory.query.filter_by(life_area_id=area_id).order_by(Subcategory.display_order).all()
    return jsonify([{
        'id': sub.id,
        'name': sub.name,
        'description': sub.description,
        'display_order': sub.display_order
    } for sub in subcategories])

@app.route('/api/subcategories/<int:subcategory_id>/questions', methods=['GET'])
def get_subcategory_questions(subcategory_id):
    questions = Question.query.filter_by(subcategory_id=subcategory_id).order_by(Question.question_order).all()
    return jsonify([{
        'id': q.id,
        'question_text': q.question_text,
        'question_order': q.question_order
    } for q in questions])

@app.route('/api/assessments', methods=['POST'])
@jwt_required()
def create_assessment():
    user_id = get_jwt_identity()
    assessment = Assessment(user_id=user_id)
    db.session.add(assessment)
    db.session.commit()
    
    return jsonify({
        'id': assessment.id,
        'title': assessment.title,
        'status': assessment.status,
        'started_at': assessment.started_at.isoformat()
    }), 201

@app.route('/api/assessments/<int:assessment_id>/responses', methods=['POST'])
@jwt_required()
def save_responses(assessment_id):
    user_id = get_jwt_identity()
    
    # IMPROVEMENT: Input validation
    schema = ResponsesSchema()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': 'Dados inválidos', 'details': err.messages}), 400
    
    # Verify assessment ownership
    assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        logger.warning(f"Assessment {assessment_id} not found for user {user_id}")
        return jsonify({'error': 'Avaliação não encontrada'}), 404
    
    try:
        # IMPROVEMENT: Use database transaction for data integrity
        with db.session.begin():
            saved_count = 0
            for response_data in data['responses']:
                # Verify question exists
                question = Question.query.get(response_data['question_id'])
                if not question:
                    logger.warning(f"Question {response_data['question_id']} not found")
                    continue
                
                existing_response = Response.query.filter_by(
                    assessment_id=assessment_id,
                    question_id=response_data['question_id']
                ).first()
                
                if existing_response:
                    existing_response.score = response_data['score']
                    existing_response.updated_at = datetime.utcnow()
                else:
                    response = Response(
                        assessment_id=assessment_id,
                        question_id=response_data['question_id'],
                        score=response_data['score']
                    )
                    db.session.add(response)
                
                saved_count += 1
        
        logger.info(f"Saved {saved_count} responses for assessment {assessment_id}")
        return jsonify({
            'message': 'Respostas salvas com sucesso',
            'saved_count': saved_count
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to save responses for assessment {assessment_id}: {str(e)}")
        return jsonify({'error': 'Falha ao salvar respostas. Tente novamente.'}), 500

@app.route('/api/assessments/<int:assessment_id>/calculate', methods=['POST'])
@jwt_required()
def calculate_scores(assessment_id):
    user_id = get_jwt_identity()
    
    assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({'message': 'Assessment não encontrado'}), 404
    
    # Calculate scores for each subcategory first
    subcategories = Subcategory.query.all()
    subcategory_results = []
    
    for subcategory in subcategories:
        # Get all responses for this subcategory's questions
        responses = db.session.query(Response).join(Question).filter(
            Response.assessment_id == assessment_id,
            Question.subcategory_id == subcategory.id
        ).all()
        
        if responses:
            avg_score = sum(r.score for r in responses) / len(responses)
            percentage = (avg_score / 10) * 100
            
            # Save or update subcategory score
            existing_score = SubcategoryScore.query.filter_by(
                assessment_id=assessment_id,
                subcategory_id=subcategory.id
            ).first()
            
            if existing_score:
                existing_score.average_score = avg_score
                existing_score.percentage = percentage
                existing_score.calculated_at = datetime.utcnow()
            else:
                subcategory_score = SubcategoryScore(
                    assessment_id=assessment_id,
                    subcategory_id=subcategory.id,
                    average_score=avg_score,
                    percentage=percentage
                )
                db.session.add(subcategory_score)
            
            subcategory_results.append({
                'subcategory_id': subcategory.id,
                'subcategory_name': subcategory.name,
                'life_area_id': subcategory.life_area_id,
                'average_score': float(avg_score),
                'percentage': float(percentage)
            })
    
    # Now calculate area scores from subcategory averages
    life_areas = LifeArea.query.all()
    area_results = []
    
    for area in life_areas:
        area_subcategory_scores = [
            result for result in subcategory_results 
            if result['life_area_id'] == area.id
        ]
        
        if area_subcategory_scores:
            area_avg_score = sum(s['average_score'] for s in area_subcategory_scores) / len(area_subcategory_scores)
            area_percentage = (area_avg_score / 10) * 100
            
            # Save or update area score
            existing_area_score = AreaScore.query.filter_by(
                assessment_id=assessment_id,
                life_area_id=area.id
            ).first()
            
            if existing_area_score:
                existing_area_score.average_score = area_avg_score
                existing_area_score.percentage = area_percentage
                existing_area_score.calculated_at = datetime.utcnow()
            else:
                area_score = AreaScore(
                    assessment_id=assessment_id,
                    life_area_id=area.id,
                    average_score=area_avg_score,
                    percentage=area_percentage
                )
                db.session.add(area_score)
            
            area_results.append({
                'life_area_id': area.id,
                'life_area_name': area.name,
                'average_score': round(float(area_avg_score), 1),
                'percentage': round(float(area_percentage), 1)
            })
    
    # Mark assessment as completed
    assessment.status = 'completed'
    assessment.completed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'area_results': area_results,
        'subcategory_results': subcategory_results
    })

@app.route('/api/assessments/<int:assessment_id>/results', methods=['GET'])
@jwt_required()
def get_assessment_results(assessment_id):
    user_id = get_jwt_identity()
    
    assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({'message': 'Assessment não encontrado'}), 404
    
    # Get area scores
    area_scores = db.session.query(AreaScore, LifeArea).join(LifeArea).filter(
        AreaScore.assessment_id == assessment_id
    ).all()
    
    area_results = [{
        'life_area_id': score.life_area_id,
        'life_area_name': area.name,
        'color': area.color,
        'average_score': float(score.average_score),
        'percentage': float(score.percentage)
    } for score, area in area_scores]
    
    # Get subcategory scores
    subcategory_scores = db.session.query(SubcategoryScore, Subcategory, LifeArea).join(
        Subcategory
    ).join(LifeArea).filter(
        SubcategoryScore.assessment_id == assessment_id
    ).all()
    
    subcategory_results = [{
        'subcategory_id': score.subcategory_id,
        'subcategory_name': subcategory.name,
        'life_area_id': subcategory.life_area_id,
        'life_area_name': area.name,
        'average_score': float(score.average_score),
        'percentage': float(score.percentage)
    } for score, subcategory, area in subcategory_scores]
    
    return jsonify({
        'assessment': {
            'id': assessment.id,
            'title': assessment.title,
            'status': assessment.status,
            'completed_at': assessment.completed_at.isoformat() if assessment.completed_at else None
        },
        'area_results': area_results,
        'subcategory_results': subcategory_results
    })

@app.route('/api/assessments/<int:assessment_id>/action-plan', methods=['POST'])
@jwt_required()
def create_action_plan(assessment_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    
    assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({'message': 'Assessment não encontrado'}), 404
    
    action_plan = ActionPlan(
        assessment_id=assessment_id,
        focus_area_id=data['focus_area_id']
    )
    db.session.add(action_plan)
    db.session.flush()
    
    # Add actions
    for action_data in data['actions']:
        action = Action(
            action_plan_id=action_plan.id,
            action_text=action_data['action_text'],
            strategy_text=action_data['strategy_text'],
            target_date=datetime.strptime(action_data['target_date'], '%Y-%m-%d').date() if action_data.get('target_date') else None
        )
        db.session.add(action)
    
    db.session.commit()
    
    return jsonify({
        'id': action_plan.id,
        'message': 'Plano de ação criado com sucesso'
    }), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)