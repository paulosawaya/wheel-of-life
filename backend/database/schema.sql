-- Wheel of Life Database Schema - Updated with Real Questions
CREATE DATABASE wheel_of_life;
USE wheel_of_life;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Life areas categories
CREATE TABLE life_areas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50),
    display_order INT DEFAULT 0
);

-- Subcategories within life areas
CREATE TABLE subcategories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    life_area_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    FOREIGN KEY (life_area_id) REFERENCES life_areas(id) ON DELETE CASCADE
);

-- Questions for each subcategory
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subcategory_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_order INT DEFAULT 0,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
);

-- User assessments
CREATE TABLE assessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT 'Avaliação da Roda da Vida',
    status ENUM('in_progress', 'completed') DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User responses to questions
CREATE TABLE responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assessment_id INT NOT NULL,
    question_id INT NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_response (assessment_id, question_id)
);

-- Subcategory scores calculated from responses
CREATE TABLE subcategory_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assessment_id INT NOT NULL,
    subcategory_id INT NOT NULL,
    average_score DECIMAL(3,1) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subcategory_score (assessment_id, subcategory_id)
);

-- Area scores calculated from subcategory averages
CREATE TABLE area_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assessment_id INT NOT NULL,
    life_area_id INT NOT NULL,
    average_score DECIMAL(3,1) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (life_area_id) REFERENCES life_areas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_area_score (assessment_id, life_area_id)
);

-- Action plans
CREATE TABLE action_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assessment_id INT NOT NULL,
    focus_area_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (focus_area_id) REFERENCES life_areas(id) ON DELETE CASCADE
);

-- Individual actions within action plans
CREATE TABLE actions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action_plan_id INT NOT NULL,
    action_text TEXT NOT NULL,
    strategy_text TEXT NOT NULL,
    target_date DATE,
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (action_plan_id) REFERENCES action_plans(id) ON DELETE CASCADE
);

-- Insert life areas
INSERT INTO life_areas (name, description, color, icon, display_order) VALUES
('Pessoal', 'Desenvolvimento pessoal, saúde e equilíbrio emocional', '#FF6B6B', 'user', 1),
('Qualidade de Vida', 'Plenitude, criatividade e espiritualidade', '#4ECDC4', 'heart', 2),
('Profissional', 'Carreira, finanças e contribuição social', '#45B7D1', 'briefcase', 3),
('Relacionamentos', 'Família, relacionamentos íntimos e vida social', '#96CEB4', 'users', 4);

-- Insert subcategories for PESSOAL
INSERT INTO subcategories (life_area_id, name, description, display_order) VALUES
(1, 'Saúde e disposição', 'Energia, vitalidade, alimentação, sono e atividade física', 1),
(1, 'Desenvolvimento intelectual', 'Aprendizado, conhecimento e crescimento intelectual', 2),
(1, 'Equilíbrio emocional', 'Gestão de emoções e bem-estar emocional', 3);

-- Insert subcategories for QUALIDADE DE VIDA
INSERT INTO subcategories (life_area_id, name, description, display_order) VALUES
(2, 'Plenitude e felicidade', 'Satisfação, paz interior e alinhamento com valores', 1),
(2, 'Criatividade, hobbies e diversão', 'Lazer, criatividade e atividades prazerosas', 2),
(2, 'Espiritualidade', 'Conexão espiritual, propósito e princípios', 3);

-- Insert subcategories for PROFISSIONAL
INSERT INTO subcategories (life_area_id, name, description, display_order) VALUES
(3, 'Realização e propósito', 'Satisfação profissional e alinhamento com propósito', 1),
(3, 'Recursos financeiros', 'Segurança financeira e planejamento', 2),
(3, 'Contribuição social', 'Impacto social e contribuição para o mundo', 3);

-- Insert subcategories for RELACIONAMENTOS
INSERT INTO subcategories (life_area_id, name, description, display_order) VALUES
(4, 'Família', 'Laços familiares, conexão e participação familiar', 1),
(4, 'Desenvolvimento de emoções', 'Relacionamentos íntimos e conexão emocional', 2),
(4, 'Vida social', 'Amizades, rede social e pertencimento', 3);

-- Insert questions for Saúde e disposição
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(1, 'Você se sente com energia e vitalidade na maior parte dos dias?', 1),
(1, 'Como você avalia sua alimentação, sono e atividade física?', 2),
(1, 'Com que frequência você cuida ativamente da sua saúde física?', 3),
(1, 'Em que medida você tem disposição para realizar suas atividades diárias?', 4);

-- Insert questions for Desenvolvimento intelectual
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(2, 'Você sente que está aprendendo e se desenvolvendo intelectualmente?', 1),
(2, 'Com que frequência você busca novos conhecimentos ou habilidades?', 2),
(2, 'Você tem se sentido mentalmente estimulado?', 3),
(2, 'Você sente que está crescendo intelectualmente na direção que deseja?', 4);

-- Insert questions for Equilíbrio emocional
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(3, 'Você sente que consegue lidar bem com suas emoções?', 1),
(3, 'Com que frequência você se sente emocionalmente equilibrado?', 2),
(3, 'Você tem estratégias saudáveis para lidar com estresse, raiva ou tristeza?', 3),
(3, 'Em que medida você compreende e acolhe suas emoções?', 4);

-- Insert questions for Plenitude e felicidade
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(4, 'Em que medida você sente satisfação com sua vida como um todo?', 1),
(4, 'Quanto você se sente em paz consigo mesmo e com suas escolhas?', 2),
(4, 'Com que frequência você sente alegria genuína no seu dia a dia?', 3),
(4, 'Você sente que está vivendo de forma alinhada aos seus valores e sonhos?', 4);

-- Insert questions for Criatividade, hobbies e diversão
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(5, 'Com que frequência você se permite momentos de lazer e diversão?', 1),
(5, 'Você tem praticado atividades que estimulem sua criatividade?', 2),
(5, 'Quanto do seu tempo é dedicado a hobbies ou paixões pessoais?', 3),
(5, 'Você sente prazer nas atividades que faz por pura diversão?', 4);

-- Insert questions for Espiritualidade
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(6, 'Em que grau você sente conexão com algo maior (fé, propósito, natureza, etc.)?', 1),
(6, 'Com que frequência você pratica algo que fortalece sua espiritualidade?', 2),
(6, 'Você sente que sua espiritualidade te dá direção ou apoio nos desafios?', 3),
(6, 'Quanto você sente que vive de forma coerente com seus princípios espirituais?', 4);

-- Insert questions for Realização e propósito
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(7, 'Em que medida você sente que seu trabalho tem propósito para você?', 1),
(7, 'Você se sente realizado com o que faz profissionalmente?', 2),
(7, 'Com que frequência você se sente motivado no ambiente profissional?', 3),
(7, 'Sua carreira está alinhada com seus valores e aspirações?', 4);

-- Insert questions for Recursos financeiros
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(8, 'Você se sente seguro financeiramente para viver sua vida com tranquilidade?', 1),
(8, 'Quanto você está satisfeito com sua organização e planejamento financeiro?', 2),
(8, 'Você tem conseguido poupar ou investir para o futuro?', 3),
(8, 'Você sente que seu dinheiro é usado de forma alinhada às suas prioridades?', 4);

-- Insert questions for Contribuição social
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(9, 'Em que medida você sente que contribui positivamente para o mundo ao seu redor?', 1),
(9, 'Você participa de ações que impactam positivamente outras pessoas?', 2),
(9, 'Com que frequência você sente que está fazendo a diferença?', 3),
(9, 'Sua vida tem espaço para servir ou ajudar causas que considera importantes?', 4);

-- Insert questions for Família
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(10, 'Você sente que seus laços familiares são fortes e saudáveis?', 1),
(10, 'Com que frequência você se conecta de forma positiva com sua família?', 2),
(10, 'Em que grau você sente apoio e acolhimento da sua família?', 3),
(10, 'Quanto você se sente presente e participativo na vida familiar?', 4);

-- Insert questions for Desenvolvimento de emoções
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(11, 'Em que medida você se sente emocionalmente conectado com seu(sua) parceiro(a) ou pessoas íntimas?', 1),
(11, 'Você consegue se comunicar com clareza e vulnerabilidade nos relacionamentos afetivos?', 2),
(11, 'Com que frequência você expressa carinho, cuidado e afeto?', 3),
(11, 'Você sente que cresce emocionalmente nas suas relações mais próximas?', 4);

-- Insert questions for Vida social
INSERT INTO questions (subcategory_id, question_text, question_order) VALUES
(12, 'Quão satisfeito você está com a qualidade das suas amizades?', 1),
(12, 'Você sente que tem com quem contar nos momentos importantes?', 2),
(12, 'Com que frequência você se conecta socialmente com pessoas fora do trabalho/família?', 3),
(12, 'Você sente que pertence a algum grupo ou rede social significativa?', 4);