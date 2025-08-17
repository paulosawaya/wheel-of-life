// frontend/src/pages/ActionPlanPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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

const ReadOnlyBanner = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  svg {
    width: 24px;
    height: 24px;
    color: #ff9800;
  }
  
  div {
    flex: 1;
    
    h4 {
      margin: 0 0 0.25rem 0;
      color: #e65100;
    }
    
    p {
      margin: 0;
      color: #666;
      font-size: 0.95rem;
    }
  }
`;

const StepContainer = styled.div`
  margin-bottom: 3rem;
`;

const StepTitle = styled.h2`
  color: #333;
  font-size: 1.8rem;
  margin-bottom: 1rem;
`;

const StepDescription = styled.p`
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const Question = styled.p`
  color: #333;
  font-weight: bold;
  margin-bottom: 1rem;
`;

const Select = styled.select`
  width: 100%;
  max-width: 400px;
  padding: 0.8rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  margin-bottom: 2rem;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
  
  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const ContributionSection = styled.div`
  background: #f8f9fa;
  border-radius: 10px;
  padding: 1.5rem;
  margin: 2rem 0;
`;

const ContributionTitle = styled.h3`
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.2rem;
`;

const ContributionDescription = styled.p`
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
`;

const ContributionGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const ContributionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
`;

const AreaLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  
  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${props => props.color};
  }
  
  span {
    font-weight: 500;
    color: #333;
  }
`;

const PointsInput = styled.input`
  width: 80px;
  padding: 0.5rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  text-align: center;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
  
  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const PointsDisplay = styled.div`
  padding: 0.5rem 1rem;
  background: #e3f2fd;
  border-radius: 5px;
  font-weight: bold;
  color: #1976d2;
`;

const TotalPoints = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${props => props.isValid ? '#e8f5e9' : '#ffebee'};
  border-radius: 8px;
  text-align: center;
  
  span {
    font-weight: bold;
    color: ${props => props.isValid ? '#2e7d32' : '#c62828'};
    font-size: 1.1rem;
  }
  
  p {
    margin: 0.5rem 0 0 0;
    color: #666;
    font-size: 0.9rem;
  }
`;

const ActionForm = styled.form`
  margin-top: 2rem;
`;

const ActionGroup = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 10px;
  background: #f8f9fa;
`;

const ActionTitle = styled.h4`
  color: #333;
  margin-bottom: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.8rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
  
  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const DateInput = styled.input`
  padding: 0.8rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
  
  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 1rem;
`;

const SubmitButton = styled.button`
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

const ViewResultsButton = styled(SubmitButton)`
  background: #9b59b6;
  
  &:hover {
    background: #8e44ad;
  }
`;

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue } = useForm();
  const [assessment, setAssessment] = useState(null);
  const [areaResults, setAreaResults] = useState([]);
  const [lifeAreas, setLifeAreas] = useState([]);
  const [focusAreaId, setFocusAreaId] = useState('');
  const [contributionPoints, setContributionPoints] = useState({});
  const [existingPlan, setExistingPlan] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessmentData();
    loadLifeAreas();
    checkExistingPlan();
  }, [id]);

  const loadAssessmentData = async () => {
    try {
      const response = await api.get(`/assessments/${id}/results`);
      setAssessment(response.data.assessment);
      setAreaResults(response.data.area_results);
    } catch (error) {
      toast.error('Erro ao carregar resultados');
    }
  };

  const loadLifeAreas = async () => {
    try {
      const response = await api.get('/life-areas');
      setLifeAreas(response.data);
      
      // Initialize contribution points
      const initialPoints = {};
      response.data.forEach(area => {
        initialPoints[area.id] = 0;
      });
      setContributionPoints(initialPoints);
    } catch (error) {
      toast.error('Erro ao carregar áreas');
    }
  };

  const checkExistingPlan = async () => {
    try {
      const response = await api.get(`/assessments/${id}/action-plan`);
      if (response.data) {
        setExistingPlan(response.data);
        setIsReadOnly(true);
        setFocusAreaId(response.data.focus_area_id);
        
        // Set contribution points from existing plan
        const points = {};
        lifeAreas.forEach(area => {
          points[area.id] = 0;
        });
        response.data.contribution_points.forEach(cp => {
          points[cp.life_area_id] = cp.points;
        });
        setContributionPoints(points);
        
        toast.info('Este plano de ação já foi criado e não pode ser editado');
      }
    } catch (error) {
      // No existing plan, which is fine
      console.log('No existing plan found');
    } finally {
      setLoading(false);
    }
  };

  const handleContributionChange = (areaId, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue <= 100) {
      setContributionPoints(prev => ({
        ...prev,
        [areaId]: numValue
      }));
    }
  };

  const getTotalPoints = () => {
    return Object.values(contributionPoints).reduce((sum, points) => sum + points, 0);
  };

  const isValidTotal = () => {
    return getTotalPoints() === 100;
  };

  const onSubmit = async (data) => {
    if (!focusAreaId) {
      toast.error('Por favor, selecione uma área de foco');
      return;
    }

    if (!isValidTotal()) {
      toast.error('Os pontos de contribuição devem somar exatamente 100');
      return;
    }

    try {
      const contributionData = Object.entries(contributionPoints).map(([areaId, points]) => ({
        life_area_id: parseInt(areaId),
        points: points
      }));

      await api.post(`/assessments/${id}/action-plan`, {
        focus_area_id: parseInt(focusAreaId),
        contribution_points: contributionData,
        actions: [
          {
            action_text: data.action1,
            strategy_text: data.strategy1,
            target_date: data.date1
          },
          {
            action_text: data.action2,
            strategy_text: data.strategy2,
            target_date: data.date2
          },
          {
            action_text: data.action3,
            strategy_text: data.strategy3,
            target_date: data.date3
          }
        ]
      });

      toast.success('Plano de ação criado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Este plano de ação já existe e não pode ser modificado');
        setIsReadOnly(true);
      } else {
        toast.error('Erro ao criar plano de ação');
      }
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <h1>Carregando...</h1>
        </Header>
      </Container>
    );
  }

  const wheelData = areaResults.map(result => ({
    name: result.life_area_name,
    value: result.average_score,
    percentage: result.percentage,
    color: lifeAreas.find(a => a.id === result.life_area_id)?.color || '#ccc'
  }));

  return (
    <Container>
      <Header>
        <h1>PLANO DE AÇÃO</h1>
        <p>Defina seus objetivos e estratégias para melhorar sua Roda da Vida</p>
      </Header>

      <ContentCard>
        {isReadOnly && (
          <ReadOnlyBanner>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h4>Plano de Ação Finalizado</h4>
              <p>Este plano já foi criado e não pode ser editado. Você pode visualizar os detalhes abaixo.</p>
            </div>
          </ReadOnlyBanner>
        )}

        <StepContainer>
          <StepTitle>Passo 1: Escolha sua Área de Foco</StepTitle>
          <StepDescription>
            Com base nos seus resultados, selecione a área que você deseja priorizar neste momento.
          </StepDescription>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1 }}>
              <Question>Qual área você deseja focar?</Question>
              <Select 
                value={focusAreaId} 
                onChange={(e) => setFocusAreaId(e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">Selecione uma área...</option>
                {areaResults.map(result => (
                  <option key={result.life_area_id} value={result.life_area_id}>
                    {result.life_area_name} - Nota: {result.average_score.toFixed(1)}/10
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ width: '300px' }}>
              <WheelDiagram data={wheelData} />
            </div>
          </div>
        </StepContainer>

        <ContributionSection>
          <ContributionTitle>Passo 2: Distribua os Pontos de Contribuição</ContributionTitle>
          <ContributionDescription>
            Distribua 100 pontos entre as áreas da vida para indicar como cada uma contribuirá para seu foco principal.
            Por exemplo, se você focar em "Profissional", pode alocar pontos em "Pessoal" (saúde para ter energia) 
            e "Relacionamentos" (networking).
          </ContributionDescription>
          
          <ContributionGrid>
            {lifeAreas.map(area => (
              <ContributionItem key={area.id}>
                <AreaLabel color={area.color}>
                  <div className="color-dot" />
                  <span>{area.name}</span>
                </AreaLabel>
                {isReadOnly ? (
                  <PointsDisplay>{contributionPoints[area.id]} pontos</PointsDisplay>
                ) : (
                  <PointsInput
                    type="number"
                    min="0"
                    max="100"
                    value={contributionPoints[area.id] || 0}
                    onChange={(e) => handleContributionChange(area.id, e.target.value)}
                    disabled={isReadOnly}
                  />
                )}
              </ContributionItem>
            ))}
          </ContributionGrid>
          
          <TotalPoints isValid={isValidTotal()}>
            <span>Total: {getTotalPoints()}/100 pontos</span>
            {!isValidTotal() && !isReadOnly && (
              <p>Os pontos devem somar exatamente 100</p>
            )}
          </TotalPoints>
        </ContributionSection>

        <StepContainer>
          <StepTitle>Passo 3: Defina suas Ações</StepTitle>
          <StepDescription>
            Estabeleça 3 ações concretas que você se compromete a realizar para melhorar na área escolhida.
          </StepDescription>

          <ActionForm onSubmit={handleSubmit(onSubmit)}>
            {[1, 2, 3].map(num => (
              <ActionGroup key={num}>
                <ActionTitle>Ação {num}</ActionTitle>
                
                <Question>O que você vai fazer?</Question>
                <TextArea
                  {...register(`action${num}`, { required: !isReadOnly })}
                  placeholder="Descreva a ação específica que você vai tomar..."
                  disabled={isReadOnly}
                  defaultValue={existingPlan?.actions?.[num-1]?.action_text || ''}
                />
                
                <Question>Como você vai fazer?</Question>
                <TextArea
                  {...register(`strategy${num}`, { required: !isReadOnly })}
                  placeholder="Descreva sua estratégia para realizar esta ação..."
                  disabled={isReadOnly}
                  defaultValue={existingPlan?.actions?.[num-1]?.strategy_text || ''}
                />
                
                <Question>Quando você pretende concluir?</Question>
                <DateInput
                  type="date"
                  {...register(`date${num}`)}
                  disabled={isReadOnly}
                  defaultValue={existingPlan?.actions?.[num-1]?.target_date || ''}
                />
              </ActionGroup>
            ))}

            <ButtonContainer>
              {isReadOnly ? (
                <>
                  <ViewResultsButton type="button" onClick={() => navigate(`/results/${id}`)}>
                    Ver Resultados
                  </ViewResultsButton>
                  <SubmitButton type="button" onClick={() => navigate('/dashboard')}>
                    Voltar ao Dashboard
                  </SubmitButton>
                </>
              ) : (
                <SubmitButton type="submit" disabled={!isValidTotal()}>
                  Criar Plano de Ação
                </SubmitButton>
              )}
            </ButtonContainer>
          </ActionForm>
        </StepContainer>
      </ContentCard>
    </Container>
  );
};

export default ActionPlanPage;