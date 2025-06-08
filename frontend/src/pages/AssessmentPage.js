// frontend/src/pages/AssessmentPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';
import WheelDiagram from '../components/WheelDiagram';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  box-sizing: border-box;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 2rem;
`;

const MainContent = styled.div`
  display: flex;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  align-items: flex-start;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  flex: 1;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-height: 85vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
`;

const WheelCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 2rem;

  @media (max-width: 1200px) {
    position: static;
    order: -1;
    margin-bottom: 2rem;
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
  margin: 1.5rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
`;

const QuestionContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: #f8f9fa;
  transition: all 0.3s ease;

  &:hover {
    background: #e9ecef;
    transform: translateX(5px);
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const QuestionText = styled.span`
  flex: 1;
  color: #333;
  font-size: 1rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;

  @media (max-width: 600px) {
    margin-bottom: 0.5rem;
    width: 100%;
  }
`;

const ScoreInput = styled.input`
  width: 60px;
  height: 40px;
  border: 2px solid #ddd;
  border-radius: 5px;
  text-align: center;
  font-size: 1.1rem;
  margin-left: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
    box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
  
  @media (max-width: 600px) {
    margin-left: 0;
    width: 100%;
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
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background: #45b7b8;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(78, 205, 196, 0.3);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SaveButton = styled(ContinueButton)`
  background: #e67e22;
  
  &:hover:not(:disabled) {
    background: #d35400;
  }
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ProgressDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.active ? '#4ECDC4' : props.completed ? '#45b7b8' : '#ddd'};
  transition: all 0.3s;
  cursor: pointer;
  
  &:hover {
    transform: scale(1.2);
  }
`;

const WheelTitle = styled.h3`
  text-align: center;
  color: #333;
  margin-bottom: 1rem;
`;

const ScoreDisplay = styled.div`
  text-align: center;
  margin-top: 1rem;
  color: #666;
  font-size: 0.9rem;
`;

const QuestionCounter = styled.div`
  text-align: right;
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: #666;
`;

const AssessmentPage = () => {
  const { id: assessmentId } = useParams();
  const navigate = useNavigate();

  const [lifeAreas, setLifeAreas] = useState([]);
  const [allQuestionsBySubcategory, setAllQuestionsBySubcategory] = useState({});
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [completedAreas, setCompletedAreas] = useState([]);
  const [wheelDataForDiagram, setWheelDataForDiagram] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const getCurrentAreaDisplayedQuestions = useCallback(() => {
    if (!lifeAreas[currentAreaIndex] || !lifeAreas[currentAreaIndex].subcategories) {
      return [];
    }
    let questions = [];
    lifeAreas[currentAreaIndex].subcategories.forEach(sub => {
      questions.push(...(allQuestionsBySubcategory[sub.id] || []));
    });
    return questions;
  }, [currentAreaIndex, lifeAreas, allQuestionsBySubcategory]);

  useEffect(() => {
    loadAssessmentData();
  }, []);

  useEffect(() => {
    loadAreaQuestions();
  }, [currentAreaIndex]);

  useEffect(() => {
    updateWheelData();
  }, [responses, lifeAreas]);

  const loadAssessmentData = async () => {
    try {
      setIsLoading(true);
      
      // Load assessment progress
      const progressResponse = await api.get(`/assessments/${assessmentId}/progress`);
      const { assessment, answered_questions } = progressResponse.data;
      
      // Load life areas
      const areasResponse = await api.get('/life-areas');
      setLifeAreas(areasResponse.data);
      
      // Set current area index from saved progress
      setCurrentAreaIndex(assessment.current_area_index || 0);
      
      // Load saved responses
      setResponses(answered_questions || {});
      
      // Determine completed areas
      const completed = [];
      for (let i = 0; i < assessment.current_area_index; i++) {
        completed.push(i);
      }
      setCompletedAreas(completed);
      
    } catch (error) {
      toast.error('Erro ao carregar dados da avaliação');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAreaQuestions = async () => {
    if (!lifeAreas[currentAreaIndex]) return;

    try {
      const currentArea = lifeAreas[currentAreaIndex];
      const questionsMap = {};

      for (const subcategory of currentArea.subcategories) {
        const response = await api.get(`/subcategories/${subcategory.id}/questions`);
        questionsMap[subcategory.id] = response.data;
      }

      setAllQuestionsBySubcategory(prev => ({
        ...prev,
        ...questionsMap
      }));
    } catch (error) {
      toast.error('Erro ao carregar questões');
    }
  };

  const updateWheelData = () => {
    const areaScores = lifeAreas.map((area, index) => {
      let totalScore = 0;
      let questionCount = 0;

      area.subcategories.forEach(sub => {
        const questions = allQuestionsBySubcategory[sub.id] || [];
        questions.forEach(q => {
          if (responses[q.id] !== undefined) {
            totalScore += responses[q.id];
            questionCount++;
          }
        });
      });

      const averageScore = questionCount > 0 ? totalScore / questionCount : 0;
      const percentage = (averageScore / 10) * 100;

      return {
        area: area.name,
        percentage: percentage,
        color: area.color || '#4ECDC4',
        completed: completedAreas.includes(index) || index < currentAreaIndex
      };
    });

    setWheelDataForDiagram({ areas: areaScores });
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

  const saveProgress = async () => {
    try {
      setIsSaving(true);
      
      // Save responses
      const areaResponses = [];
      const questions = getCurrentAreaDisplayedQuestions();
      
      questions.forEach(q => {
        if (responses[q.id] !== undefined) {
          areaResponses.push({
            question_id: q.id,
            score: responses[q.id]
          });
        }
      });

      await api.post(`/assessments/${assessmentId}/responses`, {
        responses: areaResponses
      });

      // Update progress
      await api.post(`/assessments/${assessmentId}/update-progress`, {
        current_area_index: currentAreaIndex
      });

      toast.success('Progresso salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar progresso');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    const questions = getCurrentAreaDisplayedQuestions();
    const unansweredQuestions = questions.filter(q => responses[q.id] === undefined);
    
    if (unansweredQuestions.length > 0) {
      toast.error('Por favor, responda todas as questões');
      return;
    }

    try {
      await saveProgress();
      
      if (currentAreaIndex < lifeAreas.length - 1) {
        const newIndex = currentAreaIndex + 1;
        setCurrentAreaIndex(newIndex);
        setCompletedAreas([...completedAreas, currentAreaIndex]);
        
        // Update progress in backend
        await api.post(`/assessments/${assessmentId}/update-progress`, {
          current_area_index: newIndex
        });
      } else {
        // Complete assessment
        await api.post(`/assessments/${assessmentId}/calculate`);
        navigate(`/results/${assessmentId}`);
      }
    } catch (error) {
      // Error already handled
    }
  };

  const jumpToArea = (index) => {
    if (index <= Math.max(...completedAreas, currentAreaIndex)) {
      setCurrentAreaIndex(index);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <p>Carregando avaliação...</p>
        </LoadingContainer>
      </Container>
    );
  }

  const currentArea = lifeAreas[currentAreaIndex];
  const questions = getCurrentAreaDisplayedQuestions();
  const answeredCount = questions.filter(q => responses[q.id] !== undefined).length;
  const isAreaComplete = answeredCount === questions.length && questions.length > 0;

  return (
    <Container>
      <Header>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Avaliação da Roda da Vida
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          Avalie cada área da sua vida de 0 a 10
        </p>
      </Header>

      <MainContent>
        <ContentCard>
          <ProgressIndicator>
            {lifeAreas.map((area, index) => (
              <ProgressDot
                key={index}
                active={index === currentAreaIndex}
                completed={completedAreas.includes(index)}
                onClick={() => jumpToArea(index)}
                title={area.name}
              />
            ))}
          </ProgressIndicator>

          {currentArea && (
            <>
              <AreaTitle>{currentArea.name}</AreaTitle>
              <QuestionCounter>
                {answeredCount} de {questions.length} questões respondidas
              </QuestionCounter>

              {currentArea.subcategories.map(subcategory => {
                const subcategoryQuestions = allQuestionsBySubcategory[subcategory.id] || [];
                
                return (
                  <div key={subcategory.id}>
                    <SubcategoryTitle>{subcategory.name}</SubcategoryTitle>
                    
                    {subcategoryQuestions.map(question => (
                      <QuestionContainer key={question.id}>
                        <QuestionText>{question.question_text}</QuestionText>
                        <ScoreInput
                          type="number"
                          min="0"
                          max="10"
                          value={responses[question.id] || ''}
                          onChange={(e) => handleScoreChange(question.id, e.target.value)}
                          placeholder="0-10"
                        />
                      </QuestionContainer>
                    ))}
                  </div>
                );
              })}

              <ButtonContainer>
                <SaveButton onClick={saveProgress} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Progresso'}
                </SaveButton>
                <ContinueButton onClick={handleContinue} disabled={!isAreaComplete}>
                  {currentAreaIndex < lifeAreas.length - 1 ? 'Continuar' : 'Finalizar'}
                </ContinueButton>
              </ButtonContainer>
            </>
          )}
        </ContentCard>

        <WheelCard>
          <WheelTitle>Seu Progresso</WheelTitle>
          {wheelDataForDiagram && (
            <WheelDiagram
              data={wheelDataForDiagram}
              size={350}
              interactive={false}
              showPercentages={true}
            />
          )}
          <ScoreDisplay>
            <p>Áreas Completas: {completedAreas.length}/{lifeAreas.length}</p>
            <p>Progresso Total: {Math.round((completedAreas.length / lifeAreas.length) * 100)}%</p>
          </ScoreDisplay>
        </WheelCard>
      </MainContent>
    </Container>
  );
};

export default AssessmentPage;
