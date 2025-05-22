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

const ContentCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 3rem;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
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

  &:focus {
    outline: none;
    border-color: #4ECDC4;
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
  transition: background 0.3s;

  &:hover {
    background: #45b7b8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
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
  background: ${props => props.active ? '#4ECDC4' : '#ddd'};
  transition: background 0.3s;
`;

const DiagramContainer = styled.div`
  position: fixed;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border-radius: 15px;
  padding: 1rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);

  @media (max-width: 1200px) {
    display: none;
  }
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

  useEffect(() => {
    loadLifeAreas();
  }, []);

  useEffect(() => {
    if (lifeAreas.length > 0) {
      loadAreaData(lifeAreas[currentAreaIndex].id);
    }
  }, [currentAreaIndex, lifeAreas]);

  const loadLifeAreas = async () => {
    try {
      const response = await api.get('/life-areas');
      setLifeAreas(response.data);
      setIsLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar áreas da vida');
      setIsLoading(false);
    }
  };

  const loadAreaData = async (areaId) => {
    try {
      // Load subcategories for the area
      const subcategoriesResponse = await api.get(`/life-areas/${areaId}/subcategories`);
      const subcategoriesData = subcategoriesResponse.data;
      setSubcategories(subcategoriesData);

      // Load questions for all subcategories
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

  const handleScoreChange = (questionId, score) => {
    const numScore = parseInt(score);
    if (numScore >= 0 && numScore <= 10) {
      setResponses(prev => ({
        ...prev,
        [questionId]: numScore
      }));
    }
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
    
    // Validate all questions are answered
    const unansweredQuestions = allAreaQuestions.filter(q => responses[q.id] === undefined);
    if (unansweredQuestions.length > 0) {
      toast.error('Por favor, responda todas as questões');
      return;
    }

    try {
      await saveCurrentAreaResponses();
      
      if (currentAreaIndex < lifeAreas.length - 1) {
        setCurrentAreaIndex(prev => prev + 1);
        setResponses({});
      } else {
        // All areas completed, calculate scores and go to results
        await api.post(`/assessments/${id}/calculate`);
        navigate(`/results/${id}`);
      }
    } catch (error) {
      // Error already handled in saveCurrentAreaResponses
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

  return (
    <Container>
      <Header>
        <h1>RODA DA VIDA</h1>
        <p>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</p>
      </Header>

      <ContentCard>
        <ProgressIndicator>
          {lifeAreas.map((_, index) => (
            <ProgressDot key={index} active={index <= currentAreaIndex} />
          ))}
        </ProgressIndicator>

        <AreaTitle>{currentArea.name.toUpperCase()}</AreaTitle>
        <AreaNote>(Dê uma nota de 0 à 10 para cada afirmação:)</AreaNote>

        {allQuestions.map((subcategoryData) => (
          <div key={subcategoryData.subcategoryId}>
            <SubcategoryTitle>{subcategoryData.subcategoryName}</SubcategoryTitle>
            
            {subcategoryData.questions.map((question) => (
              <QuestionContainer key={question.id}>
                <QuestionText>
                  {question.question_text}
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
            ))}
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

      <DiagramContainer>
        <WheelDiagram />
      </DiagramContainer>
    </Container>
  );
};

export default AssessmentPage;
