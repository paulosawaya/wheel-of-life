# app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from marshmallow import Schema, fields, ValidationError
from werkzeug.exceptions import HTTPException
import bcrypt
import logging
import sqlalchemy.exc
import traceback
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Environment variable validation
REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET_KEY']
missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {missing_vars}")

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_timeout': 20,
    'max_overflow': 0
}
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Check if we're in debug mode
DEBUG_MODE = os.getenv('FLASK_DEBUG', 'False').lower() == 'true' or os.getenv('FLASK_ENV') == 'development'
app.config['DEBUG'] = DEBUG_MODE

# SECURITY IMPROVEMENT: Enhanced rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["1000 per day", "100 per hour"],
    storage_uri=os.getenv('REDIS_URL', "memory://"),
    strategy="fixed-window"
)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# SECURITY IMPROVEMENT: More restrictive CORS
allowed_origins = [
    "https://rdv.embedados.com",
    "https://www.rdv.embedados.com"
]
if DEBUG_MODE:
    allowed_origins.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000"
    ])

CORS(app, origins=allowed_origins, supports_credentials=True)

# IMPROVEMENT: Enhanced structured logging
logging.basicConfig(
    level=logging.INFO if not DEBUG_MODE else logging.DEBUG,
    format='%(asctime)s %(levelname)s [%(name)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Log configuration on startup
logger.info(f"Application starting in {'DEBUG' if DEBUG_MODE else 'PRODUCTION'} mode")
logger.info(f"Allowed CORS origins: {allowed_origins}")

# SECURITY IMPROVEMENT: Enhanced input validation schemas
class UserRegistrationSchema(Schema):
    name = fields.Str(required=True, validate=lambda x: 2 <= len(x.strip()) <= 100)
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 8)

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 1)

class ResponseSchema(Schema):
    question_id = fields.Int(required=True, validate=lambda x: x > 0)
    score = fields.Int(required=True, validate=lambda x: 0 <= x <= 10)

class ResponsesSchema(Schema):
    responses = fields.List(fields.Nested(ResponseSchema), required=True, validate=lambda x: len(x) > 0)

class ActionPlanSchema(Schema):
    focus_area_id = fields.Int(required=True, validate=lambda x: x > 0)
    actions = fields.List(fields.Dict(), missing=[])
    contribution_points = fields.List(fields.Dict(), missing=[])

# Enhanced error handlers
@app.errorhandler(500)
def handle_internal_error(e):
    error_details = str(e)
    
    if DEBUG_MODE:
        tb = traceback.format_exc()
        logger.error(f"Internal error with traceback: {tb}")
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'debug_info': {
                'message': error_details,
                'traceback': tb,
                'type': type(e).__name__
            }
        }), 500
    else:
        logger.error(f"Internal error: {error_details}")
        try:
            db.session.rollback()
        except:
            pass
        return jsonify({'error': 'Erro interno do servidor'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e
    
    error_details = str(e)
    
    if DEBUG_MODE:
        tb = traceback.format_exc()
        logger.error(f"Unhandled exception with traceback: {tb}")
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'debug_info': {
                'message': error_details,
                'traceback': tb,
                'type': type(e).__name__,
                'args': str(e.args) if hasattr(e, 'args') else None
            }
        }), 500
    else:
        logger.error(f"Unhandled exception: {error_details}")
        try:
            db.session.rollback()
        except:
            pass
        return jsonify({'error': 'Erro interno do servidor'}), 500

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

@app.errorhandler(401)
def handle_unauthorized(e):
    return jsonify({'error': 'Não autorizado'}), 401

@app.errorhandler(403)
def handle_forbidden(e):
    return jsonify({'error': 'Acesso negado'}), 403

# Enhanced function wrapper for better error debugging
def debug_api_call(func):
    """Decorator to wrap API functions with detailed error handling"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if DEBUG_MODE:
                tb = traceback.format_exc()
                logger.error(f"Error in {func.__name__}: {tb}")
                
                return jsonify({
                    'error': f'Error in {func.__name__}',
                    'debug_info': {
                        'function': func.__name__,
                        'message': str(e),
                        'traceback': tb,
                        'type': type(e).__name__,
                        'args': list(args) if args else None,
                        'kwargs': kwargs if kwargs else None
                    }
                }), 500
            else:
                logger.error(f"Error in {func.__name__}: {str(e)}")
                raise
    
    wrapper.__name__ = func.__name__
    return wrapper

# IMPROVED MODELS with indexes and constraints

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<User {self.email}>'

class LifeArea(db.Model):
    __tablename__ = 'life_areas'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7))
    icon = db.Column(db.String(50))
    display_order = db.Column(db.Integer, default=0, nullable=False, index=True)

    def __repr__(self):
        return f'<LifeArea {self.name}>'

class Subcategory(db.Model):
    __tablename__ = 'subcategories'
    id = db.Column(db.Integer, primary_key=True)
    life_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    life_area = db.relationship('LifeArea', backref='subcategories')

    __table_args__ = (
        db.Index('idx_subcategory_area_order', 'life_area_id', 'display_order'),
    )

    def __repr__(self):
        return f'<Subcategory {self.name}>'

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    subcategory_id = db.Column(db.Integer, db.ForeignKey('subcategories.id'), nullable=False, index=True)
    question_text = db.Column(db.Text, nullable=False)
    question_order = db.Column(db.Integer, default=0, nullable=False)
    subcategory = db.relationship('Subcategory', backref='questions')

    __table_args__ = (
        db.Index('idx_question_subcategory_order', 'subcategory_id', 'question_order'),
    )

    def __repr__(self):
        return f'<Question {self.id}>'

class Assessment(db.Model):
    __tablename__ = 'assessments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(255), default='Avaliação da Roda da Vida', nullable=False)
    status = db.Column(db.Enum('in_progress', 'completed'), default='in_progress', nullable=False, index=True)
    current_area_index = db.Column(db.Integer, default=0, nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)
    user = db.relationship('User', backref='assessments')

    __table_args__ = (
        db.Index('idx_assessment_user_status', 'user_id', 'status'),
        db.Index('idx_assessment_completed', 'completed_at'),
    )

    def __repr__(self):
        return f'<Assessment {self.id} - {self.status}>'

class Response(db.Model):
    __tablename__ = 'responses'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    assessment = db.relationship('Assessment', backref='responses')
    question = db.relationship('Question', backref='responses')

    __table_args__ = (
        db.UniqueConstraint('assessment_id', 'question_id', name='uq_assessment_question'),
        db.Index('idx_response_assessment', 'assessment_id'),
        db.Index('idx_response_question', 'question_id'),
        db.CheckConstraint('score >= 0 AND score <= 10', name='check_score_range'),
    )

    def __repr__(self):
        return f'<Response {self.assessment_id}-{self.question_id}: {self.score}>'

class SubcategoryScore(db.Model):
    __tablename__ = 'subcategory_scores'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    subcategory_id = db.Column(db.Integer, db.ForeignKey('subcategories.id'), nullable=False)
    average_score = db.Column(db.Numeric(3, 1), nullable=False)
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    assessment = db.relationship('Assessment', backref='subcategory_scores')
    subcategory = db.relationship('Subcategory', backref='subcategory_scores')

    __table_args__ = (
        db.UniqueConstraint('assessment_id', 'subcategory_id', name='uq_assessment_subcategory'),
        db.Index('idx_subcategory_score_assessment', 'assessment_id'),
    )

    def __repr__(self):
        return f'<SubcategoryScore {self.assessment_id}-{self.subcategory_id}: {self.average_score}>'

class AreaScore(db.Model):
    __tablename__ = 'area_scores'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    life_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False)
    average_score = db.Column(db.Numeric(3, 1), nullable=False)
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    assessment = db.relationship('Assessment', backref='area_scores')
    life_area = db.relationship('LifeArea', backref='area_scores')

    __table_args__ = (
        db.UniqueConstraint('assessment_id', 'life_area_id', name='uq_assessment_area'),
        db.Index('idx_area_score_assessment', 'assessment_id'),
    )

    def __repr__(self):
        return f'<AreaScore {self.assessment_id}-{self.life_area_id}: {self.average_score}>'

class ActionPlan(db.Model):
    __tablename__ = 'action_plans'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False, unique=True)
    focus_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    assessment = db.relationship('Assessment', backref=db.backref('action_plan', uselist=False))
    focus_area = db.relationship('LifeArea', backref='action_plans')

    def __repr__(self):
        return f'<ActionPlan {self.id} for Assessment {self.assessment_id}>'

class Action(db.Model):
    __tablename__ = 'actions'
    id = db.Column(db.Integer, primary_key=True)
    action_plan_id = db.Column(db.Integer, db.ForeignKey('action_plans.id', ondelete='CASCADE'), nullable=False, index=True)
    action_text = db.Column(db.Text, nullable=False)
    strategy_text = db.Column(db.Text, nullable=False)
    target_date = db.Column(db.Date)
    status = db.Column(db.Enum('planned', 'in_progress', 'completed', 'cancelled'), default='planned', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    action_plan = db.relationship('ActionPlan', backref='actions')

    def __repr__(self):
        return f'<Action {self.id} - {self.status}>'

class ActionContributionPoint(db.Model):
    __tablename__ = 'action_contribution_points'
    id = db.Column(db.Integer, primary_key=True)
    action_plan_id = db.Column(db.Integer, db.ForeignKey('action_plans.id', ondelete='CASCADE'), nullable=False)
    life_area_id = db.Column(db.Integer, db.ForeignKey('life_areas.id'), nullable=False)
    contribution_points = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    action_plan = db.relationship('ActionPlan', backref='contribution_points')
    life_area = db.relationship('LifeArea', backref='contribution_points')

    __table_args__ = (
        db.UniqueConstraint('action_plan_id', 'life_area_id', name='uq_plan_area_contribution'),
        db.CheckConstraint('contribution_points >= 0 AND contribution_points <= 100', name='check_contribution_range'),
    )

    def __repr__(self):
        return f'<ActionContributionPoint {self.action_plan_id}-{self.life_area_id}: {self.contribution_points}>'

# Database connection testing
@app.before_first_request
def test_db_connection():
    try:
        db.session.execute(db.text('SELECT 1'))
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

# UTILITY FUNCTIONS

def hash_password(password: str) -> bytes:
    """Hash password with bcrypt using 12 rounds"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))

def verify_password(password: str, password_hash: bytes) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash)

# ROUTES

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        db.session.execute(db.text('SELECT 1'))
        return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

@app.route('/api/debug/test-error')
def debug_test_error():
    """Test endpoint to verify error handling works"""
    if DEBUG_MODE:
        try:
            x = 1 / 0
        except Exception as e:
            tb = traceback.format_exc()
            return jsonify({
                'error': 'Test error',
                'debug_info': {
                    'message': str(e),
                    'traceback': tb,
                    'type': type(e).__name__
                }
            })
    else:
        return jsonify({'error': 'Debug mode disabled'}), 403

@app.route('/api/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """User registration endpoint"""
    schema = UserRegistrationSchema()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': 'Dados inválidos', 'details': err.messages}), 400
    
    # Normalize email
    email = data['email'].lower().strip()
    name = data['name'].strip()
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email já está em uso'}), 409
    
    # Hash password with improved security
    password_hash = hash_password(data['password'])
    
    # Create user
    user = User(
        name=name,
        email=email,
        password_hash=password_hash
    )
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        logger.info(f"New user registered: {email}")
        
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        }), 201
        
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Email já está em uso'}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration failed for {email}: {e}")
        return jsonify({'error': 'Erro ao criar usuário'}), 500

@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """User login endpoint"""
    schema = UserLoginSchema()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({'error': 'Dados inválidos', 'details': err.messages}), 400
    
    email = data['email'].lower().strip()
    user = User.query.filter_by(email=email).first()
    
    if user and verify_password(data['password'], user.password_hash):
        access_token = create_access_token(identity=user.id)
        logger.info(f"User logged in: {email}")
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })
    
    logger.warning(f"Failed login attempt for: {email}")
    return jsonify({'error': 'Credenciais inválidas'}), 401

@app.route('/api/life-areas', methods=['GET'])
def get_life_areas():
    """Get all life areas"""
    try:
        areas = LifeArea.query.order_by(LifeArea.display_order, LifeArea.name).all()
        return jsonify([{
            'id': area.id,
            'name': area.name,
            'description': area.description,
            'color': area.color,
            'icon': area.icon,
            'display_order': area.display_order
        } for area in areas])
    except Exception as e:
        logger.error(f"Error fetching life areas: {e}")
        return jsonify({'error': 'Erro ao buscar áreas da vida'}), 500

@app.route('/api/life-areas/<int:area_id>/subcategories', methods=['GET'])
def get_area_subcategories(area_id):
    """Get subcategories for a specific life area"""
    try:
        # Verify life area exists
        life_area = LifeArea.query.get(area_id)
        if not life_area:
            return jsonify({'error': 'Área da vida não encontrada'}), 404
        
        subcategories = Subcategory.query.filter_by(life_area_id=area_id)\
            .order_by(Subcategory.display_order, Subcategory.name).all()
        
        return jsonify([{
            'id': sub.id,
            'name': sub.name,
            'description': sub.description,
            'display_order': sub.display_order,
            'life_area_id': sub.life_area_id
        } for sub in subcategories])
    except Exception as e:
        logger.error(f"Error fetching subcategories for area {area_id}: {e}")
        return jsonify({'error': 'Erro ao buscar subcategorias'}), 500

@app.route('/api/subcategories/<int:subcategory_id>/questions', methods=['GET'])
def get_subcategory_questions(subcategory_id):
    """Get questions for a specific subcategory"""
    try:
        # Verify subcategory exists
        subcategory = Subcategory.query.get(subcategory_id)
        if not subcategory:
            return jsonify({'error': 'Subcategoria não encontrada'}), 404
        
        questions = Question.query.filter_by(subcategory_id=subcategory_id)\
            .order_by(Question.question_order, Question.id).all()
        
        return jsonify([{
            'id': q.id,
            'question_text': q.question_text,
            'question_order': q.question_order,
            'subcategory_id': q.subcategory_id
        } for q in questions])
    except Exception as e:
        logger.error(f"Error fetching questions for subcategory {subcategory_id}: {e}")
        return jsonify({'error': 'Erro ao buscar questões'}), 500

@app.route('/api/user/assessments', methods=['GET'])
@jwt_required()
def get_user_assessments():
    """Get all assessments for the current user"""
    user_id = get_jwt_identity()
    
    try:
        assessments = Assessment.query.filter_by(user_id=user_id)\
            .order_by(Assessment.started_at.desc()).all()
        
        assessment_list = []
        for assessment in assessments:
            # Count total responses for this assessment
            response_count = Response.query.filter_by(assessment_id=assessment.id).count()
            
            # Get area scores if completed
            area_scores = []
            if assessment.status == 'completed':
                scores = db.session.query(AreaScore, LifeArea)\
                    .join(LifeArea, AreaScore.life_area_id == LifeArea.id)\
                    .filter(AreaScore.assessment_id == assessment.id)\
                    .order_by(LifeArea.display_order).all()
                
                area_scores = [{
                    'area_id': score.life_area_id,
                    'area_name': area.name,
                    'score': float(score.average_score),
                    'percentage': float(score.percentage),
                    'color': area.color
                } for score, area in scores]
            
            assessment_list.append({
                'id': assessment.id,
                'title': assessment.title,
                'status': assessment.status,
                'current_area_index': assessment.current_area_index,
                'started_at': assessment.started_at.isoformat(),
                'completed_at': assessment.completed_at.isoformat() if assessment.completed_at else None,
                'response_count': response_count,
                'area_scores': area_scores
            })
        
        return jsonify(assessment_list)
    except Exception as e:
        logger.error(f"Error fetching assessments for user {user_id}: {e}")
        return jsonify({'error': 'Erro ao buscar avaliações'}), 500

@app.route('/api/assessments/start', methods=['POST'])
@jwt_required()
def start_assessment():
    """Start a new assessment or continue an existing one"""
    user_id = get_jwt_identity()
    
    try:
        # Check for in-progress assessment
        in_progress = Assessment.query.filter_by(user_id=user_id, status='in_progress').first()
        if in_progress:
            logger.info(f"Returning existing in-progress assessment {in_progress.id} for user {user_id}")
            return jsonify({
                'id': in_progress.id,
                'title': in_progress.title,
                'status': in_progress.status,
                'current_area_index': in_progress.current_area_index,
                'started_at': in_progress.started_at.isoformat(),
                'is_continuation': True
            })
        
        # Create new assessment
        assessment = Assessment(user_id=user_id)
        db.session.add(assessment)
        db.session.commit()
        
        logger.info(f"Created new assessment {assessment.id} for user {user_id}")
        
        return jsonify({
            'id': assessment.id,
            'title': assessment.title,
            'status': assessment.status,
            'current_area_index': 0,
            'started_at': assessment.started_at.isoformat(),
            'is_continuation': False
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error starting assessment for user {user_id}: {e}")
        return jsonify({'error': 'Erro ao iniciar avaliação'}), 500

@app.route('/api/assessments', methods=['POST'])
@jwt_required()
def create_assessment():
    """Create a new assessment (legacy endpoint)"""
    user_id = get_jwt_identity()
    
    try:
        assessment = Assessment(user_id=user_id)
        db.session.add(assessment)
        db.session.commit()
        
        logger.info(f"Created assessment {assessment.id} for user {user_id}")
        
        return jsonify({
            'id': assessment.id,
            'title': assessment.title,
            'status': assessment.status,
            'started_at': assessment.started_at.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating assessment for user {user_id}: {e}")
        return jsonify({'error': 'Erro ao criar avaliação'}), 500

@app.route('/api/assessments/<int:assessment_id>/responses', methods=['POST'])
@jwt_required()
@limiter.limit("50 per minute")
def save_responses(assessment_id):
    """Save responses for an assessment"""
    user_id = get_jwt_identity()
    
    # Input validation
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
        saved_count = 0
        for response_data in data['responses']:
            if response_data.get('score') is None:
                logger.warning(f"Skipping response for question {response_data.get('question_id')} due to null score")
                continue
                
            # Verify question exists
            question = Question.query.get(response_data['question_id'])
            if not question:
                logger.warning(f"Question {response_data['question_id']} not found")
                continue
            
            # Use merge for upsert functionality
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
        
        db.session.commit()
        
        logger.info(f"Saved {saved_count} responses for assessment {assessment_id}")
        return jsonify({
            'message': 'Respostas salvas com sucesso',
            'saved_count': saved_count
        }), 200
        
    except sqlalchemy.exc.IntegrityError as ie:
        db.session.rollback()
        logger.error(f"Database integrity error while saving responses for assessment {assessment_id}: {str(ie)}")
        return jsonify({'error': 'Erro de integridade ao salvar respostas. Tente novamente.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save responses for assessment {assessment_id}: {str(e)}")
        return jsonify({'error': 'Falha ao salvar respostas. Tente novamente.'}), 500

@app.route('/api/assessments/<int:assessment_id>/calculate', methods=['POST'])
@jwt_required()
def calculate_scores(assessment_id):
    """Calculate scores for an assessment"""
    user_id = get_jwt_identity()
    
    assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({'error': 'Avaliação não encontrada'}), 404
    
    try:
        # Calculate scores for each subcategory first
        subcategories = Subcategory.query.all()
        subcategory_results = []
        
        for subcategory in subcategories:
            # Get all responses for this subcategory's questions
            responses = db.session.query(Response)\
                .join(Question, Response.question_id == Question.id)\
                .filter(
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
                    'average_score': round(float(avg_score), 1),
                    'percentage': round(float(percentage), 1)
                })
        
        # Calculate area scores from subcategory averages
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
                    'percentage': round(float(area_percentage), 1),
                    'color': area.color
                })
        
        # Mark assessment as completed
        assessment.status = 'completed'
        assessment.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"Calculated scores for assessment {assessment_id}")
        
        return jsonify({
            'area_results': area_results,
            'subcategory_results': subcategory_results
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error calculating scores for assessment {assessment_id}: {e}")
        return jsonify({'error': 'Erro ao calcular pontuações'}), 500

@app.route('/api/assessments/<int:assessment_id>/results', methods=['GET'])
@jwt_required()
def get_assessment_results(assessment_id):
    """Get results for a specific assessment"""
    user_id = get_jwt_identity()
    
    assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({'error': 'Avaliação não encontrada'}), 404
    
    try:
        # Get area scores with explicit join
        area_scores = db.session.query(AreaScore, LifeArea)\
            .join(LifeArea, AreaScore.life_area_id == LifeArea.id)\
            .filter(AreaScore.assessment_id == assessment_id)\
            .order_by(LifeArea.display_order).all()
        
        area_results = [{
            'life_area_id': score.life_area_id,
            'life_area_name': area.name,
            'color': area.color or '#999',
            'average_score': float(score.average_score),
            'percentage': float(score.percentage)
        } for score, area in area_scores]
        
        # Get subcategory scores with explicit joins
        subcategory_scores = db.session.query(SubcategoryScore, Subcategory, LifeArea)\
            .select_from(SubcategoryScore)\
            .join(Subcategory, SubcategoryScore.subcategory_id == Subcategory.id)\
            .join(LifeArea, Subcategory.life_area_id == LifeArea.id)\
            .filter(SubcategoryScore.assessment_id == assessment_id)\
            .order_by(LifeArea.display_order, Subcategory.display_order).all()
        
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
                'started_at': assessment.started_at.isoformat(),
                'completed_at': assessment.completed_at.isoformat() if assessment.completed_at else None
            },
            'area_results': area_results,
            'subcategory_results': subcategory_results
        })
    except Exception as e:
        logger.error(f"Error fetching results for assessment {assessment_id}: {e}")
        return jsonify({'error': 'Erro ao buscar resultados'}), 500

@app.route('/api/user/last-assessment', methods=['GET'])
@jwt_required()
def get_last_assessment():
    """Get the last completed assessment for the current user"""
    user_id = get_jwt_identity()
    
    try:
        # Get the most recent completed assessment
        last_assessment = Assessment.query.filter_by(
            user_id=user_id,
            status='completed'
        ).order_by(Assessment.completed_at.desc()).first()
        
        if not last_assessment:
            return jsonify({'message': 'Nenhuma avaliação anterior encontrada'}), 404
        
        # Get all responses for this assessment
        responses = Response.query.filter_by(assessment_id=last_assessment.id).all()
        
        # Format responses by question_id
        response_data = {
            response.question_id: response.score 
            for response in responses
        }
        
        return jsonify({
            'assessment_id': last_assessment.id,
            'completed_at': last_assessment.completed_at.isoformat(),
            'responses': response_data
        })
    except Exception as e:
        logger.error(f"Error fetching last assessment for user {user_id}: {e}")
        return jsonify({'error': 'Erro ao buscar última avaliação'}), 500

# ACTION PLAN ROUTES (CONSOLIDATED)

@app.route('/api/assessments/<int:assessment_id>/action-plan', methods=['GET'])
@jwt_required()
def get_action_plan(assessment_id):
    """Get action plan for a specific assessment"""
    user_id = get_jwt_identity()
    
    try:
        # Verify assessment ownership
        assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
        if not assessment:
            return jsonify({'error': 'Avaliação não encontrada'}), 404
        
        # Get action plan
        action_plan = ActionPlan.query.filter_by(assessment_id=assessment_id).first()
        if not action_plan:
            return jsonify({'error': 'Plano de ação não encontrado'}), 404
        
        # Get actions
        actions = Action.query.filter_by(action_plan_id=action_plan.id)\
            .order_by(Action.created_at).all()
        
        # Get contribution points
        contribution_points = ActionContributionPoint.query.filter_by(
            action_plan_id=action_plan.id
        ).all()
        
        # Get focus area information
        focus_area = LifeArea.query.get(action_plan.focus_area_id)
        
        return jsonify({
            'id': action_plan.id,
            'assessment_id': action_plan.assessment_id,
            'focus_area_id': action_plan.focus_area_id,
            'focus_area_name': focus_area.name if focus_area else None,
            'created_at': action_plan.created_at.isoformat(),
            'updated_at': action_plan.updated_at.isoformat(),
            'actions': [{
                'id': action.id,
                'action_text': action.action_text,
                'strategy_text': action.strategy_text,
                'target_date': action.target_date.isoformat() if action.target_date else None,
                'status': action.status,
                'created_at': action.created_at.isoformat(),
                'updated_at': action.updated_at.isoformat()
            } for action in actions],
            'contribution_points': [{
                'life_area_id': cp.life_area_id,
                'points': cp.contribution_points
            } for cp in contribution_points]
        })
    except Exception as e:
        logger.error(f"Error fetching action plan for assessment {assessment_id}: {e}")
        return jsonify({'error': 'Erro ao buscar plano de ação'}), 500

@app.route('/api/assessments/<int:assessment_id>/action-plan', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def create_action_plan(assessment_id):
    """Create action plan with contribution points and actions"""
    user_id = get_jwt_identity()
    
    try:
        # Validate input
        schema = ActionPlanSchema()
        data = schema.load(request.get_json() or {})
        
        # Verify assessment ownership
        assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
        if not assessment:
            return jsonify({'error': 'Avaliação não encontrada'}), 404
        
        # Check if assessment is completed
        if assessment.status != 'completed':
            return jsonify({'error': 'A avaliação deve estar completa antes de criar o plano de ação'}), 400
        
        # Check if action plan already exists
        existing_plan = ActionPlan.query.filter_by(assessment_id=assessment_id).first()
        if existing_plan:
            return jsonify({
                'error': 'Plano de ação já existe para esta avaliação',
                'existing_plan_id': existing_plan.id
            }), 409
        
        # Verify focus area exists
        focus_area = LifeArea.query.get(data['focus_area_id'])
        if not focus_area:
            return jsonify({'error': 'Área de foco inválida'}), 400
        
        # Validate contribution points if provided
        contribution_points = data.get('contribution_points', [])
        if contribution_points:
            # Validate that all life areas exist
            life_area_ids = [cp.get('life_area_id') for cp in contribution_points]
            existing_areas = LifeArea.query.filter(LifeArea.id.in_(life_area_ids)).count()
            if existing_areas != len(life_area_ids):
                return jsonify({'error': 'Uma ou mais áreas da vida não existem'}), 400
            
            # Validate contribution points sum to 100
            total_points = sum(cp.get('points', 0) for cp in contribution_points)
            if total_points != 100:
                return jsonify({'error': f'Os pontos de contribuição devem somar 100, obtido {total_points}'}), 400
        
        # Create action plan
        action_plan = ActionPlan(
            assessment_id=assessment_id,
            focus_area_id=data['focus_area_id']
        )
        db.session.add(action_plan)
        db.session.flush()  # Get the ID without committing
        
        # Add contribution points
        for cp_data in contribution_points:
            if 'life_area_id' not in cp_data or 'points' not in cp_data:
                continue
            
            contribution_point = ActionContributionPoint(
                action_plan_id=action_plan.id,
                life_area_id=cp_data['life_area_id'],
                contribution_points=cp_data['points']
            )
            db.session.add(contribution_point)
        
        # Add actions
        actions_data = data.get('actions', [])
        for action_data in actions_data:
            if not action_data.get('action_text') or not action_data.get('strategy_text'):
                continue  # Skip incomplete actions
            
            target_date = None
            if action_data.get('target_date'):
                try:
                    target_date = datetime.strptime(action_data['target_date'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
            
            action = Action(
                action_plan_id=action_plan.id,
                action_text=action_data['action_text'],
                strategy_text=action_data['strategy_text'],
                target_date=target_date,
                status=action_data.get('status', 'planned')
            )
            db.session.add(action)
        
        db.session.commit()
        
        logger.info(f"Action plan {action_plan.id} created for assessment {assessment_id} by user {user_id}")
        
        return jsonify({
            'id': action_plan.id,
            'message': 'Plano de ação criado com sucesso',
            'focus_area_id': action_plan.focus_area_id,
            'created_at': action_plan.created_at.isoformat()
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': 'Dados inválidos', 'details': e.messages}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create action plan for assessment {assessment_id}: {str(e)}")
        return jsonify({'error': 'Falha ao criar plano de ação. Tente novamente.'}), 500

@app.route('/api/assessments/<int:assessment_id>/action-plan', methods=['PUT'])
@jwt_required()
@limiter.limit("10 per minute")
def update_action_plan(assessment_id):
    """Update existing action plan"""
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Nenhum dado fornecido'}), 400
        
        # Verify assessment ownership
        assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
        if not assessment:
            return jsonify({'error': 'Avaliação não encontrada'}), 404
        
        # Get existing action plan
        action_plan = ActionPlan.query.filter_by(assessment_id=assessment_id).first()
        if not action_plan:
            return jsonify({'error': 'Plano de ação não encontrado'}), 404
        
        # Update focus area if provided
        if 'focus_area_id' in data:
            focus_area = LifeArea.query.get(data['focus_area_id'])
            if not focus_area:
                return jsonify({'error': 'Área de foco inválida'}), 400
            action_plan.focus_area_id = data['focus_area_id']
            action_plan.updated_at = datetime.utcnow()
        
        # Update contribution points if provided
        if 'contribution_points' in data:
            contribution_points = data['contribution_points']
            
            # Validate contribution points sum to 100
            total_points = sum(cp.get('points', 0) for cp in contribution_points)
            if total_points != 100:
                return jsonify({'error': f'Os pontos de contribuição devem somar 100, obtido {total_points}'}), 400
            
            # Delete existing contribution points
            ActionContributionPoint.query.filter_by(action_plan_id=action_plan.id).delete()
            
            # Add new contribution points
            for cp_data in contribution_points:
                if 'life_area_id' not in cp_data or 'points' not in cp_data:
                    continue
                
                contribution_point = ActionContributionPoint(
                    action_plan_id=action_plan.id,
                    life_area_id=cp_data['life_area_id'],
                    contribution_points=cp_data['points']
                )
                db.session.add(contribution_point)
        
        # Update actions if provided
        if 'actions' in data:
            # For simplicity, replace all actions
            Action.query.filter_by(action_plan_id=action_plan.id).delete()
            
            actions_data = data['actions']
            for action_data in actions_data:
                if not action_data.get('action_text') or not action_data.get('strategy_text'):
                    continue
                
                target_date = None
                if action_data.get('target_date'):
                    try:
                        target_date = datetime.strptime(action_data['target_date'], '%Y-%m-%d').date()
                    except ValueError:
                        return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
                
                action = Action(
                    action_plan_id=action_plan.id,
                    action_text=action_data['action_text'],
                    strategy_text=action_data['strategy_text'],
                    target_date=target_date,
                    status=action_data.get('status', 'planned')
                )
                db.session.add(action)
        
        db.session.commit()
        
        logger.info(f"Action plan {action_plan.id} updated for assessment {assessment_id} by user {user_id}")
        
        return jsonify({
            'id': action_plan.id,
            'message': 'Plano de ação atualizado com sucesso'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to update action plan for assessment {assessment_id}: {str(e)}")
        return jsonify({'error': 'Falha ao atualizar plano de ação. Tente novamente.'}), 500

@app.route('/api/assessments/<int:assessment_id>/action-plan', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per minute")
def delete_action_plan(assessment_id):
    """Delete action plan and all related data"""
    user_id = get_jwt_identity()
    
    try:
        # Verify assessment ownership
        assessment = Assessment.query.filter_by(id=assessment_id, user_id=user_id).first()
        if not assessment:
            return jsonify({'error': 'Avaliação não encontrada'}), 404
        
        # Get action plan
        action_plan = ActionPlan.query.filter_by(assessment_id=assessment_id).first()
        if not action_plan:
            return jsonify({'error': 'Plano de ação não encontrado'}), 404
        
        # Delete related data (foreign key constraints with CASCADE should handle this)
        Action.query.filter_by(action_plan_id=action_plan.id).delete()
        ActionContributionPoint.query.filter_by(action_plan_id=action_plan.id).delete()
        
        # Delete action plan
        db.session.delete(action_plan)
        db.session.commit()
        
        logger.info(f"Action plan {action_plan.id} deleted for assessment {assessment_id} by user {user_id}")
        
        return jsonify({'message': 'Plano de ação excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete action plan for assessment {assessment_id}: {str(e)}")
        return jsonify({'error': 'Falha ao excluir plano de ação. Tente novamente.'}), 500

# Create tables and run app
if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    # Configure host and port
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    logger.info(f"Starting Flask application on {host}:{port}")
    app.run(host=host, port=port, debug=DEBUG_MODE)