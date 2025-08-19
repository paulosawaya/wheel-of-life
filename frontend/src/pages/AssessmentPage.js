// frontend/src/pages/AssessmentPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';
import WheelDiagram from '../components/WheelDiagram';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 2rem;
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 3rem;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const PrefilledNotice = styled.div`
  background: #e8f4fd;
  border-left: 4px solid #2196F3;
  padding: 1rem;
  margin-bottom: 2rem;
  border-radius: 5px;
  
  h4 {
    color: #1976D2;
    margin: 0 0 0.5rem 0;
  }
  
  p {
    color: #555;
    margin: 0;
    font-size: 0.95rem;
  }
`;

const AreaTitle = styled.h2`
  color: #333;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
`;

const SubcategoryTitle = styled.h3`
  color: #666;
  font-size: 1.3rem;
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
`;

const AreaNote = styled.p`
  color: #666;
  margin-bottom: 2rem;
`;

const QuestionContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 10px;
  background: ${props => props.isPrefilled ? '#fff9e6' : '#f8f9fa'};
  border: ${props => props.isPrefilled ? '1px solid #ffd54f' : '1px solid transparent'};
  position: relative;
  
  ${props => props.isPrefilled && `
    &::after {
      content: 'Pré-preenchido';
      position: absolute;
      top: -8px;
      right: 10px;
      background: #ffc107;
      color: #333;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: bold;
    }
  `}
`;

const QuestionText = styled.span`
  flex: 1;
  color: #333;
  font-size: 1rem;
  line-height: 1.4;
`;

const ScoreInput = styled.input`
  width: 60px;
  height: 40px;
  border: 2px solid ${props => props.isPrefilled ? '#ffd54f' : '#ddd'};
  border-radius: 5px;
  text-align: center;
  font-size: 1.1rem;
  margin-left: 1rem;
  background: ${props => props.isPrefilled ? '#fffbf0' : 'white'};

  &:focus {
    outline: none;
    border-color: #4ECDC4;
    background: white;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 1rem;
`;

const ContinueButton = styled.button`
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #45b7b8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const ClearPrefilledButton = styled.button`
  background: #ff9800;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #f57c00;
  }
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  gap: 0.5rem;
`;

const ProgressDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.active ? '#4ECDC4' : '#e0e0e0'};
  transition: all 0.3s;
`;

const WheelContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 2rem 0;
`;

const ScoreSummary = styled.div`
  background: #f0f8ff;
  border-radius: 10px;
  padding: 1rem;
  margin-top: 1rem;
  text-align: center;
  
  h4 {
    color: #333;
    margin: 0 0 0.5rem 0;
  }
  
  p {
    color: #666;
    margin: 0;
  }
`;

const AssessmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [areas, setAreas] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [prefilledResponses, setPrefilledResponses] = useState({});
  const [hasPrefilledData, setHasPrefilledData] = useState(false);
  const [wheelData, setWheelData] = useState([]);
  const [showWheel, setShowWheel] = useState(false);

  useEffect(() => {
    loadAssessmentData();
    loadPreviousResponses();
  }, [id]);

  const loadAssessmentData = async () => {
    try {
      // Load assessment details
      const assessmentResponse = await api.get(`/assessments/${id}`);
      setAssessment(assessmentResponse.data);
      setCurrentAreaIndex(assessmentResponse.data.current_area_index || 0);
      
      // Load life areas
      const areasResponse = await api.get('/life-areas');
      setAreas(areasResponse.data);
      
      // Initialize wheel data structure
      const initialWheelData = areasResponse.data.map(area => ({
        name: area.name,
        value: 0,
        percentage: 0,
        color: area.color
      }));
      setWheelData(initialWheelData);
      
      // Load existing responses if any
      const responsesResponse = await api.get(`/assessments/${id}/responses`);
      if (responsesResponse.data.responses) {
        const existingResponses = {};
        responsesResponse.data.responses.forEach(r => {
          existingResponses[r.question_id] = r.score;
        });
        setResponses(existingResponses);
      }
    } catch (error) {
      console.error('Error loading assessment data:', error);
      toast.error('Erro ao carregar avaliação');
    }
  };

  const loadPreviousResponses = async () => {
    try {
      // Try to get the last completed assessment
      const response = await api.get('/user/last-assessment');
      if (response.data && response.data.responses) {
        setPrefilledResponses(response.data.responses);
        setHasPrefilledData(true);
        toast.success('Respostas da última avaliação foram pré-preenchidas. Você pode ajustá-las conforme necessário.');
      }
    } catch (error) {
      // No previous assessment found, which is fine
      console.log('No previous assessment found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (areas.length > 0 && currentAreaIndex < areas.length) {
      loadQuestionsForArea(areas[currentAreaIndex].id);
    }
  }, [currentAreaIndex, areas]);

  const loadQuestionsForArea = async (areaId) => {
    try {
      const subcategoriesResponse = await api.get(`/life-areas/${areaId}/subcategories`);
      const allQuestions = [];
      
      for (const subcategory of subcategoriesResponse.data) {
        const questionsResponse = await api.get(`/subcategories/${subcategory.id}/questions`);
        allQuestions.push({
          subcategory: subcategory,
          questions: questionsResponse.data
        });
      }
      
      setCurrentQuestions(allQuestions);
      
      // Apply prefilled responses if available and not already set
      if (hasPrefilledData && Object.keys(responses).length === 0) {
        const newResponses = { ...responses };
        allQuestions.forEach(group => {
          group.questions.forEach(question => {
            if (prefilledResponses[question.id] !== undefined && !newResponses[question.id]) {
              newResponses[question.id] = prefilledResponses[question.id];
            }
          });
        });
        setResponses(newResponses);
      }
    } catch (error) {
      toast.error('Erro ao carregar perguntas');
    }
  };

  const handleScoreChange = (questionId, score) => {
    const numScore = parseInt(score);
    if (numScore >= 0 && numScore <= 10) {
      setResponses(prev => ({
        ...prev,
        [questionId]: numScore
      }));
    }
  };

  const clearPrefilledData = () => {
    const clearedResponses = {};
    // Only clear prefilled data, keep manually entered responses
    Object.keys(responses).forEach(questionId => {
      if (!prefilledResponses[questionId]) {
        clearedResponses[questionId] = responses[questionId];
      }
    });
    setResponses(clearedResponses);
    setHasPrefilledData(false);
    toast.success('Dados pré-preenchidos foram limpos');
  };

  const isAreaComplete = () => {
    const allQuestionIds = currentQuestions.flatMap(group => 
      group.questions.map(q => q.id)
    );
    return allQuestionIds.every(id => responses[id] !== undefined);
  };

  const calculateAreaAverage = () => {
    const allScores = currentQuestions.flatMap(group =>
      group.questions.map(q => responses[q.id] || 0)
    );
    if (allScores.length === 0) return 0;
    return allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  };

  const updateWheelData = () => {
    const newWheelData = [...wheelData];
    const currentArea = areas[currentAreaIndex];
    const average = calculateAreaAverage();
    
    const areaIndex = newWheelData.findIndex(item => item.name === currentArea.name);
    if (areaIndex !== -1) {
      newWheelData[areaIndex] = {
        ...newWheelData[areaIndex],
        value: average,
        percentage: (average / 10) * 100
      };
    }
    
    setWheelData(newWheelData);
  };

  const saveAndContinue = async () => {
    if (!isAreaComplete()) {
      toast.error('Por favor, responda todas as perguntas');
      return;
    }

    try {
      // Save responses for current area
      const responsesToSave = currentQuestions.flatMap(group =>
        group.questions.map(q => ({
          question_id: q.id,
          score: responses[q.id]
        }))
      );

      await api.post(`/assessments/${id}/responses`, {
        responses: responsesToSave
      });

      // Update wheel data
      updateWheelData();
      setShowWheel(true);

      if (currentAreaIndex < areas.length - 1) {
        // Move to next area
        await api.patch(`/assessments/${id}/progress`, {
          current_area_index: currentAreaIndex + 1
        });
        
        setCurrentAreaIndex(currentAreaIndex + 1);
        setShowWheel(false);
        toast.success(`Área ${areas[currentAreaIndex].name} concluída!`);
      } else {
        // Assessment complete
        await api.post(`/assessments/${id}/complete`);
        toast.success('Avaliação concluída com sucesso!');
        navigate(`/results/${id}`);
      }
    } catch (error) {
      toast.error('Erro ao salvar respostas');
    }
  };

  if (loading || areas.length === 0) {
    return (
      <Container>
        <Header>
          <h1>Carregando...</h1>
        </Header>
      </Container>
    );
  }

  const currentArea = areas[currentAreaIndex];

  return (
    <Container>
      <Header>
        <h1>RODA DA VIDA</h1>
        <p>Avaliação - {currentArea?.name}</p>
      </Header>

      <ContentCard>
        <ProgressIndicator>
          {areas.map((_, index) => (
            <ProgressDot key={index} active={index <= currentAreaIndex} />
          ))}
        </ProgressIndicator>

        {hasPrefilledData && currentAreaIndex === 0 && (
          <PrefilledNotice>
            <h4>📝 Dados Pré-preenchidos Disponíveis</h4>
            <p>
              As respostas da sua última avaliação foram carregadas automaticamente. 
              Você pode mantê-las, ajustá-las ou limpá-las completamente.
            </p>
          </PrefilledNotice>
        )}

        <AreaTitle>{currentArea?.name.toUpperCase()}</AreaTitle>
        <AreaNote>
          Avalie cada aspecto de 0 a 10, onde 0 significa totalmente insatisfeito 
          e 10 significa totalmente satisfeito.
        </AreaNote>

        {currentQuestions.map((group, groupIndex) => (
          <div key={groupIndex}>
            <SubcategoryTitle>{group.subcategory.name}</SubcategoryTitle>
            {group.questions.map((question) => {
              const isPrefilled = hasPrefilledData && prefilledResponses[question.id] !== undefined;
              return (
                <QuestionContainer key={question.id} isPrefilled={isPrefilled}>
                  <QuestionText>{question.question_text}</QuestionText>
                  <ScoreInput
                    type="number"
                    min="0"
                    max="10"
                    value={responses[question.id] || ''}
                    onChange={(e) => handleScoreChange(question.id, e.target.value)}
                    placeholder="0-10"
                    isPrefilled={isPrefilled}
                  />
                </QuestionContainer>
              );
            })}
          </div>
        ))}

<<<<<<< HEAD
                      {subcategoryQuestions.map(question => (
                        <QuestionContainer key={question.id}>
                          <QuestionText>{question.question_text}</QuestionText>
                          <ScoreInput
                            type="number"
                            min="0"
                            max="10"
                            value={responses[question.id] || ''}
                            onChange={(e) => handleScoreChange(question.id, e.target.value)}
                            aria-label={`Score for ${question.question_text}`}
                          />
                        </QuestionContainer>

                      ))}
                    </div>
                  );
              })}
=======
        {isAreaComplete() && (
          <ScoreSummary>
            <h4>Média desta área: {calculateAreaAverage().toFixed(1)}/10</h4>
            <p>Todas as perguntas foram respondidas</p>
          </ScoreSummary>
        )}
>>>>>>> 5e2e3012478523a775f8092a5f2f7255a3922d66

        {showWheel && (
          <WheelContainer>
            <div style={{ width: '300px', height: '300px' }}>
              <WheelDiagram data={wheelData} />
            </div>
          </WheelContainer>
        )}

        <ButtonContainer>
          {hasPrefilledData && (
            <ClearPrefilledButton onClick={clearPrefilledData}>
              Limpar Pré-preenchidos
            </ClearPrefilledButton>
          )}
          <ContinueButton 
            onClick={saveAndContinue}
            disabled={!isAreaComplete()}
          >
            {currentAreaIndex < areas.length - 1 ? 'Continuar' : 'Finalizar Avaliação'}
          </ContinueButton>
        </ButtonContainer>
      </ContentCard>
    </Container>
  );
};

export default AssessmentPage;