// frontend/src/pages/AssessmentPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';
import WheelDiagram from '../components/WheelDiagram'; // Ensure this path is correct

// Styled Components (keep them as they are or adjust if needed)
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
  padding: 2rem; /* Adjusted padding */
  flex: 1;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-height: 85vh; /* Added max-height */
  overflow-y: auto; /* Added overflow */

   /* Custom scrollbar for webkit browsers */
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
  width: 100%; /* Make it responsive */
  max-width: 450px; /* Max width for larger screens */
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 2rem;

  @media (max-width: 1200px) {
    position: static; /* Becomes static on smaller screens */
    order: -1; /* Move wheel to top on smaller screens */
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
  margin: 1.5rem 0 1rem 0; /* Adjusted margin */
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
`;

const AreaNote = styled.p`
  color: #666;
  margin-bottom: 1.5rem; /* Adjusted margin */
`;

const QuestionContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem; /* Adjusted margin */
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
  margin-bottom: 0.5rem; /* Added margin for mobile */

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
    width: 100%; /* Full width on mobile */
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

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem; /* Adjusted margin */
  gap: 0.5rem;
  flex-wrap: wrap; /* Allow dots to wrap */
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
  height: 200px; /* Or any suitable height */
  font-size: 1.2rem;
  color: #666;
`;


const AssessmentPage = () => {
  const { id: assessmentId } = useParams(); // Renamed to avoid conflict
  const navigate = useNavigate();

  // State for data fetching and management
  const [lifeAreas, setLifeAreas] = useState([]); // Stores areas with their subcategories
  const [allQuestionsBySubcategory, setAllQuestionsBySubcategory] = useState({}); // { subcategoryId: [questions] }
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [responses, setResponses] = useState({}); // { questionId: score }
  const [isLoading, setIsLoading] = useState(true);
  const [completedAreas, setCompletedAreas] = useState([]); // Array of completed area indices

  // State for the WheelDiagram
  const [wheelDataForDiagram, setWheelDataForDiagram] = useState(null); // Data structure for WheelDiagram

  // Helper to get all questions for the current area being displayed
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
  

  // 1. Load initial structure: life areas and their subcategories
  useEffect(() => {
    const loadInitialStructure = async () => {
      setIsLoading(true);
      try {
        const areasResponse = await api.get('/life-areas');
        const areasData = areasResponse.data;

        const detailedAreasPromises = areasData.map(async (area) => {
          const subcatResponse = await api.get(`/life-areas/${area.id}/subcategories`);
          const subcategoriesWithScore = subcatResponse.data.map(sc => ({ ...sc, score: 0, questions: [] }));
          return { ...area, score: 0, subcategories: subcategoriesWithScore };
        });

        const detailedAreas = await Promise.all(detailedAreasPromises);
        setLifeAreas(detailedAreas);

        // Pre-populate wheelDataForDiagram structure
        const initialWheelData = {
          areas: detailedAreas.map(area => ({
            id: area.id,
            name: area.name,
            color: area.color,
            score: 0, // Area score, will be calculated
            subcategories: area.subcategories.map(sc => ({
              id: sc.id,
              name: sc.name,
              score: 0 // Subcategory score, will be calculated
            }))
          }))
        };
        setWheelDataForDiagram(initialWheelData);
        
        if (detailedAreas.length > 0) {
          setCurrentAreaIndex(0); // Start with the first area
        }
      } catch (error) {
        toast.error('Erro ao carregar estrutura da avaliação.');
        console.error("Error loading initial structure:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialStructure();
  }, []);

  // 2. Load questions for the current area when it changes or when lifeAreas is populated
  useEffect(() => {
    if (lifeAreas.length === 0 || !lifeAreas[currentAreaIndex]) return;

    const loadQuestionsForArea = async () => {
      const currentArea = lifeAreas[currentAreaIndex];
      if (!currentArea || !currentArea.subcategories) return;
      
      setIsLoading(true); // Show loading when fetching questions for a new area
      const newQuestionsBySubcat = { ...allQuestionsBySubcategory };
      let questionsActuallyFetched = false;

      try {
        for (const sub of currentArea.subcategories) {
          // Only fetch if not already loaded
          if (!newQuestionsBySubcat[sub.id] || newQuestionsBySubcat[sub.id].length === 0) {
            const questionsResponse = await api.get(`/subcategories/${sub.id}/questions`);
            newQuestionsBySubcat[sub.id] = questionsResponse.data;
            questionsActuallyFetched = true;
          }
        }
        if (questionsActuallyFetched) {
          setAllQuestionsBySubcategory(newQuestionsBySubcat);
        }
      } catch (error) {
        toast.error(`Erro ao carregar questões para ${currentArea.name}.`);
        console.error("Error loading questions for area:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestionsForArea();
  }, [currentAreaIndex, lifeAreas]); // Removed allQuestionsBySubcategory from deps to avoid loop

  // 3. Update WheelDiagram data whenever responses or areas change
  useEffect(() => {
    if (!lifeAreas.length || Object.keys(allQuestionsBySubcategory).length === 0) {
      // If lifeAreas or allQuestionsBySubcategory is not ready, use the initial or last known wheelDataForDiagram
      // This prevents the wheel from disappearing if data is still loading.
      return;
    }
  
    const newDiagramData = {
      areas: lifeAreas.map(areaConfig => {
        let sumOfSubcategoryScores = 0;
        let countOfScoredSubcategories = 0;
  
        const updatedSubcategories = areaConfig.subcategories.map(sub => {
          const questionsForThisSub = allQuestionsBySubcategory[sub.id] || [];
          let subcategoryScore = 0;
          let answeredQuestionsInSub = 0;
          let totalScoreInSub = 0;
  
          if (questionsForThisSub.length > 0) {
            questionsForThisSub.forEach(q => {
              if (responses[q.id] !== undefined) {
                totalScoreInSub += responses[q.id];
                answeredQuestionsInSub++;
              }
            });
            // Calculate score only if at least one question is answered, otherwise it's 0
            // Or, if you want to average over all questions, even unanswered (treating them as 0):
            // subcategoryScore = totalScoreInSub / questionsForThisSub.length;
            subcategoryScore = answeredQuestionsInSub > 0 ? totalScoreInSub / questionsForThisSub.length : 0;

          }
          
          if (questionsForThisSub.length > 0) { // Consider a subcategory for area average if it has questions
            sumOfSubcategoryScores += subcategoryScore;
            countOfScoredSubcategories++;
          }
  
          return {
            ...sub, // id, name from lifeAreas structure
            score: parseFloat(subcategoryScore.toFixed(1)) // Score from 0 to 10
          };
        });
  
        const areaScore = countOfScoredSubcategories > 0 ? sumOfSubcategoryScores / countOfScoredSubcategories : 0;
  
        return {
          ...areaConfig, // id, name, color from lifeAreas structure
          score: parseFloat(areaScore.toFixed(1)), // Area score from 0 to 10
          subcategories: updatedSubcategories
        };
      })
    };
    setWheelDataForDiagram(newDiagramData);
  
  }, [responses, lifeAreas, allQuestionsBySubcategory]);


  const handleScoreChange = (questionId, score) => {
    const value = score === '' ? undefined : parseInt(score, 10); // Allow clearing the input
    if (value === undefined || (value >= 0 && value <= 10)) {
      setResponses(prev => ({
        ...prev,
        [questionId]: value
      }));
    }
  };

  const saveCurrentAreaResponsesAPI = async () => {
    const currentArea = lifeAreas[currentAreaIndex];
    if (!currentArea) return;

    const areaResponsesPayload = [];
    currentArea.subcategories.forEach(sub => {
      const questionsForSub = allQuestionsBySubcategory[sub.id] || [];
      questionsForSub.forEach(q => {
        if (responses[q.id] !== undefined) {
          areaResponsesPayload.push({
            question_id: q.id,
            score: responses[q.id]
          });
        }
      });
    });
    
    if (areaResponsesPayload.length === 0) { // No responses to save for this area
        return;
    }

    try {
      await api.post(`/assessments/${assessmentId}/responses`, {
        responses: areaResponsesPayload
      });
      // toast.success(`Respostas para ${currentArea.name} salvas!`); // Optional: per-area save confirmation
    } catch (error) {
      toast.error(`Erro ao salvar respostas para ${currentArea.name}.`);
      console.error("Error saving responses:", error);
      throw error; // Re-throw to stop progression
    }
  };

  const handleContinue = async () => {
    const currentQuestions = getCurrentAreaDisplayedQuestions();
    const unansweredQuestions = currentQuestions.filter(q => responses[q.id] === undefined || responses[q.id] === '');
    
    if (unansweredQuestions.length > 0) {
      toast.error('Por favor, responda todas as questões da área atual.');
      return;
    }

    try {
      await saveCurrentAreaResponsesAPI();
      setCompletedAreas(prev => [...new Set([...prev, currentAreaIndex])]); // Mark area as completed

      if (currentAreaIndex < lifeAreas.length - 1) {
        setCurrentAreaIndex(prev => prev + 1);
      } else {
        // All areas completed, finalize assessment
        toast.loading('Calculando resultados finais...', { duration: 1500 });
        await api.post(`/assessments/${assessmentId}/calculate`);
        navigate(`/results/${assessmentId}`);
      }
    } catch (error) {
      // Error is handled in saveCurrentAreaResponsesAPI
    }
  };

  const jumpToArea = async (index) => {
    // Only allow jumping if current area is complete or jumping to an already completed/current area
    const currentQuestions = getCurrentAreaDisplayedQuestions();
    const isCurrentAreaComplete = currentQuestions.every(q => responses[q.id] !== undefined && responses[q.id] !== '');

    if (index !== currentAreaIndex && !isCurrentAreaComplete && !completedAreas.includes(currentAreaIndex)) {
        toast.error(`Por favor, complete a área atual (${lifeAreas[currentAreaIndex].name}) antes de mudar.`);
        return;
    }
    if (index !== currentAreaIndex && isCurrentAreaComplete && !completedAreas.includes(currentAreaIndex)) {
        try {
            await saveCurrentAreaResponsesAPI();
            setCompletedAreas(prev => [...new Set([...prev, currentAreaIndex])]);
            setCurrentAreaIndex(index);
        } catch (error) {
            // Error saving, don't navigate
            return;
        }
    } else {
       setCurrentAreaIndex(index);
    }
  };


  if (isLoading && !lifeAreas.length) { // Show initial loading only if no areas are loaded yet
    return <LoadingContainer>Carregando avaliação...</LoadingContainer>;
  }

  if (!lifeAreas.length) {
    return <Container><Header>Nenhuma área da vida encontrada para avaliação.</Header></Container>;
  }

  const currentArea = lifeAreas[currentAreaIndex];
  const currentQuestionsForDisplay = getCurrentAreaDisplayedQuestions();
  const totalQuestionsInCurrentArea = currentQuestionsForDisplay.length;
  const answeredQuestionsInCurrentArea = currentQuestionsForDisplay.filter(q => responses[q.id] !== undefined && responses[q.id] !== '').length;
  const isCurrentAreaAllAnswered = totalQuestionsInCurrentArea > 0 && answeredQuestionsInCurrentArea === totalQuestionsInCurrentArea;


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
                key={area.id}
                active={index === currentAreaIndex}
                completed={completedAreas.includes(index)}
                onClick={() => jumpToArea(index)}
                title={area.name}
              />
            ))}
          </ProgressIndicator>

          {currentArea && (
            <>
              <QuestionCounter>
                {`Questões respondidas: ${answeredQuestionsInCurrentArea} de ${totalQuestionsInCurrentArea}`}
              </QuestionCounter>
              <AreaTitle>{currentArea.name.toUpperCase()}</AreaTitle>
              <AreaNote>(Dê uma nota de 0 a 10 para cada afirmação)</AreaNote>

              {isLoading && currentQuestionsForDisplay.length === 0 && <LoadingContainer>Carregando questões...</LoadingContainer>}

              {currentArea.subcategories.map((subcategory) => (
                <div key={subcategory.id}>
                  <SubcategoryTitle>{subcategory.name}</SubcategoryTitle>
                  {(allQuestionsBySubcategory[subcategory.id] || []).map((question, qIndex) => {
                    const questionNumberInArea = currentArea.subcategories
                      .slice(0, currentArea.subcategories.findIndex(s => s.id === subcategory.id))
                      .reduce((acc, s) => acc + (allQuestionsBySubcategory[s.id]?.length || 0), 0) + qIndex + 1;
                    
                    return (
                      <QuestionContainer key={question.id}>
                        <QuestionText>
                          {questionNumberInArea}. {question.question_text}
                        </QuestionText>
                        <ScoreInput
                          type="number"
                          min="0"
                          max="10"
                          value={responses[question.id] === undefined ? '' : responses[question.id]}
                          onChange={(e) => handleScoreChange(question.id, e.target.value)}
                          placeholder="0-10"
                        />
                      </QuestionContainer>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          <ButtonContainer>
            <ContinueButton
              onClick={handleContinue}
              disabled={!isCurrentAreaAllAnswered || isLoading}
            >
              {currentAreaIndex < lifeAreas.length - 1 ? 'PRÓXIMA ÁREA >>' : 'FINALIZAR AVALIAÇÃO >>'}
            </ContinueButton>
          </ButtonContainer>
        </ContentCard>

        <WheelCard>
          <WheelTitle>Seu Progresso em Tempo Real</WheelTitle>
          {wheelDataForDiagram ? (
            <WheelDiagram
              data={wheelDataForDiagram}
              showSubcategories={true} // Always show subcategories for live update
              size={350}
              interactive={false} // Non-interactive during assessment for clarity
              showPercentages={true}
            />
          ) : (
            <LoadingContainer>Carregando diagrama...</LoadingContainer>
          )}
          <ScoreDisplay>
            Áreas completas: {completedAreas.length} de {lifeAreas.length}
          </ScoreDisplay>
        </WheelCard>
      </MainContent>
    </Container>
  );
};

export default AssessmentPage;
