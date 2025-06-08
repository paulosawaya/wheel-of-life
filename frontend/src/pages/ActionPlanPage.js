// src/pages/ActionPlanPage.js
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

const InputGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: flex-start;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.8rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
`;

const DateInput = styled.input`
  flex: 0 0 150px;
  padding: 0.8rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.8rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
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
  display: block;
  margin: 2rem auto 0;

  &:hover {
    background: #45b7b8;
  }
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

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch } = useForm();
  const [step, setStep] = useState(1);
  const [lifeAreas, setLifeAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [areasResponse, resultsResponse] = await Promise.all([
          api.get('/life-areas'),
          api.get(`/assessments/${id}/results`),
        ]);
        
        setLifeAreas(areasResponse.data);
        // Ensure you use area_results and default to an empty array
        setResults(resultsResponse.data.area_results || []);
      } catch (error) {
        toast.error('Erro ao carregar dados do plano de ação');
        setResults([]); // Set to empty array on error to prevent crashes
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleAreaSelect = () => {
    if (!selectedArea) {
      toast.error('Por favor, selecione uma área');
      return;
    }
    setStep(2);
  };

  const onSubmit = async (data) => {
    const actions = [
      {
        action_text: data.action1,
        strategy_text: data.strategy1,
        target_date: data.date1,
      },
      {
        action_text: data.action2,
        strategy_text: data.strategy2,
        target_date: data.date2,
      },
      {
        action_text: data.action3,
        strategy_text: data.strategy3,
        target_date: data.date3,
      },
    ].filter(action => action.action_text && action.strategy_text);

    if (actions.length === 0) {
      toast.error('Por favor, preencha pelo menos uma ação');
      return;
    }

    try {
      await api.post(`/assessments/${id}/action-plan`, {
        focus_area_id: parseInt(selectedArea),
        actions,
      });

      toast.success('Plano de ação criado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error('Erro ao criar plano de ação');
    }
  };
  
  // Correctly structure the data for the WheelDiagram component
  const wheelData = {
    areas: Array.isArray(results) ? results.map(result => ({
      name: result.life_area_name,
      color: result.color,
      score: result.average_score, // Pass the score for consistency
      percentage: result.percentage
    })) : []
  };

  if (isLoading) {
    return <Container><div>Carregando...</div></Container>;
  }

  if (step === 1) {
    return (
      <Container>
        <Header>
          <h1>RODA DA VIDA</h1>
          <p>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</p>
        </Header>

        <ContentCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3rem' }}>
            <div style={{ flex: 1 }}>
              <StepTitle>Área de Alavanca</StepTitle>
              <StepDescription>
                Agora, observe atentamente sua roda da vida ao lado e responda:
              </StepDescription>
              
              <Question>
                Em qual destas áreas, você poderia colocar um pouco 
                mais de foco e energia para impactar positivamente 
                um maior número de outras áreas em sua vida?
              </Question>

              <Select 
                value={selectedArea} 
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                <option value="">Selecione uma área...</option>
                {lifeAreas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </Select>

              <SubmitButton type="button" onClick={handleAreaSelect}>
                MONTAR PLANO DE AÇÃO >>
              </SubmitButton>
            </div>
            
            <div style={{ flex: '0 0 250px' }}>
              <WheelDiagram data={wheelData} />
            </div>
          </div>
        </ContentCard>

        <DiagramContainer>
          <WheelDiagram data={wheelData} />
        </DiagramContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>RODA DA VIDA</h1>
        <p>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</p>
      </Header>

      <ContentCard>
        <StepContainer>
          <StepDescription>
            Escreva 3 ações para desenvolver a área que escolheu. Defina a 
            data de início da ação e a estratégia para colocá-la em prática:
          </StepDescription>

          <ActionForm onSubmit={handleSubmit(onSubmit)}>
            {[1, 2, 3].map(num => (
              <ActionGroup key={num}>
                <InputGroup>
                  <Input
                    {...register(`action${num}`)}
                    placeholder="Qual a ação?"
                  />
                  <DateInput
                    {...register(`date${num}`)}
                    type="date"
                  />
                </InputGroup>
                <TextArea
                  {...register(`strategy${num}`)}
                  placeholder="Qual a estratégia?"
                />
              </ActionGroup>
            ))}

            <SubmitButton type="submit">
              QUERO RECEBER MEU PLANO DE AÇÃO >>
            </SubmitButton>
          </ActionForm>
        </StepContainer>
      </ContentCard>

      <DiagramContainer>
        <WheelDiagram data={wheelData} />
      </DiagramContainer>
    </Container>
  );
};

export default ActionPlanPage;