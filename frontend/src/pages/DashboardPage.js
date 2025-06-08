// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const AssessmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const AssessmentCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  background: ${props => props.status === 'completed' ? '#2ecc71' : '#f39c12'};
  color: white;
  margin-bottom: 1rem;
`;

const AssessmentTitle = styled.h3`
  color: #333;
  margin-bottom: 0.5rem;
`;

const DateInfo = styled.p`
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #4ECDC4;
  width: ${props => props.percentage}%;
  transition: width 0.3s ease;
`;

const ScoresList = styled.div`
  margin-top: 1rem;
`;

const ScoreItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  flex: 1;
  padding: 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  
  &.primary {
    background: #4ECDC4;
    color: white;
    
    &:hover {
      background: #45b7b8;
    }
  }
  
  &.secondary {
    background: #e0e0e0;
    color: #333;
    
    &:hover {
      background: #d0d0d0;
    }
  }
`;

const NewAssessmentCard = styled(AssessmentCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  border: 2px dashed #4ECDC4;
  background: rgba(78, 205, 196, 0.05);
  
  &:hover {
    background: rgba(78, 205, 196, 0.1);
  }
`;

const PlusIcon = styled.div`
  font-size: 3rem;
  color: #4ECDC4;
  margin-bottom: 1rem;
`;

const ComparisonSection = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  margin-top: 3rem;
`;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      const response = await api.get('/user/assessments');
      setAssessments(response.data.assessments);
    } catch (error) {
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateProgress = (assessment) => {
    if (assessment.status === 'completed') return 100;
    // Assuming 8 areas total
    return (assessment.current_area_index / 8) * 100;
  };

  const handleAssessmentClick = (assessment) => {
    if (assessment.status === 'completed') {
      navigate(`/results/${assessment.id}`);
    } else {
      navigate(`/assessment/${assessment.id}`);
    }
  };

  const startNewAssessment = async () => {
    try {
      const response = await api.post('/assessments');
      navigate(`/assessment/${response.data.id}`);
    } catch (error) {
      toast.error('Erro ao iniciar nova avaliação');
    }
  };

  const compareAssessments = () => {
    const completedAssessments = assessments.filter(a => a.status === 'completed');
    if (completedAssessments.length < 2) {
      toast.error('Você precisa ter pelo menos 2 avaliações completas para comparar');
      return;
    }
    navigate('/compare-assessments', { state: { assessments: completedAssessments } });
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Carregando...</Title>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Minhas Avaliações</Title>
        <Subtitle>Acompanhe seu progresso ao longo do tempo</Subtitle>
      </Header>

      <Content>
        <AssessmentGrid>
          {assessments.map(assessment => (
            <AssessmentCard 
              key={assessment.id}
              onClick={() => handleAssessmentClick(assessment)}
            >
              <StatusBadge status={assessment.status}>
                {assessment.status === 'completed' ? 'Completa' : 'Em Progresso'}
              </StatusBadge>
              
              <AssessmentTitle>{assessment.title}</AssessmentTitle>
              
              <DateInfo>
                Iniciada em: {formatDate(assessment.started_at)}
              </DateInfo>
              
              {assessment.status === 'completed' && (
                <DateInfo>
                  Concluída em: {formatDate(assessment.completed_at)}
                </DateInfo>
              )}
              
              {assessment.status === 'in_progress' && (
                <>
                  <ProgressBar>
                    <ProgressFill percentage={calculateProgress(assessment)} />
                  </ProgressBar>
                  <p style={{ fontSize: '0.9rem', color: '#666' }}>
                    {Math.round(calculateProgress(assessment))}% completo
                  </p>
                </>
              )}
              
              {assessment.status === 'completed' && assessment.area_scores.length > 0 && (
                <ScoresList>
                  {assessment.area_scores.slice(0, 3).map((score, index) => (
                    <ScoreItem key={index}>
                      <span>{score.area_name}</span>
                      <strong>{score.score.toFixed(1)}/10</strong>
                    </ScoreItem>
                  ))}
                  {assessment.area_scores.length > 3 && (
                    <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                      + {assessment.area_scores.length - 3} áreas
                    </p>
                  )}
                </ScoresList>
              )}
              
              <ActionButtons>
                <Button 
                  className="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssessmentClick(assessment);
                  }}
                >
                  {assessment.status === 'completed' ? 'Ver Resultados' : 'Continuar'}
                </Button>
                {assessment.status === 'completed' && (
                  <Button 
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/action-plan/${assessment.id}`);
                    }}
                  >
                    Plano de Ação
                  </Button>
                )}
              </ActionButtons>
            </AssessmentCard>
          ))}
          
          <NewAssessmentCard onClick={startNewAssessment}>
            <PlusIcon>+</PlusIcon>
            <h3>Nova Avaliação</h3>
            <p style={{ color: '#666', textAlign: 'center' }}>
              Comece uma nova avaliação da Roda da Vida
            </p>
          </NewAssessmentCard>
        </AssessmentGrid>
        
        {assessments.filter(a => a.status === 'completed').length >= 2 && (
          <ComparisonSection>
            <h2 style={{ marginBottom: '1rem' }}>Comparar Avaliações</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Compare seus resultados ao longo do tempo para ver sua evolução
            </p>
            <Button className="primary" onClick={compareAssessments}>
              Comparar Avaliações
            </Button>
          </ComparisonSection>
        )}
      </Content>
    </Container>
  );
};

export default DashboardPage;