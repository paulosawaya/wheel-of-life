// src/pages/AssessmentPage.js
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
  padding: 3rem;
  flex: 1;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const WheelCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 450px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 2rem;

  @media (max-width: 1200px) {
    position: static;
    width: 100%;
    max-width: 450px;
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
  background: #f8f9fa;
  transition: all 0.3s ease;

  &:hover {
    background: #e9ecef;
    transform: translateX(5px);
  }
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
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
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

  &:hover {
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

const AssessmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lifeAreas, setLifeAreas] = useState([]);
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [subcategories, setSubcategories] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [completedAreas, setCompletedAreas] = useState([]);
  const [wheelData, setWheelData] = useState(null);
  const [areaScores, setAreaScores] = useState({});

  useEffect(() => {
    loadLifeAreas();
  }, []);

  useEffect(() => {
    if (lifeAreas.length > 0) {
      loadAreaData(lifeAreas[currentAreaIndex].id);
    }
  }, [currentAreaIndex, lifeAreas]);

  useEffect(() => {
    updateWheelData();
  }, [responses, completedAreas, areaScores]);

  const loadLifeAreas = async () => {
    try {
      const response = await api.get('/life-areas');
      const areas = response.data;
      setLifeAreas(areas);
      
      // Initialize wheel data structure
      const initialWheelData = {
        areas: areas.map(area => ({
          id: area.id,
          name: area.name,
          color: area.color,
          score: 0,
          subcategories: []
        }))
      };
      setWheelData(initialWheelData);
      setIsLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar áreas da vida');
      setIsLoading(false);
    }
  };

  const loadAreaData = async (areaId) => {
    try {
      const subcategoriesResponse = await api.get(`/life-areas/${areaId}/subcategories`);
      const subcategoriesData = subcategoriesResponse.data;
      setSubcategories(subcategoriesData);

      const questionsPromises = subcategoriesData.map(sub =>
        api.get(`/subcategories/${sub.id}/questions`).then(res => ({
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          questions: res.data
        }))
      );

      const questionsData = await Promise.all(questionsPromises);
      setAllQuestions(questionsData);
    } catch (error) {
      toast.error('Erro ao carregar dados da área');
    }
  };

  const updateWheelData = () => {
    if (!lifeAreas.length || !wheelData) return;

    const updatedWheelData = { ...wheelData };
    
    // Update scores for completed areas
    updatedWheelData.areas = updatedWheelData.areas.map((area, index) => {
      if (areaScores[area.id]) {
        return { ...area, score: areaScores[area.id] };
      }
      
      // Calculate temporary score for current area
      if (index === currentAreaIndex && allQuestions.length > 0) {
        const currentAreaQuestions = getAllQuestionsFromArea();
        const answeredQuestions = currentAreaQuestions.filter(q => responses[q.id] !== undefined);
        
        if (answeredQuestions.length > 0) {
          const tempScore = answeredQuestions.reduce((sum, q) => sum + (responses[q.id] || 0), 0) / currentAreaQuestions.length;
          return { ...area, score: tempScore };
        }
      }
      
      return area;
    });

    setWheelData(updatedWheelData);
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

  const calculateAreaScore = () => {
    const allAreaQuestions = getAllQuestionsFromArea();
    const totalScore = allAreaQuestions.reduce((sum, q) => sum + (responses[q.id] || 0), 0);
    return totalScore / allAreaQuestions.length;
  };

  const saveCurrentAreaResponses = async () => {
    const areaResponses = [];
    
    allQuestions.forEach(subcategoryData => {
      subcategoryData.questions.forEach(q => {
        if (responses[q.id] !== undefined) {
          areaResponses.push({
            question_id: q.id,
            score: responses[q.id]
          });
        }
      });
    });

    try {
      await api.post(`/assessments/${id}/responses`, {
        responses: areaResponses
      });
      
      // Save the area score
      const currentArea = lifeAreas[currentAreaIndex];
      const areaScore = calculateAreaScore();
      setAreaScores(prev => ({
        ...prev,
        [currentArea.id]: areaScore
      }));
      
    } catch (error) {
      toast.error('Erro ao salvar respostas');
      throw error;
    }
  };

  const getAllQuestionsFromArea = () => {
    const questions = [];
    allQuestions.forEach(subcategoryData => {
      questions.push(...subcategoryData.questions);
    });
    return questions;
  };

  const handleContinue = async () => {
    const allAreaQuestions = getAllQuestionsFromArea();
    
    const unansweredQuestions = allAreaQuestions.filter(q => responses[q.id] === undefined);
    if (unansweredQuestions.length > 0) {
      toast.error('Por favor, responda todas as questões');
      return;
    }

    try {
      await saveCurrentAreaResponses();
      
      // Mark current area as completed
      setCompletedAreas(prev => [...prev, currentAreaIndex]);
      
      if (currentAreaIndex < lifeAreas.length - 1) {
        setCurrentAreaIndex(prev => prev + 1);
        // Clear responses for the next area
        const currentAreaQuestionIds = getAllQuestionsFromArea().map(q => q.id);
        setResponses(prev => {
          const newResponses = { ...prev };
          currentAreaQuestionIds.forEach(id => delete newResponses[id]);
          return newResponses;
        });
      } else {
        await api.post(`/assessments/${id}/calculate`);
        navigate(`/results/${id}`);
      }
    } catch (error) {
      // Error already handled
    }
  };

  const jumpToArea = (index) => {
    if (index <= completedAreas.length) {
      setCurrentAreaIndex(index);
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (lifeAreas.length === 0) {
    return <div>Nenhuma área encontrada</div>;
  }

  const currentArea = lifeAreas[currentAreaIndex];
  const allAreaQuestions = getAllQuestionsFromArea();
  const isAllAnswered = allAreaQuestions.every(q => responses[q.id] !== undefined);
  const totalQuestions = allAreaQuestions.length;
  const answeredQuestions = allAreaQuestions.filter(q => responses[q.id] !== undefined).length;

  return (
    <Container>
      <Header>
        <h1>RODA DA VIDA</h1>
        <p>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</p>
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

          <QuestionCounter>
            Questões respondidas: {answeredQuestions} de {totalQuestions}
          </QuestionCounter>

          <AreaTitle>{currentArea.name.toUpperCase()}</AreaTitle>
          <AreaNote>(Dê uma nota de 0 à 10 para cada afirmação:)</AreaNote>

          {allQuestions.map((subcategoryData, scIndex) => (
            <div key={subcategoryData.subcategoryId}>
              <SubcategoryTitle>{subcategoryData.subcategoryName}</SubcategoryTitle>
              
              {subcategoryData.questions.map((question, qIndex) => {
                const questionNumber = scIndex * 4 + qIndex + 1;
                return (
                  <QuestionContainer key={question.id}>
                    <QuestionText>
                      {questionNumber}. {question.question_text}
                    </QuestionText>
                    <ScoreInput
                      type="number"
                      min="0"
                      max="10"
                      value={responses[question.id] || ''}
                      onChange={(e) => handleScoreChange(question.id, e.target.value)}
                      placeholder="0-10"
                    />
                  </QuestionContainer>
                );
              })}
            </div>
          ))}

          <ButtonContainer>
            <ContinueButton 
              onClick={handleContinue}
              disabled={!isAllAnswered}
            >
              {currentAreaIndex < lifeAreas.length - 1 ? 'CONTINUAR >>' : 'FINALIZAR >>'}
            </ContinueButton>
          </ButtonContainer>
        </ContentCard>

        <WheelCard>
          <WheelTitle>Seu Progresso</WheelTitle>
          <WheelDiagram 
            data={wheelData}
            size={350}
            interactive={true}
            showPercentages={true}
          />
          <ScoreDisplay>
            Áreas completas: {completedAreas.length} de {lifeAreas.length}
          </ScoreDisplay>
        </WheelCard>
      </MainContent>
    </Container>
  );
};

export default AssessmentPage;
